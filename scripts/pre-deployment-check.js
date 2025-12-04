#!/usr/bin/env node

/**
 * Script di verifica pre-deployment
 * Esegue controlli per assicurarsi che tutto sia pronto per il lancio
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let errors = [];
let warnings = [];

console.log('🔍 Verifica pre-deployment per Nebula AI...\n');

// 1. Verifica package.json
console.log('📦 Verifica package.json...');
try {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  
  if (!packageJson.version) {
    errors.push('❌ Versione non specificata in package.json');
  } else {
    console.log(`   ✅ Versione: ${packageJson.version}`);
  }
  
  if (!packageJson.engines || !packageJson.engines.node) {
    warnings.push('⚠️  Versione Node.js non specificata in engines');
  } else {
    console.log(`   ✅ Node.js: ${packageJson.engines.node}`);
  }
} catch (error) {
  errors.push(`❌ Errore lettura package.json: ${error.message}`);
}

// 2. Verifica variabili d'ambiente necessarie
console.log('\n🔐 Verifica variabili d\'ambiente...');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'DATABASE_URL_UNPOOLED',
  'WEBAUTHN_RP_ID',
  'WEBAUTHN_RP_NAME',
  'WEBAUTHN_ORIGIN'
];

// Nota: In un ambiente reale, queste variabili dovrebbero essere verificate
// contro il file .env o le variabili d'ambiente del sistema
console.log('   ℹ️  Verifica manuale richiesta per le variabili d\'ambiente');
console.log('   📋 Variabili richieste:');
requiredEnvVars.forEach(v => console.log(`      - ${v}`));
console.log('   📋 Variabili opzionali:');
optionalEnvVars.forEach(v => console.log(`      - ${v}`));

// 3. Verifica file di configurazione
console.log('\n⚙️  Verifica file di configurazione...');
const configFiles = [
  'vercel.json',
  'vite.config.js',
  'svelte.config.js'
];

configFiles.forEach(file => {
  try {
    readFileSync(join(rootDir, file), 'utf-8');
    console.log(`   ✅ ${file} presente`);
  } catch (error) {
    errors.push(`❌ File ${file} non trovato`);
  }
});

// 4. Verifica documentazione
console.log('\n📚 Verifica documentazione...');
const docFiles = [
  'README.md',
  'CHANGELOG.md',
  'ENV_VARIABLES_TEMPLATE.txt'
];

docFiles.forEach(file => {
  try {
    readFileSync(join(rootDir, file), 'utf-8');
    console.log(`   ✅ ${file} presente`);
  } catch (error) {
    warnings.push(`⚠️  File ${file} non trovato`);
  }
});

// 5. Verifica struttura API
console.log('\n🌐 Verifica struttura API...');
const apiFiles = [
  'api/auth/[...slug].js',
  'api/chat/index.js',
  'api/projects/index.js',
  'api/utils/cors.js'
];

apiFiles.forEach(file => {
  try {
    readFileSync(join(rootDir, file), 'utf-8');
    console.log(`   ✅ ${file} presente`);
  } catch (error) {
    errors.push(`❌ File API ${file} non trovato`);
  }
});

// 6. Verifica che CORS sia configurato correttamente
console.log('\n🔒 Verifica sicurezza CORS...');
try {
  const corsFile = readFileSync(join(rootDir, 'api/utils/cors.js'), 'utf-8');
  if (corsFile.includes('ALLOWED_ORIGINS')) {
    console.log('   ✅ CORS configurato con whitelist');
  } else {
    warnings.push('⚠️  CORS potrebbe non essere configurato correttamente');
  }
} catch (error) {
  warnings.push('⚠️  Impossibile verificare configurazione CORS');
}

// 7. Verifica .gitignore
console.log('\n📝 Verifica .gitignore...');
try {
  const gitignore = readFileSync(join(rootDir, '.gitignore'), 'utf-8');
  const sensitiveFiles = ['.env', 'node_modules', 'dist'];
  
  sensitiveFiles.forEach(file => {
    if (gitignore.includes(file)) {
      console.log(`   ✅ ${file} ignorato`);
    } else {
      warnings.push(`⚠️  ${file} non è nel .gitignore`);
    }
  });
} catch (error) {
  warnings.push('⚠️  .gitignore non trovato');
}

// Riepilogo
console.log('\n' + '='.repeat(60));
console.log('📊 RIEPILOGO VERIFICA');
console.log('='.repeat(60));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ Tutti i controlli sono passati! Pronto per il deployment.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORI CRITICI:');
    errors.forEach(error => console.log(`   ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  AVVISI:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  console.log('\n⚠️  Risolvi gli errori prima di procedere con il deployment.\n');
  process.exit(errors.length > 0 ? 1 : 0);
}


