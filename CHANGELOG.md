# Changelog

Tutte le modifiche notevoli a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

## [1.0.0] - 2025-01-XX

### Aggiunto
- Lancio iniziale di Nebula AI
- Sistema di chat con supporto multi-modello AI
- Autenticazione sicura con JWT e supporto per passkeys (WebAuthn)
- Gestione progetti e organizzazione chat
- Sistema di crittografia end-to-end per i messaggi
- Interfaccia personalizzabile con temi e personalizzazione
- Supporto multi-lingua (Italiano, Inglese, Spagnolo, Francese, Tedesco)
- Sistema di condivisione link per le chat
- Esportazione dati e backup
- Sistema di referral
- Generazione immagini AI
- Prompt library personalizzabile
- Modalità "Deep Research" per analisi approfondite
- Supporto per immagini nelle chat (visione AI)
- Sistema di progetti per organizzare le chat
- Impostazioni AI avanzate (temperature, max tokens, ecc.)
- Supporto per multiple API providers (OpenAI, Anthropic, Google, ecc.)
- Sistema di notifiche e feedback
- Report bug integrato
- Help center e documentazione

### Sicurezza
- Implementato CORS sicuro con whitelist di domini permessi
- Cookie sicuri con flag HttpOnly e Secure in produzione
- Validazione JWT per tutte le richieste autenticate
- Crittografia end-to-end per i messaggi
- Rate limiting per le API esterne
- Sanitizzazione input utente

### Database
- Schema PostgreSQL completo con supporto per Neon e Supabase
- Row Level Security (RLS) per isolamento dati utente
- Limite automatico di 50MB per cronologia chat per utente
- Pulizia automatica link condivisi scaduti
- Backup e restore automatici

### Performance
- Compressione risposte HTTP
- Caching intelligente per le risorse statiche
- Lazy loading dei componenti UI
- Ottimizzazione bundle size
- Streaming delle risposte AI per migliorare la UX

### Deployment
- Configurazione Vercel ottimizzata
- Variabili d'ambiente documentate
- Script di inizializzazione database
- Health check endpoints

---

## [Unreleased]

### In sviluppo
- Miglioramenti continui alle performance
- Nuove funzionalità AI
- Integrazioni aggiuntive

---

## Note sulla versione

- **Major** (X.0.0): Modifiche incompatibili con versioni precedenti
- **Minor** (0.X.0): Nuove funzionalità compatibili con versioni precedenti
- **Patch** (0.0.X): Correzioni di bug compatibili con versioni precedenti





