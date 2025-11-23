import { writable } from 'svelte/store';

// Store per lo stato generale dell'applicazione
export const sidebarView = writable('chat'); // 'chat', 'search', 'library', 'projects'
export const isSearchOpen = writable(false);
export const searchQuery = writable('');
export const isSettingsOpen = writable(false);
export const isProjectModalOpen = writable(false);
export const isInviteModalOpen = writable(false);
export const isUserMenuOpen = writable(false);

