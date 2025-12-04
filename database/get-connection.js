/**
 * Utility per ottenere la connection string del database Neon
 * 
 * Priorità:
 * 1. DATABASE_URL (Neon con pooling)
 * 2. DATABASE_URL_UNPOOLED (Neon senza pooling)
 */

export function getDatabaseConnectionString() {
  const connectionString = 
    process.env.DATABASE_URL ||                    // Neon (con pooling)
    process.env.DATABASE_URL_UNPOOLED;            // Neon (senza pooling)

  if (!connectionString) {
    throw new Error(
      'Connection string PostgreSQL non trovata!\n' +
      'Configura una di queste variabili d\'ambiente:\n' +
      '  - DATABASE_URL (Neon con pooling)\n' +
      '  - DATABASE_URL_UNPOOLED (Neon senza pooling)'
    );
  }

  return connectionString;
}


