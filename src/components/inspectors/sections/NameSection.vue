<!-- src/components/inspectors/sections/NameSection.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useGraphStore } from '../../../stores/graph'
import { useI18n } from '../../../composables/useI18n'

interface Props {
  nodeId: string
}
const props = defineProps<Props>()
const { t } = useI18n()
const graphStore = useGraphStore()
const node = computed(() => graphStore.nodes[props.nodeId])

const name = computed({
  get: () => (node.value?.data?.name as string) ?? '',
  set: (value: string) => {
    const current = node.value
    if (!current) return
    graphStore.updateNode(props.nodeId, { data: { ...(current.data ?? {}), name: value } })
  },
})
</script>

<template>
  <section class="p-3 border-b app-border">
    <h3 class="app-section-title mb-2">{{ t('section.identity.title') }}</h3>
    <label class="block text-xs app-muted mb-1" for="node-name">{{
      t('section.name.label')
    }}</label>
    <input
      id="node-name"
      v-model="name"
      type="text"
      :placeholder="t('section.name.placeholder')"
      class="app-input w-full px-2 py-1 text-sm"
    />
  </section>
</template>
