# 📚 Guida all'Uso del Database Neon

## ✅ Il Tuo Codice Attuale è Corretto!

Il codice che hai nel file `server.js` è già corretto e segue le best practices di Neon:

```javascript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
```

Questo è esattamente quello che serve! ✅

## 📖 Spiegazione degli Esempi del Quickstart

Gli esempi che hai visto sono per **altri framework** e **non sono necessari** per la tua implementazione:

### 1. **Next.js** (non serve)
```javascript
// Questo è per Next.js, non per Svelte
export async function getData() {
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql`SELECT * FROM posts;`;
    return data;
}
```
**Non serve** - Stai usando Svelte, non Next.js

### 2. **pg Pool** (non serve)
```javascript
// Questo è un approccio alternativo, ma @neondatabase/serverless è migliore
import { Pool } from 'pg';
```
**Non serve** - `@neondatabase/serverless` è più efficiente per Neon

### 3. **Prisma** (opzionale, per il futuro)
```prisma
// Prisma è un ORM, utile se vuoi un layer di astrazione
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}
```
**Opzionale** - Utile se vuoi un ORM, ma non necessario ora

### 4. **Drizzle** (opzionale, per il futuro)
```javascript
// Drizzle è un altro ORM
import { drizzle } from "drizzle-orm/neon-http";
```
**Opzionale** - Come Prisma, utile per il futuro ma non necessario

## 🎯 Cosa Usare Ora

Il tuo codice attuale è **perfetto**:

```javascript
// server.js - GIÀ CORRETTO ✅
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
```

## 🚀 Prossimi Passi (Opzionali)

Se vuoi salvare le chat nel database invece che in localStorage:

### 1. Inizializza le Tabelle

```bash
npm run db:init
```

Questo creerà le tabelle:
- `chats` - Per salvare le chat
- `messages` - Per salvare i messaggi
- `projects` - Per salvare i progetti

### 2. Usa il Database per Salvare le Chat

Puoi modificare `src/stores/chat.js` per salvare nel database invece che in localStorage.

## 📝 Esempi di Query Utili

### Test Connessione (già implementato)
```javascript
const response = await sql`SELECT version()`;
```

### Creare una Chat
```javascript
await sql`
  INSERT INTO chats (id, title, created_at, updated_at)
  VALUES (${chatId}, ${title}, NOW(), NOW())
`;
```

### Salvare un Messaggio
```javascript
await sql`
  INSERT INTO messages (chat_id, type, content, timestamp)
  VALUES (${chatId}, ${type}, ${content}, NOW())
`;
```

### Recuperare Chat e Messaggi
```javascript
const chat = await sql`
  SELECT * FROM chats WHERE id = ${chatId}
`;

const messages = await sql`
  SELECT * FROM messages 
  WHERE chat_id = ${chatId} 
  ORDER BY timestamp ASC
`;
```

## 🔒 Sicurezza

- ✅ Le credenziali sono nel server, non esposte al client
- ✅ Solo query SELECT sono permesse tramite API (per sicurezza)
- ✅ Usa variabili d'ambiente per produzione

## ✨ Conclusione

**Il tuo codice è già corretto!** Gli esempi del quickstart sono per altri framework. Continua a usare `@neondatabase/serverless` come stai facendo ora.

Se vuoi salvare le chat nel database, esegui `npm run db:init` e poi modifica `src/stores/chat.js` per usare le API del database invece di localStorage.

