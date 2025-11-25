// API Route per aggiornare il numero di telefono su Vercel
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

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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
      SELECT s.*, u.id as user_id, u.is_active
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

    // Ottieni il numero di telefono dal body
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
  } catch (error) {
    console.error('✗ Errore durante aggiornamento numero di telefono:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del numero di telefono',
      error: error.message
    });
  }
}

