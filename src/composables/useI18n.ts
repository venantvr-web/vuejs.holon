// src/composables/useI18n.ts
import { ref, computed } from 'vue';

/**
 * Composable i18n léger, sans dépendance externe.
 * Fournit une infrastructure de traduction extensible : ajouter une langue =
 * étendre `messages`, puis `setLocale('xx')`. La langue choisie est persistée
 * en localStorage.
 *
 * Pour passer à vue-i18n plus tard, migrer les clés telles quelles — la
 * signature `t(key)` est identique.
 */

export type Locale = 'fr' | 'en';

type Messages = Record<Locale, Record<string, string>>;

const messages: Messages = {
  fr: {
    // Toolbar
    'toolbar.undo': 'Annuler',
    'toolbar.redo': 'Rétablir',
    'toolbar.group': 'Grouper',
    'toolbar.ungroup': 'Dégrouper',
    'toolbar.align': 'Aligner',
    'toolbar.layout': 'Layout',
    'toolbar.validate': 'Valider',
    'toolbar.suggest': 'Suggérer',
    'toolbar.versions': 'Versions',
    'toolbar.import': 'Importer',
    'toolbar.export': 'Exporter',
    'toolbar.clear': 'Effacer',
    'toolbar.grid': 'Grille',
    'toolbar.snap': 'Aimant',
    'toolbar.zoomIn': 'Zoom avant',
    'toolbar.zoomOut': 'Zoom arrière',
    'toolbar.zoomFit': 'Ajuster',
    'toolbar.zoomReset': 'Réinitialiser',
    // Sidebar
    'sidebar.library': 'Bibliothèque',
    'sidebar.outline': 'Plan du modèle',
    // Common
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.close': 'Fermer',
    'common.save': 'Sauver',
    'common.delete': 'Supprimer',
    'common.filter': 'Filtrer…',
  },
  en: {
    'toolbar.undo': 'Undo',
    'toolbar.redo': 'Redo',
    'toolbar.group': 'Group',
    'toolbar.ungroup': 'Ungroup',
    'toolbar.align': 'Align',
    'toolbar.layout': 'Layout',
    'toolbar.validate': 'Validate',
    'toolbar.suggest': 'Suggest',
    'toolbar.versions': 'Versions',
    'toolbar.import': 'Import',
    'toolbar.export': 'Export',
    'toolbar.clear': 'Clear',
    'toolbar.grid': 'Grid',
    'toolbar.snap': 'Snap',
    'toolbar.zoomIn': 'Zoom in',
    'toolbar.zoomOut': 'Zoom out',
    'toolbar.zoomFit': 'Fit',
    'toolbar.zoomReset': 'Reset',
    'sidebar.library': 'Library',
    'sidebar.outline': 'Model outline',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.filter': 'Filter…',
  },
};

const STORAGE_KEY = 'holon.locale';

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch { /* ignore */ }
  return 'fr';
}

const currentLocale = ref<Locale>(loadLocale());

export const AVAILABLE_LOCALES: Array<{ value: Locale; label: string; flag: string }> = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

export function useI18n() {
  function t(key: string): string {
    return messages[currentLocale.value]?.[key] ?? messages.fr[key] ?? key;
  }

  function setLocale(locale: Locale) {
    currentLocale.value = locale;
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    document.documentElement.setAttribute('lang', locale);
  }

  return {
    t,
    locale: computed(() => currentLocale.value),
    setLocale,
  };
}

// Appliquer l'attribut lang au démarrage.
document.documentElement.setAttribute('lang', currentLocale.value);
