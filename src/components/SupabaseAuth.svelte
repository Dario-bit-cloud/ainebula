<script>
  import { onMount, onDestroy } from 'svelte';
  import { onAuthStateChange, getCurrentUser, getSession } from '../services/supabaseAuthService.js';
  import { user, isAuthenticatedStore, isLoading, setUser, clearUser } from '../stores/auth.js';
  import { syncChatsOnLogin } from '../stores/chat.js';
  import { syncProjectsOnLogin } from '../stores/projects.js';
  import { isAuthModalOpen } from '../stores/app.js';
  import { log, logWarn, logError } from '../utils/logger.js';

  let hasSynced = false;
  let authSubscription = null;

  onMount(async () => {
    try {
      // Controlla lo stato iniziale
      await checkAuthState();
      
      // Ascolta i cambiamenti di autenticazione
      authSubscription = onAuthStateChange(async (event, session) => {
        log('🔄 [SUPABASE AUTH] Cambio stato autenticazione:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await checkAuthState();
        } else if (event === 'SIGNED_OUT') {
          clearUser();
          hasSynced = false;
        }
      });
    } catch (err) {
      logError('❌ [SUPABASE AUTH] Errore inizializzazione:', err);
      isLoading.set(false);
    }
  });

  onDestroy(() => {
    if (authSubscription) {
      authSubscription.data.subscription.unsubscribe();
    }
  });

  async function checkAuthState() {
    try {
      const supabaseUser = await getCurrentUser();
      const session = await getSession();

      if (supabaseUser && session) {
        const currentUser = $user;
        
        // Aggiorna solo se l'utente è cambiato
        if (!currentUser || currentUser.id !== supabaseUser.id) {
          // Sincronizza l'utente con il database
          try {
            const { syncUserToDatabase } = await import('../services/supabaseAuthService.js');
            const syncResult = await syncUserToDatabase(supabaseUser);
            
            let tokenSaved = false;
            
            if (syncResult.success && syncResult.token) {
              // Salva il token JWT nel localStorage
              localStorage.setItem('auth_token', syncResult.token);
              tokenSaved = true;
              log('✅ [SUPABASE AUTH] Utente sincronizzato e sessione creata');
            } else {
              logWarn('⚠️ [SUPABASE AUTH] Sincronizzazione fallita:', syncResult.message);
            }
            
            // Aggiorna lo stato utente
            const formattedUser = {
              id: supabaseUser.id,
              email: supabaseUser.email,
              username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0]
            };
            
            user.set(formattedUser);
            isAuthenticatedStore.set(true);

            // Chiudi il modal di login quando l'utente si autentica
            isAuthModalOpen.set(false);

            // Sincronizza solo se il token è stato salvato con successo
            if (tokenSaved && !hasSynced) {
              hasSynced = true;
              // Aspetta un momento per assicurarsi che il token sia disponibile
              await new Promise(resolve => setTimeout(resolve, 100));
              await Promise.all([
                syncChatsOnLogin(),
                syncProjectsOnLogin()
              ]);
            } else if (!tokenSaved) {
              logWarn('⚠️ [SUPABASE AUTH] Token non disponibile, skip sincronizzazione chat/progetti');
            }
          } catch (syncError) {
            logError('❌ [SUPABASE AUTH] Errore durante sincronizzazione:', syncError);
          }
        }
      } else {
        // Solo se prima era autenticato, resetta
        if ($isAuthenticatedStore) {
          clearUser();
          hasSynced = false;
        }
      }
    } catch (err) {
      logError('❌ [SUPABASE AUTH] Errore verifica stato auth:', err);
    } finally {
      isLoading.set(false);
    }
  }
</script>



