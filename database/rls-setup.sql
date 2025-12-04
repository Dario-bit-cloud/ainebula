-- ============================================
-- RLS (Row Level Security) Setup per Supabase
-- ============================================
-- Questo script abilita RLS e crea policies per tutte le tabelle
-- Esegui questo script dopo aver creato le tabelle base

-- Funzione helper per ottenere l'user_id corrente dal contesto
-- Questa funzione legge la variabile di sessione 'app.user_id'
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN current_setting('app.user_id', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Funzione per verificare se l'utente è admin (opzionale, per future estensioni)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.is_admin', true)::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- ABILITAZIONE RLS SU TUTTE LE TABELLE
-- ============================================

-- Tabella users: ogni utente può vedere solo il proprio profilo
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = current_user_id());

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = current_user_id());

-- Tabella sessions: ogni utente può vedere solo le proprie sessioni
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_all_own ON sessions;
CREATE POLICY sessions_all_own ON sessions
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella chats: ogni utente può vedere solo le proprie chat
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chats_all_own ON chats;
CREATE POLICY chats_all_own ON chats
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella messages: ogni utente può vedere solo i messaggi delle proprie chat
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_all_own ON messages;
CREATE POLICY messages_all_own ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
      AND c.user_id = current_user_id()
    )
  );

-- Tabella projects: ogni utente può vedere solo i propri progetti
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_all_own ON projects;
CREATE POLICY projects_all_own ON projects
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella user_settings: ogni utente può vedere solo le proprie impostazioni
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_all_own ON user_settings;
CREATE POLICY user_settings_all_own ON user_settings
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella subscriptions: ogni utente può vedere solo i propri abbonamenti
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_all_own ON subscriptions;
CREATE POLICY subscriptions_all_own ON subscriptions
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella payments: ogni utente può vedere solo i propri pagamenti
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_all_own ON payments;
CREATE POLICY payments_all_own ON payments
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella referrals: ogni utente può vedere solo i referral dove è referrer o referred
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_all_own ON referrals;
CREATE POLICY referrals_all_own ON referrals
  FOR ALL
  USING (
    referrer_id = current_user_id()
    OR referred_id = current_user_id()
  );

-- Tabella referral_earnings: ogni utente può vedere solo i propri guadagni
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_earnings_all_own ON referral_earnings;
CREATE POLICY referral_earnings_all_own ON referral_earnings
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella withdrawals: ogni utente può vedere solo i propri ritiri
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS withdrawals_all_own ON withdrawals;
CREATE POLICY withdrawals_all_own ON withdrawals
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella shared_links: ogni utente può vedere solo i propri link condivisi
-- NOTA: I link condivisi pubblici richiedono una policy aggiuntiva (vedi sotto)
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shared_links_all_own ON shared_links;
CREATE POLICY shared_links_all_own ON shared_links
  FOR ALL
  USING (user_id = current_user_id());

-- Policy aggiuntiva per link condivisi pubblici (accessibili senza autenticazione)
-- Questa policy permette di leggere link condivisi attivi anche senza user_id
DROP POLICY IF EXISTS shared_links_public_read ON shared_links;
CREATE POLICY shared_links_public_read ON shared_links
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Tabella data_exports: ogni utente può vedere solo le proprie esportazioni
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_exports_all_own ON data_exports;
CREATE POLICY data_exports_all_own ON data_exports
  FOR ALL
  USING (user_id = current_user_id());

-- Tabella passkeys: ogni utente può vedere solo le proprie passkeys
ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS passkeys_all_own ON passkeys;
CREATE POLICY passkeys_all_own ON passkeys
  FOR ALL
  USING (user_id = current_user_id());

-- ============================================
-- ECCEZIONI E CASI SPECIALI
-- ============================================

-- NOTA: Le tabelle users e sessions hanno bisogno di accesso speciale
-- per l'autenticazione. Le policies sopra permettono solo SELECT/UPDATE
-- Per INSERT (registrazione, login) serve una policy aggiuntiva

-- Policy per permettere INSERT su users (registrazione)
DROP POLICY IF EXISTS users_insert_public ON users;
CREATE POLICY users_insert_public ON users
  FOR INSERT
  WITH CHECK (true); -- Chiunque può registrarsi

-- Policy per permettere INSERT su sessions (login)
DROP POLICY IF EXISTS sessions_insert_public ON sessions;
CREATE POLICY sessions_insert_public ON sessions
  FOR INSERT
  WITH CHECK (true); -- Le sessioni vengono create durante il login

-- ============================================
-- VERIFICA CONFIGURAZIONE
-- ============================================

-- Query per verificare che RLS sia abilitato su tutte le tabelle
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- Query per vedere tutte le policies create
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;


