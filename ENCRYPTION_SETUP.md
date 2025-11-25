# Crittografia End-to-End per le Chat

## Panoramica

È stata implementata la crittografia end-to-end per proteggere i messaggi delle chat dagli attacchi hacker. I messaggi vengono crittografati lato client prima di essere inviati al server, garantendo che anche in caso di compromissione del database, i messaggi rimangano sicuri.

## Come Funziona

### 1. Derivazione della Chiave
- La chiave di crittografia viene derivata dalla password dell'utente usando **PBKDF2** con 100.000 iterazioni
- Ogni utente ha una chiave unica basata sulla propria password e ID utente
- La chiave viene memorizzata in modo sicuro nel localStorage (formato JWK)

### 2. Crittografia dei Messaggi
- Algoritmo: **AES-GCM** (256 bit)
- Ogni messaggio viene crittografato con un **IV (Initialization Vector)** casuale unico
- I messaggi crittografati sono identificati dal prefisso `encrypted:`

### 3. Flusso di Crittografia

**Al Login/Registrazione:**
1. L'utente inserisce la password
2. Viene derivata la chiave di crittografia dalla password
3. La chiave viene memorizzata per la sessione corrente

**Al Salvataggio Chat:**
1. I messaggi vengono crittografati lato client prima dell'invio
2. Solo i messaggi crittografati vengono inviati al server
3. Il server memorizza i messaggi crittografati (non può leggerli)

**Al Caricamento Chat:**
1. I messaggi crittografati vengono scaricati dal server
2. Vengono decrittografati lato client usando la chiave dell'utente
3. I messaggi decrittografati vengono mostrati all'utente

## Retrocompatibilità

- I messaggi esistenti non crittografati continuano a funzionare
- Quando vengono salvati di nuovo, vengono automaticamente crittografati
- Se la chiave di crittografia non è disponibile, i messaggi vengono salvati in chiaro (fallback)

## Sicurezza

### Protezioni Implementate:
- ✅ Crittografia AES-GCM a 256 bit
- ✅ IV casuale per ogni messaggio
- ✅ Derivazione chiave con PBKDF2 (100.000 iterazioni)
- ✅ Chiave unica per utente
- ✅ Crittografia lato client (il server non può leggere i messaggi)

### Limitazioni:
- La chiave viene memorizzata nel localStorage (protetta dalla stessa password)
- Se l'utente perde la password, i messaggi crittografati non possono essere recuperati
- Per una sicurezza ancora maggiore, si potrebbe richiedere la password ad ogni accesso

## File Modificati

1. **src/services/encryptionService.js** (NUOVO)
   - Servizio completo per crittografia/decrittografia
   - Derivazione chiavi
   - Gestione chiavi memorizzate

2. **src/services/chatService.js**
   - Integrazione crittografia nel salvataggio chat
   - Integrazione decrittografia nel caricamento chat

3. **src/services/authService.js**
   - Inizializzazione crittografia al login/registrazione
   - Pulizia chiavi al logout/eliminazione account

## Note per gli Utenti

- **Prima volta**: Dopo il login, la crittografia viene inizializzata automaticamente
- **Chat esistenti**: Le chat esistenti vengono crittografate automaticamente al prossimo salvataggio
- **Sicurezza**: I messaggi sono protetti anche se il database viene compromesso
- **Password**: È importante non perdere la password, altrimenti i messaggi crittografati non possono essere recuperati

## Test

Per testare la crittografia:
1. Fai login con un account
2. Crea una nuova chat e invia alcuni messaggi
3. Controlla nel database che i messaggi siano crittografati (prefisso `encrypted:`)
4. Ricarica la pagina e verifica che i messaggi vengano decrittografati correttamente

