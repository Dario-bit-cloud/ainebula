// API Route per inizializzare il database su Vercel
// Protegge l'endpoint con una chiave segreta
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';

const sql = neon(connectionString);

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verifica la chiave segreta
  const authHeader = req.headers['authorization'];
  const providedSecret = authHeader && authHeader.replace('Bearer ', '');

  if (providedSecret !== ADMIN_SECRET) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Fornisci ADMIN_SECRET nell\'header Authorization come Bearer token.' 
    });
  }

  try {
    console.log('📊 Inizializzazione database...');
    
    // Crea tabella users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    console.log('✅ Tabella users creata/verificata');
    
    // Crea tabella sessions
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `;
    console.log('✅ Tabella sessions creata/verificata');
    
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
    console.log('✅ Tabella chats creata/verificata');
    
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
    console.log('✅ Tabella messages creata/verificata');
    
    // Crea indici
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)`;
    console.log('✅ Indici creati/verificati');
    
    // Crea funzione per aggiornare updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;
    console.log('✅ Funzione update_updated_at_column creata/verificata');
    
    // Crea trigger per aggiornare updated_at su chats
    await sql`
      DROP TRIGGER IF EXISTS update_chats_updated_at ON chats
    `;
    await sql`
      CREATE TRIGGER update_chats_updated_at 
      BEFORE UPDATE ON chats
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
    console.log('✅ Trigger per chats creato/verificato');
    
    // Verifica le tabelle
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tableNames = tables.map(t => t.table_name);
    
    return res.json({
      success: true,
      message: 'Database inizializzato con successo!',
      tables: tableNames
    });
    
  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante l\'inizializzazione del database',
      error: error.message
    });
  }
}

