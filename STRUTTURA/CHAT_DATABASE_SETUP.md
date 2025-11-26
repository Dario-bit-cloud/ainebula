# 💬 Sistema Chat con Database

## ✅ Implementazione Completata!

Le chat sono ora salvate nel database e accessibili solo agli utenti autenticati.

## 🎯 Funzionalità

### 1. **Salvataggio nel Database**
- ✅ Le chat vengono salvate automaticamente nel database quando l'utente è autenticato
- ✅ Ogni chat è collegata all'utente (`user_id`)
- ✅ I messaggi sono salvati nella tabella `messages`
- ✅ Le chat temporanee non vengono salvate

### 2. **Accesso Protetto**
- ✅ Solo gli utenti autenticati possono vedere le proprie chat
- ✅ Le chat sono filtrate per `user_id` nel database
- ✅ Gli endpoint API sono protetti con `authenticateToken`

### 3. **Sincronizzazione**
- ✅ Al login, le chat vengono caricate dal database
- ✅ Le chat da localStorage vengono migrate automaticamente al database al primo login
- ✅ Se non autenticato, le chat vengono salvate solo in localStorage

## 📊 Struttura Database

### Tabella `chats`
- `id` - ID univoco della chat
- `user_id` - ID dell'utente proprietario
- `title` - Titolo della chat
- `project_id` - ID del progetto (opzionale)
- `created_at` - Data di creazione
- `updated_at` - Data di ultimo aggiornamento
- `is_temporary` - Se è una chat temporanea

### Tabella `messages`
- `id` - ID univoco del messaggio
- `chat_id` - ID della chat
- `type` - Tipo ('user' o 'ai')
- `content` - Contenuto del messaggio
- `hidden` - Se il messaggio è nascosto
- `timestamp` - Timestamp del messaggio

## 🔌 Endpoint API

### `GET /api/chat`
Ottiene tutte le chat dell'utente autenticato.

**Autenticazione**: Richiesta (Bearer token)

**Risposta**:
```json
{
  "success": true,
  "chats": [
    {
      "id": "...",
      "title": "...",
      "messages": [...],
      "projectId": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### `POST /api/chat`
Salva o aggiorna una chat.

**Autenticazione**: Richiesta (Bearer token)

**Body**:
```json
{
  "id": "chat-id",
  "title": "Titolo chat",
  "messages": [...],
  "projectId": null,
  "isTemporary": false
}
```

### `DELETE /api/chat/:chatId`
Elimina una chat.

**Autenticazione**: Richiesta (Bearer token)

### `PATCH /api/chat/:chatId`
Aggiorna una chat (titolo, progetto).

**Autenticazione**: Richiesta (Bearer token)

**Body**:
```json
{
  "title": "Nuovo titolo",
  "projectId": "project-id"
}
```

## 🔄 Flusso di Lavoro

### Quando l'utente è autenticato:
1. **Login/Registrazione** → Carica chat dal database
2. **Crea nuova chat** → Salvata nel database
3. **Aggiunge messaggio** → Chat aggiornata nel database
4. **Elimina chat** → Rimossa dal database
5. **Modifica chat** → Aggiornata nel database

### Quando l'utente NON è autenticato:
1. Le chat vengono salvate solo in localStorage
2. Al login, le chat vengono migrate al database
3. Dopo la migrazione, localStorage viene pulito

## 🛡️ Sicurezza

- ✅ Tutti gli endpoint chat richiedono autenticazione
- ✅ Le query filtrano per `user_id` - impossibile vedere chat di altri utenti
- ✅ Verifica della proprietà della chat prima di eliminare/aggiornare
- ✅ Le chat temporanee non vengono salvate nel database

## 📝 Note

- Le chat vengono salvate automaticamente quando:
  - Si aggiunge un messaggio
  - Si modifica un messaggio
  - Si elimina un messaggio
  - Si cambia il titolo o il progetto

- Le chat temporanee vengono ignorate dal database

- La migrazione da localStorage al database avviene automaticamente al primo login

## 🚀 Prossimi Passi (Opzionali)

- [ ] Sincronizzazione in tempo reale tra dispositivi
- [ ] Backup automatico delle chat
- [ ] Esportazione chat in formato JSON/PDF
- [ ] Ricerca full-text nei messaggi
- [ ] Versioning delle chat (cronologia modifiche)

