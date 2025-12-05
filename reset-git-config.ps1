# Script per reconfigurare Git e GitHub da zero
Write-Host "=== REIMPOSTAZIONE GIT E GITHUB ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica stato attuale
Write-Host "1. Verifica stato repository..." -ForegroundColor Yellow
git status
Write-Host ""

# 2. Rimuovi remote esistente
Write-Host "2. Rimozione remote esistente..." -ForegroundColor Yellow
git remote remove origin 2>$null
Write-Host "Remote rimosso"
Write-Host ""

# 3. Aggiungi remote GitHub
Write-Host "3. Aggiunta nuovo remote GitHub..." -ForegroundColor Yellow
git remote add origin https://github.com/Dario-bit-cloud/ainebula.git
git remote -v
Write-Host ""

# 4. Verifica configurazione utente
Write-Host "4. Configurazione utente Git..." -ForegroundColor Yellow
$currentUser = git config user.name
$currentEmail = git config user.email
Write-Host "Utente attuale: $currentUser"
Write-Host "Email attuale: $currentEmail"
Write-Host ""

if (-not $currentUser -or -not $currentEmail) {
    Write-Host "Configurazione utente mancante!" -ForegroundColor Red
    Write-Host "Configura manualmente con:" -ForegroundColor Yellow
    Write-Host "  git config --global user.name 'Dario-bit-cloud'"
    Write-Host "  git config --global user.email 'tua-email@example.com'"
    Write-Host ""
}

# 5. Aggiungi tutti i file modificati
Write-Host "5. Aggiunta file modificati..." -ForegroundColor Yellow
git add -A
git status --short
Write-Host ""

# 6. Commit
Write-Host "6. Creazione commit..." -ForegroundColor Yellow
$commitMessage = "Fix: Sidebar responsive mobile e personalizzazione popup - reconfigurazione Git"
git commit -m $commitMessage
Write-Host ""

# 7. Verifica branch
Write-Host "7. Verifica branch..." -ForegroundColor Yellow
git branch
Write-Host ""

# 8. Push su GitHub
Write-Host "8. Push su GitHub..." -ForegroundColor Yellow
Write-Host "NOTA: Potrebbe richiedere autenticazione GitHub" -ForegroundColor Cyan
Write-Host ""
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRORE nel push!" -ForegroundColor Red
    Write-Host "Possibili cause:" -ForegroundColor Yellow
    Write-Host "  1. Autenticazione GitHub non configurata"
    Write-Host "  2. Token di accesso scaduto o non valido"
    Write-Host "  3. Branch 'main' non esiste (prova 'master')"
    Write-Host ""
    Write-Host "Soluzioni:" -ForegroundColor Cyan
    Write-Host "  - Crea un Personal Access Token su GitHub"
    Write-Host "  - Usa: git push -u origin main"
    Write-Host "  - Oppure configura SSH keys"
} else {
    Write-Host ""
    Write-Host "SUCCESS! Push completato con successo!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== COMPLETATO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ultimo commit:" -ForegroundColor Cyan
git log --oneline -1

