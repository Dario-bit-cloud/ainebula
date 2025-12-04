/**
 * Script per inizializzare le tabelle in Supabase
 * Usa la connection string PostgreSQL diretta di Supabase per eseguire lo schema SQL
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connessione a Supabase usando la connection string PostgreSQL
// Supabase fornisce una connection string PostgreSQL standard
const connectionString = process.env.NEBULA_POSTGRES_URL || 
  process.env.NEBULA_POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Connection string PostgreSQL non trovata!');
  console.error('Configura una di queste variabili d\'ambiente:');
  console.error('  - NEBULA_POSTGRES_URL');
  console.error('  - NEBULA_POSTGRES_URL_NON_POOLING');
  console.error('  - DATABASE_URL');
  process.exit(1);
}

// Usa @neondatabase/serverless (compatibile con Supabase PostgreSQL)
const sql = neon(connectionString);

async function initSupabaseDatabase() {
  try {
    console.log('📊 Inizializzazione database Supabase...');
    console.log('🔗 Connection string:', connectionString.substring(0, 30) + '...');
    
    // Leggi il file schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Esegui lo schema (dividi per ; per eseguire ogni comando separatamente)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement);
          successCount++;
        } catch (error) {
          // Ignora errori "already exists" per CREATE TABLE IF NOT EXISTS
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('already defined')) {
            // Ignora silenziosamente
          } else {
            console.error('⚠️ Errore esecuzione statement:', error.message);
            console.error('Statement:', statement.substring(0, 100));
            errorCount++;
          }
        }
      }
    }
    
    console.log(`✅ Database inizializzato! ${successCount} statement eseguiti con successo`);
    if (errorCount > 0) {
      console.log(`⚠️ ${errorCount} statement con errori (probabilmente già esistenti)`);
    }
    
    // Verifica le tabelle create
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Tabelle create:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });
    
    console.log('\n🎉 Inizializzazione completata!');
    
  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione:', error);
    process.exit(1);
  }
}

initSupabaseDatabase();

