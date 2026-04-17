<!-- src/components/inspectors/EdgeInspector.vue -->
<script setup lang="ts">
import ArrowSection from './sections/ArrowSection.vue';
import LabelSection from './sections/LabelSection.vue';
import RelationTypeSection from './sections/RelationTypeSection.vue';

interface EdgeInspectorProps {
  edgeId: string;
}

defineProps<EdgeInspectorProps>();
</script>

<template>
  <div class="edge-inspector">
    <div class="px-3 py-2 border-b bg-gray-50">
      <h2 class="text-sm font-bold text-gray-800">Propriétés de l'arête</h2>
      <p class="text-xs text-gray-500 mt-0.5">ID: {{ edgeId.substring(0, 8) }}...</p>
    </div>

    <!-- Libellé (nom + commentaire) -->
    <LabelSection :edge-id="edgeId" />

    <!-- Type de relation -->
    <RelationTypeSection :edge-id="edgeId" />

    <!-- Flèches -->
    <ArrowSection :edge-id="edgeId" />
  </div>
</template>
