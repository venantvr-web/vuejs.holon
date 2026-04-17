// src/composables/traits/useThemeable.ts
import { ref, computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

/**
 * Palette de couleurs pour un thème.
 */
export interface ColorPalette {
  /** Couleur primaire */
  primary: string;
  /** Couleur secondaire */
  secondary: string;
  /** Couleur d'accentuation */
  accent: string;
  /** Couleur de fond */
  background: string;
  /** Couleur de surface */
  surface: string;
  /** Couleur du texte principal */
  text: string;
  /** Couleur du texte atténué */
  textMuted: string;
  /** Couleur de bordure */
  border: string;

  /** Couleur de succès */
  success: string;
  /** Couleur d'avertissement */
  warning: string;
  /** Couleur d'erreur */
  error: string;
  /** Couleur d'information */
  info: string;

  /** Couleur de sélection */
  selection: string;
  /** Couleur de survol */
  hover: string;
  /** Couleur de focus */
  focus: string;
}

/**
 * Couleurs spécifiques aux couches ArchiMate.
 */
export interface ArchimateLayerColors {
  /** Couleur de la couche Business */
  business: string;
  /** Couleur de la couche Application */
  application: string;
  /** Couleur de la couche Technology */
  technology: string;
  /** Couleur de la couche Motivation */
  motivation: string;
  /** Couleur de la couche Strategy */
  strategy: string;
  /** Couleur de la couche Implementation */
  implementation: string;
  /** Couleur de la couche Physical */
  physical: string;
  /** Couleur pour les éléments génériques */
  generic: string;
}

/**
 * Définition complète d'un thème visuel.
 */
export interface Theme {
  /** Identifiant unique du thème */
  id: string;
  /** Nom du thème */
  name: string;
  /** Description optionnelle */
  description?: string;
  /** Indique si c'est un thème sombre */
  isDark: boolean;
  /** Palette de couleurs */
  colors: ColorPalette;
  /** Couleurs des couches ArchiMate */
  archimate: ArchimateLayerColors;
  /** Styles par défaut pour les noeuds */
  nodeDefaults: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    borderRadius: number;
  };
  /** Styles par défaut pour les arêtes */
  edgeDefaults: {
    stroke: string;
    strokeWidth: number;
    arrowColor: string;
  };
  /** Date de création (timestamp) */
  createdAt?: number;
  /** Date de dernière modification (timestamp) */
  modifiedAt?: number;
  /** Auteur du thème */
  author?: string;
}

// Thèmes prédéfinis — réduits à deux modes : Jour (clair) et Nuit (sombre).
export const PRESET_THEMES: Record<string, Theme> = {
  light: {
    id: 'light',
    name: 'Jour',
    description: 'Mode clair',
    isDark: false,
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      selection: '#3b82f6',
      hover: '#f1f5f9',
      focus: '#dbeafe',
    },
    archimate: {
      business: '#FFFFB5',
      application: '#B5FFFF',
      technology: '#C9E7B7',
      motivation: '#CCCCFF',
      strategy: '#F5DEAA',
      implementation: '#FFE0E0',
      physical: '#C9E7B7',
      generic: '#E0E0E0',
    },
    nodeDefaults: {
      fill: '#ffffff',
      stroke: '#333333',
      strokeWidth: 1,
      opacity: 1,
      borderRadius: 4,
    },
    edgeDefaults: {
      stroke: '#333333',
      strokeWidth: 2,
      arrowColor: '#333333',
    },
  },

  dark: {
    id: 'dark',
    name: 'Nuit',
    description: 'Mode sombre',
    isDark: true,
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      selection: '#60a5fa',
      hover: '#334155',
      focus: '#1e3a5f',
    },
    archimate: {
      business: '#8B8B00',
      application: '#008B8B',
      technology: '#4A7A3A',
      motivation: '#6666AA',
      strategy: '#A08040',
      implementation: '#AA6060',
      physical: '#4A7A3A',
      generic: '#606060',
    },
    nodeDefaults: {
      fill: '#1e293b',
      stroke: '#94a3b8',
      strokeWidth: 1,
      opacity: 1,
      borderRadius: 4,
    },
    edgeDefaults: {
      stroke: '#94a3b8',
      strokeWidth: 2,
      arrowColor: '#94a3b8',
    },
  },
};

