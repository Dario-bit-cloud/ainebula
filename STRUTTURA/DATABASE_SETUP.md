# 🗄️ Setup Database Neon PostgreSQL

## Configurazione Completata

Il database Neon PostgreSQL è stato configurato e integrato nell'applicazione.

## Come Avviare

### 1. Avvia il Server API e il Client

```bash
npm run dev
```

Questo comando avvia:
- **Server API** su `http://localhost:3001` (gestisce le richieste al database)
- **Client Vite** su `http://localhost:5173` (interfaccia utente)

### 2. Avvia Separatamente (Opzionale)

Se preferisci avviare i servizi separatamente:

```bash
# Terminal 1: Server API
npm run dev:server

# Terminal 2: Client
npm run dev:client
```

## Credenziali Database

Le credenziali del database sono configurate nel file `server.js`:
- **Host**: `ep-spring-leaf-ads75xz2-pooler.c-2.us-east-1.aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`

> **Nota**: Per produzione, usa variabili d'ambiente invece di hardcodare le credenziali.

## Testare il Database

1. Avvia l'applicazione con `npm run dev`
2. Nella sidebar, clicca su **"Test Database"**
3. La pagina di test si aprirà automaticamente e testerà la connessione
4. Puoi eseguire query SQL SELECT per testare il database

## Endpoint API Disponibili

### `GET /api/db/test`
Testa la connessione al database e restituisce la versione di PostgreSQL.

### `GET /api/db/info`
Ottiene informazioni sul database (tabelle disponibili).

### `POST /api/db/query`
Esegue una query SELECT personalizzata.

**Esempio:**
```json
{
  "query": "SELECT NOW() as current_time, version() as postgres_version"
}
```

## Sicurezza

- Solo query **SELECT** sono permesse per sicurezza
- Le credenziali del database sono nel server, non esposte al client
- Il server API è protetto da CORS

## Risoluzione Problemi

### Errore: "Cannot connect to database"
- Verifica che il server API sia in esecuzione su `http://localhost:3001`
- Controlla che le credenziali nel file `server.js` siano corrette
- Verifica la connessione internet

### Errore: "Connection refused"
- Assicurati che il server API sia avviato prima del client
- Controlla che la porta 3001 non sia già in uso

### Errore: "CORS error"
- Il server API è configurato per accettare richieste da `localhost:5173`
- Se usi una porta diversa, aggiorna la configurazione CORS in `server.js`

## Prossimi Passi

- [ ] Creare tabelle per salvare le chat
- [ ] Implementare persistenza delle chat nel database
- [ ] Aggiungere autenticazione utente
- [ ] Configurare variabili d'ambiente per produzione

