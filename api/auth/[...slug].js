// API Route dinamica consolidata per gestire TUTTE le operazioni di autenticazione su Vercel
// Gestisce: /api/auth, /api/auth/login, /api/auth/register, /api/auth/passkey, /api/auth/2fa, /api/auth/me, ecc.

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

// Configurazione WebAuthn
const rpId = process.env.WEBAUTHN_RP_ID || 'ainebula.vercel.app';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Nebula AI';
const origin = process.env.WEBAUTHN_ORIGIN || 'https://ainebula.vercel.app';

// Store temporaneo per le challenge passkey
const challenges = new Map();

function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = parts[1];
      }
    });
  }
  return cookies;
}

async function authenticateUser(req, sql) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }
  
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.auth_token) {
      token = cookies.auth_token;
    }
  }

  if (!token) {
    return { error: 'Token non fornito', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.phone_number, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;

    if (sessions.length === 0) {
      return { error: 'Sessione non valida', status: 401 };
    }

    return { user: sessions[0], token };
  } catch (error) {
    return { error: 'Token non valido', status: 403 };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const sql = getDatabaseConnection();
    
    // Determina l'endpoint dal slug (per route dinamiche) o query parameter
    const slug = req.query.slug;
    let endpoint = '';
    if (slug) {
      endpoint = Array.isArray(slug) ? slug[0] : slug;
    }
    
    // Se non c'è slug, prova a estrarre dal path
    if (!endpoint) {
      const urlPath = req.url.split('?')[0];
      const pathMatch = urlPath.match(/\/api\/auth\/([^/?]+)/);
      if (pathMatch) {
        endpoint = pathMatch[1];
      }
    }
    
    let action = req.query.action || endpoint;
    
    // Parse body se necessario
    let parsedBody = req.body;
    if (parsedBody) {
      if (typeof parsedBody === 'string' && parsedBody.length > 0) {
        try {
          parsedBody = JSON.parse(parsedBody);
        } catch (e) {
          console.warn('⚠️ [AUTH] Errore parsing body JSON:', e.message);
        }
      }
      
      if (!action && parsedBody && typeof parsedBody === 'object' && parsedBody.action) {
        action = parsedBody.action;
      }
    }
    
    console.log('🔍 [AUTH] Routing:', { 
      method: req.method, 
      endpoint, 
      action, 
      slug,
      hasBody: !!req.body,
      bodyType: typeof req.body
    });
    
    // GET /api/auth/me - Verifica sessione
    if (req.method === 'GET' && (endpoint === 'me' || action === 'me' || !endpoint)) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;

      const subscriptions = await sql`
        SELECT * FROM subscriptions 
        WHERE user_id = ${userId} 
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY started_at DESC
        LIMIT 1
      `;

      let subscription = null;
      if (subscriptions.length > 0) {
        const sub = subscriptions[0];
        subscription = {
          active: true,
          plan: sub.plan,
          expiresAt: sub.expires_at ? sub.expires_at.toISOString() : null,
          startedAt: sub.started_at ? sub.started_at.toISOString() : null,
          autoRenew: sub.auto_renew || false,
          status: sub.status
        };
      } else {
        subscription = {
          active: false,
          plan: null,
          expiresAt: null,
          startedAt: null,
          autoRenew: false,
          status: 'inactive'
        };
      }

      res.json({
        success: true,
        user: {
          id: userId,
          email: auth.user.email,
          username: auth.user.username,
          phone_number: auth.user.phone_number || null,
          subscription: subscription
        },
        token: auth.token
      });
      return;
    }
    
    // POST /api/auth/login - Login
    if (req.method === 'POST' && (endpoint === 'login' || action === 'login')) {
      const body = parsedBody || req.body;
      const { username, password } = body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username e password sono obbligatori'
        });
      }
      
      const usernameLower = username.toLowerCase();
      const users = await sql`
        SELECT id, email, username, password_hash, is_active
        FROM users
        WHERE username = ${usernameLower}
      `;
      
      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenziali non valide'
        });
      }
      
      const user = users[0];
      
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account disattivato'
        });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenziali non valide'
        });
      }
      
      const sessionToken = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      const sessionId = randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_DURATION);
      
      await sql`
        INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
        VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, ${req.headers['user-agent']})
      `;
      
      await sql`
        UPDATE users SET last_login = NOW() WHERE id = ${user.id}
      `;
      
      const maxAge = SESSION_DURATION / 1000;
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieParts = [
        `auth_token=${sessionToken}`,
        `Max-Age=${maxAge}`,
        `Path=/`,
        `SameSite=Lax`,
        isProduction ? 'Secure' : '',
        'HttpOnly'
      ].filter(Boolean);
      
      res.setHeader('Set-Cookie', cookieParts.join('; '));
      
      res.json({
        success: true,
        message: 'Login completato con successo',
        user: {
          id: user.id,
          username: user.username
        },
        token: sessionToken
      });
      return;
    }
    
    // POST /api/auth/register - Registrazione
    if (req.method === 'POST' && (endpoint === 'register' || action === 'register')) {
      const body = parsedBody || req.body;
      const { username, password, referralCode } = body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username e password sono obbligatori'
        });
      }
      
      if (username.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Lo username deve essere di almeno 3 caratteri'
        });
      }
      
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La password deve essere di almeno 6 caratteri'
        });
      }
      
      const existing = await sql`
        SELECT id FROM users 
        WHERE username = ${username.toLowerCase()}
      `;
      
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username già in uso'
        });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomBytes(16).toString('hex');
      const email = `${username.toLowerCase()}@nebula.local`;
      
      function generateReferralCode() {
        return randomBytes(8).toString('hex');
      }
      
      let userReferralCode = generateReferralCode();
      let codeExists = true;
      while (codeExists) {
        const existing = await sql`
          SELECT id FROM users WHERE referral_code = ${userReferralCode}
        `;
        if (existing.length === 0) {
          codeExists = false;
        } else {
          userReferralCode = generateReferralCode();
        }
      }
      
      await sql`
        INSERT INTO users (id, email, username, password_hash, referral_code)
        VALUES (${userId}, ${email}, ${username.toLowerCase()}, ${passwordHash}, ${userReferralCode})
      `;
      
      if (referralCode) {
        try {
          const [referrer] = await sql`
            SELECT id FROM users WHERE referral_code = ${referralCode}
          `;
          
          if (referrer && referrer.id !== userId) {
            const referralId = randomBytes(16).toString('hex');
            await sql`
              INSERT INTO referrals (id, referrer_id, referred_id, referral_code, status)
              VALUES (${referralId}, ${referrer.id}, ${userId}, ${referralCode}, 'completed')
            `;
            
            const [earningsCheck] = await sql`
              SELECT 
                COALESCE(SUM(CASE WHEN re.status IN ('available', 'withdrawn') THEN re.amount ELSE 0 END), 0) as total_earnings
              FROM referral_earnings re
              WHERE re.user_id = ${referrer.id}
            `;
            
            const totalEarnings = parseFloat(earningsCheck?.total_earnings || 0);
            const REFERRAL_REWARD = 20.00;
            const MAX_EARNINGS = 500.00;
            
            if (totalEarnings < MAX_EARNINGS) {
              const earningId = randomBytes(16).toString('hex');
              const rewardAmount = Math.min(REFERRAL_REWARD, MAX_EARNINGS - totalEarnings);
              
              await sql`
                INSERT INTO referral_earnings (id, user_id, referral_id, amount, status)
                VALUES (${earningId}, ${referrer.id}, ${referralId}, ${rewardAmount}, 'available')
              `;
            }
          }
        } catch (refError) {
          console.error('Errore referral:', refError);
        }
      }
      
      const sessionToken = jwt.sign({ userId, email, username: username.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
      const sessionId = randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_DURATION);
      
      await sql`
        INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
        VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, ${req.headers['user-agent']})
      `;
      
      await sql`
        UPDATE users SET last_login = NOW() WHERE id = ${userId}
      `;
      
      const maxAge = SESSION_DURATION / 1000;
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieParts = [
        `auth_token=${sessionToken}`,
        `Max-Age=${maxAge}`,
        `Path=/`,
        `SameSite=Lax`,
        isProduction ? 'Secure' : '',
        'HttpOnly'
      ].filter(Boolean);
      
      res.setHeader('Set-Cookie', cookieParts.join('; '));
      
      res.json({
        success: true,
        message: 'Registrazione completata con successo',
        user: {
          id: userId,
          username: username.toLowerCase()
        },
        token: sessionToken
      });
      return;
    }
    
    // POST /api/auth/logout - Logout
    if (req.method === 'POST' && (endpoint === 'logout' || action === 'logout' || (!endpoint && !action))) {
      const authHeader = req.headers['authorization'];
      let token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        const cookies = parseCookies(req.headers.cookie);
        if (cookies.auth_token) {
          token = cookies.auth_token;
        }
      }

      if (token) {
        await sql`
          DELETE FROM sessions WHERE token = ${token}
        `;
      }
      
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieParts = [
        'auth_token=',
        'Max-Age=0',
        'Path=/',
        'SameSite=Lax',
        isProduction ? 'Secure' : '',
        'HttpOnly'
      ].filter(Boolean);
      res.setHeader('Set-Cookie', cookieParts.join('; '));

      res.json({
        success: true,
        message: 'Logout completato con successo'
      });
      return;
    }
    
    // Altri endpoint (passkey, 2fa, disconnect-all, delete-account, update-*) - da implementare se necessario
    // Per ora restituiamo 404 per endpoint non gestiti
    return res.status(404).json({ success: false, message: 'Endpoint non trovato', endpoint, action });
    
  } catch (error) {
    console.error('❌ Errore auth:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      url: req.url,
      method: req.method
    });
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante l\'operazione',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }
}
