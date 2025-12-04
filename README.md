# Nebula AI

Interfaccia AI moderna e elegante ispirata a ChatGPT, costruita con Svelte.

## 🚀 Caratteristiche

- 🎨 Interfaccia dark mode moderna e personalizzabile
- 📱 Design responsive e ottimizzato per mobile
- ⚡ Velocità e reattività grazie a Svelte 5
- 💬 Chat interattiva con supporto multi-modello AI
- 🔐 Autenticazione sicura con JWT e passkeys (WebAuthn)
- 🗄️ Gestione progetti e organizzazione chat
- 🔒 Crittografia end-to-end per i messaggi
- 🌍 Supporto multi-lingua (IT, EN, ES, FR, DE)
- 📤 Sistema di condivisione link per le chat
- 💾 Esportazione dati e backup
- 🎨 Generazione immagini AI
- 📚 Prompt library personalizzabile
- 🔬 Modalità "Deep Research" per analisi approfondite

## 📋 Requisiti

- **Node.js**: >= 20.x
- **npm**: >= 9.x
- **Database**: PostgreSQL (Neon o Supabase)

## 🛠️ Installazione

### 1. Clona il repository

```bash
git clone https://github.com/tuonome/nebula-ai.git
cd nebula-ai
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura le variabili d'ambiente

Copia il file `ENV_VARIABLES_TEMPLATE.txt` e crea un file `.env` con le tue configurazioni.

**Variabili richieste:**
- `DATABASE_URL` - Connection string PostgreSQL (Neon o Supabase)
- `JWT_SECRET` - Chiave segreta per JWT (genera una stringa casuale di almeno 32 caratteri)
- `NODE_ENV` - Ambiente (development/production)

**Variabili opzionali:**
- `DATABASE_URL_UNPOOLED` - Connection string senza pooling
- `NEBULA_POSTGRES_URL` - URL PostgreSQL Supabase (con pooling)
- `NEBULA_POSTGRES_URL_NON_POOLING` - URL PostgreSQL Supabase (senza pooling)
- `VITE_SUPABASE_URL` - URL Supabase per client-side
- `VITE_SUPABASE_ANON_KEY` - Chiave anonima Supabase
- `WEBAUTHN_RP_ID` - ID per WebAuthn (default: ainebula.vercel.app)
- `WEBAUTHN_RP_NAME` - Nome per WebAuthn (default: Nebula AI)
- `WEBAUTHN_ORIGIN` - Origin per WebAuthn (default: https://ainebula.vercel.app)

Per maggiori dettagli, consulta `ENV_VARIABLES_TEMPLATE.txt`.

### 4. Inizializza il database

**Opzione A: Neon Database**
```bash
npm run db:init
```

**Opzione B: Supabase**
```bash
npm run db:init-supabase
```

Oppure esegui manualmente lo script SQL in `database/schema.sql` o `database/supabase-schema.sql` nel tuo database.

### 5. Applica Row Level Security (RLS) - Solo per Supabase

```bash
npm run db:rls
```

## 🏃 Sviluppo

### Avvia il server di sviluppo

```bash
npm run dev
```

Questo avvia sia il server API (porta 3001) che il client Vite (porta 5173).

Apri [http://localhost:5173](http://localhost:5173) nel browser.

### Script disponibili

- `npm run dev` - Avvia server e client in modalità sviluppo
- `npm run dev:server` - Avvia solo il server API
- `npm run dev:client` - Avvia solo il client Vite
- `npm run build` - Build per produzione
- `npm run preview` - Preview del build di produzione
- `npm run db:init` - Inizializza database Neon
- `npm run db:init-supabase` - Inizializza database Supabase
- `npm run db:rls` - Applica Row Level Security
- `npm run db:test` - Testa connessione database
- `npm run pre-deploy` - Verifica pre-deployment

## 🏗️ Build per Produzione

### 1. Verifica pre-deployment

```bash
npm run pre-deploy
```

Questo script verifica che tutte le configurazioni siano corrette.

### 2. Build

```bash
npm run build
```

Il build verrà creato nella cartella `dist/`.

### 3. Deploy su Vercel

Il progetto è configurato per essere deployato su Vercel:

1. Collega il repository a Vercel
2. Configura le variabili d'ambiente nel dashboard Vercel
3. Vercel rileverà automaticamente le impostazioni da `vercel.json`

**Importante**: Assicurati di configurare tutte le variabili d'ambiente su Vercel prima del deploy.

## 🔒 Sicurezza

### CORS

Il progetto implementa CORS sicuro con whitelist di domini permessi. I domini consentiti sono configurati in `api/utils/cors.js`.

### Cookie

I cookie di autenticazione sono configurati con:
- `HttpOnly`: Previene accesso via JavaScript
- `Secure`: Solo su HTTPS in produzione
- `SameSite`: Lax per prevenire CSRF

### JWT

Tutti i token JWT sono verificati lato server e hanno una scadenza di 7 giorni.

### Crittografia

I messaggi possono essere crittografati end-to-end lato client prima di essere salvati nel database.

## 📊 Database

### Schema

Il database include le seguenti tabelle principali:

- `users` - Utenti
- `sessions` - Sessioni utente
- `chats` - Chat
- `messages` - Messaggi delle chat
- `projects` - Progetti
- `user_settings` - Impostazioni utente
- `shared_links` - Link condivisi
- `data_exports` - Esportazioni dati
- `passkeys` - Passkeys (WebAuthn)
- `referrals` - Sistema referral

### Limiti

- **Cronologia chat**: 50MB per utente (i messaggi più vecchi vengono rimossi automaticamente)
- **Link condivisi**: Scadenza automatica dopo 50 giorni

## 🐛 Troubleshooting

### Errore: "Connection string PostgreSQL non trovata"

Verifica che le variabili d'ambiente siano configurate correttamente. Controlla `ENV_VARIABLES_TEMPLATE.txt` per la lista completa.

### Errore: "Token non valido"

- Verifica che `JWT_SECRET` sia configurato e sia lo stesso su server e client
- Controlla che il token non sia scaduto (7 giorni)

### Errore CORS

Verifica che il dominio sia nella whitelist in `api/utils/cors.js`.

### Database non inizializzato

Esegui `npm run db:init` o `npm run db:init-supabase` a seconda del provider che usi.

## 📚 Documentazione

- `CHANGELOG.md` - Storico delle versioni
- `ENV_VARIABLES_TEMPLATE.txt` - Template variabili d'ambiente
- `INIZIALIZZA_DATABASE.md` - Guida inizializzazione database
- `NEON_SETUP.md` - Setup Neon Database

## 🤝 Contribuire

1. Fork il repository
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è proprietario. Tutti i diritti riservati.

## 🆘 Supporto

Per problemi o domande:
- Apri una issue su GitHub
- Contatta il team di sviluppo

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2025-01-XX

