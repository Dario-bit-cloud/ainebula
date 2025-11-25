<script>
  import { onMount } from 'svelte';
  import { testDatabaseConnection, getDatabaseInfo, executeQuery } from '../services/databaseService.js';
  
  let connectionStatus = null;
  let databaseInfo = null;
  let testQuery = 'SELECT NOW() as current_time, version() as postgres_version';
  let queryResult = null;
  let isLoading = false;
  let error = null;
  
  async function handleTestConnection() {
    isLoading = true;
    error = null;
    connectionStatus = null;
    
    try {
      const result = await testDatabaseConnection();
      connectionStatus = result;
      
      if (result.success) {
        // Carica anche le info del database
        const info = await getDatabaseInfo();
        databaseInfo = info;
      }
    } catch (err) {
      error = err.message;
      connectionStatus = {
        success: false,
        message: 'Errore nel test di connessione',
        error: err.message
      };
    } finally {
      isLoading = false;
    }
  }
  
  async function handleExecuteQuery() {
    if (!testQuery.trim()) {
      error = 'Inserisci una query SQL';
      return;
    }
    
    isLoading = true;
    error = null;
    queryResult = null;
    
    try {
      const result = await executeQuery(testQuery);
      queryResult = result;
      
      if (!result.success) {
        error = result.error || result.message;
      }
    } catch (err) {
      error = err.message;
      queryResult = {
        success: false,
        message: 'Errore nell\'esecuzione della query',
        error: err.message
      };
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    // Test automatico al caricamento
    handleTestConnection();
  });
</script>

