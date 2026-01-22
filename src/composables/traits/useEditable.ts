// src/composables/traits/useEditable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

export interface EditableOptions {
  nodeId: Ref<string>;
  field?: string; // Champ à éditer dans data (défaut: 'name')
}

export interface EditableState {
  isEditing: Ref<boolean>;
  editValue: Ref<string>;
  displayValue: Ref<string>;
}

export interface EditableHandlers {
  startEditing: () => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  handleEditKeydown: (event: KeyboardEvent) => void;
}

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
