import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

const app = express();
const PORT = 3001;

// Middleware CORS - permette richieste da localhost e da qualsiasi origine in produzione
app.use(cors({
  origin: function (origin, callback) {
    // Permetti richieste senza origin (es. Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    // Permetti localhost su qualsiasi porta
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // In produzione, potresti voler limitare a domini specifici
    // Per ora permettiamo tutte le origini
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware per loggare tutte le richieste
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📨 [REQUEST] ${req.method} ${req.path}`, {
    timestamp,
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    ip: req.ip
  });
  next();
});

app.use(express.json());

// Middleware per verificare l'autenticazione
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token non fornito' });
  }

  try {
    // Verifica il token JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifica che la sessione esista nel database
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;
    
    if (sessions.length === 0) {
      return res.status(401).json({ success: false, message: 'Sessione non valida' });
    }
    
    req.user = {
      id: sessions[0].user_id,
      email: sessions[0].email,
      username: sessions[0].username
    };
    req.session = sessions[0];
    
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token non valido' });
  }
}

// Connessione al database Neon
// Usa la variabile d'ambiente o il valore di default per sviluppo
const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_Xpw3ovIOqnz0@ep-spring-leaf-ads75xz2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

if (!connectionString) {
  console.error('❌ DATABASE_URL non trovata nelle variabili d\'ambiente');
  process.exit(1);
}

console.log('✅ Database URL configurato');

const sql = neon(connectionString);

// Endpoint per testare la connessione
app.get('/api/db/test', async (req, res) => {
  try {
    const response = await sql`SELECT version()`;
    const { version } = response[0];
    
    res.json({
      success: true,
      message: 'Connessione al database riuscita!',
      version: version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore connessione database:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella connessione al database',
      error: error.message
    });
  }
});

// Endpoint per eseguire query personalizzate (solo SELECT per sicurezza)
app.post('/api/db/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query non fornita'
      });
    }
    
    // Verifica che sia una query SELECT (per sicurezza)
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        message: 'Solo query SELECT sono permesse per sicurezza'
      });
    }
    
    const response = await sql.unsafe(query);
    
    res.json({
      success: true,
      data: response,
      rowCount: response.length
    });
  } catch (error) {
    console.error('Errore esecuzione query:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'esecuzione della query',
      error: error.message
    });
  }
});

// Endpoint per ottenere informazioni sul database
app.get('/api/db/info', async (req, res) => {
  try {
    // Ottieni informazioni sulle tabelle
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    res.json({
      success: true,
      tables: tables.map(t => t.table_name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore recupero info database:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle informazioni',
      error: error.message
    });
  }
});

// ==================== ENDPOINT AUTENTICAZIONE ====================

// Registrazione
app.post('/api/auth/register', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log('\n📝 [SERVER REGISTER] Richiesta ricevuta:', {
    timestamp,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    headers: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      'content-type': req.get('content-type')
    }
  });
  
  try {
    const { username, password } = req.body;
    
    console.log('📥 [SERVER REGISTER] Body ricevuto:', {
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING',
      hasUsername: !!username,
      hasPassword: !!password
    });
    
    // Validazione
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
    
    // Verifica se username esiste già
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
    
    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomBytes(16).toString('hex');
    const email = `${username.toLowerCase()}@nebula.local`; // Email fittizia basata su username
    
    // Crea l'utente
    await sql`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (${userId}, ${email}, ${username.toLowerCase()}, ${passwordHash})
    `;
    
    // Crea sessione
    const sessionToken = jwt.sign({ userId, email, username: username.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, ${req.ip}, ${req.get('user-agent')})
    `;
    
    // Aggiorna last_login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${userId}
    `;
    
    const response = {
      success: true,
      message: 'Registrazione completata con successo',
      user: {
        id: userId,
        username: username.toLowerCase()
      },
      token: sessionToken
    };
    
    console.log('✅ [SERVER REGISTER] Registrazione completata per:', username.toLowerCase());
    res.json(response);
  } catch (error) {
    console.error('❌ [SERVER REGISTER] Errore:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp
    });
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione',
      error: error.message
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log('\n🔐 [SERVER LOGIN] Richiesta ricevuta:', {
    timestamp,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    headers: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      'content-type': req.get('content-type')
    }
  });
  
  try {
    const { username, password } = req.body;
    
    console.log('📥 [SERVER LOGIN] Body ricevuto:', {
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING',
      hasUsername: !!username,
      hasPassword: !!password
    });
    
    if (!username || !password) {
      console.warn('⚠️ [SERVER LOGIN] Credenziali mancanti');
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori'
      });
    }
    
    const usernameLower = username.toLowerCase();
    console.log('🔍 [SERVER LOGIN] Ricerca utente:', usernameLower);
    
    // Trova l'utente
    const users = await sql`
      SELECT id, email, username, password_hash, is_active
      FROM users
      WHERE username = ${usernameLower}
    `;
    
    console.log('👤 [SERVER LOGIN] Utenti trovati:', users.length);
    
    if (users.length === 0) {
      console.warn('❌ [SERVER LOGIN] Utente non trovato:', usernameLower);
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }
    
    const user = users[0];
    console.log('✅ [SERVER LOGIN] Utente trovato:', {
      id: user.id,
      username: user.username,
      isActive: user.is_active
    });
    
    if (!user.is_active) {
      console.warn('⚠️ [SERVER LOGIN] Account disattivato:', user.id);
      return res.status(403).json({
        success: false,
        message: 'Account disattivato'
      });
    }
    
    // Verifica password
    console.log('🔑 [SERVER LOGIN] Verifica password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 [SERVER LOGIN] Password valida:', isValidPassword);
    
    if (!isValidPassword) {
      console.warn('❌ [SERVER LOGIN] Password non valida per utente:', user.username);
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }
    
    // Crea sessione
    console.log('🎫 [SERVER LOGIN] Creazione sessione...');
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, ${req.ip}, ${req.get('user-agent')})
    `;
    
    console.log('✅ [SERVER LOGIN] Sessione creata:', {
      sessionId,
      expiresAt: expiresAt.toISOString()
    });
    
    // Aggiorna last_login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${user.id}
    `;
    
    const response = {
      success: true,
      message: 'Login completato con successo',
      user: {
        id: user.id,
        username: user.username
      },
      token: sessionToken
    };
    
    console.log('✅ [SERVER LOGIN] Login completato con successo per:', user.username);
    res.json(response);
  } catch (error) {
    console.error('❌ [SERVER LOGIN] Errore:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp
    });
    res.status(500).json({
      success: false,
      message: 'Errore durante il login',
      error: error.message
    });
  }
});

// Verifica sessione corrente
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    await sql`
      DELETE FROM sessions WHERE token = ${req.headers['authorization'].split(' ')[1]}
    `;
    
    res.json({
      success: true,
      message: 'Logout completato con successo'
    });
  } catch (error) {
    console.error('Errore logout:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il logout',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT AUTENTICAZIONE ====================

// ==================== ENDPOINT CHAT ====================

// Ottieni tutte le chat dell'utente
app.get('/api/chat', authenticateToken, async (req, res) => {
  try {
    const chats = await sql`
      SELECT 
        c.id,
        c.title,
        c.project_id,
        c.created_at,
        c.updated_at,
        c.is_temporary,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'type', m.type,
              'content', m.content,
              'hidden', m.hidden,
              'timestamp', m.timestamp
            ) ORDER BY m.timestamp
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as messages
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.user_id = ${req.user.id}
        AND c.is_temporary = false
      GROUP BY c.id, c.title, c.project_id, c.created_at, c.updated_at, c.is_temporary
      ORDER BY c.updated_at DESC
    `;
    
    // Formatta le chat per il client
    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      projectId: chat.project_id,
      messages: chat.messages || [],
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      isTemporary: chat.is_temporary
    }));
    
    res.json({
      success: true,
      chats: formattedChats
    });
  } catch (error) {
    console.error('Errore recupero chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle chat',
      error: error.message
    });
  }
});

// Salva una chat
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { id, title, messages, projectId, isTemporary } = req.body;
    
    if (!id || !title) {
      return res.status(400).json({
        success: false,
        message: 'ID e titolo sono obbligatori'
      });
    }
    
    // Verifica se la chat esiste già
    const existingChat = await sql`
      SELECT id FROM chats WHERE id = ${id} AND user_id = ${req.user.id}
    `;
    
    if (existingChat.length > 0) {
      // Aggiorna la chat esistente
      await sql`
        UPDATE chats 
        SET title = ${title}, 
            project_id = ${projectId || null}, 
            is_temporary = ${isTemporary || false},
            updated_at = NOW()
        WHERE id = ${id} AND user_id = ${req.user.id}
      `;
    } else {
      // Crea una nuova chat
      await sql`
        INSERT INTO chats (id, user_id, title, project_id, is_temporary, updated_at)
        VALUES (${id}, ${req.user.id}, ${title}, ${projectId || null}, ${isTemporary || false}, NOW())
      `;
    }
    
    // Salva i messaggi
    if (messages && messages.length > 0) {
      // Elimina i messaggi esistenti per questa chat
      await sql`DELETE FROM messages WHERE chat_id = ${id}`;
      
      // Inserisci i nuovi messaggi
      for (const message of messages) {
        if (!message.hidden) { // Salva solo i messaggi non nascosti
          await sql`
            INSERT INTO messages (chat_id, type, content, hidden, timestamp)
            VALUES (${id}, ${message.type}, ${message.content}, ${message.hidden || false}, ${message.timestamp || new Date().toISOString()})
          `;
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Chat salvata con successo'
    });
  } catch (error) {
    console.error('Errore salvataggio chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio della chat',
      error: error.message
    });
  }
});

// Elimina una chat
app.delete('/api/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Verifica che la chat appartenga all'utente
    const chat = await sql`
      SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${req.user.id}
    `;
    
    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trovata'
      });
    }
    
    // Elimina la chat (i messaggi verranno eliminati automaticamente per CASCADE)
    await sql`DELETE FROM chats WHERE id = ${chatId}`;
    
    res.json({
      success: true,
      message: 'Chat eliminata con successo'
    });
  } catch (error) {
    console.error('Errore eliminazione chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione della chat',
      error: error.message
    });
  }
});

// Aggiorna una chat (titolo, progetto, ecc.)
app.patch('/api/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title, projectId } = req.body;
    
    // Verifica che la chat appartenga all'utente
    const chat = await sql`
      SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${req.user.id}
    `;
    
    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trovata'
      });
    }
    
    // Aggiorna la chat
    if (title !== undefined && projectId !== undefined) {
      await sql`
        UPDATE chats 
        SET title = ${title}, project_id = ${projectId}, updated_at = NOW()
        WHERE id = ${chatId}
      `;
    } else if (title !== undefined) {
      await sql`
        UPDATE chats 
        SET title = ${title}, updated_at = NOW()
        WHERE id = ${chatId}
      `;
    } else if (projectId !== undefined) {
      await sql`
        UPDATE chats 
        SET project_id = ${projectId}, updated_at = NOW()
        WHERE id = ${chatId}
      `;
    }
    
    res.json({
      success: true,
      message: 'Chat aggiornata con successo'
    });
  } catch (error) {
    console.error('Errore aggiornamento chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento della chat',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT CHAT ====================

// ==================== ENDPOINT IMPOSTAZIONI UTENTE ====================

// Ottieni le impostazioni dell'utente
app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await sql`
      SELECT * FROM user_settings WHERE user_id = ${req.user.id}
    `;
    
    if (settings.length === 0) {
      // Crea impostazioni di default se non esistono
      const defaultSettingsId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO user_settings (id, user_id)
        VALUES (${defaultSettingsId}, ${req.user.id})
      `;
      const newSettings = await sql`
        SELECT * FROM user_settings WHERE user_id = ${req.user.id}
      `;
      return res.json({
        success: true,
        settings: newSettings[0]
      });
    }
    
    res.json({
      success: true,
      settings: settings[0]
    });
  } catch (error) {
    console.error('Errore recupero impostazioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle impostazioni',
      error: error.message
    });
  }
});

