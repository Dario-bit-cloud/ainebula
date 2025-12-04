/**
 * Helper per eseguire query con RLS su Supabase
 * 
 * IMPORTANTE: Con @neondatabase/serverless (HTTP), ogni query è isolata.
 * Per far funzionare RLS, dobbiamo eseguire SET LOCAL nella stessa "sessione".
 * 
 * Questo helper usa sql.unsafe() per eseguire SET LOCAL + query in una singola chiamata.
 */

/**
 * Esegue una query con RLS abilitato
 * Combina SET LOCAL app.user_id con la query in una singola esecuzione
 * 
 * @param {Function} sql - Funzione sql da @neondatabase/serverless (compatibile con Supabase)
 * @param {string} userId - ID dell'utente corrente
 * @param {string} query - Query SQL da eseguire
 * @param {Array} params - Parametri per la query (opzionale)
 * @returns {Promise<any>} - Risultato della query
 * 
 * @example
 * const result = await executeWithRLS(sql, userId, 
 *   'SELECT * FROM chats WHERE id = $1', 
 *   [chatId]
 * );
 */
export async function executeWithRLS(sql, userId, query, params = []) {
  if (!userId) {
    throw new Error('User ID is required for RLS');
  }
  
  // Combina SET LOCAL con la query
  // Usa una transazione implicita per eseguire entrambi gli statement
  const combinedQuery = `
    DO $$
    BEGIN
      PERFORM set_config('app.user_id', $1, true);
    END $$;
    ${query}
  `;
  
  // Prepara i parametri: userId come primo parametro, poi i parametri della query
  const allParams = [userId, ...params];
  
  // Esegui la query combinata
  // NOTA: Questo approccio ha limitazioni con @neondatabase/serverless
  // perché ogni query è una richiesta HTTP separata (funziona anche con Supabase)
  return await sql.unsafe(combinedQuery, allParams);
}

/**
 * Crea una funzione sql wrapper che imposta automaticamente RLS
 * 
 * @param {Function} sql - Funzione sql originale
 * @param {string} userId - ID dell'utente corrente
 * @returns {Function} - Funzione sql con RLS abilitato
 * 
 * @example
 * const userSql = createRLSSql(sql, userId);
 * const chats = await userSql`SELECT * FROM chats`;
 */
export function createRLSSql(sql, userId) {
  return async function rlsSql(strings, ...values) {
    // Costruisci la query originale
    let query = '';
    let paramIndex = 1;
    const params = [];
    
    for (let i = 0; i < strings.length; i++) {
      query += strings[i];
      if (i < values.length) {
        query += `$${paramIndex}`;
        params.push(values[i]);
        paramIndex++;
      }
    }
    
    // Combina con SET LOCAL
    const combinedQuery = `
      DO $$
      BEGIN
        PERFORM set_config('app.user_id', $1, true);
      END $$;
      ${query}
    `;
    
    const allParams = [userId, ...params];
    return await sql.unsafe(combinedQuery, allParams);
  };
}

/**
 * NOTA CRITICA SU @neondatabase/serverless:
 * 
 * Con @neondatabase/serverless, ogni chiamata a sql`...` è una richiesta HTTP separata.
 * Funziona perfettamente con Supabase PostgreSQL.
 * Questo significa che SET LOCAL non persiste tra chiamate diverse.
 * 
 * SOLUZIONE ALTERNATIVA (più semplice):
 * Invece di usare RLS con variabili di sessione, possiamo:
 * 1. Mantenere i filtri manuali WHERE user_id = ...
 * 2. Usare RLS come "safety net" aggiuntivo
 * 3. Oppure usare una funzione PostgreSQL che accetta user_id come parametro
 * 
 * APPROCCIO CONSIGLIATO:
 * Modificare le policies RLS per usare una funzione che accetta user_id come parametro,
 * e chiamare quella funzione nelle query invece di usare current_user_id().
 * 
 * Esempio:
 * CREATE POLICY chats_all_own ON chats
 *   FOR ALL
 *   USING (user_id = get_current_user_id());
 * 
 * E poi nelle query:
 * SELECT * FROM chats WHERE get_current_user_id() = user_id;
 * 
 * Ma questo richiede di passare user_id come parametro SQL, non come variabile di sessione.
 */


