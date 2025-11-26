# 🔄 Come Pulire la Cache del Browser

Il problema è che il browser sta usando file vecchi dalla cache. Ecco come risolverlo:

## ✅ Soluzione Rapida:

### 1. **Hard Refresh nel Browser**
- **Windows/Linux**: Premi `Ctrl + Shift + R` oppure `Ctrl + F5`
- **Mac**: Premi `Cmd + Shift + R`

### 2. **Se non funziona, chiudi completamente il browser**
1. Chiudi TUTTE le finestre del browser
2. Riapri il browser
3. Vai su `http://localhost:5173`
4. Premi `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)

### 3. **Pulisci la cache manualmente**

#### Chrome/Edge:
1. Premi `F12` per aprire DevTools
2. Clicca destro sul pulsante di ricarica (🔄)
3. Seleziona **"Empty Cache and Hard Reload"**

#### Firefox:
1. Premi `Ctrl + Shift + Delete` (Windows) o `Cmd + Shift + Delete` (Mac)
2. Seleziona "Cache"
3. Clicca "Clear Now"

### 4. **Riavvia il server dev**
Nel terminale:
1. Ferma il server (Ctrl+C)
2. Riavvia: `npm run dev`
3. Aspetta che sia pronto
4. Apri il browser e ricarica

## 🔍 Verifica che Funzioni:

Dopo aver pulito la cache, controlla nella console (F12):
- Dovresti vedere: `Calling Electron Hub API:`
- NON dovresti vedere: `openrouter.ai` nell'URL

Se vedi ancora `openrouter.ai`, la cache non è stata pulita. Prova a chiudere completamente il browser e riaprilo.

