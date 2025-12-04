# 🚀 Guida al Deployment

Questa guida descrive il processo completo per il deployment di Nebula AI in produzione.

## 📋 Checklist Pre-Deployment

Prima di procedere con il deployment, assicurati di aver completato tutti questi passaggi:

### 1. Verifica Pre-Deployment

Esegui lo script di verifica:

```bash
npm run pre-deploy
```

Questo verificherà:
- ✅ Versione in package.json
- ✅ File di configurazione presenti
- ✅ Struttura API corretta
- ✅ Configurazione CORS
- ✅ .gitignore configurato

### 2. Variabili d'Ambiente

Assicurati di aver configurato tutte le variabili d'ambiente necessarie su Vercel:

**Variabili Richieste:**
- `DATABASE_URL` - Connection string PostgreSQL
- `JWT_SECRET` - Chiave segreta JWT (genera una stringa casuale di almeno 32 caratteri)
- `NODE_ENV` - Imposta a `production`

**Variabili Opzionali:**
- `DATABASE_URL_UNPOOLED` - Connection string senza pooling
- `WEBAUTHN_RP_ID` - ID per WebAuthn (default: `ainebula.vercel.app`)
- `WEBAUTHN_RP_NAME` - Nome per WebAuthn (default: `Nebula AI`)
- `WEBAUTHN_ORIGIN` - Origin per WebAuthn (default: `https://ainebula.vercel.app`)

**Come generare JWT_SECRET:**

```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

### 3. Database

- ✅ Database Neon inizializzato con lo schema completo
- ✅ Backup del database eseguito (opzionale ma consigliato)
- ✅ Test di connessione riuscito

### 4. Build Locale

Testa il build localmente:

```bash
npm run build
npm run preview
```

Verifica che tutto funzioni correttamente.

## 🌐 Deployment su Vercel

### Passo 1: Collega il Repository

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Clicca su "Add New Project"
3. Collega il tuo repository GitHub/GitLab/Bitbucket
4. Vercel rileverà automaticamente le impostazioni da `vercel.json`

### Passo 2: Configura le Variabili d'Ambiente

1. Nel dashboard Vercel, vai su **Settings > Environment Variables**
2. Aggiungi tutte le variabili d'ambiente necessarie
3. Seleziona gli ambienti: **Production**, **Preview**, **Development**
4. Salva

### Passo 3: Configura il Database

Assicurati che il database Neon sia accessibile da Vercel:

- **Neon**: Verifica che la connection string includa `?sslmode=require`
- La connection string deve essere accessibile da internet (Neon lo è di default)

### Passo 4: Deploy

1. Vercel eseguirà automaticamente il deploy quando fai push al branch principale
2. Oppure clicca su "Deploy" nel dashboard
3. Attendi il completamento del build

### Passo 5: Verifica Post-Deployment

Dopo il deployment, verifica:

1. ✅ L'applicazione è accessibile all'URL fornito
2. ✅ Il database è connesso (testa login/registrazione)
3. ✅ Le API rispondono correttamente
4. ✅ I cookie sono configurati correttamente (verifica in DevTools)
5. ✅ CORS funziona correttamente

## 🔄 Rollback

In caso di problemi dopo il deployment:

### Vercel

1. Vai su **Deployments** nel dashboard Vercel
2. Trova la versione precedente funzionante
3. Clicca sui tre puntini (...) e seleziona **Promote to Production**

### Database

Se hai bisogno di rollback del database:

1. Usa il backup più recente
2. Ripristina usando lo strumento del tuo provider:
   - **Neon**: Dashboard > Backups > Restore
   - **Supabase**: Dashboard > Database > Backups > Restore

## 📊 Monitoraggio Post-Deployment

### Metriche da Monitorare

1. **Errori 500/400**: Controlla i log di Vercel
2. **Tempi di risposta API**: Dashboard Vercel > Analytics
3. **Tasso di registrazione/login**: Monitora le metriche utente
4. **Uso delle funzionalità**: Traccia l'uso delle feature principali

### Log

I log sono disponibili su:
- **Vercel Dashboard** > Il tuo progetto > Logs
- **Database Provider** > Logs/Queries

### Alert

Configura alert per:
- Errori critici (500)
- Tempi di risposta elevati
- Tasso di errore > 5%

## 🔒 Sicurezza Post-Deployment

### Verifiche di Sicurezza

1. ✅ HTTPS abilitato (automatico su Vercel)
2. ✅ Cookie sicuri configurati (`Secure`, `HttpOnly`)
3. ✅ CORS limitato ai domini specifici
4. ✅ JWT_SECRET non esposto nel codice
5. ✅ Variabili d'ambiente non committate

### Best Practices

- Non committare mai file `.env`
- Usa segreti forti per `JWT_SECRET`
- Limita l'accesso al database solo agli IP necessari
- Abilita 2FA su tutti gli account (Vercel, Database, ecc.)
- Monitora regolarmente i log per attività sospette

## 🐛 Troubleshooting

### Problema: Build Fallisce

**Causa comune**: Variabili d'ambiente mancanti

**Soluzione**: Verifica che tutte le variabili richieste siano configurate su Vercel

### Problema: Database Non Connesso

**Causa comune**: Connection string errata o database non accessibile

**Soluzione**: 
1. Verifica la connection string
2. Controlla che il database sia accessibile da internet
3. Verifica firewall/IP whitelist

### Problema: CORS Errors

**Causa comune**: Dominio non nella whitelist

**Soluzione**: Aggiungi il dominio in `api/utils/cors.js` e ri-deploya

### Problema: Cookie Non Funzionano

**Causa comune**: Configurazione cookie errata

**Soluzione**: Verifica che `secure` sia `true` in produzione e che il dominio sia corretto

## 📞 Supporto

In caso di problemi durante il deployment:

1. Controlla i log di Vercel
2. Verifica le variabili d'ambiente
3. Testa localmente con `npm run preview`
4. Contatta il team di sviluppo

---

**Ultimo aggiornamento**: 2025-01-XX


