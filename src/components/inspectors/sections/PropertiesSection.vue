
<!-- src/components/inspectors/sections/PropertiesSection.vue -->
<script setup lang="ts">
import { ref, toRef } from 'vue';
import { usePropertyable, type CustomProperty, type PropertyType } from '../../../composables/traits/usePropertyable';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();
const nodeIdRef = toRef(props, 'nodeId');

const { properties, templates, addProperty, updateProperty, removeProperty, applyTemplate } =
  usePropertyable({ nodeId: nodeIdRef });

const adderOpen = ref(false);
const newKey = ref('');
const newLabel = ref('');
const newType = ref<PropertyType>('string');

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'string', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'boolean', label: 'Booléen' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
];

function handleAdd() {
  const key = newKey.value.trim();
  if (!key) return;
  const defaultValue: Record<PropertyType, unknown> = {
    string: '',
    number: 0,
    boolean: false,
    date: new Date().toISOString().slice(0, 10),
    select: '',
    url: '',
    email: '',
  };
  const prop: CustomProperty = {
    key,
    value: defaultValue[newType.value],
    type: newType.value,
    label: newLabel.value.trim() || key,
  };
  addProperty(prop);
  newKey.value = '';
  newLabel.value = '';
  adderOpen.value = false;
}

function castBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}
function castNumber(value: unknown): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function inputTypeFor(type: PropertyType): string {
  if (type === 'date') return 'date';
  if (type === 'url') return 'url';
  if (type === 'email') return 'email';
  if (type === 'number') return 'number';
  return 'text';
}
</script>

<template>
  <section class="p-3 border-b">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-gray-700">Propriétés personnalisées</h3>
      <button
        class="text-xs text-blue-600 hover:text-blue-800 hover:underline"
        @click="adderOpen = !adderOpen"
      >
        {{ adderOpen ? 'Fermer' : '+ Ajouter' }}
      </button>
    </div>

    <!-- Liste -->
    <div v-if="properties.length > 0" class="space-y-2 mb-2">
      <div
        v-for="prop in properties"
        :key="prop.key"
        class="group flex items-start gap-2"
      >
        <div class="flex-1 min-w-0">
          <label class="block text-xs text-gray-500 truncate">
            {{ prop.label ?? prop.key }}
            <span v-if="prop.required" class="text-red-500">*</span>
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
            class="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-blue-500"
            @change="updateProperty(prop.key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in prop.options ?? []" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input
            v-else
            :type="inputTypeFor(prop.type)"
            :value="prop.value as string"
            class="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-blue-500"
            @input="updateProperty(prop.key, prop.type === 'number' ? castNumber(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value)"
          />
        </div>
        <button
          class="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 mt-4"
          title="Supprimer la propriété"
          @click="removeProperty(prop.key)"
        >
          ✕
        </button>
      </div>
    </div>
    <div v-else class="text-xs text-gray-400 italic mb-2">Aucune propriété.</div>

    <!-- Templates -->
    <div v-if="templates.length > 0" class="text-xs text-gray-500 mb-2">
      Modèles :
      <button
        v-for="tpl in templates"
        :key="tpl.name"
        class="ml-1 text-blue-600 hover:text-blue-800 hover:underline"
        :title="tpl.description"
        @click="applyTemplate(tpl.name)"
      >
        {{ tpl.name }}
      </button>
    </div>

    <!-- Adder -->
    <div v-if="adderOpen" class="border rounded bg-gray-50 p-2 space-y-2">
      <input
        v-model="newKey"
        type="text"
        placeholder="Clé (ex. owner)"
        class="w-full px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500"
      />
      <input
        v-model="newLabel"
        type="text"
        placeholder="Libellé (optionnel)"
        class="w-full px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500"
      />
      <div class="flex items-center gap-2">
        <select
          v-model="newType"
          class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500"
        >
          <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <button
          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40"
          :disabled="!newKey.trim()"
          @click="handleAdd"
        >
          Ajouter
        </button>
      </div>
    </div>
  </section>
</template>
