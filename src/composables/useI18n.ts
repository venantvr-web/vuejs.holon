// src/composables/useI18n.ts
import { ref, computed } from 'vue'

/**
 * Composable i18n léger, sans dépendance externe.
 *
 * Fournit :
 * - `t(key)` : traduction simple
 * - `t(key, params)` : interpolation `{name}` style ICU minimal
 * - `tn(key, count, params?)` : pluralisation à 2 formes (« 0/1 » vs « 2+ »).
 *   La clé pointe sur une string contenant `{singulier} | {pluriel}` (par
 *   convention) — voir les exemples plus bas.
 * - `formatDate(date)` / `formatNumber(value, options)` : helpers `Intl`
 *   pilotés par la locale courante.
 *
 * Pour migrer vers `vue-i18n` plus tard, les clés et la signature `t(key)`
 * sont compatibles — seul `tn` est spécifique.
 */

export type Locale = 'fr' | 'en'

type Messages = Record<Locale, Record<string, string>>

const messages: Messages = {
  fr: {
    // === Toolbar — boutons principaux ===
    'toolbar.undo': 'Annuler',
    'toolbar.redo': 'Rétablir',
    'toolbar.group': 'Grouper',
    'toolbar.ungroup': 'Dégrouper',
    'toolbar.align': 'Aligner',
    'toolbar.layout': 'Layout',
    'toolbar.validate': 'Valider',
    'toolbar.suggest': 'Suggérer',
    'toolbar.versions': 'Versions',
    'toolbar.views': 'Vues',
    'toolbar.filter': 'Filtrer',
    'toolbar.import': 'Importer',
    'toolbar.export': 'Exporter',
    'toolbar.clear': 'Effacer',
    'toolbar.grid': 'Grille',
    'toolbar.snap': 'Aimant',
    'toolbar.history': 'Historique',
    'toolbar.layers': 'Couches',
    'toolbar.zoomIn': 'Zoom avant',
    'toolbar.zoomOut': 'Zoom arrière',
    'toolbar.zoomFit': 'Ajuster',
    'toolbar.zoomReset': 'Réinitialiser',
    // Tooltips (riches) de la toolbar
    'toolbar.tooltip.brand': 'Guide utilisateur (onboarding)',
    'toolbar.tooltip.zoomOut': 'Zoom arrière',
    'toolbar.tooltip.zoomIn': 'Zoom avant',
    'toolbar.tooltip.zoomFit': 'Ajuster à la sélection (ou tout)',
    'toolbar.tooltip.zoomReset': 'Réinitialiser la vue (100 %)',
    'toolbar.tooltip.undo': 'Annuler (Ctrl+Z)',
    'toolbar.tooltip.redo': 'Rétablir (Ctrl+Maj+Z)',
    'toolbar.tooltip.history': 'Afficher / masquer la timeline d’historique',
    'toolbar.tooltip.layers': 'Afficher / masquer les couches Archimate',
    'toolbar.tooltip.grid': 'Afficher la grille et y aimanter (activé/désactivé)',
    'toolbar.tooltip.snap':
      'Aimanter sur les autres noeuds (Alt pendant le drag désactive temporairement)',
    'toolbar.tooltip.layout': 'Appliquer un algorithme de mise en page automatique',
    'toolbar.tooltip.align': 'Aligner et distribuer (2+ éléments requis)',
    'toolbar.tooltip.group': 'Grouper la sélection (Ctrl+G)',
    'toolbar.tooltip.ungroup': 'Dégrouper la sélection (Ctrl+Shift+G)',
    'toolbar.tooltip.muteOn': 'Activer les sons d’interface',
    'toolbar.tooltip.muteOff': 'Couper les sons d’interface',
    'toolbar.tooltip.clear': 'Effacer tout le canevas',
    'toolbar.tooltip.export': 'Exporter le diagramme',
    'toolbar.tooltip.import': 'Importer un fichier JSON versionné',
    'toolbar.tooltip.help': 'Aide — raccourcis clavier (F1)',
    'toolbar.tooltip.themeToDark': 'Passer en mode Nuit',
    'toolbar.tooltip.themeToLight': 'Passer en mode Jour',
    'toolbar.tooltip.language': 'Langue : {locale}',
    'toolbar.tooltip.languageAria': 'Choisir la langue',

    // === Sidebar / bibliothèque ===
    'sidebar.library': 'Bibliothèque',
    'sidebar.outline': 'Plan du modèle',
    'sidebar.eventStorming': 'Stickers Event Storming',
    'sidebar.eventStormingHint': 'Glissez un sticker sur le canevas',

    // === Mode Event Storming ===
    'notation.archimate': 'Archimate',
    'notation.eventStorming': 'Event Storming',
    'notation.tooltip': 'Choisir la notation du canevas (Archimate ou Event Storming)',
    'es.type.domain-event': 'Événement de domaine',
    'es.type.command': 'Commande',
    'es.type.actor': 'Acteur',
    'es.type.aggregate': 'Agrégat',
    'es.type.policy': 'Politique',
    'es.type.read-model': 'Modèle de lecture',
    'es.type.external-system': 'Système externe',
    'es.type.hotspot': 'Point chaud',
    'es.grammar.invalid': 'Relation non conforme à la grammaire Event Storming',

    // === Actions communes ===
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.close': 'Fermer',
    'common.save': 'Sauver',
    'common.delete': 'Supprimer',
    'common.filter': 'Filtrer…',
    'common.search': 'Rechercher',
    'common.ok': 'OK',
    'common.add': 'Ajouter',
    'common.remove': 'Retirer',
    'common.apply': 'Appliquer',
    'common.reset': 'Réinitialiser',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.all': 'Tout',
    'common.none': 'Aucun',
    'common.show': 'Afficher',
    'common.hide': 'Masquer',
    'common.empty': 'Vide',
    'common.loading': 'Chargement…',
    'common.drag': 'glisser',

    // === Menus contextuels ===
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

    // === Canevas / Modes ===
    'canvas.connectionMode': 'Mode connexion — cliquez sur un nœud cible (Échap pour annuler)',
    'canvas.commentLabel': 'Commentaire',
    'canvas.commentPlaceholder': 'Ajouter un commentaire…',
    'canvas.connectionStarted': 'Mode connexion activé',
    'canvas.connectionCreated': 'Connexion créée',
    'canvas.connectionCancelled': 'Mode connexion annulé',
    'canvas.ariaLabel': 'Canevas d’édition de graphe',
    'edge.ariaWithLabel': 'Relation : {label}',
    'edge.ariaWithoutLabel': 'Relation entre noeuds',
    'node.ariaCollapse': 'Replier le conteneur',
    'node.ariaExpand': 'Développer le conteneur',
    'node.ariaEditComment': 'Modifier le commentaire',
    'node.ariaAddComment': 'Ajouter un commentaire',
    'node.ariaStartConnection': 'Démarrer une connexion depuis ce noeud',
    'node.ariaTypePicker': 'Type Archimate : {label} (cliquer pour changer)',
    'node.typeNone': 'aucun',

    // === Landmarks ARIA App ===
    'app.skipToCanvas': 'Aller au canevas',
    'app.navAria': 'Bibliothèque et plan du modèle',
    'app.inspectorAria': 'Inspecteur de propriétés',

    // === Toolbar — labels ARIA résiduels et confirmations ===
    'toolbar.aria.zoomOut': 'Zoom arrière',
    'toolbar.aria.zoomIn': 'Zoom avant',
    'toolbar.aria.zoomFit': 'Ajuster la vue',
    'toolbar.aria.muteOn': 'Sons coupés',
    'toolbar.aria.muteOff': 'Sons activés',
    'toolbar.confirmClear': 'Voulez-vous vraiment supprimer tous les éléments ?',

    // === Outline panel ===
    'outline.filterPlaceholder': 'Filtrer…',
    'outline.ariaExpand': 'Déplier',
    'outline.ariaCollapse': 'Replier',

    // === Edge label editor ===
    'edge.namePlaceholder': 'Nom de la relation…',

    // === Empty state ===
    'emptyState.title': 'Commençons un nouveau modèle',
    'emptyState.intro': 'Le canevas est vide. Plusieurs façons de démarrer :',
    'emptyState.dragFromLibrary':
      'Glissez un bloc depuis la {library} (panneau de gauche) vers le canevas.',
    'emptyState.importExisting':
      'Importez un modèle existant (JSON Holon ou Archimate XML) avec le bouton {import} de la barre d’outils.',
    'emptyState.pressF1': 'Appuyez sur {f1} pour voir tous les raccourcis clavier.',
    'emptyState.shortcutsTitle': 'Raccourcis utiles',
    'emptyState.shortcutMarquee': 'Sélection rectangle',
    'emptyState.shortcutConnect': 'Relier deux noeuds',
    'emptyState.shortcutNoSnap': 'Désactiver le magnétisme',
    'emptyState.duringDrag': '(pendant le drag)',
    'emptyState.welcomeLabel': 'Bienvenue sur Holon — guide rapide',

    // === Bibliothèque ===
    'library.blockNamePrompt': 'Nom du bloc dans la bibliothèque :',
    'library.defaultBlockName': 'Mon bloc',
    'library.empty': 'Aucun bloc dans la bibliothèque',
    'library.dragHint': 'Glissez un bloc sur le canevas',
    'library.removeConfirm': 'Supprimer « {name} » de la bibliothèque ?',
    'library.removeTooltip': 'Supprimer de la bibliothèque',

    // === Recherche ===
    'search.placeholder': 'Rechercher un nœud ou une relation…',
    'search.noResults': 'Aucun résultat',
    'search.results': '{count} résultat | {count} résultats',
    'search.title': 'Recherche',
    'search.closeAria': 'Fermer (Échap)',
    'search.hintNavigate': 'naviguer',
    'search.hintEnter': 'centrer',
    'search.kindNode': 'N',
    'search.kindEdge': 'E',

    // === Historique ===
    'history.title': 'Historique',
    'history.empty': 'Aucun état dans l’historique.',
    'history.entryLabel': 'État #{n}',
    'history.summary': '{nodes} · {edges} · {age}',
    'history.clearAll': 'Vider',
    'history.tooltipClearAll': 'Effacer tout l’historique (irréversible)',
    'history.closeAria': 'Fermer le panneau historique',
    'history.dialogAria': 'Historique des modifications',
    'history.justNow': 'à l’instant',
    'history.secondsAgo': 'il y a {n} s',
    'history.minutesAgo': 'il y a {n} min',
    'history.hoursAgo': 'il y a {n} h',

    // === Couches Archimate ===
    'layers.title': 'Couches',
    'layers.typed': '{n} typé | {n} typés',
    'layers.showAll': 'Tout afficher',
    'layers.hideAll': 'Tout masquer',
    'layers.tooltipShowAll': 'Afficher toutes les couches',
    'layers.tooltipHideAll': 'Masquer toutes les couches',
    'layers.tooltipShowLayer': 'Afficher la couche {name}',
    'layers.tooltipHideLayer': 'Masquer la couche {name}',
    'layers.closeAria': 'Fermer le panneau couches',
    'layers.dialogAria': 'Visibilité par couche Archimate',

    // === Filtres ===
    'filter.title': 'Filtres',
    'filter.placeholder': 'ex. couche:business et non tag:obsolète',
    'filter.queryLabel': 'Requête',
    'filter.matching': 'Correspondants',
    'filter.kept': 'conservés',
    'filter.discarded': 'écartés',
    'filter.effect': 'Effet',
    'filter.tooltipKept': 'Seuls les éléments correspondants (et leurs parents) restent visibles',
    'filter.tooltipDiscarded': 'Les éléments correspondants (et leurs enfants) sont écartés',
    'filter.tooltipDim': 'Les éléments écartés sont estompés',
    'filter.tooltipMask': 'Les éléments écartés sont retirés du rendu',
    'filter.modeKeep': 'Conserver',
    'filter.modeHide': 'Écarter',
    'filter.styleDim': 'Estomper',
    'filter.styleMask': 'Masquer',
    'filter.empty': 'Aucun filtre actif',
    'filter.activeCount': '{n} élément écarté | {n} éléments écartés',
    'filter.save': 'Sauvegarder',
    'filter.reset': 'Réinitialiser',
    'filter.savePrompt': 'Nom du filtre :',
    'filter.label': 'Filtre',
    'filter.labelCount': 'Filtre ({n})',
    'filter.shortcuts': 'Raccourcis',
    'filter.saved': 'Filtres sauvegardés',
    'filter.deleteOne': 'Supprimer le filtre {name}',
    'filter.tooltipMain': 'Filtrer le diagramme par requête (masquer ou estomper des éléments)',
    'filter.dialogAria': 'Filtre du diagramme',
    'filter.syntaxHide': 'Masquer la syntaxe',
    'filter.syntaxShow': 'Aide sur la syntaxe…',
    'filter.help.name': '<code>mot</code> — le nom contient « mot » (accents ignorés)',
    'filter.help.layer': '<code>couche:business</code> — métier, application, technology/infra…',
    'filter.help.archi': '<code>archi:business-actor</code> — type Archimate',
    'filter.help.type': '<code>type:container</code> / <code>type:forme</code>',
    'filter.help.meta':
      '<code>tag:critique</code>, <code>prop:owner=DSI</code>, <code>commentaire:2027</code>',
    'filter.help.combinators':
      '<code>et / ou / non</code>, parenthèses, <code>nom:pay*</code> (joker), <code>nom="CRM"</code> (exact), <code>nom~regex</code>',

    // === Vues ===
    'views.title': 'Vues',
    'views.empty': 'Aucune vue sauvegardée.',
    'views.emptyHint': 'Cliquez sur « + Sauver » pour capturer la vue courante.',
    'views.savePrompt': 'Nom de la vue :',
    'views.defaultName': 'Vue {n}',
    'views.save': '+ Sauver',
    'views.saveTooltip': 'Sauvegarder la vue courante',
    'views.deleteConfirm': 'Supprimer la vue « {name} » ?',
    'views.tooltip': 'Gérer les vues sauvegardées',
    'views.heading': 'Vues sauvegardées',
    'views.count': 'Vues ({n})',

    // === Versions ===
    'versions.title': 'Versions',
    'versions.empty': 'Aucune version sauvegardée.',
    'versions.create': 'Créer une version',
    'versions.namePrompt': 'Nom de cette version :',
    'versions.defaultName': 'Version {n}',
    'versions.descriptionPrompt': 'Description (optionnel) :',
    'versions.restoreConfirm':
      'Restaurer « {name } » ? L’état courant sera remplacé (annulable via Ctrl+Z).',
    'versions.deleteConfirm': 'Supprimer la version « {name} » ?',
    'versions.deleteTooltip': 'Supprimer cette version',
    'versions.restore': 'Restaurer',
    'versions.delete': 'Supprimer la version',
    'versions.tooltipMain': 'Versions du modèle',
    'versions.tooltipSave': 'Capturer l’état courant',
    'versions.save': '+ Sauver',
    'versions.heading': 'Historique des versions',
    'versions.count': 'Versions ({n})',
    'versions.summary': '{date} · {nodes} · {edges}',

    // === Validation ===
    'validation.title': 'Validation',
    'validation.run': 'Valider le modèle',
    'validation.noIssues': 'Aucun problème détecté',
    'validation.errors': '{n} erreur | {n} erreurs',
    'validation.warnings': '{n} avertissement | {n} avertissements',
    'validation.infos': '{n} information | {n} informations',
    'validation.results': 'Résultats de validation',
    'validation.summary': '{errors} · {warnings}',
    'validation.attention': '{n} attention | {n} attentions',
    'validation.revalidate': 'Revalider',
    'validation.valid': 'Aucun problème détecté — le graphe est valide.',
    'validation.tooltip': 'Valider le graphe et afficher les problèmes',
    'validation.severity.error': 'Erreur',
    'validation.severity.warning': 'Attention',
    'validation.severity.info': 'Info',

    // === Suggestions ===
    'suggestions.title': 'Suggestions',
    'suggestions.empty': 'Aucune suggestion pour l’instant',
    'suggestions.refresh': 'Rafraîchir',
    'suggestions.apply': 'Appliquer',
    'suggestions.dismiss': 'Ignorer',
    'suggestions.tooltipMain': 'Générer des suggestions contextuelles',
    'suggestions.count': '{n} proposition | {n} propositions',
    'suggestions.clearAll': 'Tout effacer',
    'suggestions.focus': 'Voir',
    'suggestions.focusTooltip': 'Centrer sur les éléments concernés',
    'suggestions.priority.high': 'Prioritaire',
    'suggestions.priority.medium': 'Moyenne',
    'suggestions.priority.low': 'Basse',

    // === Export ===
    'export.title': 'Exporter',
    'export.png': 'Image PNG',
    'export.svg': 'Image SVG',
    'export.pdf': 'Document PDF',
    'export.json': 'JSON Holon',
    'export.archimate': 'Archimate XML',
    'export.exporting': 'Export {format}…',
    'export.success': '✓ {format} exporté',
    'export.error': '✗ Erreur : {message}',
    'export.modelTitle': 'Modèle d’architecture Holon',
    'export.exportedOn': 'Exporté le {date}',
    'export.byAuthor': 'Par {author}',
    'export.nodesCount': '{n} noeud | {n} noeuds',
    'export.edgesCount': '{n} relation | {n} relations',
    'export.tableOfContents': 'Table des matières',
    'export.overview': 'Vue d’ensemble',
    'export.layerSection': 'Couche {name}',
    'export.elementsCount': '{n} élément | {n} éléments',
    'export.section.raster': 'Image raster',
    'export.section.vector': 'Vectoriel / Document',
    'export.section.data': 'Données',
    'export.png96': 'PNG · Écran (96 DPI)',
    'export.png200': 'PNG · Haute qualité (200 DPI)',
    'export.png300': 'PNG · Impression (300 DPI)',
    'export.svgLabel': 'SVG',
    'export.pdfLabel': 'PDF',
    'export.jsonLabel': 'JSON (v1.0, avec métadonnées)',
    'export.label.png96': 'PNG 96 DPI',
    'export.label.png200': 'PNG 200 DPI',
    'export.label.png300': 'PNG 300 DPI',
    'export.label.svg': 'SVG',
    'export.label.pdf': 'PDF',
    'export.label.json': 'JSON',

    // === Import ===
    'import.title': 'Importer',
    'import.tooltip': 'Importer un fichier JSON versionné',
    'import.dragHint': 'Glissez un fichier ici',
    'import.inProgress': 'Import en cours…',
    'import.warnings': '({n} avertissement) | ({n} avertissements)',
    'import.success': '✓ {nodes} noeuds, {edges} arêtes{warnings}',
    'import.errorPrefix': '✗ {message}',
    'import.errorGeneric': '✗ Erreur : {message}',
    'import.dialogTitle': 'Importer « {filename} »',
    'import.mergeStrategy': 'Stratégie de fusion',
    'import.merge.append': 'Ajouter au graphe existant',
    'import.merge.replace': 'Remplacer tout le graphe',
    'import.merge.merge': 'Fusionner intelligemment',
    'import.conflictStrategy': 'En cas de conflit d’ID',
    'import.conflict.rename': 'Renommer (sûr, recommandé)',
    'import.conflict.skip': 'Ignorer les éléments en conflit',
    'import.conflict.replace': 'Remplacer les éléments existants',
    'import.undoHint': 'Astuce : l’import est annulable via Ctrl+Z si vous vous trompez.',

    // === Property Inspector ===
    'inspector.noSelection': 'Aucune sélection',
    'inspector.clickToInspect': 'Cliquez sur un élément pour voir ses propriétés',
    'inspector.multiSelection': 'Multi-sélection',
    'inspector.selectedCount': '{n} élément sélectionné | {n} éléments sélectionnés',

    // === Sections d'inspecteur ===
    'section.identity.title': 'Identité',
    'section.name.label': 'Nom',
    'section.name.placeholder': 'Nom du noeud…',
    'section.label.title': 'Libellé',
    'section.label.label': 'Nom',
    'section.label.placeholder': 'ex. implémente, utilise, flux de données…',
    'section.label.comment': 'Commentaire',
    'section.label.commentPlaceholder': 'Description libre, notes, justification…',
    'section.style.title': 'Apparence',
    'section.style.fill': 'Couleur de fond',
    'section.style.stroke': 'Couleur de bordure',
    'section.style.strokeWidth': 'Épaisseur de bordure',
    'section.style.opacity': 'Opacité',
    'section.style.typeOverride': 'Type {label} — couleur surchargée',
    'section.style.revertType': 'Revenir au type',
    'section.style.revertTooltip': 'Revenir à la couleur de la layer Archimate',
    'section.style.customColor': 'Couleur personnalisée',
    'section.tags.title': 'Tags',
    'section.tags.placeholder': 'Ajouter une étiquette…',
    'section.tags.add': '+ Ajouter',
    'section.tags.empty': 'Aucun tag appliqué.',
    'section.tags.available': 'Tags disponibles',
    'section.tags.create': 'Créer un tag',
    'section.tags.newName': 'Nom du tag…',
    'section.tags.removeTag': 'Retirer {label}',
    'section.properties.title': 'Propriétés personnalisées',
    'section.properties.empty': 'Aucune propriété.',
    'section.properties.addKey': 'Clé (ex. owner)',
    'section.properties.addLabel': 'Libellé (optionnel)',
    'section.properties.addValue': 'Valeur',
    'section.properties.add': '+ Ajouter',
    'section.properties.close': 'Fermer',
    'section.properties.submit': 'Ajouter',
    'section.properties.removeTooltip': 'Supprimer la propriété',
    'section.properties.templates': 'Modèles :',
    'section.properties.type.string': 'Texte',
    'section.properties.type.number': 'Nombre',
    'section.properties.type.boolean': 'Booléen',
    'section.properties.type.date': 'Date',
    'section.properties.type.url': 'URL',
    'section.properties.type.email': 'Email',
    'section.confidence.title': 'Maturité du modèle',
    'section.confidence.maturity': 'Maturité',
    'section.confidence.level': 'Niveau',
    'section.confidence.confidence': 'Confiance',
    'section.confidence.sources': 'Sources',
    'section.confidence.questions': 'Questions ouvertes',
    'section.confidence.alternatives': 'Alternatives',
    'section.confidence.levelTooltip': '{label} — {description}',
    'section.relationType.title': 'Type de relation',
    'section.relationType.choose': 'Choisir un type',
    'section.relationType.category.structural': 'Structurelles',
    'section.relationType.category.dependency': 'Dépendances',
    'section.relationType.category.dynamic': 'Dynamiques',
    'section.relationType.category.other': 'Autres',
    'section.relationType.accessType': 'Type d’accès',
    'section.relationType.access.read': 'Lecture',
    'section.relationType.access.write': 'Écriture',
    'section.relationType.access.readwrite': 'Lecture/Écriture',
    'section.relationType.influence': 'Force d’influence',
    'section.relationType.flowType': 'Type de flux',
    'section.relationType.flow.information': 'Information',
    'section.relationType.flow.material': 'Matériel',
    'section.relationType.flow.money': 'Monétaire',
    'section.relationType.flow.energy': 'Énergie',
    'section.arrow.title': 'Flèches',
    'section.arrow.startArrow': 'Marqueur de départ',
    'section.arrow.endArrow': 'Marqueur de fin',
    'section.arrow.size': 'Taille des flèches',
    'section.arrow.preview': 'Aperçu :',
    'section.arrow.previewNote':
      'Aperçu simplifié. Les marqueurs sont générés dynamiquement sur le canvas.',

    // === Breadcrumb ===
    'breadcrumb.root': 'Racine',
    'breadcrumb.goToRoot': 'Aller à la racine',

    // === Mini-map ===
    'minimap.ariaLabel': 'Mini-carte du diagramme',

    // === Style panel (NodeStylePanel) ===
    'stylePanel.backgroundColor': 'Couleur de fond',
    'stylePanel.borderColor': 'Couleur de bordure',
    'stylePanel.shapeLabel': 'Forme : {name}',
    'stylePanel.changeShape': 'Changer',
    'stylePanel.hideShape': 'Masquer',
    'stylePanel.typeLabel': 'Type : {name}',
    'stylePanel.typeNone': 'Aucun',
    'stylePanel.actionsTitle': 'Actions',
    'stylePanel.toggleLockOn': '🔓 Déverrouiller',
    'stylePanel.toggleLockOff': '🔒 Verrouiller',
    'stylePanel.bringToFront': '↑ Devant',
    'stylePanel.sendToBack': '↓ Derrière',
    'stylePanel.addToLibrary': '📚 Bibliothèque',
    'stylePanel.tooltipAddToLibrary': 'Sauvegarder ce bloc comme modèle réutilisable',
    'stylePanel.noType': 'Aucun type',

    // === Archimate type picker ===
    'typePicker.title': 'Type Archimate',
    'typePicker.clear': 'Aucun type',
    'typePicker.placeholder': 'Type Archimate…',
    'typePicker.closeAria': 'Fermer (Échap)',
    'typePicker.noMatch': 'Aucun type ne correspond.',
    'typePicker.footer': '{n} type Archimate 3.2 | {n} types Archimate 3.2',

    // === Raccourcis ===
    'shortcuts.title': 'Raccourcis clavier',
    'shortcuts.f1Hint': 'Appuyez sur F1 pour ouvrir/fermer · Échap pour fermer',
    'shortcuts.closeAria': 'Fermer l’aide',
    'shortcuts.tooltip': 'Aide — raccourcis clavier (F1)',

    // === Manuel utilisateur ===
    'manual.header': 'Guide utilisateur · onboarding',
    'manual.closeAria': 'Fermer',
    'manual.closeTooltip': 'Fermer (Échap)',
    'manual.previous': 'Précédent',
    'manual.next': 'Suivant',
  },

  en: {
    // === Toolbar — main buttons ===
    'toolbar.undo': 'Undo',
    'toolbar.redo': 'Redo',
    'toolbar.group': 'Group',
    'toolbar.ungroup': 'Ungroup',
    'toolbar.align': 'Align',
    'toolbar.layout': 'Layout',
    'toolbar.validate': 'Validate',
    'toolbar.suggest': 'Suggest',
    'toolbar.versions': 'Versions',
    'toolbar.views': 'Views',
    'toolbar.filter': 'Filter',
    'toolbar.import': 'Import',
    'toolbar.export': 'Export',
    'toolbar.clear': 'Clear',
    'toolbar.grid': 'Grid',
    'toolbar.snap': 'Snap',
    'toolbar.history': 'History',
    'toolbar.layers': 'Layers',
    'toolbar.zoomIn': 'Zoom in',
    'toolbar.zoomOut': 'Zoom out',
    'toolbar.zoomFit': 'Fit',
    'toolbar.zoomReset': 'Reset',
    'toolbar.tooltip.brand': 'User guide (onboarding)',
    'toolbar.tooltip.zoomOut': 'Zoom out',
    'toolbar.tooltip.zoomIn': 'Zoom in',
    'toolbar.tooltip.zoomFit': 'Fit to selection (or all)',
    'toolbar.tooltip.zoomReset': 'Reset view (100%)',
    'toolbar.tooltip.undo': 'Undo (Ctrl+Z)',
    'toolbar.tooltip.redo': 'Redo (Ctrl+Shift+Z)',
    'toolbar.tooltip.history': 'Show / hide history timeline',
    'toolbar.tooltip.layers': 'Show / hide Archimate layers',
    'toolbar.tooltip.grid': 'Show grid and snap to it (on/off)',
    'toolbar.tooltip.snap': 'Snap to other nodes (hold Alt while dragging to disable)',
    'toolbar.tooltip.layout': 'Apply an automatic layout algorithm',
    'toolbar.tooltip.align': 'Align and distribute (2+ elements required)',
    'toolbar.tooltip.group': 'Group selection (Ctrl+G)',
    'toolbar.tooltip.ungroup': 'Ungroup selection (Ctrl+Shift+G)',
    'toolbar.tooltip.muteOn': 'Enable UI sounds',
    'toolbar.tooltip.muteOff': 'Mute UI sounds',
    'toolbar.tooltip.clear': 'Clear the whole canvas',
    'toolbar.tooltip.export': 'Export diagram',
    'toolbar.tooltip.import': 'Import a versioned JSON file',
    'toolbar.tooltip.help': 'Help — keyboard shortcuts (F1)',
    'toolbar.tooltip.themeToDark': 'Switch to Night mode',
    'toolbar.tooltip.themeToLight': 'Switch to Day mode',
    'toolbar.tooltip.language': 'Language: {locale}',
    'toolbar.tooltip.languageAria': 'Choose language',

    'sidebar.library': 'Library',
    'sidebar.outline': 'Model outline',
    'sidebar.eventStorming': 'Event Storming stickers',
    'sidebar.eventStormingHint': 'Drag a sticker onto the canvas',

    // === Event Storming mode ===
    'notation.archimate': 'Archimate',
    'notation.eventStorming': 'Event Storming',
    'notation.tooltip': 'Choose the canvas notation (Archimate or Event Storming)',
    'es.type.domain-event': 'Domain event',
    'es.type.command': 'Command',
    'es.type.actor': 'Actor',
    'es.type.aggregate': 'Aggregate',
    'es.type.policy': 'Policy',
    'es.type.read-model': 'Read model',
    'es.type.external-system': 'External system',
    'es.type.hotspot': 'Hotspot',
    'es.grammar.invalid': 'Relation does not follow the Event Storming grammar',

    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.filter': 'Filter…',
    'common.search': 'Search',
    'common.ok': 'OK',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.apply': 'Apply',
    'common.reset': 'Reset',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.none': 'None',
    'common.show': 'Show',
    'common.hide': 'Hide',
    'common.empty': 'Empty',
    'common.loading': 'Loading…',
    'common.drag': 'drag',

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
    'canvas.connectionStarted': 'Connection mode enabled',
    'canvas.connectionCreated': 'Connection created',
    'canvas.connectionCancelled': 'Connection mode cancelled',
    'canvas.ariaLabel': 'Graph editing canvas',
    'edge.ariaWithLabel': 'Relation: {label}',
    'edge.ariaWithoutLabel': 'Relation between nodes',
    'node.ariaCollapse': 'Collapse container',
    'node.ariaExpand': 'Expand container',
    'node.ariaEditComment': 'Edit comment',
    'node.ariaAddComment': 'Add a comment',
    'node.ariaStartConnection': 'Start a connection from this node',
    'node.ariaTypePicker': 'Archimate type: {label} (click to change)',
    'node.typeNone': 'none',

    'app.skipToCanvas': 'Skip to canvas',
    'app.navAria': 'Library and model outline',
    'app.inspectorAria': 'Property inspector',

    'toolbar.aria.zoomOut': 'Zoom out',
    'toolbar.aria.zoomIn': 'Zoom in',
    'toolbar.aria.zoomFit': 'Fit view',
    'toolbar.aria.muteOn': 'Sounds muted',
    'toolbar.aria.muteOff': 'Sounds on',
    'toolbar.confirmClear': 'Really delete every element?',

    'outline.filterPlaceholder': 'Filter…',
    'outline.ariaExpand': 'Expand',
    'outline.ariaCollapse': 'Collapse',

    'edge.namePlaceholder': 'Relation name…',

    'emptyState.title': 'Let’s start a new model',
    'emptyState.intro': 'The canvas is empty. Several ways to get started:',
    'emptyState.dragFromLibrary': 'Drag a block from the {library} (left panel) onto the canvas.',
    'emptyState.importExisting':
      'Import an existing model (Holon JSON or Archimate XML) using the {import} button in the toolbar.',
    'emptyState.pressF1': 'Press {f1} to see all keyboard shortcuts.',
    'emptyState.shortcutsTitle': 'Handy shortcuts',
    'emptyState.shortcutMarquee': 'Marquee selection',
    'emptyState.shortcutConnect': 'Connect two nodes',
    'emptyState.shortcutNoSnap': 'Disable snapping',
    'emptyState.duringDrag': '(while dragging)',
    'emptyState.welcomeLabel': 'Welcome to Holon — quick guide',

    'library.blockNamePrompt': 'Block name in the library:',
    'library.defaultBlockName': 'My block',
    'library.empty': 'No blocks in the library',
    'library.dragHint': 'Drag a block onto the canvas',
    'library.removeConfirm': 'Remove “{name}” from the library?',
    'library.removeTooltip': 'Remove from library',

    'search.placeholder': 'Search a node or a relation…',
    'search.noResults': 'No results',
    'search.results': '{count} result | {count} results',
    'search.title': 'Search',
    'search.closeAria': 'Close (Esc)',
    'search.hintNavigate': 'navigate',
    'search.hintEnter': 'centre',
    'search.kindNode': 'N',
    'search.kindEdge': 'E',

    'history.title': 'History',
    'history.empty': 'No state in history.',
    'history.entryLabel': 'State #{n}',
    'history.summary': '{nodes} · {edges} · {age}',
    'history.clearAll': 'Clear',
    'history.tooltipClearAll': 'Clear all history (irreversible)',
    'history.closeAria': 'Close history panel',
    'history.dialogAria': 'Edit history',
    'history.justNow': 'just now',
    'history.secondsAgo': '{n} s ago',
    'history.minutesAgo': '{n} min ago',
    'history.hoursAgo': '{n} h ago',

    'layers.title': 'Layers',
    'layers.typed': '{n} typed | {n} typed',
    'layers.showAll': 'Show all',
    'layers.hideAll': 'Hide all',
    'layers.tooltipShowAll': 'Show all layers',
    'layers.tooltipHideAll': 'Hide all layers',
    'layers.tooltipShowLayer': 'Show {name} layer',
    'layers.tooltipHideLayer': 'Hide {name} layer',
    'layers.closeAria': 'Close layers panel',
    'layers.dialogAria': 'Visibility per Archimate layer',

    'filter.title': 'Filters',
    'filter.placeholder': 'e.g. layer:business and not tag:obsolete',
    'filter.queryLabel': 'Query',
    'filter.matching': 'Matching',
    'filter.kept': 'kept',
    'filter.discarded': 'discarded',
    'filter.effect': 'Effect',
    'filter.tooltipKept': 'Only matching elements (and their parents) stay visible',
    'filter.tooltipDiscarded': 'Matching elements (and their children) are discarded',
    'filter.tooltipDim': 'Discarded elements are dimmed',
    'filter.tooltipMask': 'Discarded elements are removed from rendering',
    'filter.modeKeep': 'Keep',
    'filter.modeHide': 'Discard',
    'filter.styleDim': 'Dim',
    'filter.styleMask': 'Mask',
    'filter.empty': 'No active filter',
    'filter.activeCount': '{n} element discarded | {n} elements discarded',
    'filter.save': 'Save',
    'filter.reset': 'Reset',
    'filter.savePrompt': 'Filter name:',
    'filter.label': 'Filter',
    'filter.labelCount': 'Filter ({n})',
    'filter.shortcuts': 'Shortcuts',
    'filter.saved': 'Saved filters',
    'filter.deleteOne': 'Delete filter {name}',
    'filter.tooltipMain': 'Filter the diagram by query (mask or dim elements)',
    'filter.dialogAria': 'Diagram filter',
    'filter.syntaxHide': 'Hide syntax',
    'filter.syntaxShow': 'Syntax help…',
    'filter.help.name': '<code>word</code> — the name contains “word” (accents ignored)',
    'filter.help.layer': '<code>layer:business</code> — business, application, technology/infra…',
    'filter.help.archi': '<code>archi:business-actor</code> — Archimate type',
    'filter.help.type': '<code>type:container</code> / <code>type:shape</code>',
    'filter.help.meta':
      '<code>tag:critical</code>, <code>prop:owner=DSI</code>, <code>comment:2027</code>',
    'filter.help.combinators':
      '<code>and / or / not</code>, parentheses, <code>name:pay*</code> (wildcard), <code>name="CRM"</code> (exact), <code>name~regex</code>',

    'views.title': 'Views',
    'views.empty': 'No saved view.',
    'views.emptyHint': 'Click “+ Save” to capture the current view.',
    'views.savePrompt': 'View name:',
    'views.defaultName': 'View {n}',
    'views.save': '+ Save',
    'views.saveTooltip': 'Save current view',
    'views.deleteConfirm': 'Delete view “{name}”?',
    'views.tooltip': 'Manage saved views',
    'views.heading': 'Saved views',
    'views.count': 'Views ({n})',

    'versions.title': 'Versions',
    'versions.empty': 'No saved version.',
    'versions.create': 'Create a version',
    'versions.namePrompt': 'Version name:',
    'versions.defaultName': 'Version {n}',
    'versions.descriptionPrompt': 'Description (optional):',
    'versions.restoreConfirm':
      'Restore “{name}”? Current state will be replaced (undoable via Ctrl+Z).',
    'versions.deleteConfirm': 'Delete version “{name}”?',
    'versions.deleteTooltip': 'Delete this version',
    'versions.restore': 'Restore',
    'versions.delete': 'Delete version',
    'versions.tooltipMain': 'Model versions',
    'versions.tooltipSave': 'Capture current state',
    'versions.save': '+ Save',
    'versions.heading': 'Version history',
    'versions.count': 'Versions ({n})',
    'versions.summary': '{date} · {nodes} · {edges}',

    'validation.title': 'Validation',
    'validation.run': 'Validate the model',
    'validation.noIssues': 'No issue detected',
    'validation.errors': '{n} error | {n} errors',
    'validation.warnings': '{n} warning | {n} warnings',
    'validation.infos': '{n} info | {n} infos',
    'validation.results': 'Validation results',
    'validation.summary': '{errors} · {warnings}',
    'validation.attention': '{n} warning | {n} warnings',
    'validation.revalidate': 'Revalidate',
    'validation.valid': 'No issue detected — graph is valid.',
    'validation.tooltip': 'Validate the graph and show issues',
    'validation.severity.error': 'Error',
    'validation.severity.warning': 'Warning',
    'validation.severity.info': 'Info',

    'suggestions.title': 'Suggestions',
    'suggestions.empty': 'No suggestion at this time',
    'suggestions.refresh': 'Refresh',
    'suggestions.apply': 'Apply',
    'suggestions.dismiss': 'Dismiss',
    'suggestions.tooltipMain': 'Generate contextual suggestions',
    'suggestions.count': '{n} proposal | {n} proposals',
    'suggestions.clearAll': 'Clear all',
    'suggestions.focus': 'View',
    'suggestions.focusTooltip': 'Centre on related elements',
    'suggestions.priority.high': 'High',
    'suggestions.priority.medium': 'Medium',
    'suggestions.priority.low': 'Low',

    'export.title': 'Export',
    'export.png': 'PNG image',
    'export.svg': 'SVG image',
    'export.pdf': 'PDF document',
    'export.json': 'Holon JSON',
    'export.archimate': 'Archimate XML',
    'export.exporting': 'Exporting {format}…',
    'export.success': '✓ {format} exported',
    'export.error': '✗ Error: {message}',
    'export.modelTitle': 'Holon Architecture Model',
    'export.exportedOn': 'Exported on {date}',
    'export.byAuthor': 'By {author}',
    'export.nodesCount': '{n} node | {n} nodes',
    'export.edgesCount': '{n} relation | {n} relations',
    'export.tableOfContents': 'Table of contents',
    'export.overview': 'Overview',
    'export.layerSection': '{name} layer',
    'export.elementsCount': '{n} element | {n} elements',
    'export.section.raster': 'Raster image',
    'export.section.vector': 'Vector / Document',
    'export.section.data': 'Data',
    'export.png96': 'PNG · Screen (96 DPI)',
    'export.png200': 'PNG · High quality (200 DPI)',
    'export.png300': 'PNG · Print (300 DPI)',
    'export.svgLabel': 'SVG',
    'export.pdfLabel': 'PDF',
    'export.jsonLabel': 'JSON (v1.0, with metadata)',
    'export.label.png96': 'PNG 96 DPI',
    'export.label.png200': 'PNG 200 DPI',
    'export.label.png300': 'PNG 300 DPI',
    'export.label.svg': 'SVG',
    'export.label.pdf': 'PDF',
    'export.label.json': 'JSON',

    'import.title': 'Import',
    'import.tooltip': 'Import a versioned JSON file',
    'import.dragHint': 'Drag a file here',
    'import.inProgress': 'Importing…',
    'import.warnings': '({n} warning) | ({n} warnings)',
    'import.success': '✓ {nodes} nodes, {edges} edges{warnings}',
    'import.errorPrefix': '✗ {message}',
    'import.errorGeneric': '✗ Error: {message}',
    'import.dialogTitle': 'Import “{filename}”',
    'import.mergeStrategy': 'Merge strategy',
    'import.merge.append': 'Append to existing graph',
    'import.merge.replace': 'Replace whole graph',
    'import.merge.merge': 'Smart merge',
    'import.conflictStrategy': 'On ID conflict',
    'import.conflict.rename': 'Rename (safe, recommended)',
    'import.conflict.skip': 'Skip conflicting elements',
    'import.conflict.replace': 'Replace existing elements',
    'import.undoHint': 'Tip: the import is undoable via Ctrl+Z if you made a mistake.',

    'inspector.noSelection': 'Nothing selected',
    'inspector.clickToInspect': 'Click an element to see its properties',
    'inspector.multiSelection': 'Multi-selection',
    'inspector.selectedCount': '{n} element selected | {n} elements selected',

    'section.identity.title': 'Identity',
    'section.name.label': 'Name',
    'section.name.placeholder': 'Node name…',
    'section.label.title': 'Label',
    'section.label.label': 'Name',
    'section.label.placeholder': 'e.g. implements, uses, data flow…',
    'section.label.comment': 'Comment',
    'section.label.commentPlaceholder': 'Free description, notes, rationale…',
    'section.style.title': 'Appearance',
    'section.style.fill': 'Fill colour',
    'section.style.stroke': 'Border colour',
    'section.style.strokeWidth': 'Border width',
    'section.style.opacity': 'Opacity',
    'section.style.typeOverride': 'Type {label} — colour overridden',
    'section.style.revertType': 'Revert to type',
    'section.style.revertTooltip': 'Revert to Archimate layer colour',
    'section.style.customColor': 'Custom colour',
    'section.tags.title': 'Tags',
    'section.tags.placeholder': 'Add a tag…',
    'section.tags.add': '+ Add',
    'section.tags.empty': 'No tag applied.',
    'section.tags.available': 'Available tags',
    'section.tags.create': 'Create a tag',
    'section.tags.newName': 'Tag name…',
    'section.tags.removeTag': 'Remove {label}',
    'section.properties.title': 'Custom properties',
    'section.properties.empty': 'No property.',
    'section.properties.addKey': 'Key (e.g. owner)',
    'section.properties.addLabel': 'Label (optional)',
    'section.properties.addValue': 'Value',
    'section.properties.add': '+ Add',
    'section.properties.close': 'Close',
    'section.properties.submit': 'Add',
    'section.properties.removeTooltip': 'Remove property',
    'section.properties.templates': 'Templates:',
    'section.properties.type.string': 'Text',
    'section.properties.type.number': 'Number',
    'section.properties.type.boolean': 'Boolean',
    'section.properties.type.date': 'Date',
    'section.properties.type.url': 'URL',
    'section.properties.type.email': 'Email',
    'section.confidence.title': 'Model maturity',
    'section.confidence.maturity': 'Maturity',
    'section.confidence.level': 'Level',
    'section.confidence.confidence': 'Confidence',
    'section.confidence.sources': 'Sources',
    'section.confidence.questions': 'Open questions',
    'section.confidence.alternatives': 'Alternatives',
    'section.confidence.levelTooltip': '{label} — {description}',
    'section.relationType.title': 'Relation type',
    'section.relationType.choose': 'Choose a type',
    'section.relationType.category.structural': 'Structural',
    'section.relationType.category.dependency': 'Dependencies',
    'section.relationType.category.dynamic': 'Dynamic',
    'section.relationType.category.other': 'Other',
    'section.relationType.accessType': 'Access type',
    'section.relationType.access.read': 'Read',
    'section.relationType.access.write': 'Write',
    'section.relationType.access.readwrite': 'Read/Write',
    'section.relationType.influence': 'Influence strength',
    'section.relationType.flowType': 'Flow type',
    'section.relationType.flow.information': 'Information',
    'section.relationType.flow.material': 'Material',
    'section.relationType.flow.money': 'Money',
    'section.relationType.flow.energy': 'Energy',
    'section.arrow.title': 'Arrows',
    'section.arrow.startArrow': 'Start marker',
    'section.arrow.endArrow': 'End marker',
    'section.arrow.size': 'Arrow size',
    'section.arrow.preview': 'Preview:',
    'section.arrow.previewNote': 'Simplified preview. Markers are generated dynamically on canvas.',

    'breadcrumb.root': 'Root',
    'breadcrumb.goToRoot': 'Go to root',

    'minimap.ariaLabel': 'Diagram minimap',

    'stylePanel.backgroundColor': 'Background colour',
    'stylePanel.borderColor': 'Border colour',
    'stylePanel.shapeLabel': 'Shape: {name}',
    'stylePanel.changeShape': 'Change',
    'stylePanel.hideShape': 'Hide',
    'stylePanel.typeLabel': 'Type: {name}',
    'stylePanel.typeNone': 'None',
    'stylePanel.actionsTitle': 'Actions',
    'stylePanel.toggleLockOn': '🔓 Unlock',
    'stylePanel.toggleLockOff': '🔒 Lock',
    'stylePanel.bringToFront': '↑ Front',
    'stylePanel.sendToBack': '↓ Back',
    'stylePanel.addToLibrary': '📚 Library',
    'stylePanel.tooltipAddToLibrary': 'Save this block as a reusable template',
    'stylePanel.noType': 'No type',

    'typePicker.title': 'Archimate type',
    'typePicker.clear': 'No type',
    'typePicker.placeholder': 'Archimate type…',
    'typePicker.closeAria': 'Close (Esc)',
    'typePicker.noMatch': 'No matching type.',
    'typePicker.footer': '{n} Archimate 3.2 type | {n} Archimate 3.2 types',

    'shortcuts.title': 'Keyboard shortcuts',
    'shortcuts.f1Hint': 'Press F1 to open/close · Esc to close',
    'shortcuts.closeAria': 'Close help',
    'shortcuts.tooltip': 'Help — keyboard shortcuts (F1)',

    'manual.header': 'User guide · onboarding',
    'manual.closeAria': 'Close',
    'manual.closeTooltip': 'Close (Esc)',
    'manual.previous': 'Previous',
    'manual.next': 'Next',
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

/**
 * Mappe une locale `useI18n` à une locale BCP 47 pour `Intl`. Permet de
 * formater dates et nombres en cohérence avec la langue affichée.
 */
function bcp47(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-GB'
}

/**
 * Substitue les placeholders `{name}` dans un template par les valeurs du
 * dictionnaire `params`. Si une clé n'a pas de valeur, on laisse le
 * placeholder intact (aide au diagnostic en dev).
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  )
}

/**
 * Sélectionne la forme plurielle correcte dans une chaîne
 * « singulier | pluriel ». Si la chaîne n'a pas de séparateur, on l'utilise
 * pour les deux formes (l'utilisateur n'a probablement pas besoin de pluriel).
 *
 * Choix volontairement simple à 2 formes : fr et en n'ont pas besoin de plus
 * (à la différence du polonais ou de l'arabe). Si une langue avec plus de
 * formes plurielles est ajoutée, étendre cette fonction (CLDR plural rules).
 */
function selectPlural(template: string, count: number): string {
  const parts = template.split('|').map((p) => p.trim())
  if (parts.length === 1) return parts[0]
  // 0 et 1 → singulier ; 2+ → pluriel. En français, 0 est singulier (« 0 noeud »).
  // Anglais identique.
  return Math.abs(count) <= 1 ? parts[0] : parts[1]
}

export function useI18n() {
  function t(key: string, params?: Record<string, string | number>): string {
    const template = messages[currentLocale.value]?.[key] ?? messages.fr[key] ?? key
    return interpolate(template, params)
  }

  /**
   * Helper pluralisation. La clé doit pointer sur un template
   * `singulier | pluriel` ; `{n}` est auto-injecté comme `count` si non
   * fourni dans `params`.
   *
   * @example
   * ```ts
   * tn('export.nodesCount', 1)  // "1 noeud"
   * tn('export.nodesCount', 3)  // "3 noeuds"
   * tn('search.results', count) // "{count} résultat(s)"
   * ```
   */
  function tn(key: string, count: number, params?: Record<string, string | number>): string {
    const template = messages[currentLocale.value]?.[key] ?? messages.fr[key] ?? key
    const form = selectPlural(template, count)
    return interpolate(form, { n: count, count, ...(params ?? {}) })
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

  /**
   * Date longue localisée. Par défaut format « 12 juin 2026 » en fr,
   * « 12 June 2026 » en en. Options Intl.DateTimeFormatOptions transmises
   * telles quelles si besoin de personnaliser.
   */
  function formatDate(date: Date | number | string, options?: Intl.DateTimeFormatOptions): string {
    const d = date instanceof Date ? date : new Date(date)
    const opts: Intl.DateTimeFormatOptions = options ?? {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
    return new Intl.DateTimeFormat(bcp47(currentLocale.value), opts).format(d)
  }

  /**
   * Heure courte localisée (HH:MM:SS).
   */
  function formatTime(date: Date | number | string): string {
    const d = date instanceof Date ? date : new Date(date)
    return new Intl.DateTimeFormat(bcp47(currentLocale.value), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d)
  }

  /**
   * Nombre formaté selon la locale (séparateurs et décimales adaptés).
   */
  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(bcp47(currentLocale.value), options).format(value)
  }

  return {
    t,
    tn,
    locale: computed(() => currentLocale.value),
    setLocale,
    formatDate,
    formatTime,
    formatNumber,
  }
}

// Appliquer l'attribut lang au démarrage.
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('lang', currentLocale.value)
}
