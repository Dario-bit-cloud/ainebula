# 🚀 Guida Setup Neon Database

Questa guida spiega come configurare e usare Neon Database con il progetto.

## 📋 Prerequisiti

- Account Neon (gratuito su [neon.tech](https://neon.tech))
- Progetto Neon creato
- Variabili d'ambiente configurate

## 🔧 Setup Iniziale

### 1. Ottieni le Connection Strings da Neon

1. Vai su [Neon Dashboard](https://console.neon.tech)
2. Seleziona il tuo progetto
3. Vai su **Connection Details**
4. Copia le connection strings:

   - **Connection string** (con pooling) → `DATABASE_URL`
     ```
     postgresql://user:password@host/database?sslmode=require
     ```
   
   - **Connection string** (senza pooling) → `DATABASE_URL_UNPOOLED`
     ```
     postgresql://user:password@host/database?sslmode=require
     ```

### 2. Configura le Variabili d'Ambiente

#### Per sviluppo locale (`.env`):

```env
# Neon Database (priorità alta)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@host/database?sslmode=require
```

#### Per Vercel:

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **Environment Variables**
2. Aggiungi:
   - `DATABASE_URL` = Connection string con pooling
   - `DATABASE_URL_UNPOOLED` = Connection string senza pooling (opzionale)
3. Seleziona gli ambienti: **Production**, **Preview**, **Development**
4. Salva e **redeploy**

## 💻 Utilizzo nel Codice

### Pattern Base

Il progetto usa `@neondatabase/serverless`, perfetto per ambienti serverless:

```javascript
import { neon } from '@neondatabase/serverless';

// La connection string viene letta automaticamente da DATABASE_URL
const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

// Query semplice
const data = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Esempi Pratici

#### Query con parametri (sicura)

```javascript
// ✅ CORRETTO: I parametri vengono sanitizzati automaticamente
const user = await sql`SELECT * FROM users WHERE email = ${email}`;
```

#### Query complessa

```javascript
const chats = await sql`
  SELECT 
    c.id,
    c.title,
    c.created_at,
    COUNT(m.id) as message_count
  FROM chats c
  LEFT JOIN messages m ON c.id = m.chat_id
  WHERE c.user_id = ${userId}
  GROUP BY c.id
  ORDER BY c.created_at DESC
`;
```

#### Inserimento dati

```javascript
const result = await sql`
  INSERT INTO chats (user_id, title, created_at)
  VALUES (${userId}, ${title}, NOW())
  RETURNING *
`;
const newChat = result[0];
```

#### Transazioni

```javascript
const result = await sql.begin(async (tx) => {
  // Query 1
  await tx`UPDATE users SET credits = credits - 10 WHERE id = ${userId}`;
  
  // Query 2
  await tx`INSERT INTO transactions (user_id, amount) VALUES (${userId}, -10)`;
  
  // Query 3: ritorna il risultato
  const user = await tx`SELECT * FROM users WHERE id = ${userId}`;
  return user[0];
});
```

## 🔍 Priorità Connection Strings

Il codice controlla nell'ordine:

1. `DATABASE_URL` (Neon - con pooling) ⭐ **Consigliato**
2. `DATABASE_URL_UNPOOLED` (Neon - senza pooling)
3. `NEBULA_POSTGRES_URL` (Supabase - con pooling)
4. `NEBULA_POSTGRES_URL_NON_POOLING` (Supabase - senza pooling)

## ⚠️ Note Importanti

### Pooling vs Non-Pooling

- **Con pooling** (`DATABASE_URL`): Consigliato per serverless/Vercel
  - Gestisce automaticamente le connessioni
  - Ottimizzato per ambienti serverless
  - Limite di connessioni gestito automaticamente

- **Senza pooling** (`DATABASE_URL_UNPOOLED`): Per operazioni specifiche
  - Connessione diretta al database
  - Utile per migrazioni o operazioni batch
  - Richiede gestione manuale delle connessioni

### Sicurezza

- ✅ **SEMPRE** usa template literals con parametri:
  ```javascript
  sql`SELECT * FROM users WHERE id = ${userId}` // ✅ Sicuro
  ```

- ❌ **MAI** concatenare stringhe:
  ```javascript
  sql.unsafe(`SELECT * FROM users WHERE id = ${userId}`) // ❌ Pericoloso!
  ```

### Performance

- Ogni query con `@neondatabase/serverless` è una richiesta HTTP separata
- Perfetto per serverless (Vercel, Cloudflare Workers, etc.)
- Non richiede gestione di pool di connessioni
- Le transazioni sono supportate tramite `sql.begin()`

## 🧪 Test Connessione

### Test rapido

```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const result = await sql`SELECT version()`;
console.log('PostgreSQL version:', result[0].version);
```


## 📚 Risorse

- [Neon Documentation](https://neon.tech/docs)
- [@neondatabase/serverless Docs](https://github.com/neondatabase/serverless)
- [Neon Serverless Driver Guide](https://neon.tech/docs/serverless/serverless-driver)

## 🆘 Troubleshooting

### Errore: "Connection string non trovata"

- Verifica che `DATABASE_URL` sia configurata in `.env` (locale) o Vercel
- Controlla che la variabile sia disponibile nell'ambiente corretto

### Errore: "SSL required"

- Assicurati che la connection string includa `?sslmode=require`
- Neon richiede sempre SSL

### Errore: "Connection timeout"

- Verifica che la connection string sia corretta
- Controlla che il progetto Neon sia attivo
- Prova con `DATABASE_URL_UNPOOLED` se il pooling causa problemi

### Query lente

- Usa indici appropriati sulle colonne usate in WHERE/JOIN
- Limita i risultati con `LIMIT`
- Considera paginazione per grandi dataset

## ✅ Checklist Setup

- [ ] Account Neon creato
- [ ] Progetto Neon creato
- [ ] Connection strings copiate
- [ ] `DATABASE_URL` configurata in `.env` (locale)
- [ ] `DATABASE_URL` configurata su Vercel
- [ ] Test connessione riuscito
- [ ] Schema database inizializzato (se necessario)

---

**Nota**: Il progetto supporta sia Neon che Supabase PostgreSQL. Se usi Neon, configura `DATABASE_URL` e il codice lo userà automaticamente.

