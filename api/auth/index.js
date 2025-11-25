// API Route consolidata per gestire operazioni di autenticazione su Vercel
// Endpoints:
// GET /api/auth/me - Verifica sessione e ottieni dati utente
// POST /api/auth/logout - Logout
// POST /api/auth/disconnect-all - Disconnetti da tutti i dispositivi
// DELETE /api/auth/delete-account - Elimina account
// PUT/PATCH /api/auth/update-phone - Aggiorna numero di telefono
// PUT/PATCH /api/auth/update-username - Aggiorna username
// PUT/PATCH /api/auth/update-password - Aggiorna password

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Inizializza la connessione al database solo se DATABASE_URL è disponibile
function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

// Helper per verificare autenticazione
async function authenticateUser(req, sql) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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
    // Inizializza la connessione al database
    const sql = getDatabaseConnection();
    
    // GET /api/auth/me - Verifica sessione e ottieni dati utente
    if (req.method === 'GET') {
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
          phone_number: auth.user.phone_number || null,
          subscription: subscription
        }
      });
      return;
    }

    // POST /api/auth/disconnect-all - Disconnetti da tutti i dispositivi
    if (req.method === 'POST' && req.query.action === 'disconnect-all') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const token = auth.token;

      // Elimina tutte le sessioni dell'utente tranne quella corrente
      await sql`
        DELETE FROM sessions 
        WHERE user_id = ${userId} 
          AND token != ${token}
      `;

      console.log(`✓ Disconnessione da tutti i dispositivi per userId=${userId} (sessione corrente mantenuta)`);

      res.json({
        success: true,
        message: 'Disconnessione da tutti i dispositivi completata. La sessione corrente è stata mantenuta.'
      });
      return;
    }

    // POST /api/auth/logout - Logout (default POST without action)
    if (req.method === 'POST' && !req.query.action) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await sql`
          DELETE FROM sessions WHERE token = ${token}
        `;
      }

      res.json({
        success: true,
        message: 'Logout completato con successo'
      });
      return;
    }

    // DELETE /api/auth/delete-account - Elimina account
    if (req.method === 'DELETE' || (req.method === 'POST' && req.query.action === 'delete-account')) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;

      // Elimina l'utente dal database
      // Grazie a ON DELETE CASCADE, questo eliminerà automaticamente:
      // - Tutte le sessioni (sessions)
      // - Tutte le chat (chats)
      // - Tutti i messaggi (messages, tramite CASCADE da chats)
      // - Tutti i progetti (projects)
      // - Tutte le impostazioni utente (user_settings)
      // - Tutti gli abbonamenti (subscriptions)
      // - Tutti i pagamenti (payments, tramite CASCADE da subscriptions)
      await sql`
        DELETE FROM users WHERE id = ${userId}
      `;

      console.log(`✅ Account eliminato con successo: userId=${userId}`);

      res.json({
        success: true,
        message: 'Account eliminato con successo. Tutti i dati associati sono stati rimossi.'
      });
      return;
    }

    // PUT/PATCH /api/auth/update-phone - Aggiorna numero di telefono
    if ((req.method === 'PUT' || req.method === 'PATCH') && req.query.action === 'update-phone') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const { phone_number } = req.body;

      // Valida il numero di telefono (opzionale, può essere null o una stringa)
      if (phone_number !== null && phone_number !== undefined && phone_number !== '') {
        // Rimuovi spazi e caratteri non numerici (tranne +)
        const cleanedPhone = phone_number.toString().trim();
        if (cleanedPhone.length > 20) {
          return res.status(400).json({ success: false, message: 'Il numero di telefono è troppo lungo (max 20 caratteri)' });
        }
      }

      // Aggiorna il numero di telefono
      await sql`
        UPDATE users 
        SET phone_number = ${phone_number || null}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      console.log(`✓ Numero di telefono aggiornato per userId=${userId}`);

      res.json({
        success: true,
        message: 'Numero di telefono aggiornato con successo',
        phone_number: phone_number || null
      });
      return;
    }

    // PUT/PATCH /api/auth/update-username - Aggiorna username
    if ((req.method === 'PUT' || req.method === 'PATCH') && req.query.action === 'update-username') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const { username } = req.body;

      // Validazione
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Lo username è obbligatorio' });
      }

      const trimmedUsername = username.trim().toLowerCase();

      if (trimmedUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'Lo username deve essere di almeno 3 caratteri' });
      }

      if (trimmedUsername.length > 100) {
        return res.status(400).json({ success: false, message: 'Lo username è troppo lungo (max 100 caratteri)' });
      }

      // Verifica se lo username esiste già (escludendo l'utente corrente)
      const existing = await sql`
        SELECT id FROM users 
        WHERE username = ${trimmedUsername} AND id != ${userId}
      `;

      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Username già in uso' });
      }

      // Aggiorna lo username
      await sql`
        UPDATE users 
        SET username = ${trimmedUsername}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      console.log(`✓ Username aggiornato per userId=${userId}`);

      res.json({
        success: true,
        message: 'Username aggiornato con successo',
        username: trimmedUsername
      });
      return;
    }

    // PUT/PATCH /api/auth/update-password - Aggiorna password
    if ((req.method === 'PUT' || req.method === 'PATCH') && req.query.action === 'update-password') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const { current_password, new_password } = req.body;

      // Validazione
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'La password attuale è obbligatoria' });
      }

      if (!new_password) {
        return res.status(400).json({ success: false, message: 'La nuova password è obbligatoria' });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'La nuova password deve essere di almeno 6 caratteri' });
      }

      // Verifica la password attuale
      const [user] = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `;

      if (!user) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }

      const isValidPassword = await bcrypt.compare(current_password, user.password_hash);

      if (!isValidPassword) {
        return res.status(400).json({ success: false, message: 'Password attuale non corretta' });
      }

      // Hash della nuova password
      const passwordHash = await bcrypt.hash(new_password, 10);

      // Aggiorna la password
      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      console.log(`✓ Password aggiornata per userId=${userId}`);

      res.json({
        success: true,
        message: 'Password aggiornata con successo'
      });
      return;
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Errore auth:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Assicurati che la risposta sia sempre JSON valido
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante l\'operazione',
        error: error.message || 'Unknown error'
      });
    }
  }
}

