<!-- src/components/inspectors/sections/TagsSection.vue -->
<script setup lang="ts">
import { ref, toRef } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { useTaggable } from '../../../composables/traits/useTaggable'
import { useI18n } from '../../../composables/useI18n'

interface Props {
  nodeId: string
}
const props = defineProps<Props>()
const nodeIdRef = toRef(props, 'nodeId')

const { t } = useI18n()
const { tags, availableTags, toggleTag, createTag } = useTaggable({ nodeId: nodeIdRef })

const picker = ref(false)
const newLabel = ref('')
const newColor = ref('#3b82f6')

function handleCreate() {
  const label = newLabel.value.trim()
  if (!label) return
  const tag = createTag(label, newColor.value)
  toggleTag(tag.id)
  newLabel.value = ''
  picker.value = false
}

function isApplied(tagId: string): boolean {
  return tags.value.some((t) => t.id === tagId)
}
</script>

<template>
  <section class="p-3 border-b app-border">
    <div class="flex items-center justify-between mb-2">
      <h3 class="app-section-title">{{ t('section.tags.title') }}</h3>
      <button class="text-xs app-link" @click="picker = !picker">
        {{ picker ? t('common.close') : t('section.tags.add') }}
      </button>
    </div>

    <!-- Chips appliquées -->
    <div v-if="tags.length > 0" class="flex flex-wrap gap-1 mb-2">
      <span
        v-for="tag in tags"
        :key="tag.id"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-white"
        :style="{ backgroundColor: tag.color }"
        v-tooltip="tag.description"
      >
        {{ tag.label }}
        <button
          class="hover:opacity-75 transition-opacity duration-150"
          @click="toggleTag(tag.id)"
          v-tooltip="t('section.tags.removeTag', { label: tag.label })"
          :aria-label="t('section.tags.removeTag', { label: tag.label })"
        >
          <X :size="12" />
        </button>
      </span>
    </div>
    <div v-else class="text-xs app-subtle italic mb-2">{{ t('section.tags.empty') }}</div>

    <!-- Picker -->
    <div v-if="picker" class="border app-border rounded app-surface-2 p-2 space-y-2">
      <div class="text-xs font-medium app-muted">{{ t('section.tags.available') }}</div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="tag in availableTags"
          :key="tag.id"
          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-opacity"
          :style="{
            backgroundColor: tag.color,
            color: 'white',
            opacity: isApplied(tag.id) ? 1 : 0.5,
          }"
          v-tooltip="tag.description"
          @click="toggleTag(tag.id)"
        >
          <Check v-if="isApplied(tag.id)" :size="12" />
          {{ tag.label }}
        </button>
      </div>

      <div class="border-t pt-2 space-y-1">
        <div class="text-xs font-medium app-muted">{{ t('section.tags.create') }}</div>
        <div class="flex items-center gap-2">
          <input
            v-model="newLabel"
            type="text"
            :placeholder="t('section.tags.newName')"
            class="app-input flex-1 px-2 py-1 text-xs"
            @keydown.enter="handleCreate"
          />
          <input
            v-model="newColor"
            type="color"
            class="w-7 h-7 border app-border rounded cursor-pointer"
          />
          <button
            class="app-btn-primary px-2 py-1 text-xs rounded"
            :disabled="!newLabel.trim()"
            @click="handleCreate"
          >
            {{ t('common.ok') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
