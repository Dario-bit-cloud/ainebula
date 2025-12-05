#!/usr/bin/env node
// Script per fare push al repository GitHub corretto
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const REPO_URL = 'https://github.com/Dario-bit-cloud/ainebula.git';

console.log('🔍 Verifica configurazione repository...\n');

(async () => {
try {
  // Verifica il remote
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  console.log(`📍 Remote attuale: ${remoteUrl}`);
  
  if (remoteUrl !== REPO_URL) {
    console.log(`\n⚠️  Remote non corrisponde! Configurazione del remote corretto...`);
    execSync(`git remote set-url origin ${REPO_URL}`, { stdio: 'inherit' });
    console.log('✅ Remote configurato correttamente!');
  } else {
    console.log('✅ Remote configurato correttamente!');
  }
  
  // Verifica lo stato
  console.log('\n📊 Stato repository:');
  execSync('git status', { stdio: 'inherit' });
  
  // Verifica se ci sono modifiche da committare
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  
  if (status.trim()) {
    console.log('\n📝 Trovate modifiche non committate!');
    console.log('📦 Aggiunta di tutti i file modificati...');
    execSync('git add -A', { stdio: 'inherit' });
    
    console.log('\n💾 Creazione commit...');
    // Bug 1 Fix: Usa execFile con argomenti separati invece di interpolare stringhe
    // Questo previene command injection attraverso process.argv[2]
    const commitMessage = process.argv[2] || 'Update: Multiple improvements and new features';
    
    // Sanitizza il messaggio di commit rimuovendo caratteri pericolosi
    const sanitizedMessage = commitMessage
      .replace(/[;&|`$(){}[\]]/g, '') // Rimuove caratteri shell pericolosi
      .replace(/\n/g, ' ') // Sostituisce newline con spazi
      .trim()
      .substring(0, 500); // Limita la lunghezza
    
    // Usa execFile con argomenti separati per evitare command injection
    // execFile non usa shell, quindi è più sicuro
    try {
      await execFileAsync('git', ['commit', '-m', sanitizedMessage], {
        stdio: 'inherit'
      });
      console.log('✅ Commit creato con successo!');
    } catch (error) {
      console.error('❌ Errore durante la creazione del commit:', error.message);
      process.exit(1);
    }
  }
  
  // Verifica se ci sono commit da pushare
  const unpushedCommits = execSync('git log origin/main..HEAD --oneline', { encoding: 'utf-8' });
  
  if (!unpushedCommits.trim()) {
    console.log('\n✅ Nessun commit da pushare. Tutto aggiornato!');
    process.exit(0);
  }
  
  console.log('\n📤 Commit da pushare:');
  console.log(unpushedCommits);
  
  // Esegui il push
  console.log('\n🚀 Esecuzione push...\n');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n✅ Push completato con successo!');
  
} catch (error) {
  console.error('\n❌ Errore durante il push:', error.message);
  console.error('\n💡 Suggerimenti:');
  console.error('   1. Verifica di avere le credenziali GitHub configurate');
  console.error('   2. Usa un Personal Access Token se necessario');
  console.error('   3. Verifica di avere i permessi sul repository');
  process.exit(1);
}
})();
