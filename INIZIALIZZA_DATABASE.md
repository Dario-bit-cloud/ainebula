# 🗄️ Inizializza Database Supabase

## ✅ Le Tabelle per le Chat Sono Già Pronte!

Lo schema include già tutte le tabelle necessarie per salvare la cronologia chat:
- **`chats`** - Tabella per le chat
- **`messages`** - Tabella per i messaggi delle chat

## 🚀 Come Inizializzare il Database

### Metodo 1: SQL Editor Supabase (Consigliato - 2 minuti)

1. Vai su [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor** (menu laterale)
4. Clicca su **New Query**
5. Apri il file `database/supabase-schema.sql` dal progetto
6. **Copia tutto il contenuto** e incollalo nell'editor SQL
7. Clicca **Run** (o premi `Ctrl+Enter` / `Cmd+Enter`)

✅ **Fatto!** Le tabelle sono state create.

### Metodo 2: Script Node.js (Alternativo)

Se preferisci usare lo script:

1. Assicurati di avere le variabili d'ambiente configurate:
   ```env
   NEBULA_POSTGRES_URL=postgresql://...
   ```

2. Esegui lo script:
   ```bash
   npm run db:init-supabase
   ```

## 📋 Tabelle Create

Dopo l'inizializzazione, avrai queste tabelle:

### Tabelle Principali
- ✅ `users` - Utenti
- ✅ `sessions` - Sessioni utente
- ✅ **`chats`** - Chat (cronologia chat)
- ✅ **`messages`** - Messaggi delle chat
- ✅ `projects` - Progetti
- ✅ `user_settings` - Impostazioni utente

### Tabelle Supporto
- `subscriptions` - Abbonamenti (deprecata, ora usa Clerk)
- `payments` - Pagamenti
- `referrals` - Referral
- `referral_earnings` - Guadagni referral
- `withdrawals` - Ritiri
- `shared_links` - Link condivisi
- `data_exports` - Esportazioni dati
- `passkeys` - Passkeys (WebAuthn)

## ✅ Verifica

Dopo l'inizializzazione, verifica che le tabelle siano state create:

1. Vai su Supabase Dashboard → **Table Editor**
2. Dovresti vedere tutte le tabelle elencate sopra
3. In particolare, verifica che esistano:
   - `chats`
   - `messages`

## 🔍 Test Connessione

Testa che tutto funzioni:

1. Vai su Vercel → Il tuo progetto
2. Vai su **Deployments** → Seleziona il deployment più recente
3. Vai su **Functions** → Seleziona una funzione API
4. Controlla i log - non dovrebbero esserci errori di connessione

Oppure testa direttamente:
- `GET https://[tuo-dominio]/api/db/test` → Dovrebbe restituire la versione PostgreSQL
- `GET https://[tuo-dominio]/api/db/info` → Dovrebbe restituire l'elenco delle tabelle

## 🆘 Problemi?

### "relation does not exist"
→ Le tabelle non sono state create. Esegui di nuovo lo script SQL.

### "permission denied"
→ Verifica che la connection string contenga la password corretta.

### "connection refused"
→ Verifica che `NEBULA_POSTGRES_URL` sia configurata correttamente su Vercel.

## 📝 Note

- Lo script `supabase-schema.sql` è ottimizzato per Supabase
- Include tutti gli indici per performance ottimali
- Include i trigger per aggiornare automaticamente `updated_at`
- Le tabelle `chats` e `messages` sono pronte per salvare la cronologia chat



