// API Route per registrazione su Vercel
// Questo file viene deployato come serverless function su Vercel

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

// Inizializza la connessione al database solo se DATABASE_URL è disponibile
function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const timestamp = new Date().toISOString();
  console.log('\n📝 [VERCEL REGISTER] Richiesta ricevuta:', {
    timestamp,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });

  try {
    // Inizializza la connessione al database
    const sql = getDatabaseConnection();
    
    const { username, password, referralCode } = req.body;

    console.log('📥 [VERCEL REGISTER] Body ricevuto:', {
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING',
      referralCode: referralCode || 'NONE'
    });

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
    const email = `${username.toLowerCase()}@nebula.local`;

    // Genera un codice referral per il nuovo utente
    function generateReferralCode() {
      return randomBytes(8).toString('hex');
    }
    
    let userReferralCode = generateReferralCode();
    let codeExists = true;
    while (codeExists) {
      const existing = await sql`
        SELECT id FROM users WHERE referral_code = ${userReferralCode}
      `;
      if (existing.length === 0) {
        codeExists = false;
      } else {
        userReferralCode = generateReferralCode();
      }
    }

    // Crea l'utente
    await sql`
      INSERT INTO users (id, email, username, password_hash, referral_code)
      VALUES (${userId}, ${email}, ${username.toLowerCase()}, ${passwordHash}, ${userReferralCode})
    `;

    // Gestisci il referral se presente
    if (referralCode) {
      try {
        // Trova il referrer
        const [referrer] = await sql`
          SELECT id FROM users WHERE referral_code = ${referralCode}
        `;

        if (referrer && referrer.id !== userId) {
          // Crea il record referral
          const referralId = randomBytes(16).toString('hex');
          await sql`
            INSERT INTO referrals (id, referrer_id, referred_id, referral_code, status)
            VALUES (${referralId}, ${referrer.id}, ${userId}, ${referralCode}, 'completed')
          `;

          // Verifica se il referrer ha già raggiunto il massimo guadagnabile
          const [earningsCheck] = await sql`
            SELECT 
              COALESCE(SUM(CASE WHEN re.status IN ('available', 'withdrawn') THEN re.amount ELSE 0 END), 0) as total_earnings
            FROM referral_earnings re
            WHERE re.user_id = ${referrer.id}
          `;

          const totalEarnings = parseFloat(earningsCheck?.total_earnings || 0);
          const REFERRAL_REWARD = 20.00;
          const MAX_EARNINGS = 500.00;

          // Crea il guadagno solo se non ha raggiunto il massimo
          if (totalEarnings < MAX_EARNINGS) {
            const earningId = randomBytes(16).toString('hex');
            const rewardAmount = Math.min(REFERRAL_REWARD, MAX_EARNINGS - totalEarnings);
            
            await sql`
              INSERT INTO referral_earnings (id, user_id, referral_id, amount, status)
              VALUES (${earningId}, ${referrer.id}, ${referralId}, ${rewardAmount}, 'available')
            `;

            console.log(`✅ [REFERRAL] Guadagno di €${rewardAmount.toFixed(2)} creato per referrer ${referrer.id}`);
          } else {
            console.log(`⚠️ [REFERRAL] Referrer ${referrer.id} ha già raggiunto il massimo guadagnabile`);
          }
        }
      } catch (refError) {
        console.error('❌ [REFERRAL] Errore durante la gestione del referral:', refError);
        // Non bloccare la registrazione se il referral fallisce
      }
    }

    // Crea sessione
    const sessionToken = jwt.sign({ userId, email, username: username.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, ${req.headers['user-agent']})
    `;

    // Aggiorna last_login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${userId}
    `;

    // Imposta il cookie HTTP per mantenere la sessione
    // Per Vercel API routes, usiamo setHeader invece di res.cookie()
    const maxAge = SESSION_DURATION / 1000; // Durata in secondi (7 giorni)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieParts = [
      `auth_token=${sessionToken}`,
      `Max-Age=${maxAge}`,
      `Path=/`,
      `SameSite=Lax`,
      isProduction ? 'Secure' : '',
      'HttpOnly'
    ].filter(Boolean); // Rimuove stringhe vuote
    
    res.setHeader('Set-Cookie', cookieParts.join('; '));
    
    console.log('🍪 [VERCEL REGISTER] Cookie impostato');

    console.log('✅ [VERCEL REGISTER] Registrazione completata per:', username.toLowerCase());

    res.json({
      success: true,
      message: 'Registrazione completata con successo',
      user: {
        id: userId,
        username: username.toLowerCase()
      },
      token: sessionToken
    });
  } catch (error) {
    console.error('❌ [VERCEL REGISTER] Errore:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Assicurati che la risposta sia sempre JSON valido
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Errore durante la registrazione',
        error: error.message || 'Unknown error'
      });
    }
  }
}

