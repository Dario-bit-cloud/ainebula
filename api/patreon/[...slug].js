// API Route dinamica per gestire tutte le operazioni Patreon su Vercel
// Gestisce:
// GET /api/patreon/callback - Callback OAuth Patreon
// POST /api/patreon/link-account - Collega account Patreon
// POST /api/patreon/check-membership - Verifica membership Patreon
// GET /api/patreon/link-status - Verifica stato collegamento
// POST /api/patreon/unlink-account - Scollega account Patreon

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PATREON_CLIENT_ID = process.env.PATREON_CLIENT_ID || 'NF2MmLVExjXVv4ZpcgijfosjlJIYQuPBblK7vE1PpSPRawgFbKhiVbzq0Nbl1YAf';
const PATREON_CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET || '8JZGmekMz0KcEs-20TV1mVFZUb4VpPny6vA_XXM_OFm4GwTTrbv7wTkQSzHgjiEm';

// Inizializza la connessione al database solo se DATABASE_URL è disponibile
function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

// Helper per parsare i cookie dalle richieste
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

// Helper per verificare autenticazione
async function authenticateUser(req, sql) {
  // Prova prima con l'header Authorization
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }
  
  // Se non c'è token nell'header, prova con il cookie
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

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Determina il percorso dalla query
    const slug = req.query.slug || [];
    const path = Array.isArray(slug) ? slug.join('/') : slug;
    
    // Gestisci callback OAuth Patreon
    if (path === 'callback' && req.method === 'GET') {
      const { code, state, error } = req.query;
      
      // Gestisci errori da Patreon
      if (error) {
        return res.redirect(`/?patreon_error=${encodeURIComponent(error)}`);
      }
      
      if (!code) {
        return res.redirect('/?patreon_error=no_code');
      }
      
      // Determina redirect URI
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const redirectUri = `${protocol}://${host}/api/patreon/callback`;
      
      // Scambia code con access token
      const tokenResponse = await fetch('https://www.patreon.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code: code,
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
      
      // Ottieni informazioni utente da Patreon
      const userResponse = await fetch('https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        return res.redirect('/?patreon_error=user_info_failed');
      }
      
      const userData = await userResponse.json();
      const patreonUserId = userData.data?.id;
      
      if (!patreonUserId) {
        return res.redirect('/?patreon_error=no_user_id');
      }
      
      // Reindirizza alla pagina principale con i dati
      return res.redirect(`/?patreon_linked=true&patreon_user_id=${patreonUserId}&patreon_token=${encodeURIComponent(accessToken)}`);
    }
    
    // Inizializza la connessione al database per le altre operazioni
    const sql = getDatabaseConnection();
    
    // GET /api/patreon/link-status - Verifica stato collegamento
    if (path === 'link-status' && req.method === 'GET') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      
      const users = await sql`
        SELECT patreon_user_id, patreon_access_token
        FROM users
        WHERE id = ${userId}
      `;
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      
      const isLinked = !!(users[0].patreon_user_id && users[0].patreon_access_token);
      
      res.json({
        success: true,
        isLinked,
        patreonUserId: users[0].patreon_user_id || null
      });
      return;
    }

    // POST /api/patreon/link-account - Collega account Patreon
    if (path === 'link-account' && req.method === 'POST') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const { patreonUserId, patreonAccessToken } = req.body;
      
      if (!patreonUserId || !patreonAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'Patreon User ID e Access Token richiesti'
        });
      }
      
      const userId = auth.user.user_id;
      
      // Aggiorna utente con dati Patreon
      await sql`
        UPDATE users
        SET patreon_user_id = ${patreonUserId},
            patreon_access_token = ${patreonAccessToken},
            updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      res.json({
        success: true,
        message: 'Account Patreon collegato con successo'
      });
      return;
    }

    // POST /api/patreon/check-membership - Verifica membership
    if (path === 'check-membership' && req.method === 'POST') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const { patreonUserId } = req.body;
      
      if (!patreonUserId) {
        return res.status(400).json({
          success: false,
          message: 'Patreon User ID richiesto'
        });
      }

      // Ottieni access token dell'utente
      const users = await sql`
        SELECT patreon_access_token
        FROM users
        WHERE id = ${auth.user.user_id}
          AND patreon_user_id = ${patreonUserId}
      `;

      if (users.length === 0 || !users[0].patreon_access_token) {
        return res.status(404).json({
          success: false,
          message: 'Account Patreon non collegato'
        });
      }

      const accessToken = users[0].patreon_access_token;

      // Verifica membership su Patreon
      try {
        const membershipResponse = await fetch(`https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name&fields[member]=patron_status,currently_entitled_amount_cents`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!membershipResponse.ok) {
          return res.status(500).json({
            success: false,
            message: 'Errore nella verifica membership Patreon'
          });
        }

        const membershipData = await membershipResponse.json();
        
        // Verifica se l'utente ha una membership attiva con almeno 5€/mese
        const MIN_AMOUNT_CENTS = 500; // 5€ = 500 centesimi
        let hasActiveMembership = false;
        let subscription = null;

        if (membershipData.included) {
          for (const item of membershipData.included) {
            if (item.type === 'member') {
              const isActive = item.attributes?.patron_status === 'active_patron';
              const amountCents = item.attributes?.currently_entitled_amount_cents || 0;
              
              if (isActive && amountCents >= MIN_AMOUNT_CENTS) {
                hasActiveMembership = true;
                
                // Crea o aggiorna abbonamento nel database
                const subscriptionId = randomBytes(16).toString('hex');
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 mese da ora
                
                // Verifica se esiste già un abbonamento attivo
                const existingSubs = await sql`
                  SELECT id FROM subscriptions
                  WHERE user_id = ${auth.user.user_id}
                    AND payment_method = 'patreon'
                    AND status = 'active'
                `;

                if (existingSubs.length === 0) {
                  await sql`
                    INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, payment_method, auto_renew)
                    VALUES (${subscriptionId}, ${auth.user.user_id}, 'premium', 'active', NOW(), ${expiresAt}, 'patreon', true)
                  `;
                } else {
                  // Aggiorna abbonamento esistente
                  await sql`
                    UPDATE subscriptions
                    SET expires_at = ${expiresAt},
                        updated_at = NOW()
                    WHERE id = ${existingSubs[0].id}
                  `;
                }

                subscription = {
                  active: true,
                  plan: 'premium',
                  expires_at: expiresAt.toISOString(),
                  started_at: new Date().toISOString()
                };
                break;
              }
            }
          }
        }

        if (hasActiveMembership && subscription) {
          res.json({
            success: true,
            subscription: subscription,
            message: 'Abbonamento Premium attivo trovato'
          });
        } else {
          res.json({
            success: false,
            subscription: null,
            message: 'Nessun abbonamento Premium attivo trovato. Assicurati di essere iscritto al tier da almeno 5€/mese su Patreon.'
          });
        }
      } catch (error) {
        console.error('Errore verifica membership Patreon:', error);
        res.status(500).json({
          success: false,
          message: 'Errore nella verifica membership Patreon',
          error: error.message
        });
      }
      return;
    }

    // POST /api/patreon/unlink-account - Scollega account
    if (path === 'unlink-account' && req.method === 'POST') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      
      // Rimuovi dati Patreon dall'utente
      await sql`
        UPDATE users
        SET patreon_user_id = NULL,
            patreon_access_token = NULL,
            updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      // Disattiva abbonamenti attivi collegati a Patreon
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
    console.error('❌ Errore Patreon:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante l\'operazione',
        error: error.message || 'Unknown error'
      });
    }
  }
}

