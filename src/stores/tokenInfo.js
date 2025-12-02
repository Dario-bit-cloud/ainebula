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
      const isNebula15 = $selectedModel === 'gemini-2.5-flash-preview-09-2025-thinking';
      const isRegistered = $isAuthenticatedStore;
      
      let maxTokens;
      let tokenUsagePercentage = 0;
      let tokenWarning = false;
      
      if (hasPremium) {
        maxTokens = Infinity;
        tokenUsagePercentage = 0;
        tokenWarning = false;
      } else if (isAdvancedModel) {
        // gpt-5.1-codex-mini ha limite di 400K token
        maxTokens = $selectedModel === 'gpt-5.1-codex-mini' ? 400000 : 1000000;
        tokenUsagePercentage = (currentChatTokens / maxTokens) * 100;
        tokenWarning = tokenUsagePercentage > 80;
      } else if (isNebula15 && isRegistered) {
        maxTokens = 15000;
        tokenUsagePercentage = (currentChatTokens / maxTokens) * 100;
        tokenWarning = tokenUsagePercentage > 80;
      } else {
        maxTokens = 4000;
        tokenUsagePercentage = (currentChatTokens / maxTokens) * 100;
        tokenWarning = tokenUsagePercentage > 80;
      }
      
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
      const isNebula15 = $selectedModel === 'gemini-2.5-flash-preview-09-2025-thinking';
      const isRegistered = $isAuthenticatedStore;
      
      let maxTokens;
      if (hasPremium) {
        maxTokens = Infinity;
      } else if (isAdvancedModel) {
        maxTokens = $selectedModel === 'gpt-5.1-codex-mini' ? 400000 : 1000000;
      } else if (isNebula15 && isRegistered) {
        maxTokens = 15000;
      } else {
        maxTokens = 4000;
      }
      
      return {
        currentChatTokens: 0,
        maxTokens,
        tokenUsagePercentage: 0,
        tokenWarning: false
      };
    }
  }
);

