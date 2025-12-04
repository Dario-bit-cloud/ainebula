// API Route per gestire il backup delle chat su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Connessione al database PostgreSQL Neon
const connectionString = process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  console.error('❌ Connection string PostgreSQL non trovata!');
  throw new Error('Connection string PostgreSQL non trovata. Configura DATABASE_URL (Neon)');
}

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

// Assicura che la tabella chat_backups esista
async function ensureBackupTableExists() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS chat_backups (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        backup_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `;
    
    // Crea indice per migliorare le performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_backups_user_id ON chat_backups(user_id);
    `;
    
    return true;
  } catch (error) {
    console.error('❌ [BACKUP API] Errore creazione tabella backup:', error);
    return false;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsPreflight(req, res)) {
    return;
  }

  // Assicurati che la tabella esista
  const tableReady = await ensureBackupTableExists();
  if (!tableReady) {
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
    // GET - Carica l'ultimo backup dell'utente
    if (req.method === 'GET') {
      console.log('📥 [BACKUP API] Caricamento backup per user_id:', user.user_id);
      
      const backup = await sql`
        SELECT backup_data, created_at, updated_at
        FROM chat_backups
        WHERE user_id = ${user.user_id}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      
      if (backup.length === 0) {
        console.log('ℹ️ [BACKUP API] Nessun backup trovato per user_id:', user.user_id);
        return res.status(404).json({
          success: false,
          message: 'Nessun backup disponibile',
          backup: null
        });
      }
      
      const backupData = backup[0].backup_data;
      console.log('✅ [BACKUP API] Backup caricato:', {
        chatsCount: backupData?.chats?.length || 0,
        timestamp: backupData?.metadata?.timestamp
      });
      
      return res.json({
        success: true,
        backup: backupData,
        metadata: {
          created_at: backup[0].created_at,
          updated_at: backup[0].updated_at
        }
      });
    }

    // POST - Salva un nuovo backup
    if (req.method === 'POST') {
      const { metadata, chats } = req.body;
      
      console.log('💾 [BACKUP API] Salvataggio backup:', {
        userId: user.user_id,
        chatsCount: chats?.length || 0,
        timestamp: metadata?.timestamp
      });
      
      if (!chats || !Array.isArray(chats)) {
        return res.status(400).json({
          success: false,
          message: 'Dati backup non validi: chats è obbligatorio e deve essere un array'
        });
      }
      
      // Prepara il backup completo
      const backupData = {
        metadata: {
          ...metadata,
          timestamp: metadata?.timestamp || new Date().toISOString(),
          version: metadata?.version || '1.0.0'
        },
        chats: chats
      };
      
      // Verifica se esiste già un backup per questo utente
      const existingBackup = await sql`
        SELECT id FROM chat_backups WHERE user_id = ${user.user_id}
      `;
      
      if (existingBackup.length > 0) {
        // Aggiorna il backup esistente
        await sql`
          UPDATE chat_backups
          SET backup_data = ${JSON.stringify(backupData)}::jsonb,
              updated_at = NOW()
          WHERE user_id = ${user.user_id}
        `;
        console.log('✅ [BACKUP API] Backup aggiornato');
      } else {
        // Crea un nuovo backup
        await sql`
          INSERT INTO chat_backups (user_id, backup_data)
          VALUES (${user.user_id}, ${JSON.stringify(backupData)}::jsonb)
        `;
        console.log('✅ [BACKUP API] Backup creato');
      }
      
      return res.json({
        success: true,
        message: 'Backup salvato con successo',
        metadata: {
          chatsCount: chats.length,
          timestamp: backupData.metadata.timestamp
        }
      });
    }

    // DELETE - Elimina il backup dell'utente
    if (req.method === 'DELETE') {
      console.log('🗑️ [BACKUP API] Eliminazione backup per user_id:', user.user_id);
      
      await sql`
        DELETE FROM chat_backups WHERE user_id = ${user.user_id}
      `;
      
      return res.json({
        success: true,
        message: 'Backup eliminato con successo'
      });
    }

    // Metodo non supportato
    return res.status(405).json({
      success: false,
      message: 'Metodo non supportato'
    });
  } catch (error) {
    console.error('❌ [BACKUP API] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
}

