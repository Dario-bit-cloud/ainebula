# 🔑 Come Ottenere e Configurare l'API Key di OpenRouter

## ❌ Problema Attuale
L'API key attuale non è valida. Errore: `401 Unauthorized: User not found`

## ✅ Soluzione: Ottenere una Nuova API Key

### Passo 1: Vai su OpenRouter
1. Apri il browser e vai su: **https://openrouter.ai/**
2. Clicca su **"Sign In"** in alto a destra
3. Accedi con Google, Discord o Email

### Passo 2: Crea una Nuova API Key
1. Dopo il login, vai su: **https://openrouter.ai/keys**
2. Clicca su **"Create Key"**
3. Assegna un nome alla chiave (es. "Nebula AI")
4. (Opzionale) Imposta un limite di credito se vuoi
5. Clicca su **"Create"**
6. **⚠️ IMPORTANTE:** Copia immediatamente la chiave API! Non sarà più visibile dopo.

### Passo 3: Configura la Chiave nel Progetto
1. Apri il file: `src/config/api.js`
2. Sostituisci la chiave esistente con la nuova:

```javascript
export const API_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: 'LA_TUA_NUOVA_API_KEY_QUI', // ← Incolla qui la nuova chiave
  timeout: 30000
};
```

3. Salva il file
4. Ricarica il browser (Ctrl+F5 o Cmd+Shift+R)

## 🎁 Piano Gratuito
OpenRouter offre **50 richieste gratuite al giorno** sul piano gratuito, perfetto per testare!

## 🔄 Alternative Se Non Funziona OpenRouter

### Opzione 1: Electron Hub (Già Configurato Prima)
- Vai su: https://playground.electronhub.ai/console
- Usa la tua chiave esistente
- Cambia in `src/config/api.js`:
  ```javascript
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-1Nr31Tdp53bBR3y04Apz6MCSCC4FMTOcYpmb0DVxoDTZO0FR2e'
  ```

### Opzione 2: CometAPI (Gratuito)
- Vai su: https://cometapi.com/
- Registrati e ottieni la chiave API
- Configura secondo la loro documentazione

## ✅ Verifica che Funzioni
Dopo aver configurato la nuova API key, prova a inviare un messaggio nella chat. 
Se vedi ancora errori, controlla la console del browser (F12) per dettagli.

## 🆘 Problemi Comuni

- **401 Unauthorized**: API key non valida → Ottieni una nuova chiave
- **429 Too Many Requests**: Troppe richieste → Attendi o aggiungi crediti
- **402 Payment Required**: Nessun credito → Aggiungi fondi o usa modelli gratuiti

