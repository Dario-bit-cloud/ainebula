# Script per push esplicito con output
$ErrorActionPreference = "Continue"

Write-Host "=== PUSH SU GITHUB ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Stato repository:" -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "2. Aggiunta file modificati..." -ForegroundColor Yellow
git add -A
$status = git status --short
if ($status) {
    Write-Host "File da committare:" -ForegroundColor Green
    Write-Host $status
} else {
    Write-Host "Nessun file da committare" -ForegroundColor Gray
}
Write-Host ""

Write-Host "3. Commit..." -ForegroundColor Yellow
$commitOutput = git commit -m "Fix: Sidebar responsive mobile e personalizzazione popup - miglioramenti UX" 2>&1
Write-Host $commitOutput
Write-Host ""

Write-Host "4. Push su GitHub..." -ForegroundColor Yellow
$pushOutput = git push origin main 2>&1
Write-Host $pushOutput
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ PUSH COMPLETATO CON SUCCESSO!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ ERRORE nel push!" -ForegroundColor Red
    Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
}
Write-Host ""

Write-Host "5. Ultimo commit:" -ForegroundColor Yellow
git log --oneline -1
Write-Host ""

Write-Host "=== FINE ===" -ForegroundColor Cyan

