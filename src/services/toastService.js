import { writable } from 'svelte/store';

export const toasts = writable([]);

let toastId = 0;

export function showToast(message, type = 'info', duration = 3000) {
  const id = toastId++;
  const toast = {
    id,
    message,
    type,
    duration
  };
  
  toasts.update(current => [...current, toast]);
  
  return id;
}

export function showSuccess(message, duration = 3000) {
  return showToast(message, 'success', duration);
}

export function showError(message, duration = 4000) {
  return showToast(message, 'error', duration);
}

export function showWarning(message, duration = 3500) {
  return showToast(message, 'warning', duration);
}

export function showInfo(message, duration = 3000) {
  return showToast(message, 'info', duration);
}

export function removeToast(id) {
  toasts.update(current => current.filter(t => t.id !== id));
}

