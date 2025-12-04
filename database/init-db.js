// Script per inizializzare il database con le tabelle necessarie
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function initDatabase() {
  try {
    console.log('📊 Inizializzazione database...');
    
    // Leggi il file schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Esegui lo schema (dividi per ; per eseguire ogni comando separatamente)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement);
        } catch (error) {
          // Ignora errori "already exists" per CREATE TABLE IF NOT EXISTS
          if (!error.message.includes('already exists')) {
            console.error('Errore esecuzione statement:', error.message);
            console.error('Statement:', statement.substring(0, 100));
          }
        }
      }
    }
    
    console.log('✅ Database inizializzato con successo!');
    
    // Verifica le tabelle create
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Tabelle create:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione:', error);
    process.exit(1);
  }
}

initDatabase();