// Aggiorna le impostazioni dell'utente
app.patch('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const { theme, language, ai_temperature, ai_max_tokens, ai_top_p, ai_frequency_penalty, ai_presence_penalty, default_model, notifications_enabled, email_notifications, auto_save_chats, settings_json } = req.body;
    
    // Verifica se le impostazioni esistono
    const existing = await sql`
      SELECT id FROM user_settings WHERE user_id = ${req.user.id}
    `;
    
    if (existing.length === 0) {
      // Crea impostazioni se non esistono
      const settingsId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO user_settings (
          id, user_id, theme, language, ai_temperature, ai_max_tokens, 
          ai_top_p, ai_frequency_penalty, ai_presence_penalty, default_model,
          notifications_enabled, email_notifications, auto_save_chats, settings_json
        )
        VALUES (
          ${settingsId}, ${req.user.id}, 
          ${theme || 'system'}, ${language || 'it'}, 
          ${ai_temperature || 0.7}, ${ai_max_tokens || 2000},
          ${ai_top_p || 1.0}, ${ai_frequency_penalty || 0.0}, 
          ${ai_presence_penalty || 0.0}, ${default_model || 'nebula-1.0'},
          ${notifications_enabled !== undefined ? notifications_enabled : true},
          ${email_notifications !== undefined ? email_notifications : false},
          ${auto_save_chats !== undefined ? auto_save_chats : true},
          ${settings_json ? JSON.stringify(settings_json) : null}
        )
      `;
    } else {
      // Aggiorna impostazioni esistenti - costruisci query dinamicamente
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (theme !== undefined) { updates.push(`theme = $${paramIndex++}`); values.push(theme); }
      if (language !== undefined) { updates.push(`language = $${paramIndex++}`); values.push(language); }
      if (ai_temperature !== undefined) { updates.push(`ai_temperature = $${paramIndex++}`); values.push(ai_temperature); }
      if (ai_max_tokens !== undefined) { updates.push(`ai_max_tokens = $${paramIndex++}`); values.push(ai_max_tokens); }
      if (ai_top_p !== undefined) { updates.push(`ai_top_p = $${paramIndex++}`); values.push(ai_top_p); }
      if (ai_frequency_penalty !== undefined) { updates.push(`ai_frequency_penalty = $${paramIndex++}`); values.push(ai_frequency_penalty); }
      if (ai_presence_penalty !== undefined) { updates.push(`ai_presence_penalty = $${paramIndex++}`); values.push(ai_presence_penalty); }
      if (default_model !== undefined) { updates.push(`default_model = $${paramIndex++}`); values.push(default_model); }
      if (notifications_enabled !== undefined) { updates.push(`notifications_enabled = $${paramIndex++}`); values.push(notifications_enabled); }
      if (email_notifications !== undefined) { updates.push(`email_notifications = $${paramIndex++}`); values.push(email_notifications); }
      if (auto_save_chats !== undefined) { updates.push(`auto_save_chats = $${paramIndex++}`); values.push(auto_save_chats); }
      if (settings_json !== undefined) { updates.push(`settings_json = $${paramIndex++}`); values.push(JSON.stringify(settings_json)); }
      
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(req.user.id);
        const query = `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`;
        await sql.unsafe(query, values);
      }
    }
    
    // Restituisci le impostazioni aggiornate
    const updated = await sql`
      SELECT * FROM user_settings WHERE user_id = ${req.user.id}
    `;
    
    res.json({
      success: true,
      settings: updated[0]
    });
  } catch (error) {
    console.error('Errore aggiornamento impostazioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento delle impostazioni',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT IMPOSTAZIONI UTENTE ====================

// ==================== ENDPOINT ABBONAMENTI ====================

// Ottieni l'abbonamento corrente dell'utente
app.get('/api/user/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${req.user.id} 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (subscription.length === 0) {
      // Crea abbonamento gratuito di default
      const freeSubscriptionId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO subscriptions (id, user_id, plan, status, started_at)
        VALUES (${freeSubscriptionId}, ${req.user.id}, 'free', 'active', NOW())
      `;
      const newSubscription = await sql`
        SELECT * FROM subscriptions WHERE id = ${freeSubscriptionId}
      `;
      return res.json({
        success: true,
        subscription: newSubscription[0]
      });
    }
    
    res.json({
      success: true,
      subscription: subscription[0]
    });
  } catch (error) {
    console.error('Errore recupero abbonamento:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dell\'abbonamento',
      error: error.message
    });
  }
});