// État global du thème, persisté en localStorage pour survivre aux reloads.
const THEME_STORAGE_KEY = 'holon.theme';
function loadInitialTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* ignore */ }
  // Sinon : respecter la préférence système (prefers-color-scheme).
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch { /* ignore */ }
  return 'light';
}

const currentThemeId = ref<string>(loadInitialTheme());
const customThemes = ref<Map<string, Theme>>(new Map());

// Application immédiate du thème au chargement du module (avant tout mount),
// pour éviter un flash visuel au démarrage.
function applyThemeToDocument(themeId: string) {
  const theme = PRESET_THEMES[themeId] ?? PRESET_THEMES.light;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }
  for (const [key, value] of Object.entries(theme.archimate)) {
    root.style.setProperty(`--archimate-${key}`, value);
  }
  if (theme.isDark) root.classList.add('dark');
  else root.classList.remove('dark');
}
applyThemeToDocument(currentThemeId.value);

/**
 * État réactif géré par le trait Themeable.
 */
export interface ThemeableState {
  /** Thème actuellement actif */
  currentTheme: Ref<Theme>;
  /** Identifiant du thème actuel */
  currentThemeId: Ref<string>;
  /** Liste de tous les thèmes disponibles (presets + personnalisés) */
  availableThemes: Ref<Theme[]>;
  /** Indique si le mode sombre est actif */
  isDarkMode: Ref<boolean>;
}

/**
 * Gestionnaires d'actions fournis par le trait Themeable.
 */
export interface ThemeableHandlers {
  /** Active un thème par son identifiant */
  setTheme: (themeId: string) => void;
  /** Crée un nouveau thème personnalisé et retourne son ID */
  createTheme: (theme: Omit<Theme, 'id' | 'createdAt'>) => string;
  /** Met à jour un thème personnalisé existant */
  updateTheme: (themeId: string, updates: Partial<Theme>) => void;
  /** Supprime un thème personnalisé (impossible pour les presets) */
  deleteTheme: (themeId: string) => boolean;
  /** Duplique un thème existant avec un nouveau nom */
  duplicateTheme: (themeId: string, newName: string) => string | null;
  /** Exporte un thème au format JSON */
  exportTheme: (themeId: string) => string | null;
  /** Importe un thème depuis du JSON */
  importTheme: (json: string) => string | null;
  /** Récupère une couleur de la palette du thème actuel */
  getColor: (key: keyof ColorPalette) => string;
  /** Récupère la couleur d'une couche ArchiMate */
  getArchimateColor: (layer: keyof ArchimateLayerColors) => string;
  /** Applique les styles par défaut du thème à un noeud */
  applyThemeToNode: (nodeId: string) => void;
  /** Bascule entre thème clair et sombre */
  toggleDarkMode: () => void;
}

/**
 * Ajoute la capacité de gestion de thèmes visuels à l'application.
 *
 * Gère 5 thèmes prédéfinis (light, dark, archimate, blueprint, highContrast)
 * et permet la création, modification et persistance de thèmes personnalisés.
 * Applique automatiquement les variables CSS et gère le mode sombre.
 *
 * @returns État réactif et gestionnaires pour la gestion des thèmes
 *
 * @example
 * ```ts
 * const { setTheme, createTheme, getArchimateColor } = useThemeable();
 * setTheme('dark');
 * const businessColor = getArchimateColor('business');
 * ```
 */
