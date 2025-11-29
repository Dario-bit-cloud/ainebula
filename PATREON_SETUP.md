# Guida Setup Integrazione Patreon

## ✅ Completato

L'integrazione Patreon è stata implementata con successo! Ecco cosa è stato fatto:

### File creati/modificati:

1. **`src/services/patreonService.js`** - Servizio per gestire le chiamate API Patreon
2. **`api/patreon/callback.js`** - Route callback per OAuth Patreon
3. **`src/components/PremiumModal.svelte`** - Aggiunto supporto Patreon per piano Premium
4. **`src/App.svelte`** - Gestione callback Patreon dopo autorizzazione
5. **`server.js`** - Endpoint API per Patreon (link account, verifica membership, webhook)
6. **`database/schema.sql`** - Aggiunti campi `patreon_user_id` e `patreon_access_token` alla tabella users
7. **`database/add-patreon-fields.sql`** - Script per aggiungere campi Patreon a database esistenti

## 🔧 Configurazione Necessaria

### 1. Variabili d'Ambiente

Aggiungi queste variabili d'ambiente al tuo file `.env` (locale) e su Vercel (produzione):

```env
PATREON_CLIENT_ID=NF2MmLVExjXVv4ZpcgijfosjlJIYQuPBblK7vE1PpSPRawgFbKhiVbzq0Nbl1YAf
PATREON_CLIENT_SECRET=8JZGmekMz0KcEs-20TV1mVFZUb4VpPny6vA_XXM_OFm4GwTTrbv7wTkQSzHgjiEm
PATREON_CREATOR_ACCESS_TOKEN=TWD_FwnKyJHjFNATwJHsUDQzzLSJuplWcbUpvIbTMrA
PATREON_CREATOR_REFRESH_TOKEN=Vb5aAzykB9meiShokfKv2mRt6h9Ov5kTNRYGVDNp58o
```

**Su Vercel:**
1. Vai su Settings → Environment Variables
2. Aggiungi tutte le variabili sopra

### 2. Configurazione Redirect URI su Patreon

1. Vai su https://www.patreon.com/portal/registration/register-clients
2. Seleziona la tua app "Nebula AI"
3. Aggiungi questi Redirect URIs:
   - **Locale (Sviluppo):** `http://localhost:3001/api/patreon/callback` ⚠️ **IMPORTANTE: usa porta 3001 (backend), non 5173 (frontend)**
   - **Produzione:** `https://tuodominio.com/api/patreon/callback`

**Nota:** In sviluppo locale, il frontend gira su `localhost:5173` ma il backend (dove è il callback) gira su `localhost:3001`. Assicurati di configurare `http://localhost:3001/api/patreon/callback` su Patreon.

### 3. Aggiorna Database

Se il database esiste già, esegui questo script:

```sql
-- Esegui questo script SQL sul tuo database
ALTER TABLE users ADD COLUMN IF NOT EXISTS patreon_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS patreon_access_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_patreon_user_id ON users(patreon_user_id);
```

Oppure esegui il file: `database/add-patreon-fields.sql`

### 4. Configura Webhook Patreon (Opzionale ma Consigliato)

1. Vai su https://www.patreon.com/portal/registration/register-clients
2. Seleziona la tua app
3. Vai alla sezione "Webhooks"
4. Aggiungi webhook URL: `https://tuodominio.com/api/patreon/webhook`
5. Seleziona eventi:
   - `members:pledge:create`
   - `members:pledge:update`
   - `members:pledge:delete`

## 🚀 Come Funziona

### Flusso Utente:

1. **Utente seleziona piano Premium** → Vede opzione "Collega con Patreon"
2. **Clicca "Collega con Patreon"** → Redirect a Patreon OAuth
3. **Autorizza su Patreon** → Redirect al callback
4. **Callback processa** → Collega account e verifica membership
5. **Se membership attiva (≥5€/mese)** → Attiva abbonamento Premium automaticamente

### Verifica Manuale:

Se l'utente ha già collegato Patreon, può cliccare "Verifica Abbonamento" per controllare lo stato.

## 📝 Note Importanti

1. **Tier ID Patreon**: Attualmente il sistema verifica se l'importo è ≥ 5€ (500 centesimi). Se vuoi verificare un tier specifico, devi:
   - Ottenere l'ID del tier da Patreon
   - Modificare `server.js` nella funzione `check-membership` per verificare il tier ID specifico

2. **Sicurezza**: 
   - I token Patreon vengono salvati nel database (criptati se possibile)
   - Il webhook dovrebbe verificare la firma (TODO: implementare verifica firma webhook)

3. **Rinnovo Automatico**: 
   - Il webhook gestisce automaticamente attivazione/disattivazione
   - Gli abbonamenti scadono dopo 1 mese e vengono rinnovati se il patron è ancora attivo

## 🧪 Test

1. **Test Locale:**
   ```bash
   npm run dev
   ```
   - Vai su http://localhost:3000
   - Apri Premium Modal
   - Seleziona piano Premium
   - Clicca "Collega con Patreon"

2. **Test Produzione:**
   - Assicurati che le variabili d'ambiente siano configurate su Vercel
   - Verifica che il redirect URI sia corretto su Patreon
   - Testa il flusso completo

## 🐛 Troubleshooting

### Errore "token_exchange_failed"
- Verifica che Client ID e Secret siano corretti
- Controlla che il redirect URI corrisponda esattamente a quello configurato su Patreon

### Errore "user_info_failed"
- Verifica che il Creator Access Token sia valido
- Controlla che l'app abbia i permessi necessari

### Abbonamento non si attiva
- Verifica che l'utente sia iscritto a un tier ≥ 5€/mese
- Controlla i log del server per errori API Patreon

## 📚 Risorse

- [Documentazione API Patreon](https://docs.patreon.com/)
- [OAuth 2.0 Patreon](https://docs.patreon.com/#oauth)

