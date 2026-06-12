// src/composables/useI18n.ts
import { ref, computed } from 'vue'

/**
 * Composable i18n léger, sans dépendance externe.
 * Fournit une infrastructure de traduction extensible : ajouter une langue =
 * étendre `messages`, puis `setLocale('xx')`. La langue choisie est persistée
 * en localStorage.
 *
 * Pour passer à vue-i18n plus tard, migrer les clés telles quelles — la
 * signature `t(key)` est identique.
 */

export type Locale = 'fr' | 'en'

type Messages = Record<Locale, Record<string, string>>

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
    // Menus contextuels du canevas
    'menu.duplicate': 'Dupliquer',
    'menu.copy': 'Copier',
    'menu.cut': 'Couper',
    'menu.paste': 'Coller',
    'menu.pasteHere': 'Coller ici',
    'menu.group': 'Grouper',
    'menu.groupRequires': 'Grouper (2+ requis)',
    'menu.ungroup': 'Dégrouper',
    'menu.addToLibrary': 'Ajouter à la bibliothèque',
    'menu.selectAll': 'Tout sélectionner',
    'menu.deselect': 'Désélectionner',
    // Canevas
    'canvas.connectionMode': 'Mode connexion — cliquez sur un nœud cible (Échap pour annuler)',
    'canvas.commentLabel': 'Commentaire',
    'canvas.commentPlaceholder': 'Ajouter un commentaire…',
    // Bibliothèque
    'library.blockNamePrompt': 'Nom du bloc dans la bibliothèque :',
    'library.defaultBlockName': 'Mon bloc',
    // Recherche
    'search.placeholder': 'Rechercher un nœud ou une relation…',
    'search.noResults': 'Aucun résultat',
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
    'menu.duplicate': 'Duplicate',
    'menu.copy': 'Copy',
    'menu.cut': 'Cut',
    'menu.paste': 'Paste',
    'menu.pasteHere': 'Paste here',
    'menu.group': 'Group',
    'menu.groupRequires': 'Group (2+ required)',
    'menu.ungroup': 'Ungroup',
    'menu.addToLibrary': 'Add to library',
    'menu.selectAll': 'Select all',
    'menu.deselect': 'Deselect',
    'canvas.connectionMode': 'Connection mode — click a target node (Esc to cancel)',
    'canvas.commentLabel': 'Comment',
    'canvas.commentPlaceholder': 'Add a comment…',
    'library.blockNamePrompt': 'Block name in the library:',
    'library.defaultBlockName': 'My block',
    'search.placeholder': 'Search a node or a relation…',
    'search.noResults': 'No results',
  },
}

const STORAGE_KEY = 'holon.locale'

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'fr'
}

const currentLocale = ref<Locale>(loadLocale())

export const AVAILABLE_LOCALES: Array<{ value: Locale; label: string; flag: string }> = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
]

export function useI18n() {
  function t(key: string): string {
    return messages[currentLocale.value]?.[key] ?? messages.fr[key] ?? key
  }

  function setLocale(locale: Locale) {
    currentLocale.value = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute('lang', locale)
  }

  return {
    t,
    locale: computed(() => currentLocale.value),
    setLocale,
  }
}

// Appliquer l'attribut lang au démarrage.
document.documentElement.setAttribute('lang', currentLocale.value)
