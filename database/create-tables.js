// Script semplificato per creare le tabelle
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_Xpw3ovIOqnz0@ep-spring-leaf-ads75xz2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

async function createTables() {
  try {
    console.log('📊 Creazione tabelle...');
    
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
    console.log('✅ Tabella users creata');
    
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
    console.log('✅ Tabella sessions creata');
    
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
    console.log('✅ Tabella chats creata');
    
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
    console.log('✅ Tabella messages creata');
    
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
    
    // Crea tabella passkeys
    await sql`
      CREATE TABLE IF NOT EXISTS passkeys (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter BIGINT DEFAULT 0,
        device_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE
      )
    `;
    console.log('✅ Tabella passkeys creata');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id)`;
    console.log('✅ Indici creati');
    
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
    console.log('✅ Funzione update_updated_at_column creata');
    
    // Crea trigger per aggiornare updated_at su chats
    await sql`
      DROP TRIGGER IF EXISTS update_chats_updated_at ON chats
    `;
    await sql`
      CREATE TRIGGER update_chats_updated_at 
      BEFORE UPDATE ON chats
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
    console.log('✅ Trigger per chats creato');
    
    // Verifica le tabelle
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('\n📋 Tabelle create:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    console.log('\n✅ Database inizializzato con successo!');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

createTables();