export function useThemeable(): ThemeableState & ThemeableHandlers {
  const graphStore = useGraphStore();

  const currentTheme = computed((): Theme => {
    const custom = customThemes.value.get(currentThemeId.value);
    if (custom) return custom;
    return PRESET_THEMES[currentThemeId.value] ?? PRESET_THEMES.light;
  });

  const availableThemes = computed((): Theme[] => {
    const presets = Object.values(PRESET_THEMES);
    const customs = Array.from(customThemes.value.values());
    return [...presets, ...customs];
  });

  const isDarkMode = computed(() => currentTheme.value.isDark);

  function setTheme(themeId: string) {
    if (PRESET_THEMES[themeId] || customThemes.value.has(themeId)) {
      currentThemeId.value = themeId;
      applyThemeToCss();
      try { localStorage.setItem(THEME_STORAGE_KEY, themeId); } catch { /* ignore */ }
    }
  }

  function createTheme(theme: Omit<Theme, 'id' | 'createdAt'>): string {
    const id = `custom-${Date.now()}`;
    const newTheme: Theme = {
      ...theme,
      id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    customThemes.value.set(id, newTheme);
    return id;
  }

  function updateTheme(themeId: string, updates: Partial<Theme>) {
    const theme = customThemes.value.get(themeId);
    if (theme) {
      const updated = {
        ...theme,
        ...updates,
        id: theme.id, // Empêcher la modification de l'ID
        modifiedAt: Date.now(),
      };
      customThemes.value.set(themeId, updated);

      // Si c'est le thème actuel, réappliquer
      if (currentThemeId.value === themeId) {
        applyThemeToCss();
      }
    }
  }

  function deleteTheme(themeId: string): boolean {
    // Ne pas supprimer les presets
    if (PRESET_THEMES[themeId]) return false;

    const deleted = customThemes.value.delete(themeId);

    // Si c'était le thème actuel, revenir au light
    if (deleted && currentThemeId.value === themeId) {
      setTheme('light');
    }

    return deleted;
  }

  function duplicateTheme(themeId: string, newName: string): string | null {
    const source = PRESET_THEMES[themeId] ?? customThemes.value.get(themeId);
    if (!source) return null;

    return createTheme({
      ...source,
      name: newName,
      description: `Copie de ${source.name}`,
    });
  }

  function exportTheme(themeId: string): string | null {
    const theme = PRESET_THEMES[themeId] ?? customThemes.value.get(themeId);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  function importTheme(json: string): string | null {
    try {
      const theme = JSON.parse(json) as Theme;
      // Valider la structure minimale
      if (!theme.name || !theme.colors || !theme.archimate) {
        return null;
      }
      return createTheme(theme);
    } catch {
      return null;
    }
  }

  function getColor(key: keyof ColorPalette): string {
    return currentTheme.value.colors[key];
  }

  function getArchimateColor(layer: keyof ArchimateLayerColors): string {
    return currentTheme.value.archimate[layer];
  }

  function applyThemeToNode(nodeId: string) {
    const node = graphStore.nodes[nodeId];
    if (!node) return;

    const defaults = currentTheme.value.nodeDefaults;

    graphStore.updateNode(nodeId, {
      styling: {
        ...node.styling,
        fill: defaults.fill,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        opacity: defaults.opacity,
      },
    });
  }

  function toggleDarkMode() {
    if (isDarkMode.value) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  }

  // Applique les variables CSS du thème
  function applyThemeToCss() {
    const theme = currentTheme.value;
    const root = document.documentElement;

    // Couleurs de base
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${key}`, value);
    }

    // Couleurs Archimate
    for (const [key, value] of Object.entries(theme.archimate)) {
      root.style.setProperty(`--archimate-${key}`, value);
    }

    // Classe dark mode
    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Appliquer le thème initial
  applyThemeToCss();

  return {
    currentTheme,
    currentThemeId: computed(() => currentThemeId.value),
    availableThemes,
    isDarkMode,
    setTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
    exportTheme,
    importTheme,
    getColor,
    getArchimateColor,
    applyThemeToNode,
    toggleDarkMode,
  };
}

// Export de l'état global pour persistance
export function useThemeState() {
  return {
    currentThemeId,
    customThemes,
    saveToStorage: () => {
      localStorage.setItem('holon-theme', currentThemeId.value);
      localStorage.setItem(
        'holon-custom-themes',
        JSON.stringify(Array.from(customThemes.value.entries()))
      );
    },
    loadFromStorage: () => {
      const savedTheme = localStorage.getItem('holon-theme');
      if (savedTheme) {
        currentThemeId.value = savedTheme;
      }

      const savedCustom = localStorage.getItem('holon-custom-themes');
      if (savedCustom) {
        try {
          const entries = JSON.parse(savedCustom) as [string, Theme][];
          customThemes.value = new Map(entries);
        } catch {
          // Ignorer les erreurs de parsing
        }
      }
    },
  };
}