<div class="database-test-page">
  <div class="container">
    <h1>🧪 Test Database Neon PostgreSQL</h1>
    
    <div class="section">
      <h2>Test Connessione</h2>
      <button 
        class="test-button" 
        on:click={handleTestConnection}
        disabled={isLoading}
      >
        {#if isLoading}
          <span class="spinner"></span> Test in corso...
        {:else}
          🔍 Testa Connessione
        {/if}
      </button>
      
      {#if connectionStatus}
        <div class="result" class:success={connectionStatus.success} class:error={!connectionStatus.success}>
          {#if connectionStatus.success}
            <div class="success-icon">✅</div>
            <div class="result-content">
              <h3>Connessione Riuscita!</h3>
              <p><strong>Messaggio:</strong> {connectionStatus.message}</p>
              {#if connectionStatus.version}
                <p><strong>Versione PostgreSQL:</strong></p>
                <code>{connectionStatus.version}</code>
              {/if}
              {#if connectionStatus.timestamp}
                <p><strong>Timestamp:</strong> {new Date(connectionStatus.timestamp).toLocaleString('it-IT')}</p>
              {/if}
            </div>
          {:else}
            <div class="error-icon">❌</div>
            <div class="result-content">
              <h3>Errore di Connessione</h3>
              <p><strong>Messaggio:</strong> {connectionStatus.message}</p>
              {#if connectionStatus.error}
                <p><strong>Errore:</strong></p>
                <code>{connectionStatus.error}</code>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    
    {#if databaseInfo && databaseInfo.success}
      <div class="section">
        <h2>Informazioni Database</h2>
        <div class="info-box">
          <p><strong>Tabelle disponibili:</strong></p>
          {#if databaseInfo.tables && databaseInfo.tables.length > 0}
            <ul class="tables-list">
              {#each databaseInfo.tables as table}
                <li>{table}</li>
              {/each}
            </ul>
          {:else}
            <p class="no-tables">Nessuna tabella trovata nel database.</p>
          {/if}
        </div>
      </div>
    {/if}
    
    <div class="section">
      <h2>Esegui Query SQL</h2>
      <p class="info-text">Puoi eseguire query SELECT per testare il database.</p>
      
      <div class="query-input-container">
        <textarea
          class="query-input"
          bind:value={testQuery}
          placeholder="Inserisci una query SELECT..."
          rows="4"
        ></textarea>
      </div>
      
      <button 
        class="test-button" 
        on:click={handleExecuteQuery}
        disabled={isLoading || !testQuery.trim()}
      >
        {#if isLoading}
          <span class="spinner"></span> Esecuzione...
        {:else}
          ▶️ Esegui Query
        {/if}
      </button>
      
      {#if error}
        <div class="error-message">
          <strong>Errore:</strong> {error}
        </div>
      {/if}
      
      {#if queryResult}
        <div class="result" class:success={queryResult.success} class:error={!queryResult.success}>
          {#if queryResult.success}
            <div class="success-icon">✅</div>
            <div class="result-content">
              <h3>Query Eseguita con Successo</h3>
              {#if queryResult.rowCount !== undefined}
                <p><strong>Righe restituite:</strong> {queryResult.rowCount}</p>
              {/if}
              {#if queryResult.data && queryResult.data.length > 0}
                <div class="table-container">
                  <table class="result-table">
                    <thead>
                      <tr>
                        {#each Object.keys(queryResult.data[0]) as key}
                          <th>{key}</th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody>
                      {#each queryResult.data as row}
                        <tr>
                          {#each Object.values(row) as value}
                            <td>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {:else}
                <p>Nessun risultato restituito.</p>
              {/if}
            </div>
          {:else}
            <div class="error-icon">❌</div>
            <div class="result-content">
              <h3>Errore nell'Esecuzione</h3>
              <p><strong>Messaggio:</strong> {queryResult.message}</p>
              {#if queryResult.error}
                <p><strong>Errore:</strong></p>
                <code>{queryResult.error}</code>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    
    <div class="section">
      <h2>Query di Esempio</h2>
      <div class="example-queries">
        <button 
          class="example-button"
          on:click={() => testQuery = 'SELECT NOW() as current_time, version() as postgres_version'}
        >
          Data/Ora e Versione
        </button>
        <button 
          class="example-button"
          on:click={() => testQuery = 'SELECT current_database() as database_name, current_user as user_name'}
        >
          Database e Utente
        </button>
        <button 
          class="example-button"
          on:click={() => testQuery = 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 10'}
        >
          Lista Tabelle
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .database-test-page {
    height: 100%;
    width: 100%;
    background: var(--bg-primary, #0a0a0a);
    color: var(--text-primary, #ffffff);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
    min-height: 100%;
  }
  
  h1 {
    font-size: 32px;
    margin-bottom: 40px;
    text-align: center;
    color: var(--text-primary, #ffffff);
  }
  
  h2 {
    font-size: 24px;
    margin-bottom: 20px;
    color: var(--text-primary, #ffffff);
    border-bottom: 2px solid var(--border-color, #333);
    padding-bottom: 10px;
  }
  
  .section {
    background: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }
  
  .test-button {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  
  .test-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .test-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .result {
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  
  .result.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  
  .result.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .success-icon, .error-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .result-content {
    flex: 1;
  }
  
  .result-content h3 {
    margin: 0 0 12px 0;
    font-size: 20px;
  }
  
  .result-content p {
    margin: 8px 0;
    line-height: 1.6;
  }
  
  .result-content code {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 12px;
    border-radius: 4px;
    display: block;
    margin-top: 8px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    word-break: break-all;
  }
  
  .info-box {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 16px;
  }
  
  .tables-list {
    list-style: none;
    padding: 0;
    margin: 12px 0 0 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }
  
  .tables-list li {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
  }
  
  .no-tables {
    color: var(--text-secondary, #999);
    font-style: italic;
    margin-top: 12px;
  }
  
  .query-input-container {
    margin-bottom: 16px;
  }
  
  .query-input {
    width: 100%;
    background: var(--bg-tertiary, #2a2a2a);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    padding: 12px;
    color: var(--text-primary, #ffffff);
    font-family: 'Courier New', monospace;
    font-size: 14px;
    resize: vertical;
    min-height: 100px;
  }
  
  .query-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .info-text {
    color: var(--text-secondary, #999);
    margin-bottom: 16px;
    font-size: 14px;
  }
  
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin-top: 16px;
    color: #ef4444;
  }
  
  .table-container {
    margin-top: 16px;
    overflow-x: auto;
  }
  
  .result-table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .result-table thead {
    background: rgba(59, 130, 246, 0.2);
  }
  
  .result-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid var(--border-color, #333);
  }
  
  .result-table td {
    padding: 12px;
    border-bottom: 1px solid var(--border-color, #333);
    font-family: 'Courier New', monospace;
    font-size: 13px;
    word-break: break-word;
  }
  
  .result-table tr:last-child td {
    border-bottom: none;
  }
  
  .example-queries {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .example-button {
    background: var(--bg-tertiary, #2a2a2a);
    border: 1px solid var(--border-color, #333);
    color: var(--text-primary, #ffffff);
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .example-button:hover {
    background: var(--hover-bg, #333);
    border-color: #3b82f6;
  }
  
  @media (max-width: 768px) {
    .database-test-page {
      padding: 20px 12px;
    }
    
    h1 {
      font-size: 24px;
    }
    
    .section {
      padding: 16px;
    }
    
    .tables-list {
      grid-template-columns: 1fr;
    }
  }
</style>

