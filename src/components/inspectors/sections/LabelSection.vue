<!-- src/components/inspectors/sections/LabelSection.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useGraphStore } from '../../../stores/graph'
import { useI18n } from '../../../composables/useI18n'

interface LabelSectionProps {
  edgeId: string
}

const props = defineProps<LabelSectionProps>()
const { t } = useI18n()
const graphStore = useGraphStore()

const edge = computed(() => graphStore.edges[props.edgeId])

const name = computed({
  get: () => (edge.value?.data?.name as string) ?? '',
  set: (value: string) => {
    const current = edge.value
    if (!current) return
    graphStore.updateEdge(props.edgeId, {
      data: { ...(current.data ?? {}), name: value },
    })
  },
})

const comment = computed({
  get: () => (edge.value?.data?.comment as string) ?? '',
  set: (value: string) => {
    const current = edge.value
    if (!current) return
    graphStore.updateEdge(props.edgeId, {
      data: { ...(current.data ?? {}), comment: value },
    })
  },
})
</script>

<template>
  <div class="label-section p-3 border-b app-border">
    <h3 class="app-section-title mb-3">{{ t('section.label.title') }}</h3>

    <label class="block text-xs app-muted mb-1" for="edge-name">{{
      t('section.label.label')
    }}</label>
    <input
      id="edge-name"
      v-model="name"
      type="text"
      :placeholder="t('section.label.placeholder')"
      class="app-input w-full px-2 py-1 text-sm mb-3"
    />

    <label class="block text-xs app-muted mb-1" for="edge-comment">{{
      t('section.label.comment')
    }}</label>
    <textarea
      id="edge-comment"
      v-model="comment"
      rows="3"
      :placeholder="t('section.label.commentPlaceholder')"
      class="app-input w-full px-2 py-1 text-sm resize-y"
    />
  </div>
</template>
