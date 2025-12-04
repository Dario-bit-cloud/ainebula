# 🚀 CHECKLIST FINALE PER IL LANCIO GLOBALE

## ✅ PRE-DEPLOYMENT (Completato)

- [x] Database Neon configurato e inizializzato
- [x] Tutte le tabelle create (`npm run db:init`)
- [x] Riferimenti a Supabase rimossi
- [x] CORS configurato per produzione
- [x] Cookie sicuri implementati
- [x] Script di verifica pre-deployment funzionante
- [x] Documentazione completa

## 🔐 VARIABILI D'AMBIENTE SU VERCEL

**IMPORTANTE**: Configura queste variabili nel dashboard Vercel:
**Settings > Environment Variables**

### Variabili RICHIESTE:

- [ ] `DATABASE_URL` - Connection string Neon (con pooling)
  - Vai su Neon Dashboard > Il tuo progetto > Connection Details
  - Copia "Connection string" (con pooling)
  - Formato: `postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require`

- [ ] `JWT_SECRET` - Chiave segreta JWT (minimo 32 caratteri)
  - Genera con: `openssl rand -base64 32` (Linux/Mac)
  - O PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`

- [ ] `NODE_ENV` - Imposta a `production`

### Variabili OPZIONALI (ma consigliate):

- [ ] `DATABASE_URL_UNPOOLED` - Connection string Neon (senza pooling)
  - Stesso processo, ma usa "Connection string" (senza pooling)

- [ ] `WEBAUTHN_RP_ID` - ID per WebAuthn (default: `ainebula.vercel.app`)

- [ ] `WEBAUTHN_RP_NAME` - Nome per WebAuthn (default: `Nebula AI`)

- [ ] `WEBAUTHN_ORIGIN` - Origin per WebAuthn (default: `https://ainebula.vercel.app`)

## 🗄️ DATABASE

- [ ] Database Neon creato e attivo
- [ ] Tabelle inizializzate (`npm run db:init`)
- [ ] Test di connessione riuscito
- [ ] Backup eseguito (opzionale ma consigliato)

## 🧪 TEST LOCALI

Prima del deployment, testa localmente:

```bash
# 1. Build
npm run build

# 2. Preview
npm run preview

# 3. Verifica pre-deployment
npm run pre-deploy
```

- [ ] Build completato senza errori
- [ ] Preview funziona correttamente
- [ ] Verifica pre-deployment passata

## 🌐 DEPLOYMENT SU VERCEL

### Passo 1: Collega Repository

- [ ] Repository GitHub/GitLab/Bitbucket collegato a Vercel
- [ ] Vercel ha rilevato automaticamente le impostazioni da `vercel.json`

### Passo 2: Configura Variabili d'Ambiente

- [ ] Tutte le variabili richieste configurate
- [ ] Variabili impostate per: **Production**, **Preview**, **Development**

### Passo 3: Deploy

- [ ] Push al branch principale o deploy manuale
- [ ] Build completato con successo
- [ ] Nessun errore nei log

### Passo 4: Verifica Post-Deployment

- [ ] Applicazione accessibile all'URL: `https://ainebula.vercel.app`
- [ ] Database connesso (testa login/registrazione)
- [ ] API rispondono correttamente
- [ ] Cookie configurati correttamente (verifica in DevTools)
- [ ] CORS funziona correttamente

## 🧪 TEST FUNZIONALITÀ

Dopo il deployment, testa tutte le funzionalità principali:

- [ ] **Registrazione** nuovo utente
- [ ] **Login** utente esistente
- [ ] **Creazione chat**
- [ ] **Invio messaggi**
- [ ] **Salvataggio chat** (verifica che si salvino nel database)
- [ ] **Caricamento chat** esistenti
- [ ] **Gestione progetti**
- [ ] **Condivisione link**
- [ ] **Logout**

## 📊 MONITORAGGIO

Nei primi 24-48 ore dopo il lancio:

- [ ] Monitora errori nei log Vercel
- [ ] Verifica metriche di performance
- [ ] Controlla uso database
- [ ] Testa su browser diversi (Chrome, Firefox, Safari, Edge)
- [ ] Testa su dispositivi mobili

## 🔒 SICUREZZA

Verifica che:

- [ ] HTTPS abilitato (automatico su Vercel)
- [ ] Cookie sicuri (`Secure`, `HttpOnly`, `SameSite`)
- [ ] CORS limitato ai domini specifici
- [ ] `JWT_SECRET` non esposto nel codice
- [ ] Variabili d'ambiente non committate

## 🚨 ROLLBACK PLAN

In caso di problemi critici:

1. Vai su **Vercel Dashboard > Deployments**
2. Trova versione precedente funzionante
3. Clicca **Promote to Production**

## 📝 NOTE IMPORTANTI

- **Dominio produzione**: `https://ainebula.vercel.app`
- **Database**: Neon PostgreSQL
- **Autenticazione**: JWT + bcrypt
- **Backend**: Express.js su Vercel Serverless Functions
- **Frontend**: Svelte + Vite

## ✅ PRONTO PER IL LANCIO?

Se tutte le checklist sono completate, sei pronto per il lancio globale! 🚀

---

## 🎯 TEST RAPIDI POST-DEPLOYMENT

Dopo il deployment, esegui questi test rapidi per verificare che tutto funzioni:

### Test 1: Health Check
```bash
curl https://ainebula.vercel.app/api/health
# Dovrebbe restituire: {"status":"ok"}
```

### Test 2: Registrazione
1. Vai su `https://ainebula.vercel.app`
2. Clicca "Registrati"
3. Inserisci username e password
4. Verifica che la registrazione funzioni

### Test 3: Login
1. Fai login con l'account appena creato
2. Verifica che vieni reindirizzato alla dashboard
3. Controlla in DevTools > Application > Cookies che `auth_token` sia presente

### Test 4: Creazione Chat
1. Crea una nuova chat
2. Invia un messaggio
3. Ricarica la pagina
4. Verifica che la chat sia ancora presente (salvata nel database)

## 📞 SUPPORTO RAPIDO

Se qualcosa non funziona:

1. **Controlla i log Vercel**: Dashboard > Il tuo progetto > Logs
2. **Verifica variabili d'ambiente**: Settings > Environment Variables
3. **Testa connessione database**: Esegui `npm run db:test` localmente
4. **Verifica build**: Controlla che il build sia completato senza errori

---

**Data preparazione**: 2025-01-XX  
**Versione**: 1.0.0  
**Stato**: ✅ Pronto per il lancio

