# 🚀 Quick Start - Avvio Rapido

## 1. Configura le variabili d'ambiente

Crea un file `.env` nella root del progetto con:

```env
# Database Neon (obbligatorio)
DATABASE_URL=postgresql://neondb_owner:npg_y2lNI8unzUxX@ep-sparkling-cherry-ahh8648q-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_y2lNI8unzUxX@ep-sparkling-cherry-ahh8648q.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret (obbligatorio)
JWT_SECRET=genera_una_stringa_casuale_lunga_minimo_32_caratteri

# Node Environment
NODE_ENV=development
```

**Per generare JWT_SECRET:**
- Windows PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
- Linux/Mac: `openssl rand -base64 32`

## 2. Inizializza il database

Esegui questo comando per creare tutte le tabelle necessarie:

```bash
npm run db:init
```

Questo creerà:
- ✅ Tabella `users` (per gli utenti)
- ✅ Tabella `sessions` (per le sessioni)
- ✅ Tabella `chats` (per le chat)
- ✅ Tabella `messages` (per i messaggi)
- ✅ Tabella `projects` (per i progetti)
- ✅ E tutte le altre tabelle necessarie

## 3. Avvia il server

In un terminale, avvia il server API:

```bash
npm run dev:server
```

Oppure avvia sia server che client insieme:

```bash
npm run dev
```

Il server sarà disponibile su `http://localhost:3001`

## 4. Verifica che tutto funzioni

1. Apri il browser su `http://localhost:5173` (o la porta del client)
2. Prova a registrarti con un nuovo account
3. Prova a fare login

## 🔧 Troubleshooting

### Errore: "Connection string PostgreSQL non trovata"
- Verifica che il file `.env` esista e contenga `DATABASE_URL`
- Riavvia il server dopo aver aggiunto le variabili d'ambiente

### Errore: "ERR_CONNECTION_REFUSED"
- Verifica che il server sia in esecuzione (`npm run dev:server`)
- Controlla che la porta 3001 non sia già in uso

### Errore: "relation 'users' does not exist"
- Esegui `npm run db:init` per creare le tabelle

### Errore: "JWT_SECRET non configurato"
- Aggiungi `JWT_SECRET` al file `.env`
- Riavvia il server

## 📝 Note

- Il server deve essere in esecuzione per fare login/registrazione
- Le tabelle devono essere create prima di usare l'app
- Usa `DATABASE_URL` (con pooling) per la maggior parte degli usi
- Usa `DATABASE_URL_UNPOOLED` solo per operazioni specifiche che richiedono una connessione diretta

