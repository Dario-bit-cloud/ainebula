// API Route per eliminare l'account su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

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

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token non fornito' });
    }

    // Verifica il token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(403).json({ success: false, message: 'Token non valido' });
    }

    // Verifica che la sessione esista nel database e ottieni l'user_id
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

    const userId = sessions[0].user_id;

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
  } catch (error) {
    console.error('❌ Errore durante eliminazione account:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione dell\'account',
      error: error.message
    });
  }
}

