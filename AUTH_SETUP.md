# 🔐 Sistema di Autenticazione

## ✅ Sistema Completato!

Il sistema di login/registrazione è stato completamente integrato nell'applicazione.

## 🚀 Come Funziona

### 1. **Database Schema**
- Tabella `users` - Memorizza email, username, password hash
- Tabella `sessions` - Gestisce le sessioni con token JWT
- Le chat e i progetti sono collegati agli utenti

### 2. **Endpoint API** (`server.js`)
- `POST /api/auth/register` - Registrazione nuovo utente
- `POST /api/auth/login` - Login utente esistente
- `GET /api/auth/me` - Verifica sessione corrente
- `POST /api/auth/logout` - Logout e rimozione sessione

### 3. **Componenti UI**
- `AuthModal.svelte` - Modal per login/registrazione
- Integrato in `App.svelte` - Mostra automaticamente se non autenticato
- `UserMenu.svelte` - Mostra info utente e logout

### 4. **Store e Servizi**
- `src/stores/auth.js` - Gestisce stato autenticazione
- `src/services/authService.js` - Funzioni per chiamare API

## 📋 Setup Iniziale

### 1. Inizializza il Database

```bash
npm run db:init
```

Questo creerà le tabelle:
- `users`
- `sessions`
- `chats` (con `user_id`)
- `projects` (con `user_id`)
- `messages`

### 2. Avvia il Server

```bash
npm run dev
```

## 🎯 Funzionalità

### Registrazione
- Email univoca
- Username univoco
- Password minimo 6 caratteri
- Hash password con bcrypt
- Creazione sessione automatica

### Login
- Login con email o username
- Verifica password
- Creazione sessione JWT (valida 7 giorni)
- Salvataggio token in localStorage

### Sicurezza
- Password hashate con bcrypt (10 rounds)
- Token JWT firmati
- Sessioni salvate nel database
- Verifica sessione ad ogni richiesta
- CORS configurato

### Logout
- Rimozione sessione dal database
- Pulizia localStorage
- Reindirizzamento al login

## 🔧 Configurazione

### Variabili d'Ambiente (Opzionale)

Crea un file `.env` nella root:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-change-in-production
```

**⚠️ IMPORTANTE**: Cambia `JWT_SECRET` in produzione!

## 📝 Esempio di Utilizzo

### Registrazione
1. L'app si apre
2. Se non autenticato, mostra modal di login
3. Clicca su "Registrati"
4. Inserisci email, username, password
5. Clicca "Registrati"
6. Sei automaticamente loggato

### Login
1. Apri l'app
2. Modal di login appare automaticamente
3. Inserisci email/username e password
4. Clicca "Accedi"
5. Sei loggato

### Logout
1. Clicca sul menu utente (in basso a sinistra)
2. Clicca su "Esci"
3. Conferma
4. Vieni disconnesso e il modal di login riappare

## 🛡️ Protezione Route

Per proteggere endpoint API, usa il middleware `authenticateToken`:

```javascript
app.get('/api/protected', authenticateToken, async (req, res) => {
  // req.user contiene i dati dell'utente
  res.json({ user: req.user });
});
```

## 🔄 Prossimi Passi

- [ ] Salvare le chat nel database per utente
- [ ] Sincronizzazione chat tra dispositivi
- [ ] Recupero password
- [ ] Verifica email
- [ ] Profilo utente

## ⚠️ Note Importanti

1. **JWT_SECRET**: Cambia il secret in produzione!
2. **Password**: Le password sono hashate, mai salvate in chiaro
3. **Sessioni**: Le sessioni scadono dopo 7 giorni
4. **Database**: Assicurati che il database sia inizializzato

## 🐛 Risoluzione Problemi

### "Errore nella comunicazione con il server"
- Verifica che il server API sia avviato (`npm run dev:server`)
- Controlla che la porta 3001 non sia occupata

### "Email o username già in uso"
- Usa un'email o username diverso
- Verifica nel database se l'utente esiste

### "Token non valido"
- Fai logout e login di nuovo
- Verifica che il JWT_SECRET sia corretto

### Modal di login non appare
- Verifica che `initAuth()` sia chiamato in `App.svelte`
- Controlla la console per errori

