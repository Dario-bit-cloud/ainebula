// Script per creare l'utente di test
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
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

async function createTestUser() {
  try {
    console.log('👤 Creazione utente di test...');
    
    const username = 'dario';
    const password = '123456';
    
    // Verifica se l'utente esiste già
    const existing = await sql`
      SELECT id FROM users 
      WHERE username = ${username.toLowerCase()}
    `;
    
    if (existing.length > 0) {
      console.log('⚠️  Utente già esistente. Eliminazione...');
      await sql`DELETE FROM users WHERE username = ${username.toLowerCase()}`;
    }
    
    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomBytes(16).toString('hex');
    const email = `${username.toLowerCase()}@nebula.local`;
    
    // Crea l'utente
    await sql`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (${userId}, ${email}, ${username.toLowerCase()}, ${passwordHash})
    `;
    
    console.log('✅ Utente di test creato con successo!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`   ID: ${userId}`);
    
  } catch (error) {
    console.error('❌ Errore durante la creazione dell\'utente:', error);
    process.exit(1);
  }
}

createTestUser();

