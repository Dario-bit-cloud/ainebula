// API Route per verificare che i messaggi siano crittografati
// Il server NON può decrittografare i messaggi, solo verificare che siano crittografati
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    // POST - Verifica che un messaggio sia crittografato
    if (req.method === 'POST') {
      const { encryptedMessage, chatId } = req.body;
      
      if (!encryptedMessage) {
        return res.status(400).json({
          success: false,
          message: 'Messaggio non fornito'
        });
      }
      
      // Verifica che il messaggio sia crittografato
      if (!encryptedMessage.startsWith('encrypted:')) {
        return res.status(400).json({
          success: false,
          message: 'Messaggio non crittografato',
          isEncrypted: false
        });
      }
      
      // Il server NON può decrittografare il messaggio
      // Solo verificare che sia nel formato corretto
      try {
        // Verifica che sia un base64 valido
        const base64 = encryptedMessage.substring(10);
        atob(base64); // Se non è base64 valido, lancerà un errore
        
        // Verifica che abbia almeno la dimensione minima (IV + qualche dato)
        const binaryString = atob(base64);
        if (binaryString.length < 12) {
          return res.status(400).json({
            success: false,
            message: 'Messaggio crittografato non valido (dimensione insufficiente)',
            isEncrypted: false
          });
        }
        
        return res.json({
          success: true,
          message: 'Messaggio correttamente crittografato',
          isEncrypted: true,
          // Il server NON può vedere il contenuto decrittografato
          note: 'Il server non può decrittografare questo messaggio'
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Formato messaggio crittografato non valido',
          isEncrypted: false,
          error: error.message
        });
      }
    }
    
    // GET - Verifica che tutte le chat dell'utente abbiano messaggi crittografati
    if (req.method === 'GET') {
      const chats = await sql`
        SELECT 
          c.id,
          c.title,
          COUNT(m.id) as message_count,
          COUNT(CASE WHEN m.content LIKE 'encrypted:%' THEN 1 END) as encrypted_count
        FROM chats c
        LEFT JOIN messages m ON c.id = m.chat_id
        WHERE c.user_id = ${user.user_id}
          AND c.is_temporary = false
        GROUP BY c.id, c.title
      `;
      
      const verificationResults = chats.map(chat => ({
        chatId: chat.id,
        title: chat.title,
        totalMessages: parseInt(chat.message_count || 0),
        encryptedMessages: parseInt(chat.encrypted_count || 0),
        allEncrypted: chat.message_count === chat.encrypted_count && chat.message_count > 0,
        hasUnencrypted: chat.message_count > chat.encrypted_count
      }));
      
      const allChatsEncrypted = verificationResults.every(result => 
        result.totalMessages === 0 || result.allEncrypted
      );
      
      return res.json({
        success: true,
        allChatsEncrypted,
        chats: verificationResults,
        summary: {
          totalChats: verificationResults.length,
          fullyEncrypted: verificationResults.filter(r => r.allEncrypted).length,
          partiallyEncrypted: verificationResults.filter(r => r.hasUnencrypted).length,
          unencrypted: verificationResults.filter(r => r.totalMessages > 0 && r.encryptedMessages === 0).length
        }
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [VERIFY ENCRYPTION] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel server',
      error: error.message
    });
  }
}

