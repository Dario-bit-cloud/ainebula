# Script per push modifiche su GitHub
Write-Host "=== Verifica stato repository ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Aggiunta file modificati ===" -ForegroundColor Cyan
git add src/components/SidebarCustomizer.svelte src/components/Sidebar.svelte
git add -A

Write-Host "`n=== Commit modifiche ===" -ForegroundColor Cyan
git commit -m "Fix: Sidebar responsive mobile e personalizzazione popup - correzione sintassi"

Write-Host "`n=== Push su GitHub ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Verifica ultimo commit ===" -ForegroundColor Cyan
git log --oneline -1

Write-Host "`n=== COMPLETATO ===" -ForegroundColor Green

