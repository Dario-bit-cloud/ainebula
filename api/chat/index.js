// API Route per gestire le chat su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Connessione al database PostgreSQL Neon
// Priorità: DATABASE_URL (con pooling) > DATABASE_URL_UNPOOLED (senza pooling)
const connectionString = process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  console.error('❌ Connection string PostgreSQL non trovata!');
  console.error('Configura una di queste variabili d\'ambiente:');
  console.error('  - DATABASE_URL (Neon con pooling)');
  console.error('  - DATABASE_URL_UNPOOLED (Neon senza pooling)');
  throw new Error('Connection string PostgreSQL non trovata. Configura DATABASE_URL (Neon)');
}

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
    console.warn('⚠️ [CHAT API] Token non fornito');
    return { error: 'Token non fornito', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔐 [CHAT API] Token JWT verificato:', {
      userId: decoded.userId || decoded.id,
      hasToken: !!token
    });
    
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;
    
    if (sessions.length === 0) {
      console.warn('⚠️ [CHAT API] Sessione non trovata o scaduta per token:', token.substring(0, 20) + '...');
      return { error: 'Sessione non valida', status: 401 };
    }
    
    const user = sessions[0];
    console.log('✅ [CHAT API] Autenticazione riuscita:', {
      userId: user.user_id,
      username: user.username,
      email: user.email
    });
    
    return { user };
  } catch (error) {
    console.error('❌ [CHAT API] Errore verifica token:', error.message);
    return { error: 'Token non valido', status: 403 };
  }
}

