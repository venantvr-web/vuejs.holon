<!-- src/components/inspectors/sections/PropertiesSection.vue -->
<script setup lang="ts">
import { ref, toRef, computed } from 'vue'
import { X } from 'lucide-vue-next'
import {
  usePropertyable,
  type CustomProperty,
  type PropertyType,
} from '../../../composables/traits/usePropertyable'
import { useI18n } from '../../../composables/useI18n'

const { t } = useI18n()

interface Props {
  nodeId: string
}
const props = defineProps<Props>()
const nodeIdRef = toRef(props, 'nodeId')

const { properties, templates, addProperty, updateProperty, removeProperty, applyTemplate } =
  usePropertyable({ nodeId: nodeIdRef })

const adderOpen = ref(false)
const newKey = ref('')
const newLabel = ref('')
const newType = ref<PropertyType>('string')

const TYPES = computed<{ value: PropertyType; label: string }[]>(() => [
  { value: 'string', label: t('section.properties.type.string') },
  { value: 'number', label: t('section.properties.type.number') },
  { value: 'boolean', label: t('section.properties.type.boolean') },
  { value: 'date', label: t('section.properties.type.date') },
  { value: 'url', label: t('section.properties.type.url') },
  { value: 'email', label: t('section.properties.type.email') },
])

function handleAdd() {
  const key = newKey.value.trim()
  if (!key) return
  const defaultValue: Record<PropertyType, unknown> = {
    string: '',
    number: 0,
    boolean: false,
    date: new Date().toISOString().slice(0, 10),
    select: '',
    url: '',
    email: '',
  }
  const prop: CustomProperty = {
    key,
    value: defaultValue[newType.value],
    type: newType.value,
    label: newLabel.value.trim() || key,
  }
  addProperty(prop)
  newKey.value = ''
  newLabel.value = ''
  adderOpen.value = false
}

function castBoolean(value: unknown): boolean {
  return value === true || value === 'true'
}
function castNumber(value: unknown): number {
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

function inputTypeFor(type: PropertyType): string {
  if (type === 'date') return 'date'
  if (type === 'url') return 'url'
  if (type === 'email') return 'email'
  if (type === 'number') return 'number'
  return 'text'
}
</script>

<template>
  <section class="p-3 border-b app-border">
    <div class="flex items-center justify-between mb-2">
      <h3 class="app-section-title">{{ t('section.properties.title') }}</h3>
      <button class="text-xs app-link" @click="adderOpen = !adderOpen">
        {{ adderOpen ? t('section.properties.close') : t('section.properties.add') }}
      </button>
    </div>

    <!-- Liste -->
    <div v-if="properties.length > 0" class="space-y-2 mb-2">
      <div v-for="prop in properties" :key="prop.key" class="group flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <label class="block text-xs app-subtle truncate">
            {{ prop.label ?? prop.key }}
            <span v-if="prop.required" class="app-danger-text">*</span>
          </label>
          <input
            v-if="prop.type === 'boolean'"
            type="checkbox"
            :checked="castBoolean(prop.value)"
            class="mt-0.5"
            @change="updateProperty(prop.key, ($event.target as HTMLInputElement).checked)"
          />
          <select
            v-else-if="prop.type === 'select'"
            :value="prop.value as string"
            class="app-input w-full px-2 py-1 text-sm"
            @change="updateProperty(prop.key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in prop.options ?? []" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input
            v-else
            :type="inputTypeFor(prop.type)"
            :value="prop.value as string"
            class="app-input w-full px-2 py-1 text-sm"
            @input="
              updateProperty(
                prop.key,
                prop.type === 'number'
                  ? castNumber(($event.target as HTMLInputElement).value)
                  : ($event.target as HTMLInputElement).value
              )
            "
          />
        </div>
        <button
          class="opacity-0 group-hover:opacity-100 app-danger-link mt-4 transition-opacity duration-150"
          v-tooltip="t('section.properties.removeTooltip')"
          :aria-label="t('section.properties.removeTooltip')"
          @click="removeProperty(prop.key)"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
    <div v-else class="text-xs app-subtle italic mb-2">{{ t('section.properties.empty') }}</div>

    <!-- Templates -->
    <div v-if="templates.length > 0" class="text-xs app-subtle mb-2">
      {{ t('section.properties.templates') }}
      <button
        v-for="tpl in templates"
        :key="tpl.name"
        class="ml-1 app-link"
        v-tooltip="tpl.description"
        @click="applyTemplate(tpl.name)"
      >
        {{ tpl.name }}
      </button>
    </div>

    <!-- Adder -->
    <div v-if="adderOpen" class="border app-border rounded app-surface-2 p-2 space-y-2">
      <input
        v-model="newKey"
        type="text"
        :placeholder="t('section.properties.addKey')"
        class="app-input w-full px-2 py-1 text-xs"
      />
      <input
        v-model="newLabel"
        type="text"
        :placeholder="t('section.properties.addLabel')"
        class="app-input w-full px-2 py-1 text-xs"
      />
      <div class="flex items-center gap-2">
        <select v-model="newType" class="app-input flex-1 px-2 py-1 text-xs">
          <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <button
          class="app-btn-primary px-2 py-1 text-xs rounded"
          :disabled="!newKey.trim()"
          @click="handleAdd"
        >
          {{ t('section.properties.submit') }}
        </button>
      </div>
    </div>
  </section>
</template>
