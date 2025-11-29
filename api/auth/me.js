// API Route per verificare sessione e ottenere dati utente
// GET /api/auth/me

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const sql = getDatabaseConnection();
    const auth = await authenticateUser(req, sql);
    
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const userId = auth.user.user_id;

    // Carica l'abbonamento attivo dell'utente
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
        phoneNumber: auth.user.phone_number || null,
        subscription: subscription
      },
      token: auth.token
    });
  } catch (error) {
    console.error('❌ Errore /api/auth/me:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante la verifica della sessione',
        error: error.message
      });
    }
  }
}

