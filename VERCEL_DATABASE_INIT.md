# 🚀 Inizializzazione Database su Vercel

## ❌ Problema

Se vedi questo errore nella console del browser:
```
relation "chats" does not exist
```

Significa che le tabelle del database non sono state ancora create su Vercel.

## ✅ Soluzione

### Opzione 1: Usa l'Endpoint API Admin (Raccomandato)

1. **Imposta la variabile d'ambiente ADMIN_SECRET su Vercel:**
   - Vai sul dashboard Vercel del tuo progetto
   - Vai su **Settings** → **Environment Variables**
   - Aggiungi una nuova variabile:
     - **Key**: `ADMIN_SECRET`
     - **Value**: Scegli una stringa segreta (es. `my-super-secret-key-2024`)
   - Clicca **Save**

2. **Chiama l'endpoint API per inizializzare il database:**

   Puoi usare diversi metodi:

   **a) Usando curl:**
   ```bash
   curl -X POST https://ainebula.vercel.app/api/admin/init-db \
     -H "Authorization: Bearer my-super-secret-key-2024" \
     -H "Content-Type: application/json"
   ```

   **b) Usando PowerShell (Windows):**
   ```powershell
   Invoke-WebRequest -Uri "https://ainebula.vercel.app/api/admin/init-db" `
     -Method POST `
     -Headers @{
       "Authorization" = "Bearer my-super-secret-key-2024"
       "Content-Type" = "application/json"
     }
   ```

   **c) Usando il browser (console JavaScript):**
   ```javascript
   fetch('https://ainebula.vercel.app/api/admin/init-db', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer my-super-secret-key-2024',
       'Content-Type': 'application/json'
     }
   })
   .then(res => res.json())
   .then(data => console.log(data))
   .catch(err => console.error(err));
   ```

3. **Verifica la risposta:**

   Dovresti ricevere una risposta simile a:
   ```json
   {
     "success": true,
     "message": "Database inizializzato con successo!",
     "tables": ["chats", "messages", "sessions", "users"]
   }
   ```

4. **Ricarica l'applicazione:**

   Dopo l'inizializzazione, ricarica la pagina del browser. Le chat dovrebbero ora funzionare correttamente!

### Opzione 2: Usa lo Script Locale

Se hai accesso al database locale o vuoi testare prima:

1. **Assicurati di avere la variabile DATABASE_URL:**
   ```bash
   export DATABASE_URL="your-neon-database-url"
   ```
   Oppure crea un file `.env` con:
   ```
   DATABASE_URL=your-neon-database-url
   ```

2. **Esegui lo script:**
   ```bash
   npm run db:init
   ```

   Questo creerà tutte le tabelle necessarie (users, sessions, chats, messages) e gli indici.

## 📋 Tabelle Create

L'inizializzazione crea le seguenti tabelle:

- ✅ **users** - Utenti dell'applicazione
- ✅ **sessions** - Sessioni di autenticazione
- ✅ **chats** - Chat degli utenti
- ✅ **messages** - Messaggi delle chat

## 🔒 Sicurezza

- ⚠️ **IMPORTANTE**: L'endpoint `/api/admin/init-db` è protetto da una chiave segreta (`ADMIN_SECRET`)
- Cambia sempre `ADMIN_SECRET` con un valore sicuro e casuale in produzione
- Dopo aver inizializzato il database, considera di rimuovere o disabilitare l'endpoint in produzione

## 🐛 Risoluzione Problemi

### Errore: "Unauthorized"
- Verifica che `ADMIN_SECRET` sia impostato correttamente su Vercel
- Controlla che il token Bearer nell'header sia identico a `ADMIN_SECRET`

### Errore: "relation already exists"
- Questo non è un errore! Le tabelle esistono già, l'inizializzazione è già stata eseguita
- Puoi ignorare questo messaggio

### Le chat ancora non funzionano dopo l'inizializzazione
- Verifica che `DATABASE_URL` sia configurato correttamente su Vercel
- Controlla i log di Vercel per eventuali errori
- Assicurati che tutte le tabelle siano state create (vedi risposta dell'endpoint)

## 📚 Documentazione Correlata

- `DATABASE_SETUP.md` - Setup database locale
- `CHAT_DATABASE_SETUP.md` - Documentazione sistema chat
- `DATABASE_USAGE.md` - Come usare il database nell'applicazione

