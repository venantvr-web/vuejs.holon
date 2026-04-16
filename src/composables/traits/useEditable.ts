// src/composables/traits/useEditable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Options de configuration pour le trait Editable.
 */
export interface EditableOptions {
  /**
   * Référence réactive vers l'ID du noeud concerné.
   */
  nodeId: Ref<string>;
  /**
   * Champ à éditer dans data (défaut: 'name').
   */
  field?: string;
}

/**
 * État réactif exposé par le trait Editable.
 */
export interface EditableState {
  /**
   * Indique si le noeud est en mode édition.
   */
  isEditing: Ref<boolean>;
  /**
   * Valeur en cours d'édition.
   */
  editValue: Ref<string>;
  /**
   * Valeur affichée du champ.
   */
  displayValue: Ref<string>;
}

/**
 * Handlers (actions) exposés par le trait Editable.
 */
export interface EditableHandlers {
  /**
   * Démarre l'édition du champ.
   */
  startEditing: () => void;
  /**
   * Valide et enregistre les modifications.
   */
  commitEdit: () => void;
  /**
   * Annule l'édition en cours.
   */
  cancelEdit: () => void;
  /**
   * Gère les événements clavier pendant l'édition (Enter pour valider, Escape pour annuler).
   * @param event - Événement clavier
   */
  handleEditKeydown: (event: KeyboardEvent) => void;
}

/**
 * Trait permettant l'édition inline des propriétés d'un noeud.
 *
 * Gère l'état d'édition, la validation et l'annulation avec support des raccourcis clavier.
 *
 * @param options - Configuration du trait
 * @returns État réactif et handlers pour l'édition
 *
 * @example
 * ```typescript
 * const { isEditing, editValue, startEditing, commitEdit } = useEditable({
 *   nodeId: ref('node-123'),
 *   field: 'name'
 * });
 * ```
 */
export function useEditable(options: EditableOptions): EditableState & EditableHandlers {
  const graphStore = useGraphStore();
  const field = options.field ?? 'name';

  const isEditing = ref(false);
  const editValue = ref('');

  const displayValue = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return '';
    return node.data[field] || node.id.substring(0, 8);
  });

  function startEditing() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    isEditing.value = true;
    editValue.value = node.data[field] || '';
  }

  function commitEdit() {
    if (!isEditing.value) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const trimmedValue = editValue.value.trim();

    if (trimmedValue !== node.data[field]) {
      graphStore.updateNode(options.nodeId.value, {
        data: {
          ...node.data,
          [field]: trimmedValue || undefined,
        },
      });
    }

    isEditing.value = false;
  }

  function cancelEdit() {
    isEditing.value = false;
    editValue.value = '';
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  }

  return {
    isEditing,
    editValue,
    displayValue,
    startEditing,
    commitEdit,
    cancelEdit,
    handleEditKeydown,
  };
}
