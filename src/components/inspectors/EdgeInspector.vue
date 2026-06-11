<!-- src/components/inspectors/EdgeInspector.vue -->
<script setup lang="ts">
import ArrowSection from './sections/ArrowSection.vue';
import LabelSection from './sections/LabelSection.vue';
import RelationTypeSection from './sections/RelationTypeSection.vue';

interface EdgeInspectorProps { edgeId: string; }
defineProps<EdgeInspectorProps>();
</script>

<template>
  <div class="edge-inspector">
    <header class="px-3 py-3 border-b app-surface-2 app-border">
      <h2 class="text-xs font-semibold uppercase tracking-wide app-muted">Propriétés de l'arête</h2>
      <p class="text-xs app-subtle mt-0.5 font-mono">ID: {{ edgeId.substring(0, 8) }}…</p>
    </header>

    <LabelSection :edge-id="edgeId" />
    <RelationTypeSection :edge-id="edgeId" />
    <ArrowSection :edge-id="edgeId" />
  </div>
</template>
