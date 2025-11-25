// API Route per gestire le chat su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

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

