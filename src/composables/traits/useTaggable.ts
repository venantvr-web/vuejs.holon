// src/composables/traits/useTaggable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';
import { nanoid } from 'nanoid';

/**
 * Définition d'un tag.
 */
export interface Tag {
  /**
   * Identifiant unique du tag.
   */
  id: string;
  /**
   * Label du tag.
   */
  label: string;
  /**
   * Couleur du tag (hex).
   */
  color: string;
  /**
   * Description optionnelle.
   */
  description?: string;
}

/**
 * Options de configuration pour le trait Taggable.
 */
export interface TaggableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>;
}

/**
 * État réactif exposé par le trait Taggable.
 */
export interface TaggableState {
  /**
   * Tags appliqués au noeud.
   */
  tags: Ref<Tag[]>;
  /**
   * Tags disponibles globalement.
   */
  availableTags: Ref<Tag[]>;
}

/**
 * Handlers (actions) exposés par le trait Taggable.
 */
export interface TaggableHandlers {
  /**
   * Ajoute un tag au noeud.
   * @param tag - Tag à ajouter (string label ou objet Tag complet)
   */
  addTag: (tag: string | Tag) => void;
  /**
   * Retire un tag du noeud.
   * @param tagId - ID du tag à retirer
   */
  removeTag: (tagId: string) => void;
  /**
   * Vérifie si le noeud possède un tag.
   * @param tagId - ID du tag à vérifier
   * @returns true si le tag est présent
   */
  hasTag: (tagId: string) => boolean;
  /**
   * Toggle un tag (ajoute s'il n'existe pas, retire sinon).
   * @param tagId - ID du tag à toggler
   */
  toggleTag: (tagId: string) => void;
  /**
   * Crée un nouveau tag global.
   * @param label - Label du tag
   * @param color - Couleur (hex)
   * @param description - Description optionnelle
   * @returns Tag créé
   */
  createTag: (label: string, color: string, description?: string) => Tag;
  /**
   * Supprime un tag global.
   * @param tagId - ID du tag à supprimer
   */
  deleteTag: (tagId: string) => void;
  /**
   * Filtre les noeuds par tag.
   * @param tagId - ID du tag
   * @returns IDs des noeuds ayant ce tag
   */
  filterByTag: (tagId: string) => string[];
}

// Tags prédéfinis
const PREDEFINED_TAGS: Tag[] = [
  { id: 'important', label: 'Important', color: '#f44336', description: 'Élément important' },
  { id: 'todo', label: 'À faire', color: '#ff9800', description: 'Action à réaliser' },
  { id: 'done', label: 'Terminé', color: '#4caf50', description: 'Travail complété' },
  { id: 'review', label: 'À réviser', color: '#2196f3', description: 'Nécessite une révision' },
  { id: 'draft', label: 'Brouillon', color: '#9e9e9e', description: 'Version préliminaire' },
  { id: 'deprecated', label: 'Déprécié', color: '#795548', description: 'Obsolète' },
];

// État global des tags personnalisés (persiste entre sessions)
const getCustomTags = (): Tag[] => {
  const stored = localStorage.getItem('holon-custom-tags');
  return stored ? JSON.parse(stored) : [];
};

const saveCustomTags = (tags: Tag[]): void => {
  localStorage.setItem('holon-custom-tags', JSON.stringify(tags));
};

/**
 * Trait permettant de gérer des tags sur les noeuds.
 *
 * Les tags permettent de catégoriser et filtrer les noeuds avec des labels colorés.
 * Supporte des tags prédéfinis et personnalisés.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour les tags
 *
 * @example
 * ```typescript
 * const { tags, addTag, hasTag, filterByTag } = useTaggable({
 *   nodeId: ref('node-123')
 * });
 *
 * // Ajouter un tag
 * addTag('important');
 *
 * // Vérifier présence
 * if (hasTag('important')) {
 *   console.log('Noeud important');
 * }
 *
 * // Filtrer les noeuds
 * const importantNodes = filterByTag('important');
 * ```
 */
