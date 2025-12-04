/**
 * Script per applicare RLS (Row Level Security) al database Neon
 * Esegui: node database/apply-rls.js
 * NOTA: RLS è supportato anche su Neon PostgreSQL
 */

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
// NOTA: RLS (Row Level Security) è supportato anche su Neon PostgreSQL
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

async function applyRLS() {
  try {
    console.log('🔒 Applicazione RLS (Row Level Security)...\n');
    
    // Leggi il file rls-setup.sql
    const rlsPath = join(__dirname, 'rls-setup.sql');
    const rlsScript = readFileSync(rlsPath, 'utf-8');
    
    // Dividi lo script in statement (separati da ;)
    // Filtra commenti e statement vuoti
    const statements = rlsScript
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Rimuovi commenti standalone e statement vuoti
        if (s.length === 0) return false;
        if (s.startsWith('--')) return false;
        // Rimuovi blocchi di commenti
        if (s.startsWith('/*')) return false;
        return true;
      });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Usa unsafe per permettere DDL statements
          await sql.unsafe(statement);
          successCount++;
        } catch (error) {
          // Ignora errori "already exists" e "does not exist" (per DROP IF EXISTS)
          if (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key value')
          ) {
            // Questi sono OK, continua
            successCount++;
          } else {
            errorCount++;
            console.error('⚠️ Errore esecuzione statement:', error.message);
            console.error('Statement:', statement.substring(0, 150) + '...');
          }
        }
      }
    }
    
    console.log(`\n✅ RLS applicato con successo!`);
    console.log(`   - Statement eseguiti: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   - Errori: ${errorCount}`);
    }
    
    // Verifica le policies create
    console.log('\n📋 Verifica policies RLS create...');
    const policies = await sql`
      SELECT tablename, policyname, cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    if (policies.length > 0) {
      console.log(`\n✅ Trovate ${policies.length} policies:`);
      const tables = {};
      policies.forEach(policy => {
        if (!tables[policy.tablename]) {
          tables[policy.tablename] = [];
        }
        tables[policy.tablename].push(policy.policyname);
      });
      
      Object.keys(tables).sort().forEach(table => {
        console.log(`   - ${table}: ${tables[table].length} policies`);
      });
    } else {
      console.log('⚠️ Nessuna policy trovata. Verifica lo script SQL.');
    }
    
    // Verifica che RLS sia abilitato
    console.log('\n🔒 Verifica RLS abilitato...');
    const rlsEnabled = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND rowsecurity = true
      ORDER BY tablename;
    `;
    
    if (rlsEnabled.length > 0) {
      console.log(`\n✅ RLS abilitato su ${rlsEnabled.length} tabelle:`);
      rlsEnabled.forEach(table => {
        console.log(`   - ${table.tablename}`);
      });
    } else {
      console.log('⚠️ Nessuna tabella con RLS abilitato trovata.');
    }
    
    console.log('\n✅ Setup RLS completato!');
    console.log('\n📝 PROSSIMI PASSI:');
    console.log('   1. Modifica le funzioni authenticateUser per impostare app.user_id');
    console.log('   2. Testa le query per verificare che RLS funzioni');
    console.log('   3. Rimuovi i filtri manuali WHERE user_id = ... (opzionale)');
    
  } catch (error) {
    console.error('❌ Errore durante l\'applicazione RLS:', error);
    process.exit(1);
  }
}

applyRLS();


