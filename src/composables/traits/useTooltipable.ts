// src/composables/traits/useTooltipable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Options de configuration pour le trait Tooltipable.
 */
export interface TooltipableOptions {
  /** Identifiant réactif du noeud */
  nodeId: Ref<string>;
  /** Champ pour le commentaire dans data (défaut: 'comment') */
  field?: string;
  /** Délai avant affichage du tooltip en millisecondes (défaut: 300ms) */
  delay?: number;
}

/**
 * État réactif géré par le trait Tooltipable.
 */
export interface TooltipableState {
  /** Indique si le tooltip est actuellement visible */
  isTooltipVisible: Ref<boolean>;
  /** Contenu textuel du tooltip */
  tooltipContent: Ref<string>;
  /** Indique si le noeud possède un commentaire */
  hasComment: Ref<boolean>;
  /** Indique si le mode édition du commentaire est actif */
  isEditingComment: Ref<boolean>;
  /** Valeur temporaire du commentaire en cours d'édition */
  editCommentValue: Ref<string>;
}

/**
 * Gestionnaires d'actions fournis par le trait Tooltipable.
 */
export interface TooltipableHandlers {
  /** Affiche le tooltip après le délai configuré */
  showTooltip: () => void;
  /** Masque immédiatement le tooltip */
  hideTooltip: () => void;
  /** Active le mode édition du commentaire */
  startEditComment: () => void;
  /** Valide et enregistre les modifications du commentaire */
  commitComment: () => void;
  /** Annule l'édition en cours sans enregistrer */
  cancelEditComment: () => void;
  /** Supprime définitivement le commentaire */
  deleteComment: () => void;
}

/**
 * Ajoute la capacité d'affichage de tooltip et d'édition de commentaire à un noeud.
 *
 * Gère l'affichage différé d'un tooltip au survol et permet l'édition
 * du commentaire associé au noeud avec validation ou annulation.
 *
 * @param options - Configuration du trait
 * @returns État réactif et gestionnaires pour le tooltip et les commentaires
 */
export function useTooltipable(options: TooltipableOptions): TooltipableState & TooltipableHandlers {
  const graphStore = useGraphStore();
  const field = options.field ?? 'comment';
  const delay = options.delay ?? 300;

  const isTooltipVisible = ref(false);
  const isEditingComment = ref(false);
  const editCommentValue = ref('');
  let showTimeout: ReturnType<typeof setTimeout> | null = null;

  const tooltipContent = computed(() => {
    const node = graphStore.nodes[options.nodeId.value];
    return node?.data[field] || '';
  });

  const hasComment = computed(() => {
    return tooltipContent.value.length > 0;
  });

  function showTooltip() {
    if (isEditingComment.value) return;

    // Délai avant affichage
    showTimeout = setTimeout(() => {
      if (hasComment.value) {
        isTooltipVisible.value = true;
      }
    }, delay);
  }

  function hideTooltip() {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    isTooltipVisible.value = false;
  }

  function startEditComment() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    isEditingComment.value = true;
    editCommentValue.value = node.data[field] || '';
    isTooltipVisible.value = false;
  }

  function commitComment() {
    if (!isEditingComment.value) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const trimmedValue = editCommentValue.value.trim();

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        [field]: trimmedValue || undefined,
      },
    });

    isEditingComment.value = false;
    editCommentValue.value = '';
  }

  function cancelEditComment() {
    isEditingComment.value = false;
    editCommentValue.value = '';
  }

  function deleteComment() {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const newData = { ...node.data };
    delete newData[field];

    graphStore.updateNode(options.nodeId.value, {
      data: newData,
    });

    isEditingComment.value = false;
    isTooltipVisible.value = false;
  }

  return {
    isTooltipVisible,
    tooltipContent,
    hasComment,
    isEditingComment,
    editCommentValue,
    showTooltip,
    hideTooltip,
    startEditComment,
    commitComment,
    cancelEditComment,
    deleteComment,
  };
}