export function useTaggable(options: TaggableOptions): TaggableState & TaggableHandlers {
  const graphStore = useGraphStore();

  const availableTags = computed(() => {
    return [...PREDEFINED_TAGS, ...getCustomTags()];
  });

  const tags = computed((): Tag[] => {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return [];

    const tagIds = (node.data?.tags as string[]) || [];
    return tagIds
      .map((id) => availableTags.value.find((t) => t.id === id))
      .filter((t): t is Tag => t !== undefined);
  });

  /**
   * Ajoute un tag.
   */
  function addTag(tag: string | Tag): void {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    let tagToAdd: Tag;

    if (typeof tag === 'string') {
      // Chercher dans les tags disponibles
      const existingTag = availableTags.value.find((t) => t.label === tag || t.id === tag);

      if (existingTag) {
        tagToAdd = existingTag;
      } else {
        // Créer un nouveau tag avec couleur aléatoire
        tagToAdd = createTag(tag, generateRandomColor());
      }
    } else {
      tagToAdd = tag;
    }

    const currentTags = (node.data?.tags as string[]) || [];

    // Éviter les doublons
    if (currentTags.includes(tagToAdd.id)) {
      return;
    }

    const updatedTags = [...currentTags, tagToAdd.id];

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        tags: updatedTags,
      },
    });
  }

  /**
   * Retire un tag.
   */
  function removeTag(tagId: string): void {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const currentTags = (node.data?.tags as string[]) || [];
    const updatedTags = currentTags.filter((id) => id !== tagId);

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        tags: updatedTags,
      },
    });
  }

  /**
   * Vérifie si le noeud a un tag.
   */
  function hasTag(tagId: string): boolean {
    return tags.value.some((t) => t.id === tagId);
  }

  /**
   * Toggle un tag.
   */
  function toggleTag(tagId: string): void {
    if (hasTag(tagId)) {
      removeTag(tagId);
    } else {
      const tag = availableTags.value.find((t) => t.id === tagId);
      if (tag) {
        addTag(tag);
      }
    }
  }

  /**
   * Crée un nouveau tag global.
   */
  function createTag(label: string, color: string, description?: string): Tag {
    const newTag: Tag = {
      id: nanoid(),
      label,
      color,
      description,
    };

    const customTags = getCustomTags();
    customTags.push(newTag);
    saveCustomTags(customTags);

    return newTag;
  }

  /**
   * Supprime un tag global.
   */
  function deleteTag(tagId: string): void {
    // Empêcher la suppression des tags prédéfinis
    if (PREDEFINED_TAGS.some((t) => t.id === tagId)) {
      console.warn('Impossible de supprimer un tag prédéfini');
      return;
    }

    const customTags = getCustomTags();
    const updatedTags = customTags.filter((t) => t.id !== tagId);
    saveCustomTags(updatedTags);

    // Retirer ce tag de tous les noeuds
    const allNodes = Object.values(graphStore.nodes);
    for (const node of allNodes) {
      const nodeTags = (node.data?.tags as string[]) || [];
      if (nodeTags.includes(tagId)) {
        const updatedNodeTags = nodeTags.filter((id) => id !== tagId);
        graphStore.updateNode(node.id, {
          data: {
            ...node.data,
            tags: updatedNodeTags,
          },
        });
      }
    }
  }

  /**
   * Filtre les noeuds par tag.
   */
  function filterByTag(tagId: string): string[] {
    const allNodes = Object.values(graphStore.nodes);
    return allNodes
      .filter((node) => {
        const nodeTags = (node.data?.tags as string[]) || [];
        return nodeTags.includes(tagId);
      })
      .map((node) => node.id);
  }

  return {
    tags,
    availableTags,
    addTag,
    removeTag,
    hasTag,
    toggleTag,
    createTag,
    deleteTag,
    filterByTag,
  };
}

/**
 * Génère une couleur aléatoire pour un nouveau tag.
 */
function generateRandomColor(): string {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
    '#ff5722', '#795548', '#9e9e9e', '#607d8b',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
