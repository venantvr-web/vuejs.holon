
// src/stores/library.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { nanoid } from 'nanoid';
import { db } from '../db';
import type { Node, LibraryItem } from '../types';

/**
 * Blocs prédéfinis, réinsérés au premier démarrage si la bibliothèque est vide.
 */
const BUILT_IN_ITEMS: LibraryItem[] = [
  {
    id: 'builtin-container',
    name: 'Container',
    isBuiltIn: true,
    createdAt: 0,
    template: {
      type: 'container',
      geometry: { x: 0, y: 0, w: 200, h: 150 },
      styling: { fill: 'rgba(0,0,0,0.05)', stroke: '#999', strokeWidth: 1, opacity: 1 },
      data: { name: 'Container', autosize: true },
    },
  },
  {
    id: 'builtin-box',
    name: 'Box',
    isBuiltIn: true,
    createdAt: 0,
    template: {
      type: 'shape',
      geometry: { x: 0, y: 0, w: 100, h: 60 },
      styling: { fill: '#fff', stroke: '#333', strokeWidth: 2, opacity: 1 },
      data: { name: 'Box' },
    },
  },
];

export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([]);

  function sortItems(list: LibraryItem[]): LibraryItem[] {
    return [...list].sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  }

  async function loadFromDB() {
    const stored = await db.library.toArray();
    if (stored.length === 0) {
      await db.library.bulkPut(BUILT_IN_ITEMS);
      items.value = sortItems(BUILT_IN_ITEMS);
    } else {
      items.value = sortItems(stored);
    }
  }

  /**
   * Ajoute un noeud existant du canevas à la bibliothèque comme modèle réutilisable.
   * Les coordonnées sont remises à zéro pour que le bloc se place au point de drop.
   */
  async function addFromNode(node: Node, name?: string): Promise<LibraryItem> {
    const { id: _id, parentId: _parentId, ...rest } = node;
    const item: LibraryItem = {
      id: nanoid(),
      name: name ?? (node.data?.name as string) ?? 'Sans nom',
      isBuiltIn: false,
      createdAt: Date.now(),
      template: {
        ...rest,
        geometry: { ...rest.geometry, x: 0, y: 0 },
      },
    };
    items.value.push(item);
    items.value = sortItems(items.value);
    await db.library.put(item);
    return item;
  }

  async function removeItem(id: string) {
    const item = items.value.find(i => i.id === id);
    if (!item || item.isBuiltIn) return;
    items.value = items.value.filter(i => i.id !== id);
    await db.library.delete(id);
  }

  async function renameItem(id: string, name: string) {
    const item = items.value.find(i => i.id === id);
    if (!item) return;
    item.name = name;
    await db.library.update(id, { name });
  }

  return {
    items,
    loadFromDB,
    addFromNode,
    removeItem,
    renameItem,
  };
});
