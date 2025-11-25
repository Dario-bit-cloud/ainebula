# 🚀 Deploy su Vercel - Configurazione

## ⚠️ Importante: Variabili d'Ambiente

Per far funzionare l'autenticazione su Vercel, devi configurare le seguenti variabili d'ambiente nel dashboard di Vercel:

### Variabili Richieste

1. **DATABASE_URL**
   - La connection string del database Neon PostgreSQL
   - Esempio: `postgresql://user:password@host/database?sslmode=require`

2. **JWT_SECRET**
   - Una chiave segreta per firmare i token JWT
   - Genera una chiave sicura: `openssl rand -base64 32`
   - **IMPORTANTE**: Usa una chiave diversa per produzione!

### Come Configurare le Variabili su Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `ainebula`
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi le variabili:
   - `DATABASE_URL` = (la tua connection string Neon)
   - `JWT_SECRET` = (una chiave segreta sicura)

## 📁 Struttura API Routes

Le API routes sono nella cartella `api/`:
- `api/auth/login.js` - Endpoint per login
- `api/auth/register.js` - Endpoint per registrazione
- `api/auth/me.js` - Verifica sessione
- `api/auth/logout.js` - Logout

## 🔧 Configurazione Alternativa: Backend Separato

Se preferisci deployare il backend separatamente (es. su Railway, Render, etc.):

1. Deploya `server.js` su un servizio separato
2. Aggiungi la variabile d'ambiente su Vercel:
   - `VITE_API_BASE_URL` = `https://tuo-backend-url.com`
3. L'app userà automaticamente quell'URL invece delle API routes locali

## ✅ Verifica

Dopo il deploy:
1. Vai su `https://ainebula.vercel.app`
2. Prova a fare login con:
   - Username: `dario`
   - Password: `123456`
3. Controlla i log su Vercel per eventuali errori

## 🐛 Troubleshooting

### Errore: "Failed to fetch"
- Verifica che le variabili d'ambiente siano configurate
- Controlla i log su Vercel per errori del database
- Verifica che il database Neon sia accessibile

### Errore: "Token non valido"
- Verifica che `JWT_SECRET` sia configurato correttamente
- Assicurati di usare la stessa chiave per tutte le API routes

### Le API routes non funzionano
- Verifica che i file siano nella cartella `api/`
- Controlla che `vercel.json` sia configurato correttamente
- Rivedi i log di build su Vercel

