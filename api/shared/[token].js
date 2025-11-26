// API Route per accedere a una chat condivisa tramite token (pubblico, non richiede autenticazione)
import { neon } from '@neondatabase/serverless';

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
      console.log('🔧 [SHARED API] Creazione tabella database...');
      
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
      
      console.log('✅ [SHARED API] Tabella creata con successo');
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ [SHARED API] Errore creazione tabella:', error);
    isInitializing = false;
    return false;
  } finally {
    isInitializing = false;
  }
}

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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

  // Per Vercel, i parametri dinamici sono in req.query
  // Il nome del file [token].js diventa un parametro query
  const token = req.query.token;

  try {
    // GET - Ottieni una chat condivisa tramite token (pubblico, non richiede autenticazione)
    if (req.method === 'GET') {
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token non fornito'
        });
      }

      const link = await sql`
        SELECT 
          sl.*,
          c.title as chat_title,
          c.id as chat_id
        FROM shared_links sl
        JOIN chats c ON sl.chat_id = c.id
        WHERE sl.share_token = ${token}
          AND sl.is_active = TRUE
          AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
      `;
      
      if (link.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Link non valido o scaduto'
        });
      }
      
      // Incrementa contatore accessi
      await sql`
        UPDATE shared_links 
        SET access_count = access_count + 1
        WHERE id = ${link[0].id}
      `;
      
      // Ottieni i messaggi della chat
      const messages = await sql`
        SELECT id, type, content, hidden, timestamp
        FROM messages
        WHERE chat_id = ${link[0].chat_id}
          AND hidden = FALSE
        ORDER BY timestamp ASC
      `;
      
      return res.json({
        success: true,
        chat: {
          id: link[0].chat_id,
          title: link[0].title || link[0].chat_title,
          messages: messages.map(m => ({
            id: m.id,
            type: m.type,
            content: m.content,
            timestamp: m.timestamp
          }))
        }
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [SHARED API] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel server',
      error: error.message
    });
  }
}

