
// src/stores/library.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Node } from '../types';

// Type pour les templates dans la librairie (sans ID, ni parent)
export type LibraryItem = Omit<Node, 'id' | 'parentId'>;

export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([
    {
      type: 'container',
      geometry: { x: 0, y: 0, w: 200, h: 150 },
      styling: { fill: 'rgba(0,0,0,0.05)', stroke: '#999', strokeWidth: 1, opacity: 1 },
      data: { name: 'Container' },
    },
    {
      type: 'shape',
      geometry: { x: 0, y: 0, w: 100, h: 60 },
      styling: { fill: '#fff', stroke: '#333', strokeWidth: 2, opacity: 1 },
      data: { name: 'Box' },
    },
    // ... autres formes prédéfinies
  ]);

  return { items };
});
