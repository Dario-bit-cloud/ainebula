// Script semplificato per creare le tabelle
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Connessione al database Neon
// Priorità: DATABASE_URL (con pooling) > DATABASE_URL_UNPOOLED (senza pooling)
const connectionString = process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  console.error('❌ Connection string PostgreSQL non trovata!');
  console.error('Configura una di queste variabili d\'ambiente:');
  console.error('  - DATABASE_URL (Neon con pooling)');
  console.error('  - DATABASE_URL_UNPOOLED (Neon senza pooling)');
  process.exit(1);
}

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
    
    // Crea tabella user_settings
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'it',
        ai_temperature DECIMAL(3,2) DEFAULT 0.7,
        ai_max_tokens INTEGER DEFAULT 2000,
        ai_top_p DECIMAL(3,2) DEFAULT 1.0,
        ai_frequency_penalty DECIMAL(3,2) DEFAULT 0.0,
        ai_presence_penalty DECIMAL(3,2) DEFAULT 0.0,
        default_model VARCHAR(100) DEFAULT 'nebula-1.0',
        notifications_enabled BOOLEAN DEFAULT TRUE,
        email_notifications BOOLEAN DEFAULT FALSE,
        auto_save_chats BOOLEAN DEFAULT TRUE,
        settings_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tabella user_settings creata');
    
    // Crea tabella subscriptions
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        auto_renew BOOLEAN DEFAULT TRUE,
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        billing_cycle VARCHAR(20),
        amount DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'EUR',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tabella subscriptions creata');
    
    // Crea tabella projects
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(50),
        icon VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tabella projects creata');
    
    // Crea indici aggiuntivi
    await sql`CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`;
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
    
    // Crea trigger per aggiornare updated_at
    await sql`DROP TRIGGER IF EXISTS update_chats_updated_at ON chats`;
    await sql`
      CREATE TRIGGER update_chats_updated_at 
      BEFORE UPDATE ON chats
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
    
    await sql`DROP TRIGGER IF EXISTS update_projects_updated_at ON projects`;
    await sql`
      CREATE TRIGGER update_projects_updated_at 
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
    
    await sql`DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings`;
    await sql`
      CREATE TRIGGER update_user_settings_updated_at 
      BEFORE UPDATE ON user_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
    
    await sql`DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions`;
    await sql`
      CREATE TRIGGER update_subscriptions_updated_at 
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
    console.log('✅ Trigger creati');
    
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

