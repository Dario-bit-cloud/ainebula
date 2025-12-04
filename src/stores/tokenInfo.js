import { derived } from 'svelte/store';
import { get } from 'svelte/store';
import { currentChat } from './chat.js';
import { selectedModel, availableModels } from './models.js';
import { isAuthenticatedStore } from './auth.js';
import { hasActiveSubscription } from './user.js';
import { estimateChatTokens } from '../utils/tokenCounter.js';

/**
 * Derived store per calcolare informazioni sui token
 * Ottimizza i calcoli evitando reactive statements multipli
 */
export const tokenInfo = derived(
  [currentChat, selectedModel, isAuthenticatedStore, availableModels],
  ([$currentChat, $selectedModel, $isAuthenticatedStore, $availableModels]) => {
    try {
      // Filtra i messaggi nascosti
      const messages = $currentChat?.messages || [];
      const visibleMessages = messages.filter(msg => !msg.hidden);
      
      // Calcola token correnti
      const currentChatTokens = visibleMessages.length > 0 
        ? estimateChatTokens(visibleMessages) 
        : 0;
      
      // Determina i limiti in base al modello e abbonamento
      const isPremiumModel = $selectedModel === 'gpt-4.1' || $selectedModel === 'o3';
      const isGeminiFlash = $selectedModel === 'gemini-2.5-flash-image';
      const selectedModelData = $availableModels.find(m => m.id === $selectedModel);
      const allowsPremiumFeatures = selectedModelData?.allowsPremiumFeatures || false;
      const hasPremium = (isPremiumModel && hasActiveSubscription()) || (allowsPremiumFeatures && isGeminiFlash);
      const isAdvancedModel = $selectedModel === 'gpt-5.1-codex-mini' || isPremiumModel || isGeminiFlash;
      
      let maxTokens;
      let tokenUsagePercentage = 0;
      let tokenWarning = false;
      
      // TEMPORANEO: Limite infinito per tutti (limite nascosto 300.000 per evitare costi eccessivi)
      const HIDDEN_MAX_TOKENS = 300000;
      maxTokens = Infinity; // Mostrato come infinito nell'UI
      // Calcola la percentuale usando il limite nascosto per i warning
      tokenUsagePercentage = (currentChatTokens / HIDDEN_MAX_TOKENS) * 100;
      tokenWarning = tokenUsagePercentage > 80;
      
      return {
        currentChatTokens,
        maxTokens,
        tokenUsagePercentage,
        tokenWarning
      };
    } catch (error) {
      // Fallback in caso di errore
      const isPremiumModel = $selectedModel === 'gpt-4.1' || $selectedModel === 'o3';
      const isGeminiFlash = $selectedModel === 'gemini-2.5-flash-image';
      const selectedModelData = $availableModels.find(m => m.id === $selectedModel);
      const allowsPremiumFeatures = selectedModelData?.allowsPremiumFeatures || false;
      const hasPremium = (isPremiumModel && hasActiveSubscription()) || (allowsPremiumFeatures && isGeminiFlash);
      const isAdvancedModel = $selectedModel === 'gpt-5.1-codex-mini' || isPremiumModel || isGeminiFlash;
      
      // TEMPORANEO: Limite infinito per tutti (limite nascosto 300.000 per evitare costi eccessivi)
      let maxTokens = Infinity;
      
      return {
        currentChatTokens: 0,
        maxTokens,
        tokenUsagePercentage: 0,
        tokenWarning: false
      };
    }
  }
);

