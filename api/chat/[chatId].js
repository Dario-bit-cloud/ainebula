// API Route per gestire singole chat (DELETE, PATCH) su Vercel
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

  // Per Vercel, i parametri dinamici sono in req.query
  // Il nome del file [chatId].js diventa un parametro query
  const chatId = req.query.chatId || req.query.id;

  try {
    // DELETE - Elimina una chat
    if (req.method === 'DELETE') {
      // Verifica che la chat appartenga all'utente
      const chat = await sql`
        SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${user.user_id}
      `;
      
      if (chat.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Chat non trovata'
        });
      }
      
      // Elimina la chat (i messaggi verranno eliminati automaticamente per CASCADE)
      await sql`DELETE FROM chats WHERE id = ${chatId}`;
      
      return res.json({
        success: true,
        message: 'Chat eliminata con successo'
      });
    }

    // PATCH - Aggiorna una chat
    if (req.method === 'PATCH') {
      const { title, projectId } = req.body;
      
      // Verifica che la chat appartenga all'utente
      const chat = await sql`
        SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${user.user_id}
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
      
      return res.json({
        success: true,
        message: 'Chat aggiornata con successo'
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

