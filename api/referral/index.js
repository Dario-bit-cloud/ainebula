// API Route per gestire i referral
// Endpoint: /api/referral

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

// Costanti per il sistema referral
const REFERRAL_REWARD = 20.00; // €20 per ogni referral
const MIN_WITHDRAWAL = 200.00; // €200 minimo per ritirare
const MAX_EARNINGS = 500.00; // €500 massimo guadagnabile

// Funzione per verificare il token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Genera un codice referral unico
function generateReferralCode() {
  return randomBytes(8).toString('hex');
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

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Non autenticato' });
  }

  try {
    // GET /api/referral - Ottieni link referral e statistiche
    if (req.method === 'GET') {
      // Ottieni o crea il codice referral dell'utente
      const [userData] = await sql`
        SELECT referral_code FROM users WHERE id = ${user.userId}
      `;

      let referralCode = userData?.referral_code;

      // Se l'utente non ha un codice referral, creane uno
      if (!referralCode) {
        let codeExists = true;
        while (codeExists) {
          referralCode = generateReferralCode();
          const existing = await sql`
            SELECT id FROM users WHERE referral_code = ${referralCode}
          `;
          if (existing.length === 0) {
            codeExists = false;
          }
        }

        await sql`
          UPDATE users SET referral_code = ${referralCode} WHERE id = ${user.userId}
        `;
      }

      // Calcola le statistiche
      const referralsData = await sql`
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals
        FROM referrals
        WHERE referrer_id = ${user.userId}
      `;

      const earningsData = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_earnings,
          COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_earnings
        FROM referral_earnings
        WHERE user_id = ${user.userId}
      `;

      const stats = referralsData[0];
      const earnings = earningsData[0];

      const withdrawnEarnings = parseFloat(earnings.withdrawn_earnings || 0);
      const availableEarnings = parseFloat(earnings.available_earnings || 0);
      const totalEarnings = availableEarnings + withdrawnEarnings;
      const completedReferrals = parseInt(stats.completed_referrals || 0);
      const pendingEarnings = Math.max(0, completedReferrals * REFERRAL_REWARD - totalEarnings);

      // Limita i guadagni disponibili al massimo
      const maxAvailableEarnings = Math.max(0, Math.min(availableEarnings, MAX_EARNINGS - withdrawnEarnings));
      const maxEarningsReached = (withdrawnEarnings + maxAvailableEarnings) >= MAX_EARNINGS;
      const canWithdraw = maxAvailableEarnings >= MIN_WITHDRAWAL && !maxEarningsReached;

      // Costruisci il link referral
      const baseUrl = req.headers.host || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const referralLink = `${protocol}://${baseUrl}/register?ref=${referralCode}`;

      return res.json({
        success: true,
        referralCode,
        referralLink,
        stats: {
          totalReferrals: parseInt(stats.total_referrals || 0),
          completedReferrals: completedReferrals,
          totalEarnings: totalEarnings.toFixed(2),
          availableEarnings: maxAvailableEarnings.toFixed(2),
          pendingEarnings: pendingEarnings.toFixed(2),
          withdrawnEarnings: withdrawnEarnings.toFixed(2),
          maxEarnings: MAX_EARNINGS,
          minWithdrawal: MIN_WITHDRAWAL,
          canWithdraw,
          maxEarningsReached
        }
      });
    }

    // POST /api/referral/withdraw - Ritira guadagni
    if (req.method === 'POST' && req.body.action === 'withdraw') {
      const { amount, paymentMethod, paymentDetails } = req.body;

      // Calcola i guadagni disponibili
      const [earningsData] = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN re.status = 'available' THEN re.amount ELSE 0 END), 0) as available_earnings,
          COALESCE(SUM(CASE WHEN re.status = 'withdrawn' THEN re.amount ELSE 0 END), 0) as withdrawn_earnings
        FROM referral_earnings re
        WHERE re.user_id = ${user.userId}
      `;

      const availableEarnings = parseFloat(earningsData.available_earnings || 0);
      const withdrawnEarnings = parseFloat(earningsData.withdrawn_earnings || 0);
      const maxAvailable = Math.max(0, MAX_EARNINGS - withdrawnEarnings);
      const actualAvailable = Math.min(availableEarnings, maxAvailable);

      // Verifica che l'importo sia valido
      const withdrawalAmount = parseFloat(amount);
      if (!withdrawalAmount || withdrawalAmount < MIN_WITHDRAWAL) {
        return res.status(400).json({
          success: false,
          message: `L'importo minimo per il ritiro è €${MIN_WITHDRAWAL.toFixed(2)}`
        });
      }

      if (withdrawalAmount > actualAvailable) {
        return res.status(400).json({
          success: false,
          message: `Importo non disponibile. Disponibile: €${actualAvailable.toFixed(2)}`
        });
      }

      // Crea la richiesta di ritiro
      const withdrawalId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO withdrawals (id, user_id, amount, status, payment_method, payment_details)
        VALUES (${withdrawalId}, ${user.userId}, ${withdrawalAmount}, 'pending', ${paymentMethod || 'bank_transfer'}, ${JSON.stringify(paymentDetails || {})})
      `;

      // Marca i guadagni come ritirati (in ordine cronologico fino a raggiungere l'importo)
      const earningsToWithdraw = await sql`
        SELECT id, amount
        FROM referral_earnings
        WHERE user_id = ${user.userId} AND status = 'available'
        ORDER BY created_at ASC
      `;

      let remainingAmount = withdrawalAmount;
      const earningsIds = [];
      
      for (const earning of earningsToWithdraw) {
        if (remainingAmount <= 0) break;
        earningsIds.push(earning.id);
        remainingAmount -= parseFloat(earning.amount);
      }

      if (earningsIds.length > 0) {
        // Aggiorna i guadagni uno per uno per compatibilità con Neon
        for (const earningId of earningsIds) {
          await sql`
            UPDATE referral_earnings
            SET status = 'withdrawn', withdrawn_at = NOW()
            WHERE id = ${earningId}
          `;
        }
      }

      return res.json({
        success: true,
        message: 'Richiesta di ritiro creata con successo',
        withdrawalId
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [REFERRAL API] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante l\'operazione',
      error: error.message
    });
  }
}

