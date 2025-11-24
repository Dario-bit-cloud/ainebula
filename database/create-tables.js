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
    
    // Crea indici
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
    console.log('✅ Indici creati');
    
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

