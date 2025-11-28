// API Route per gestire le chat su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

// Flag per evitare creazioni multiple simultanee
let isInitializing = false;
let isInitialized = false;

// Limite nascosto di 50MB per la cronologia chat per utente
const MAX_CHAT_HISTORY_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Applica il limite di 50MB alla cronologia chat dell'utente
 * Rimuove automaticamente i messaggi più vecchi se il limite viene superato
 */
async function enforceChatHistoryLimit(userId) {
  try {
    // Calcola la dimensione totale dei messaggi per l'utente
    const sizeResult = await sql`
      SELECT COALESCE(SUM(octet_length(content)), 0) as total_size
      FROM messages m
      INNER JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = ${userId}
    `;
    
    const totalSize = parseInt(sizeResult[0]?.total_size || 0);
    
    // Se la dimensione supera il limite, rimuovi i messaggi più vecchi
    if (totalSize > MAX_CHAT_HISTORY_SIZE) {
      console.log(`⚠️ [CHAT LIMIT] Utente ${userId} ha superato il limite: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Ottieni i messaggi ordinati per timestamp (più vecchi prima)
      const messagesToDelete = await sql`
        SELECT m.id, m.chat_id, octet_length(m.content) as size
        FROM messages m
        INNER JOIN chats c ON m.chat_id = c.id
        WHERE c.user_id = ${userId}
        ORDER BY m.timestamp ASC, m.id ASC
      `;
      
      let currentSize = totalSize;
      let deletedCount = 0;
      
      // Elimina i messaggi più vecchi fino a scendere sotto il limite
      for (const msg of messagesToDelete) {
        if (currentSize <= MAX_CHAT_HISTORY_SIZE) {
          break;
        }
        
        await sql`DELETE FROM messages WHERE id = ${msg.id}`;
        currentSize -= parseInt(msg.size || 0);
        deletedCount++;
      }
      
      // Se una chat rimane senza messaggi, elimina anche la chat
      await sql`
        DELETE FROM chats c
        WHERE c.user_id = ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM messages m WHERE m.chat_id = c.id
        )
      `;
      
      console.log(`✅ [CHAT LIMIT] Rimossi ${deletedCount} messaggi vecchi. Nuova dimensione: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('❌ [CHAT LIMIT] Errore nell\'applicazione del limite:', error);
    // Non bloccare il salvataggio se c'è un errore nel controllo del limite
  }
}

// Funzione per inizializzare automaticamente le tabelle
async function ensureTablesExist() {
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
    // Verifica se la tabella chats esiste
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chats'
      )
    `;
    
    if (!tableCheck[0].exists) {
      console.log('🔧 [CHAT API] Creazione tabelle database...');
      
      // Crea tabella chats
      await sql`
        CREATE TABLE IF NOT EXISTS chats (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          project_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_temporary BOOLEAN DEFAULT FALSE
        )
      `;
      
      // Crea tabella messages
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          chat_id VARCHAR(255) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          hidden BOOLEAN DEFAULT FALSE,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Crea indici
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)`;
      
      // Crea funzione e trigger per updated_at
      await sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `;
      
      await sql`DROP TRIGGER IF EXISTS update_chats_updated_at ON chats`;
      await sql`
        CREATE TRIGGER update_chats_updated_at 
        BEFORE UPDATE ON chats
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `;
      
      console.log('✅ [CHAT API] Tabelle create con successo');
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ [CHAT API] Errore creazione tabelle:', error);
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
  const tablesReady = await ensureTablesExist();
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
    // GET - Ottieni tutte le chat dell'utente
    if (req.method === 'GET') {
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
        WHERE c.user_id = ${user.user_id}
          AND c.is_temporary = false
        GROUP BY c.id, c.title, c.project_id, c.created_at, c.updated_at, c.is_temporary
        ORDER BY c.updated_at DESC
      `;
      
      const formattedChats = chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        projectId: chat.project_id,
        messages: chat.messages || [],
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        isTemporary: chat.is_temporary
      }));
      
      return res.json({
        success: true,
        chats: formattedChats
      });
    }

    // POST - Salva una chat
    if (req.method === 'POST') {
      const { id, title, messages, projectId, isTemporary } = req.body;
      
      if (!id || !title) {
        return res.status(400).json({
          success: false,
          message: 'ID e titolo sono obbligatori'
        });
      }
      
      // Verifica se la chat esiste già
      const existingChat = await sql`
        SELECT id FROM chats WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      if (existingChat.length > 0) {
        // Aggiorna la chat esistente
        await sql`
          UPDATE chats 
          SET title = ${title}, 
              project_id = ${projectId || null}, 
              is_temporary = ${isTemporary || false},
              updated_at = NOW()
          WHERE id = ${id} AND user_id = ${user.user_id}
        `;
      } else {
        // Crea una nuova chat
        await sql`
          INSERT INTO chats (id, user_id, title, project_id, is_temporary, updated_at)
          VALUES (${id}, ${user.user_id}, ${title}, ${projectId || null}, ${isTemporary || false}, NOW())
        `;
      }
      
      // Salva i messaggi
      if (messages && messages.length > 0) {
        // Elimina i messaggi esistenti per questa chat
        await sql`DELETE FROM messages WHERE chat_id = ${id}`;
        
        // Inserisci i nuovi messaggi
        for (const message of messages) {
          if (!message.hidden) {
            await sql`
              INSERT INTO messages (chat_id, type, content, hidden, timestamp)
              VALUES (${id}, ${message.type}, ${message.content}, ${message.hidden || false}, ${message.timestamp || new Date().toISOString()})
            `;
          }
        }
      }
      
      // Applica limite di 50MB per utente (nascosto)
      await enforceChatHistoryLimit(user.user_id);
      
      return res.json({
        success: true,
        message: 'Chat salvata con successo'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [VERCEL CHAT] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel server',
      error: error.message
    });
  }
}

