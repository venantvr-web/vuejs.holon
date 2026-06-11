
<!-- src/components/canvas/ValidationPanel.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { CheckCircle2, Lightbulb, ShieldCheck, X } from 'lucide-vue-next';
import { useValidatable, useSelectionState } from '../../composables/traits';
import { useEdgeSelectionState } from '../../composables/useEdgeSelection';
import type { ValidationIssue, ValidationSeverity } from '../../composables/traits/useValidatable';

const { lastValidationResult, validateGraph, errorCount, warningCount } = useValidatable();
const { selectedNodeIds, focusedNodeId } = useSelectionState();
const { selectedEdgeId } = useEdgeSelectionState();

const isOpen = ref(false);

function handleValidate() {
  validateGraph();
  isOpen.value = true;
}

const issues = computed(() => lastValidationResult.value?.issues ?? []);

const severityBadge: Record<ValidationSeverity, { label: string; cls: string }> = {
  error: { label: 'Erreur', cls: 'app-badge app-badge-danger' },
  warning: { label: 'Attention', cls: 'app-badge app-badge-warning' },
  info: { label: 'Info', cls: 'app-badge app-badge-info' },
};

function focusIssue(issue: ValidationIssue) {
  if (issue.nodeIds && issue.nodeIds.length > 0) {
    selectedNodeIds.value = new Set(issue.nodeIds);
    focusedNodeId.value = issue.nodeIds[0];
  }
  if (issue.edgeIds && issue.edgeIds.length > 0) {
    selectedEdgeId.value = issue.edgeIds[0];
  }
}

defineExpose({ open: () => { isOpen.value = true; }, handleValidate });
</script>

<template>
  <div class="validation-wrapper">
    <button
      @click="handleValidate"
      class="px-3 py-1.5 text-sm rounded transition-colors duration-150 flex items-center gap-1.5"
      :class="isOpen ? 'app-toggle-active' : 'app-btn'"
      title="Valider le graphe et afficher les problèmes"
    >
      <ShieldCheck :size="16" />
      <span>Valider</span>
      <span
        v-if="errorCount > 0"
        class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs rounded-full bg-[var(--danger-bg)] text-[var(--danger)] font-semibold"
      >
        {{ errorCount }}
      </span>
      <span
        v-else-if="warningCount > 0"
        class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs rounded-full bg-[var(--warning-bg)] text-[var(--warning)] font-semibold"
      >
        {{ warningCount }}
      </span>
    </button>

    <!-- Panneau flottant -->
    <div
      v-if="isOpen"
      class="fixed bottom-3 left-[260px] right-[330px] max-h-[40vh] app-surface border app-border rounded-lg shadow-xl z-30 flex flex-col"
      @mousedown.stop
    >
      <div class="flex items-center justify-between px-3 py-2 border-b app-surface-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold app-fg">Résultats de validation</h3>
          <span class="text-xs app-subtle">
            {{ errorCount }} erreur{{ errorCount > 1 ? 's' : '' }} ·
            {{ warningCount }} attention{{ warningCount > 1 ? 's' : '' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs app-link"
            @click="handleValidate"
          >
            Revalider
          </button>
          <button
            class="app-subtle hover:text-[var(--fg)] transition-colors duration-150 px-1"
            title="Fermer"
            @click="isOpen = false"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <div
        v-if="issues.length === 0"
        class="p-4 text-sm text-[var(--success)] text-center flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 :size="16" />
        <span>Aucun problème détecté — le graphe est valide.</span>
      </div>
      <ul v-else class="overflow-y-auto divide-y divide-[var(--border)]">
        <li
          v-for="(issue, i) in issues"
          :key="i"
          class="px-3 py-2 app-hover cursor-pointer"
          @click="focusIssue(issue)"
        >
          <div class="flex items-start gap-2">
            <span
              class="flex-shrink-0"
              :class="severityBadge[issue.severity].cls"
            >
              {{ severityBadge[issue.severity].label }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-sm app-fg">{{ issue.message }}</div>
              <div v-if="issue.suggestion" class="text-xs app-subtle mt-0.5 flex items-center gap-1">
                <Lightbulb :size="12" class="flex-shrink-0 text-[var(--warning)]" />
                <span>{{ issue.suggestion }}</span>
              </div>
              <div class="text-xs app-subtle font-mono mt-0.5">{{ issue.ruleId }} · {{ issue.category }}</div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
