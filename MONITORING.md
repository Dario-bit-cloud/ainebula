# 📊 Guida al Monitoraggio

Questa guida descrive come monitorare Nebula AI in produzione.

## 🔍 Metriche da Monitorare

### 1. Performance

- **Tempo di risposta API**: < 500ms per richieste normali
- **Tempo di caricamento pagina**: < 2s per first contentful paint
- **Tasso di errore**: < 1% delle richieste totali
- **Throughput**: Numero di richieste al secondo

### 2. Errori

- **Errori 500**: Errori del server (critici)
- **Errori 400**: Richieste malformate
- **Errori 401/403**: Problemi di autenticazione
- **Errori database**: Problemi di connessione o query

### 3. Utilizzo

- **Utenti attivi**: Numero di utenti che usano l'app
- **Chat create**: Numero di nuove chat al giorno
- **Messaggi inviati**: Volume di messaggi
- **Registrazioni**: Nuovi utenti

### 4. Database

- **Connessioni attive**: Numero di connessioni al database
- **Query lente**: Query che impiegano > 1s
- **Spazio utilizzato**: Dimensione del database
- **Backup**: Verifica che i backup siano completati

## 🛠️ Strumenti di Monitoraggio

### Vercel Analytics

Vercel fornisce analytics integrati:

1. Vai su **Dashboard Vercel** > Il tuo progetto > **Analytics**
2. Monitora:
   - Tempi di risposta
   - Errori
   - Traffico
   - Performance

### Log di Vercel

1. Vai su **Dashboard Vercel** > Il tuo progetto > **Logs**
2. Filtra per:
   - Errori (status 500, 400)
   - Endpoint specifici
   - Timestamp

### Database Monitoring

#### Neon

1. Vai su **Neon Dashboard** > Il tuo progetto
2. Monitora:
   - **Metrics**: CPU, memoria, connessioni
   - **Queries**: Query lente o problematiche
   - **Logs**: Log del database

#### Supabase

1. Vai su **Supabase Dashboard** > Il tuo progetto
2. Monitora:
   - **Database**: Performance e query
   - **Logs**: Log delle query
   - **Metrics**: Utilizzo risorse

## 📧 Alert e Notifiche

### Configurazione Alert

Configura alert per:

1. **Errori critici (500)**
   - Soglia: > 10 errori in 5 minuti
   - Canale: Email, Slack, Discord

2. **Tempo di risposta elevato**
   - Soglia: > 2s per il 95° percentile
   - Canale: Email

3. **Database non disponibile**
   - Soglia: Qualsiasi errore di connessione
   - Canale: Email, SMS

4. **Tasso di errore elevato**
   - Soglia: > 5% delle richieste
   - Canale: Email

### Servizi Consigliati

- **Sentry**: Monitoraggio errori in tempo reale
- **LogRocket**: Session replay e debugging
- **Datadog**: Monitoring completo
- **New Relic**: APM e monitoring

## 🔔 Setup Sentry (Consigliato)

### 1. Installa Sentry

```bash
npm install @sentry/node @sentry/svelte
```

### 2. Configurazione

Crea `src/utils/sentry.js`:

```javascript
import * as Sentry from '@sentry/svelte';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 3. Variabile d'Ambiente

Aggiungi su Vercel:
- `VITE_SENTRY_DSN`: DSN del tuo progetto Sentry

## 📈 Dashboard Personalizzato

Crea un dashboard per monitorare:

1. **Overview**
   - Utenti attivi (ultime 24h)
   - Chat create (oggi)
   - Errori (ultime 24h)
   - Tempo di risposta medio

2. **Performance**
   - Tempo di risposta per endpoint
   - Query database più lente
   - Utilizzo risorse

3. **Errori**
   - Errori per tipo
   - Errori per endpoint
   - Trend errori nel tempo

## 🚨 Procedure di Emergenza

### Database Non Disponibile

1. Verifica lo stato del provider (Neon/Supabase)
2. Controlla i log per errori di connessione
3. Verifica le variabili d'ambiente
4. Se necessario, esegui rollback a versione precedente

### Errori 500 Frequenti

1. Controlla i log di Vercel per dettagli
2. Verifica le variabili d'ambiente
3. Controlla lo stato del database
4. Se necessario, esegui rollback

### Performance Degradata

1. Verifica il carico sul database
2. Controlla query lente
3. Verifica utilizzo risorse Vercel
4. Considera scaling del database

## 📝 Logging Best Practices

### Cosa Loggare

- ✅ Errori e eccezioni
- ✅ Operazioni critiche (login, registrazione)
- ✅ Performance metrics
- ✅ Eventi di sicurezza

### Cosa NON Loggare

- ❌ Password o token sensibili
- ❌ Dati personali degli utenti
- ❌ Informazioni di pagamento
- ❌ Credenziali di accesso

### Formato Log

Usa un formato strutturato:

```javascript
console.log({
  level: 'error',
  message: 'Database connection failed',
  timestamp: new Date().toISOString(),
  userId: user.id, // Solo se necessario
  endpoint: req.path
});
```

## 🔄 Review Periodico

Esegui un review settimanale di:

1. **Metriche di performance**
2. **Errori più frequenti**
3. **Utilizzo risorse**
4. **Feedback utenti**

## 📞 Supporto

In caso di problemi:

1. Controlla i log
2. Verifica le metriche
3. Consulta questa guida
4. Contatta il team di sviluppo

---

**Ultimo aggiornamento**: 2025-01-XX





