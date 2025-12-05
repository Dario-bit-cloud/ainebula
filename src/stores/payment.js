import { writable } from 'svelte/store';

// Store per il modal di pagamento
export const isPaymentModalOpen = writable(false);

// Store per i dati del piano selezionato
export const selectedPlan = writable(null);

// Store per lo stato del pagamento
export const paymentState = writable({
  isProcessing: false,
  isComplete: false,
  error: null
});

// Funzione per aprire il modal di pagamento con un piano
export function openPaymentModal(plan) {
  selectedPlan.set(plan);
  paymentState.set({ isProcessing: false, isComplete: false, error: null });
  isPaymentModalOpen.set(true);
}

// Funzione per chiudere il modal
export function closePaymentModal() {
  isPaymentModalOpen.set(false);
  selectedPlan.set(null);
  paymentState.set({ isProcessing: false, isComplete: false, error: null });
}

// Funzione per resettare lo stato del pagamento
export function resetPaymentState() {
  paymentState.set({ isProcessing: false, isComplete: false, error: null });
}

