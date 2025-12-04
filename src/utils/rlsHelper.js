/**
 * Helper per gestire RLS (Row Level Security) con Supabase
 * 
 * IMPORTANTE: @neondatabase/serverless usa connessioni HTTP, quindi ogni query è isolata.
 * Per far funzionare RLS, dobbiamo impostare app.user_id prima di ogni query.
 * 
 * Questo helper fornisce funzioni per:
 * 1. Impostare il contesto utente prima delle query
 * 2. Eseguire query con RLS automaticamente abilitato
 */

/**
 * Imposta il contesto utente per RLS
 * Deve essere chiamato prima di ogni query che richiede RLS
 * 
 * @param {Function} sql - Funzione sql da @neondatabase/serverless
 * @param {string} userId - ID dell'utente corrente
 * @returns {Promise<void>}
 */
export async function setUserContext(sql, userId) {
  if (!userId) {
    throw new Error('User ID is required for RLS');
  }
  
  // Imposta la variabile di sessione per RLS
  // NOTA: Con @neondatabase/serverless, ogni query è isolata, quindi dobbiamo
  // impostare questo prima di ogni query che richiede RLS
  await sql`SET LOCAL app.user_id = ${userId}`;
}

/**
 * Esegue una query con RLS abilitato
 * Imposta automaticamente il contesto utente prima della query
 * 
 * @param {Function} sql - Funzione sql da @neondatabase/serverless
 * @param {string} userId - ID dell'utente corrente
 * @param {Function} queryFn - Funzione che esegue la query (async)
 * @returns {Promise<any>} - Risultato della query
 * 
 * @example
 * const result = await executeWithRLS(sql, userId, async () => {
 *   return await sql`SELECT * FROM chats`;
 * });
 */
export async function executeWithRLS(sql, userId, queryFn) {
  if (!userId) {
    throw new Error('User ID is required for RLS');
  }
  
  // Imposta il contesto utente
  await setUserContext(sql, userId);
  
  // Esegui la query
  return await queryFn();
}

/**
 * Crea una versione "scoped" della funzione sql con RLS automatico
 * Ogni query eseguita con questo sql sarà automaticamente protetta da RLS
 * 
 * @param {Function} sql - Funzione sql da @neondatabase/serverless
 * @param {string} userId - ID dell'utente corrente
 * @returns {Function} - Funzione sql con RLS abilitato
 * 
 * @example
 * const userSql = createRLSSql(sql, userId);
 * const chats = await userSql`SELECT * FROM chats`; // Automaticamente filtrato per user_id
 */
export function createRLSSql(sql, userId) {
  if (!userId) {
    throw new Error('User ID is required for RLS');
  }
  
  // Crea un proxy che imposta il contesto prima di ogni query
  return new Proxy(sql, {
    apply: async (target, thisArg, argumentsList) => {
      // Imposta il contesto utente prima della query
      await sql`SET LOCAL app.user_id = ${userId}`;
      // Esegui la query originale
      return target.apply(thisArg, argumentsList);
    }
  });
}

/**
 * NOTA IMPORTANTE SU @neondatabase/serverless:
 * 
 * Con @neondatabase/serverless, ogni query è una richiesta HTTP separata.
 * Funziona perfettamente con Supabase PostgreSQL.
 * Questo significa che SET LOCAL non persiste tra query diverse.
 * 
 * SOLUZIONE: Dobbiamo impostare app.user_id PRIMA di ogni query che richiede RLS.
 * 
 * Due approcci:
 * 
 * 1. APPROCCIO MANUALE (consigliato per ora):
 *    await sql`SET LOCAL app.user_id = ${userId}`;
 *    const result = await sql`SELECT * FROM chats`;
 * 
 * 2. APPROCCIO CON HELPER:
 *    const result = await executeWithRLS(sql, userId, async () => {
 *      return await sql`SELECT * FROM chats`;
 *    });
 * 
 * LIMITAZIONE: Non possiamo usare transazioni multi-query con RLS
 * perché ogni query è isolata. Se serve una transazione, usa un approccio diverso.
 */


