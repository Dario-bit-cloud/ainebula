// API Route per gestire i link condivisi su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

// Flag per evitare creazioni multiple simultanee
let isInitializing = false;
let isInitialized = false;

// Funzione per inizializzare automaticamente le tabelle
async function ensureSharedLinksTable() {
  if (isInitialized) return true;
  if (isInitializing) {
    // Aspetta che l'inizializzazione finisca
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isInitialized;
  }
  
  isInitializing = true;
  
  try {
    // Verifica se la tabella shared_links esiste
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shared_links'
      )
    `;
    
    if (!tableCheck[0].exists) {
      console.log('🔧 [SHARED LINKS API] Creazione tabella database...');
      
      // Crea tabella shared_links
      await sql`
        CREATE TABLE IF NOT EXISTS shared_links (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          chat_id VARCHAR(255) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          share_token VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(500),
          expires_at TIMESTAMP WITH TIME ZONE,
          access_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Crea indici
      await sql`CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_shared_links_chat_id ON shared_links(chat_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(share_token)`;
      
      console.log('✅ [SHARED LINKS API] Tabella creata con successo');
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ [SHARED LINKS API] Errore creazione tabella:', error);
    isInitializing = false;
    return false;
  } finally {
    isInitializing = false;
  }
}

// Middleware per verificare autenticazione
async function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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
    
    return { user: sessions[0] };
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

  // Assicurati che le tabelle esistano (automatico)
  const tablesReady = await ensureSharedLinksTable();
  if (!tablesReady) {
    return res.status(500).json({
      success: false,
      message: 'Errore inizializzazione database'
    });
  }

  // Verifica autenticazione
  const auth = await authenticateToken(req);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, message: auth.error });
  }
  const user = auth.user;

  try {
    // GET - Ottieni tutti i link condivisi dell'utente
    if (req.method === 'GET') {
      const links = await sql`
        SELECT 
          sl.id,
          sl.chat_id,
          sl.share_token,
          sl.title,
          sl.expires_at,
          sl.access_count,
          sl.is_active,
          sl.created_at,
          c.title as chat_title
        FROM shared_links sl
        JOIN chats c ON sl.chat_id = c.id
        WHERE sl.user_id = ${user.user_id}
        ORDER BY sl.created_at DESC
      `;
      
      const baseUrl = req.headers['x-forwarded-proto'] 
        ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host'] || req.headers.host}`
        : `${req.protocol || 'https'}://${req.headers.host}`;
      
      return res.json({
        success: true,
        links: links.map(link => ({
          id: link.id,
          chatId: link.chat_id,
          shareToken: link.share_token,
          title: link.title || link.chat_title,
          expiresAt: link.expires_at,
          accessCount: link.access_count,
          isActive: link.is_active,
          createdAt: link.created_at,
          chatTitle: link.chat_title,
          shareUrl: `${baseUrl}/shared/${link.share_token}`
        }))
      });
    }

    // POST - Crea un nuovo link condiviso
    if (req.method === 'POST') {
      const { chatId, title } = req.body;
      
      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: 'Chat ID obbligatorio'
        });
      }
      
      // Verifica che la chat appartenga all'utente
      const chat = await sql`
        SELECT id, title FROM chats WHERE id = ${chatId} AND user_id = ${user.user_id}
      `;
      
      if (chat.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Chat non trovata'
        });
      }
      
      // Genera token unico
      const shareToken = randomBytes(32).toString('hex');
      const linkId = randomBytes(16).toString('hex');
      
      // Calcola data di scadenza - sempre 50 giorni dalla condivisione
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 50);
      
      await sql`
        INSERT INTO shared_links (
          id, user_id, chat_id, share_token, title, expires_at
        )
        VALUES (
          ${linkId}, ${user.user_id}, ${chatId}, ${shareToken},
          ${title || chat[0].title}, ${expiresAt.toISOString()}
        )
      `;
      
      const baseUrl = req.headers['x-forwarded-proto'] 
        ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host'] || req.headers.host}`
        : `${req.protocol || 'https'}://${req.headers.host}`;
      
      return res.json({
        success: true,
        link: {
          id: linkId,
          chatId,
          shareToken,
          title: title || chat[0].title,
          expiresAt: expiresAt.toISOString(),
          shareUrl: `${baseUrl}/shared/${shareToken}`
        }
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [SHARED LINKS API] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel server',
      error: error.message
    });
  }
}

