#!/usr/bin/env node

/**
 * Script di backup del database
 * Esegue un dump completo del database PostgreSQL
 */

import { neon } from '@neondatabase/serverless';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
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

async function backupDatabase() {
  console.log('🔄 Inizio backup database...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(process.cwd(), 'backups');
  
  // Crea la cartella backups se non esiste
  try {
    mkdirSync(backupDir, { recursive: true });
  } catch (error) {
    // La cartella potrebbe già esistere
  }
  
  const backupFile = join(backupDir, `backup-${timestamp}.json`);
  
  try {
    console.log('📊 Recupero dati...');
    
    // Recupera tutti i dati
    const [users] = await sql`SELECT COUNT(*) as count FROM users`;
    const [chats] = await sql`SELECT COUNT(*) as count FROM chats`;
    const [messages] = await sql`SELECT COUNT(*) as count FROM messages`;
    const [projects] = await sql`SELECT COUNT(*) as count FROM projects`;
    
    console.log(`   ✅ Utenti: ${users.count}`);
    console.log(`   ✅ Chat: ${chats.count}`);
    console.log(`   ✅ Messaggi: ${messages.count}`);
    console.log(`   ✅ Progetti: ${projects.count}`);
    
    // Crea un backup strutturato
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'nebula-ai'
      },
      statistics: {
        users: parseInt(users.count),
        chats: parseInt(chats.count),
        messages: parseInt(messages.count),
        projects: parseInt(projects.count)
      },
      note: 'Questo è un backup parziale delle statistiche. Per un backup completo, usa pg_dump o lo strumento di backup del tuo provider database.'
    };
    
    // Salva il backup
    writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    
    console.log(`\n✅ Backup completato: ${backupFile}`);
    console.log(`\n⚠️  NOTA: Questo è un backup parziale.`);
    console.log(`   Per un backup completo del database, usa:`);
    console.log(`   - pg_dump (per database locali)`);
    console.log(`   - Dashboard Neon/Supabase (per database cloud)`);
    console.log(`   - API di backup del provider\n`);
    
  } catch (error) {
    console.error('❌ Errore durante il backup:', error);
    process.exit(1);
  }
}

// Esegui il backup
backupDatabase();

