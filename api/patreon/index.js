// API Route semplificata per gestire abbonamenti Patreon
// Endpoints:
// GET  /api/patreon/callback - Callback OAuth Patreon
// GET  /api/patreon/status - Verifica stato collegamento e abbonamento
// POST /api/patreon/link - Collega account Patreon (dopo callback)
// POST /api/patreon/sync - Sincronizza abbonamento da Patreon
// POST /api/patreon/unlink - Scollega account Patreon

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PATREON_CLIENT_ID = process.env.PATREON_CLIENT_ID || 'NF2MmLVExjXVv4ZpcgijfosjlJIYQuPBblK7vE1PpSPRawgFbKhiVbzq0Nbl1YAf';
const PATREON_CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET || '8JZGmekMz0KcEs-20TV1mVFZUb4VpPny6vA_XXM_OFm4GwTTrbv7wTkQSzHgjiEm';
const MIN_AMOUNT_CENTS = 500; // 5€ = 500 centesimi

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
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
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

// Verifica membership su Patreon e aggiorna subscription
async function syncPatreonMembership(userId, patreonUserId, accessToken, sql) {
  try {
    const membershipResponse = await fetch(
      `https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name&fields[member]=patron_status,currently_entitled_amount_cents`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!membershipResponse.ok) {
      return { success: false, message: 'Errore nella verifica membership Patreon' };
    }

    const membershipData = await membershipResponse.json();
    let hasActiveMembership = false;
    let amountCents = 0;

    if (membershipData.included) {
      for (const item of membershipData.included) {
        if (item.type === 'member') {
          const isActive = item.attributes?.patron_status === 'active_patron';
          amountCents = item.attributes?.currently_entitled_amount_cents || 0;
          
          if (isActive && amountCents >= MIN_AMOUNT_CENTS) {
            hasActiveMembership = true;
            break;
          }
        }
      }
    }

    if (hasActiveMembership) {
      // Crea o aggiorna abbonamento
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const existingSubs = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${userId}
          AND payment_method = 'patreon'
          AND status = 'active'
      `;

      if (existingSubs.length === 0) {
        const subscriptionId = randomBytes(16).toString('hex');
        await sql`
          INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, payment_method, auto_renew, amount, currency, billing_cycle)
          VALUES (${subscriptionId}, ${userId}, 'premium', 'active', NOW(), ${expiresAt}, 'patreon', true, ${amountCents / 100}, 'EUR', 'monthly')
        `;
      } else {
        await sql`
          UPDATE subscriptions
          SET expires_at = ${expiresAt},
              updated_at = NOW(),
              amount = ${amountCents / 100}
          WHERE id = ${existingSubs[0].id}
        `;
      }

      return {
        success: true,
        hasActiveMembership: true,
        subscription: {
          plan: 'premium',
          status: 'active',
          expires_at: expiresAt.toISOString()
        }
      };
    } else {
      // Disattiva abbonamento se non più attivo
      await sql`
        UPDATE subscriptions
        SET status = 'cancelled',
            cancelled_at = NOW(),
            auto_renew = false
        WHERE user_id = ${userId}
          AND payment_method = 'patreon'
          AND status = 'active'
      `;

      return {
        success: true,
        hasActiveMembership: false,
        message: 'Nessun abbonamento Premium attivo su Patreon'
      };
    }
  } catch (error) {
    console.error('Errore sync membership Patreon:', error);
    return { success: false, message: error.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const sql = getDatabaseConnection();
    const urlPath = req.url.split('?')[0];
    const action = req.query.action || urlPath.split('/api/patreon/')[1] || '';

    // GET /api/patreon/callback - Callback OAuth
    if (action === 'callback' && req.method === 'GET') {
      const { code, error } = req.query;
      
      if (error) {
        return res.redirect(`/?patreon_error=${encodeURIComponent(error)}`);
      }
      
      if (!code) {
        return res.redirect('/?patreon_error=no_code');
      }
      
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const redirectUri = `${protocol}://${host}/api/patreon/callback`;
      
      // Scambia code con access token
      const tokenResponse = await fetch('https://www.patreon.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: PATREON_CLIENT_ID,
          client_secret: PATREON_CLIENT_SECRET,
          redirect_uri: redirectUri
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Errore scambio token Patreon:', errorText);
        return res.redirect('/?patreon_error=token_exchange_failed');
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      if (!accessToken) {
        return res.redirect('/?patreon_error=no_access_token');
      }
      
      // Ottieni info utente da Patreon
      const userResponse = await fetch(
        'https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!userResponse.ok) {
        return res.redirect('/?patreon_error=user_info_failed');
      }
      
      const userData = await userResponse.json();
      const patreonUserId = userData.data?.id;
      
      if (!patreonUserId) {
        return res.redirect('/?patreon_error=no_user_id');
      }
      
      // Salva temporaneamente i dati per il collegamento
      return res.redirect(`/?patreon_callback=true&patreon_user_id=${patreonUserId}&patreon_token=${encodeURIComponent(accessToken)}`);
    }

    // Tutti gli altri endpoint richiedono autenticazione
    const auth = await authenticateUser(req, sql);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const userId = auth.user.user_id;

    // POST /api/patreon/link - Collega account dopo callback
    if (action === 'link' && req.method === 'POST') {
      const { patreonUserId, patreonAccessToken } = req.body;
      
      if (!patreonUserId || !patreonAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'Patreon User ID e Access Token richiesti'
        });
      }
      
      // Salva dati Patreon
      await sql`
        UPDATE users
        SET patreon_user_id = ${patreonUserId},
            patreon_access_token = ${patreonAccessToken},
            updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      // Sincronizza membership
      const syncResult = await syncPatreonMembership(userId, patreonUserId, patreonAccessToken, sql);
      
      res.json({
        success: true,
        message: 'Account Patreon collegato con successo',
        ...syncResult
      });
      return;
    }

    // GET /api/patreon/status - Verifica stato collegamento e abbonamento
    if (action === 'status' && req.method === 'GET') {
      const users = await sql`
        SELECT patreon_user_id, patreon_access_token
        FROM users
        WHERE id = ${userId}
      `;
      
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }
      
      const isLinked = !!(users[0].patreon_user_id && users[0].patreon_access_token);
      
      // Ottieni subscription attiva
      const subscriptions = await sql`
        SELECT * FROM subscriptions
        WHERE user_id = ${userId}
          AND payment_method = 'patreon'
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const subscription = subscriptions.length > 0 ? {
        plan: subscriptions[0].plan,
        status: subscriptions[0].status,
        expires_at: subscriptions[0].expires_at?.toISOString(),
        started_at: subscriptions[0].started_at?.toISOString()
      } : null;
      
      res.json({
        success: true,
        isLinked,
        patreonUserId: users[0].patreon_user_id || null,
        subscription
      });
      return;
    }

    // POST /api/patreon/sync - Sincronizza abbonamento da Patreon
    if (action === 'sync' && req.method === 'POST') {
      const users = await sql`
        SELECT patreon_user_id, patreon_access_token
        FROM users
        WHERE id = ${userId}
      `;
      
      if (users.length === 0 || !users[0].patreon_user_id || !users[0].patreon_access_token) {
        return res.status(404).json({
          success: false,
          message: 'Account Patreon non collegato'
        });
      }
      
      const syncResult = await syncPatreonMembership(
        userId,
        users[0].patreon_user_id,
        users[0].patreon_access_token,
        sql
      );
      
      res.json(syncResult);
      return;
    }

    // POST /api/patreon/unlink - Scollega account
    if (action === 'unlink' && req.method === 'POST') {
      await sql`
        UPDATE users
        SET patreon_user_id = NULL,
            patreon_access_token = NULL,
            updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      await sql`
        UPDATE subscriptions
        SET status = 'cancelled',
            cancelled_at = NOW(),
            auto_renew = false
        WHERE user_id = ${userId}
          AND payment_method = 'patreon'
          AND status = 'active'
      `;
      
      res.json({
        success: true,
        message: 'Account Patreon scollegato con successo'
      });
      return;
    }

    return res.status(404).json({ success: false, message: 'Endpoint non trovato' });
  } catch (error) {
    console.error('❌ Errore Patreon:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante l\'operazione',
        error: error.message
      });
    }
  }
}
