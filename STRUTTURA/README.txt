================================================================================
                    CARTELLA STRUTTURA - INDICE
================================================================================

Questa cartella contiene tutta la documentazione del progetto Nebula AI.

--------------------------------------------------------------------------------
FILE DI DOCUMENTAZIONE PRINCIPALE
--------------------------------------------------------------------------------

1. STRUTTURA_SITO.txt
   - Struttura completa delle cartelle del progetto
   - Architettura tecnica (Frontend, Backend, Database)
   - Schema database e tabelle
   - Flusso dati dell'applicazione
   - File di configurazione

2. FUNZIONAMENTO.txt
   - Come funziona l'applicazione
   - Flussi di lavoro principali:
     * Avvio applicazione
     * Autenticazione (login, registrazione, passkeys)
     * Gestione chat
     * Chiamate AI
     * Abbonamenti e premium
     * Sistema referral
     * Link condivisi
     * Esportazione dati
     * Personalizzazione UI
     * Sicurezza
     * Performance

3. UI.txt
   - Descrizione completa dell'interfaccia utente
   - Layout principale
   - Componenti UI (Sidebar, MainArea, TopBar, UserMenu)
   - Modals e dialogs
   - Responsive design
   - Temi e stili
   - Accessibilità

4. API_KEYS.txt
   - Elenco completo di tutte le API keys utilizzate
   - Provider AI (Electron Hub, LLM7.io)
   - Credenziali database
   - JWT Secret
   - Configurazione WebAuthn
   - Dove sono configurate
   - Note di sicurezza
   - Come ottenere nuove API keys

--------------------------------------------------------------------------------
FILE DI SETUP E CONFIGURAZIONE
--------------------------------------------------------------------------------

5. API_KEY_SETUP.md
   - Come ottenere e configurare API keys di OpenRouter
   - Alternative (Electron Hub, CometAPI)
   - Risoluzione problemi comuni

6. AUTH_SETUP.md
   - Sistema di autenticazione completo
   - Setup iniziale database
   - Funzionalità (registrazione, login, logout)
   - Sicurezza implementata
   - Protezione route
   - Troubleshooting

7. CHAT_DATABASE_SETUP.md
   - Sistema chat con database
   - Struttura database per chat
   - Endpoint API chat
   - Flusso di lavoro
   - Sicurezza
   - Migrazione da localStorage

8. DATABASE_SETUP.md
   - Setup database Neon PostgreSQL
   - Come avviare il server
   - Credenziali database
   - Testare il database
   - Endpoint API disponibili
   - Risoluzione problemi

9. DATABASE_USAGE.md
   - Guida all'uso del database Neon
   - Spiegazione esempi quickstart
   - Query utili
   - Esempi di utilizzo
   - Sicurezza

10. ENCRYPTION_SETUP.md
    - Crittografia end-to-end per chat
    - Come funziona la crittografia
    - Derivazione chiavi
    - Flusso crittografia/decrittografia
    - Retrocompatibilità
    - Sicurezza implementata
    - File modificati

11. VERCEL_DEPLOY.md
    - Deploy su Vercel
    - Variabili d'ambiente richieste
    - Configurazione variabili su Vercel
    - Inizializzazione database
    - Struttura API routes
    - Verifica deploy
    - Troubleshooting

12. CLEAR_CACHE.md
    - Come pulire la cache del browser
    - Soluzioni rapide
    - Hard refresh
    - Pulizia cache manuale
    - Riavvio server dev

================================================================================
COME USARE QUESTA DOCUMENTAZIONE
================================================================================

PER INIZIARE:
1. Leggi STRUTTURA_SITO.txt per capire la struttura del progetto
2. Leggi FUNZIONAMENTO.txt per capire come funziona l'app
3. Leggi UI.txt per capire l'interfaccia utente
4. Leggi API_KEYS.txt per configurare le API keys

PER SETUP:
1. DATABASE_SETUP.md - Setup database
2. AUTH_SETUP.md - Setup autenticazione
3. API_KEY_SETUP.md - Setup API keys
4. ENCRYPTION_SETUP.md - Setup crittografia (opzionale)

PER DEPLOY:
1. VERCEL_DEPLOY.md - Deploy su Vercel
2. Configura variabili d'ambiente
3. Verifica funzionamento

PER TROUBLESHOOTING:
1. CLEAR_CACHE.md - Problemi cache
2. AUTH_SETUP.md - Problemi autenticazione
3. DATABASE_SETUP.md - Problemi database
4. VERCEL_DEPLOY.md - Problemi deploy

================================================================================



