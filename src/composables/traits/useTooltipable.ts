// src/composables/traits/useTooltipable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface TooltipableOptions {
  nodeId: Ref<string>;
  field?: string; // Champ pour le commentaire dans data (défaut: 'comment')
  delay?: number; // Délai avant affichage (ms)
}

export interface TooltipableState {
  isTooltipVisible: Ref<boolean>;
  tooltipContent: Ref<string>;
  hasComment: Ref<boolean>;
  isEditingComment: Ref<boolean>;
  editCommentValue: Ref<string>;
}

export interface TooltipableHandlers {
  showTooltip: () => void;
  hideTooltip: () => void;
  startEditComment: () => void;
  commitComment: () => void;
  cancelEditComment: () => void;
  deleteComment: () => void;
}

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
