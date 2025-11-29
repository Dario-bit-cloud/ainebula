-- Script per aggiungere campi Patreon alla tabella users
-- Esegui questo script se la tabella users esiste già

ALTER TABLE users ADD COLUMN IF NOT EXISTS patreon_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS patreon_access_token TEXT;

-- Crea indice per ricerca rapida
CREATE INDEX IF NOT EXISTS idx_users_patreon_user_id ON users(patreon_user_id);

