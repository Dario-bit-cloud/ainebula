# Script per verificare che il push sia andato a buon fine
Write-Host "=== VERIFICA PUSH GITHUB ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Remote configurato:" -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "2. Ultimo commit locale:" -ForegroundColor Yellow
git log --oneline -1
Write-Host ""

Write-Host "3. Stato repository:" -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "4. Verifica connessione GitHub:" -ForegroundColor Yellow
$remoteInfo = git ls-remote --heads origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Connessione GitHub OK" -ForegroundColor Green
    Write-Host $remoteInfo
} else {
    Write-Host "✗ Errore connessione GitHub" -ForegroundColor Red
    Write-Host $remoteInfo
}
Write-Host ""

Write-Host "=== COMPLETATO ===" -ForegroundColor Green

