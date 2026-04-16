// src/composables/traits/usePropertyable.ts
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Type de propriété personnalisée.
 */
export type PropertyType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'url' | 'email';

/**
 * Définition d'une propriété personnalisée.
 */
export interface CustomProperty {
  /**
   * Clé unique de la propriété.
   */
  key: string;
  /**
   * Valeur de la propriété.
   */
  value: unknown;
  /**
   * Type de la propriété.
   */
  type: PropertyType;
  /**
   * Label d'affichage.
   */
  label?: string;
  /**
   * Options pour type 'select'.
   */
  options?: string[];
  /**
   * Fonction de validation personnalisée.
   */
  validation?: (value: unknown) => boolean;
  /**
   * Propriété obligatoire.
   */
  required?: boolean;
  /**
   * Description de la propriété.
   */
  description?: string;
}

/**
 * Template de propriétés réutilisable.
 */
export interface PropertyTemplate {
  /**
   * Nom du template.
   */
  name: string;
  /**
   * Description du template.
   */
  description?: string;
  /**
   * Propriétés du template.
   */
  properties: Omit<CustomProperty, 'value'>[];
}

/**
 * Options de configuration pour le trait Propertyable.
 */
export interface PropertyableOptions {
  /**
   * Référence réactive vers l'ID du noeud ou de l'arête concerné.
   */
  nodeId: Ref<string>;
}

/**
 * État réactif exposé par le trait Propertyable.
 */
export interface PropertyableState {
  /**
   * Toutes les propriétés personnalisées.
   */
  properties: Ref<CustomProperty[]>;
  /**
   * Templates disponibles.
   */
  templates: Ref<PropertyTemplate[]>;
}

/**
 * Handlers (actions) exposés par le trait Propertyable.
 */
export interface PropertyableHandlers {
  /**
   * Ajoute une propriété personnalisée.
   * @param property - Propriété à ajouter
   */
  addProperty: (property: CustomProperty) => void;
  /**
   * Met à jour une propriété existante.
   * @param key - Clé de la propriété
   * @param value - Nouvelle valeur
   */
  updateProperty: (key: string, value: unknown) => void;
  /**
   * Supprime une propriété.
   * @param key - Clé de la propriété à supprimer
   */
  removeProperty: (key: string) => void;
  /**
   * Récupère la valeur d'une propriété.
   * @param key - Clé de la propriété
   * @returns Valeur de la propriété ou undefined
   */
  getProperty: (key: string) => unknown;
  /**
   * Valide une propriété selon son type et sa validation.
   * @param property - Propriété à valider
   * @returns true si valide
   */
  validateProperty: (property: CustomProperty) => boolean;
  /**
   * Applique un template de propriétés.
   * @param templateName - Nom du template
   */
  applyTemplate: (templateName: string) => void;
  /**
   * Crée un template depuis les propriétés actuelles.
   * @param name - Nom du template
   * @param description - Description optionnelle
   */
  createTemplate: (name: string, description?: string) => void;
}

// Templates prédéfinis
const PREDEFINED_TEMPLATES: PropertyTemplate[] = [
  {
    name: 'Archimate Element',
    description: 'Propriétés standard pour un élément Archimate',
    properties: [
      { key: 'name', type: 'string', label: 'Nom', required: true },
      { key: 'description', type: 'string', label: 'Description' },
      { key: 'owner', type: 'string', label: 'Propriétaire' },
      { key: 'status', type: 'select', label: 'Statut', options: ['Draft', 'Proposed', 'Approved', 'Deprecated'] },
    ],
  },
  {
    name: 'Documentation',
    description: 'Propriétés de documentation',
    properties: [
      { key: 'title', type: 'string', label: 'Titre', required: true },
      { key: 'author', type: 'string', label: 'Auteur' },
      { key: 'version', type: 'string', label: 'Version' },
      { key: 'lastModified', type: 'date', label: 'Dernière modification' },
      { key: 'url', type: 'url', label: 'URL de référence' },
    ],
  },
];

/**
 * Trait permettant de gérer des propriétés personnalisées sur les noeuds.
 *
 * Supporte différents types de propriétés (string, number, boolean, date, select)
 * avec validation et templates réutilisables.
 *
 * @param options - Options de configuration
 * @returns État réactif et handlers pour les propriétés
 *
 * @example
 * ```typescript
 * const { properties, addProperty, updateProperty } = usePropertyable({
 *   nodeId: ref('node-123')
 * });
 *
 * // Ajouter une propriété
 * addProperty({
 *   key: 'owner',
 *   value: 'John Doe',
 *   type: 'string',
 *   label: 'Propriétaire'
 * });
 *
 * // Mettre à jour
 * updateProperty('owner', 'Jane Doe');
 * ```
 */
