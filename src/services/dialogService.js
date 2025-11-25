// Servizio per gestire i dialoghi personalizzati invece dei dialoghi di sistema

import { get } from 'svelte/store';
import { 
  confirmDialogState, 
  alertDialogState, 
  promptDialogState 
} from '../stores/app.js';
import { t } from '../utils/i18n.js';

/**
 * Mostra un dialog di conferma personalizzato
 * @param {string} message - Messaggio da mostrare
 * @param {string} title - Titolo del dialog (opzionale)
 * @param {string} confirmText - Testo del pulsante conferma (opzionale)
 * @param {string} cancelText - Testo del pulsante annulla (opzionale)
 * @param {string} type - Tipo: 'default', 'danger', 'warning' (opzionale)
 * @returns {Promise<boolean>} - true se confermato, false se annullato
 */
export function showConfirm(message, title = t('confirm'), confirmText = t('confirm'), cancelText = t('cancel'), type = 'default') {
  return new Promise((resolve) => {
    confirmDialogState.set({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      resolve
    });
  });
}

/**
 * Mostra un dialog di alert personalizzato
 * @param {string} message - Messaggio da mostrare
 * @param {string} title - Titolo del dialog (opzionale)
 * @param {string} buttonText - Testo del pulsante (opzionale)
 * @param {string} type - Tipo: 'info', 'success', 'error', 'warning' (opzionale)
 * @returns {Promise<void>}
 */
export function showAlert(message, title = t('warning'), buttonText = t('ok'), type = 'info') {
  return new Promise((resolve) => {
    alertDialogState.set({
      isOpen: true,
      title,
      message,
      buttonText,
      type,
      resolve
    });
  });
}

/**
 * Mostra un dialog di prompt personalizzato
 * @param {string} message - Messaggio da mostrare
 * @param {string} title - Titolo del dialog (opzionale)
 * @param {string} defaultValue - Valore predefinito (opzionale)
 * @param {string} placeholder - Placeholder per l'input (opzionale)
 * @param {string} confirmText - Testo del pulsante conferma (opzionale)
 * @param {string} cancelText - Testo del pulsante annulla (opzionale)
 * @param {string} type - Tipo input: 'text', 'password', 'textarea' (opzionale)
 * @returns {Promise<string|null>} - Valore inserito o null se annullato
 */
export function showPrompt(message, title = t('confirm'), defaultValue = '', placeholder = '', confirmText = t('confirm'), cancelText = t('cancel'), type = 'text') {
  return new Promise((resolve) => {
    promptDialogState.set({
      isOpen: true,
      title,
      message,
      defaultValue,
      placeholder,
      confirmText,
      cancelText,
      type,
      resolve
    });
  });
}