// Crea o aggiorna un abbonamento
app.post('/api/user/subscription', authenticateToken, async (req, res) => {
  try {
    const { plan, billingCycle, amount, currency, paymentMethod, paymentId, expiresAt } = req.body;
    
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Piano obbligatorio'
      });
    }
    
    // Disattiva abbonamenti precedenti
    await sql`
      UPDATE subscriptions 
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE user_id = ${req.user.id} AND status = 'active'
    `;
    
    // Crea nuovo abbonamento
    const subscriptionId = randomBytes(16).toString('hex');
    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    
    await sql`
      INSERT INTO subscriptions (
        id, user_id, plan, status, billing_cycle, 
        amount, currency, payment_method, payment_id, expires_at
      )
      VALUES (
        ${subscriptionId}, ${req.user.id}, ${plan}, 'active',
        ${billingCycle || 'monthly'}, ${amount || 0}, 
        ${currency || 'EUR'}, ${paymentMethod || null}, 
        ${paymentId || null}, ${expiresDate}
      )
    `;
    
    // Crea record di pagamento se fornito
    if (amount && amount > 0) {
      const paymentRecordId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO payments (
          id, subscription_id, user_id, amount, currency,
          status, payment_method, payment_provider, transaction_id, paid_at
        )
        VALUES (
          ${paymentRecordId}, ${subscriptionId}, ${req.user.id},
          ${amount}, ${currency || 'EUR'}, 'completed',
          ${paymentMethod || null}, 'stripe', ${paymentId || null}, NOW()
        )
      `;
    }
    
    const newSubscription = await sql`
      SELECT * FROM subscriptions WHERE id = ${subscriptionId}
    `;
    
    res.json({
      success: true,
      subscription: newSubscription[0]
    });
  } catch (error) {
    console.error('Errore creazione abbonamento:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione dell\'abbonamento',
      error: error.message
    });
  }
});

// Cancella un abbonamento
app.delete('/api/user/subscription/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    await sql`
      UPDATE subscriptions 
      SET status = 'cancelled', cancelled_at = NOW(), auto_renew = false
      WHERE id = ${subscriptionId} AND user_id = ${req.user.id}
    `;
    
    res.json({
      success: true,
      message: 'Abbonamento cancellato con successo'
    });
  } catch (error) {
    console.error('Errore cancellazione abbonamento:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella cancellazione dell\'abbonamento',
      error: error.message
    });
  }
});

// Ottieni lo storico pagamenti
app.get('/api/user/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await sql`
      SELECT p.*, s.plan, s.billing_cycle
      FROM payments p
      JOIN subscriptions s ON p.subscription_id = s.id
      WHERE p.user_id = ${req.user.id}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    
    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Errore recupero pagamenti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei pagamenti',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT ABBONAMENTI ====================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Server API avviato su http://localhost:${PORT}`);
  console.log(`📅 Data avvio: ${new Date().toISOString()}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${connectionString ? '✅ Configurato' : '❌ Non configurato'}`);
  console.log('='.repeat(60));
  console.log(`\n📊 Endpoint disponibili:`);
  console.log(`   GET  /api/db/test - Test connessione`);
  console.log(`   GET  /api/db/info - Informazioni database`);
  console.log(`   POST /api/db/query - Esegui query SELECT`);
  console.log(`   POST /api/auth/register - Registrazione`);
  console.log(`   POST /api/auth/login - Login`);
  console.log(`   GET  /api/auth/me - Verifica sessione`);
  console.log(`   POST /api/auth/logout - Logout`);
  console.log(`   GET  /api/chat - Ottieni chat utente`);
  console.log(`   POST /api/chat - Salva chat`);
  console.log(`   DELETE /api/chat/:id - Elimina chat`);
  console.log(`   PATCH /api/chat/:id - Aggiorna chat`);
  console.log(`   GET  /api/user/settings - Ottieni impostazioni utente`);
  console.log(`   PATCH /api/user/settings - Aggiorna impostazioni utente`);
  console.log(`   GET  /api/user/subscription - Ottieni abbonamento utente`);
  console.log(`   POST /api/user/subscription - Crea/aggiorna abbonamento`);
  console.log(`   DELETE /api/user/subscription/:id - Cancella abbonamento`);
  console.log(`   GET  /api/user/payments - Ottieni storico pagamenti`);
  console.log('\n' + '='.repeat(60));
  console.log('✅ Server pronto a ricevere richieste\n');
});