export function usePropertyable(options: PropertyableOptions): PropertyableState & PropertyableHandlers {
  const graphStore = useGraphStore();

  const templates = computed(() => PREDEFINED_TEMPLATES);

  const properties = computed((): CustomProperty[] => {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return [];

    const customProps = node.data?.customProperties as CustomProperty[] | undefined;
    return customProps || [];
  });

  /**
   * Valide une propriété.
   */
  function validateProperty(property: CustomProperty): boolean {
    const { value, type, required, validation } = property;

    // Vérifier si requis
    if (required && (value === undefined || value === null || value === '')) {
      return false;
    }

    // Validation personnalisée
    if (validation && !validation(value)) {
      return false;
    }

    // Validation par type
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value as string));
      case 'url':
        try {
          new URL(value as string);
          return true;
        } catch {
          return false;
        }
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'select':
        return property.options ? property.options.includes(value as string) : true;
      default:
        return true;
    }
  }

  /**
   * Ajoute une propriété.
   */
  function addProperty(property: CustomProperty): void {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    if (!validateProperty(property)) {
      console.warn('Propriété invalide:', property);
      return;
    }

    const currentProps = (node.data?.customProperties as CustomProperty[]) || [];
    const updatedProps = [...currentProps, property];

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        customProperties: updatedProps,
      },
    });
  }

  /**
   * Met à jour une propriété.
   */
  function updateProperty(key: string, value: unknown): void {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const currentProps = (node.data?.customProperties as CustomProperty[]) || [];
    const propIndex = currentProps.findIndex((p) => p.key === key);

    if (propIndex === -1) return;

    const updatedProp = { ...currentProps[propIndex], value };

    if (!validateProperty(updatedProp)) {
      console.warn('Nouvelle valeur invalide pour la propriété:', key, value);
      return;
    }

    const updatedProps = [...currentProps];
    updatedProps[propIndex] = updatedProp;

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        customProperties: updatedProps,
      },
    });
  }

  /**
   * Supprime une propriété.
   */
  function removeProperty(key: string): void {
    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    const currentProps = (node.data?.customProperties as CustomProperty[]) || [];
    const updatedProps = currentProps.filter((p) => p.key !== key);

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        customProperties: updatedProps,
      },
    });
  }

  /**
   * Récupère une propriété.
   */
  function getProperty(key: string): unknown {
    const prop = properties.value.find((p) => p.key === key);
    return prop?.value;
  }

  /**
   * Applique un template.
   */
  function applyTemplate(templateName: string): void {
    const template = templates.value.find((t) => t.name === templateName);
    if (!template) return;

    const node = graphStore.nodes[options.nodeId.value];
    if (!node) return;

    // Créer les propriétés avec valeurs par défaut
    const newProps: CustomProperty[] = template.properties.map((prop) => ({
      ...prop,
      value: getDefaultValue(prop.type),
    }));

    graphStore.updateNode(options.nodeId.value, {
      data: {
        ...node.data,
        customProperties: newProps,
      },
    });
  }

  /**
   * Crée un template.
   */
  function createTemplate(name: string, description?: string): void {
    const currentProps = properties.value.map((prop) => {
      const { value, ...rest } = prop;
      return rest;
    });

    // Stocker dans le localStorage pour persistance
    const savedTemplates = JSON.parse(
      localStorage.getItem('holon-property-templates') || '[]'
    );

    savedTemplates.push({
      name,
      description,
      properties: currentProps,
    });

    localStorage.setItem('holon-property-templates', JSON.stringify(savedTemplates));
  }

  return {
    properties,
    templates,
    addProperty,
    updateProperty,
    removeProperty,
    getProperty,
    validateProperty,
    applyTemplate,
    createTemplate,
  };
}

/**
 * Retourne une valeur par défaut selon le type.
 */
function getDefaultValue(type: PropertyType): unknown {
  switch (type) {
    case 'string':
    case 'url':
    case 'email':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return new Date();
    case 'select':
      return '';
    default:
      return null;
  }
}
