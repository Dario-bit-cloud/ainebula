import { writable } from 'svelte/store';

// Voci disponibili
export const availableVoices = [
  {
    id: 'vale',
    name: 'Vale',
    description: 'Brillante e curiosa',
    language: 'it'
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Sicura e ottimista',
    language: 'it'
  },
  {
    id: 'cove',
    name: 'Cove',
    description: 'Composta e diretta',
    language: 'it'
  },
  {
    id: 'arbor',
    name: 'Arbor',
    description: 'Disinvolta e versatile',
    language: 'it'
  },
  {
    id: 'juniper',
    name: 'Juniper',
    description: 'Aperta e ottimista',
    language: 'it'
  },
  {
    id: 'spruce',
    name: 'Spruce',
    description: 'Calma e assertiva',
    language: 'it'
  }
];

export const selectedVoice = writable('juniper');
export const isVoiceModeActive = writable(false);
export const isVoiceSelectModalOpen = writable(false);

export function setVoice(voiceId) {
  selectedVoice.set(voiceId);
}

export function toggleVoiceMode() {
  isVoiceModeActive.update(active => !active);
}