import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsPreflight(req, res)) {
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
      console.log('📥 [CHAT API] Caricamento chat per user_id:', user.user_id);
      
      // Prima verifica che l'utente esista e abbia chat
      const userCheck = await sql`
        SELECT id FROM users WHERE id = ${user.user_id}
      `;
      
      if (userCheck.length === 0) {
        console.error('❌ [CHAT API] Utente non trovato:', user.user_id);
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      
      // Conta le chat dell'utente per debug
      const chatCount = await sql`
        SELECT COUNT(*) as count FROM chats 
        WHERE user_id = ${user.user_id} AND is_temporary = false
      `;
      console.log('📊 [CHAT API] Numero di chat trovate:', chatCount[0]?.count || 0);
      
      // Query ottimizzata: carica solo i metadati delle chat (lazy loading messaggi)
      // I messaggi verranno caricati on-demand quando si apre una chat
      const chats = await sql`
        SELECT 
          c.id,
          c.title,
          c.project_id,
          c.created_at,
          c.updated_at,
          c.is_temporary,
          (
            SELECT COUNT(*)::int
            FROM messages m
            WHERE m.chat_id = c.id AND COALESCE(m.hidden, false) = false
          ) as message_count
        FROM chats c
        WHERE c.user_id = ${user.user_id}
          AND c.is_temporary = false
        ORDER BY c.updated_at DESC NULLS LAST
        LIMIT 100
      `;
      
      console.log('✅ [CHAT API] Chat caricate dal database:', chats.length);
      
      // Formatta le chat per il frontend (senza messaggi per performance)
      const formattedChats = chats.map(chat => {
        return {
          id: chat.id,
          title: chat.title || 'Nuova chat',
          projectId: chat.project_id || null,
          messages: [], // Messaggi caricati lazy on-demand
          messageCount: chat.message_count || 0,
          createdAt: chat.created_at ? new Date(chat.created_at).toISOString() : new Date().toISOString(),
          updatedAt: chat.updated_at ? new Date(chat.updated_at).toISOString() : new Date().toISOString(),
          isTemporary: chat.is_temporary || false
        };
      });
      
      console.log('✅ [CHAT API] Chat formattate:', formattedChats.length);
      
      return res.json({
        success: true,
        chats: formattedChats
      });
    }

    // POST - Salva una chat
    if (req.method === 'POST') {
      const { id, title, messages, projectId, isTemporary } = req.body;
      
      console.log('💾 [CHAT API] Salvataggio chat:', {
        chatId: id,
        userId: user.user_id,
        title: title?.substring(0, 50),
        messagesCount: messages?.length || 0,
        isTemporary: isTemporary || false
      });
      
      if (!id || !title) {
        console.error('❌ [CHAT API] ID o titolo mancanti:', { id, title });
        return res.status(400).json({
          success: false,
          message: 'ID e titolo sono obbligatori'
        });
      }
      
      // Verifica che l'utente esista
      const userCheck = await sql`
        SELECT id FROM users WHERE id = ${user.user_id}
      `;
      
      if (userCheck.length === 0) {
        console.error('❌ [CHAT API] Utente non trovato durante salvataggio:', user.user_id);
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      
      // Verifica se la chat esiste già
      const existingChat = await sql`
        SELECT id, user_id FROM chats WHERE id = ${id}
      `;
      
      if (existingChat.length > 0) {
        // Verifica che la chat appartenga all'utente
        if (existingChat[0].user_id !== user.user_id) {
          console.error('❌ [CHAT API] Tentativo di modificare chat di altro utente:', {
            chatId: id,
            chatUserId: existingChat[0].user_id,
            currentUserId: user.user_id
          });
          return res.status(403).json({
            success: false,
            message: 'Non autorizzato a modificare questa chat'
          });
        }
        
        // Aggiorna la chat esistente
        console.log('🔄 [CHAT API] Aggiornamento chat esistente:', id);
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
        console.log('✨ [CHAT API] Creazione nuova chat:', id);
        try {
          await sql`
            INSERT INTO chats (id, user_id, title, project_id, is_temporary, created_at, updated_at)
            VALUES (${id}, ${user.user_id}, ${title}, ${projectId || null}, ${isTemporary || false}, NOW(), NOW())
          `;
          console.log('✅ [CHAT API] Chat creata con successo:', id);
        } catch (insertError) {
          console.error('❌ [CHAT API] Errore creazione chat:', insertError);
          // Se l'errore è dovuto a un duplicato, prova ad aggiornare
          if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
            console.log('🔄 [CHAT API] Chat già esistente, aggiorno:', id);
            await sql`
              UPDATE chats 
              SET title = ${title}, 
                  project_id = ${projectId || null}, 
                  is_temporary = ${isTemporary || false},
                  updated_at = NOW()
              WHERE id = ${id} AND user_id = ${user.user_id}
            `;
          } else {
            throw insertError;
          }
        }
      }
      
      // Salva i messaggi
      if (messages && Array.isArray(messages) && messages.length > 0) {
        console.log('💬 [CHAT API] Salvataggio messaggi:', messages.length);
        
        // Elimina i messaggi esistenti per questa chat
        await sql`DELETE FROM messages WHERE chat_id = ${id}`;
        
        // Filtra solo i messaggi non nascosti
        const visibleMessages = messages.filter(msg => !msg.hidden);
        console.log('💬 [CHAT API] Messaggi visibili da salvare:', visibleMessages.length);
        
        // Batch insert ottimizzato: inserisci tutti i messaggi in parallelo (chunked)
        if (visibleMessages.length > 0) {
          // Usa chunk di 200 per bilanciare performance e memoria
          const chunkSize = 200;
          const chunks = [];
          for (let i = 0; i < visibleMessages.length; i += chunkSize) {
            chunks.push(visibleMessages.slice(i, i + chunkSize));
          }
          
          // Esegui tutti i chunk in parallelo per massima velocità
          await Promise.all(chunks.map(chunk => 
            Promise.all(chunk.map(msg => {
              const timestamp = msg.timestamp 
                ? (msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp)
                : new Date().toISOString();
              
              return sql`
                INSERT INTO messages (chat_id, type, content, hidden, timestamp)
                VALUES (${id}, ${msg.type || 'user'}, ${msg.content || ''}, ${msg.hidden || false}, ${timestamp})
              `;
            }))
          ));
          
          console.log('✅ [CHAT API] Messaggi salvati con successo (batch parallelo):', visibleMessages.length);
        }
      }
      
      // Applica limite di 50MB per utente (nascosto)
      await enforceChatHistoryLimit(user.user_id);
      
      console.log('✅ [CHAT API] Chat salvata con successo:', id);
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

