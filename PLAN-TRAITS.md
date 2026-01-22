# Plan des Traits pour Holon - Éditeur Archimate/SVG

## Traits Implémentés ✅

### Traits de base (Noeuds)
| Trait | Description | Fichier |
|-------|-------------|---------|
| `useDraggable` | Déplacement des noeuds avec zoom | useDraggable.ts |
| `useResizable` | Redimensionnement avec scaling des enfants | useResizable.ts |
| `useDockable` | Hiérarchie parent/enfant dynamique | useDockable.ts |
| `useEditable` | Édition inline du label | useEditable.ts |
| `useStyleable` | Couleurs fill/stroke, opacité | useStyleable.ts |
| `useConnectable` | Création de liens entre noeuds | useConnectable.ts |
| `useSelectable` | Sélection simple et multiple | useSelectable.ts |
| `useTooltipable` | Commentaires/tooltips sur noeuds | useTooltipable.ts |
| `useCollapsible` | Collapse/expand des containers | useCollapsible.ts |
| `useZIndexable` | Z-order (devant/derrière) | useZIndexable.ts |
| `useTypeable` | 60+ types Archimate, 7 layers | useTypeable.ts |
| `useLockable` | Verrouillage position/taille/style | useLockable.ts |
| `useShapeable` | 22 formes SVG avec enum | useShapeable.ts |

### Traits globaux (Canvas/Selection)
| Trait | Description | Fichier |
|-------|-------------|---------|
| `useUndoable` | Undo/Redo avec historique | useUndoable.ts |
| `useKeyboardable` | Raccourcis clavier | useKeyboardable.ts |
| `useSnappable` | Snap to grid/nodes/guides | useSnappable.ts |
| `useGroupable` | Groupes de noeuds nommés | useGroupable.ts |
| `useAlignable` | Alignement et distribution | useAlignable.ts |
| `useClipboardable` | Copier/Couper/Coller/Dupliquer | useClipboardable.ts |
| `useFilterable` | Filtrage par type/tag/propriété | useFilterable.ts |

### Traits de connexions (Edges)
| Trait | Description | Fichier |
|-------|-------------|---------|
| `useAnchorable` | Points d'ancrage avec intersection | useAnchorable.ts |
| `useRoutable` | 4 types de routage | useRoutable.ts |
| `useArrowable` | 18 types de flèches | useArrowable.ts |

---

## Statistiques

- **23 traits** implémentés
- **22 formes** SVG (Rectangle, Ellipse, Diamond, Star, Cloud, Actor, etc.)
- **60+ types** Archimate dans 7 layers
- **18 types** de flèches (dont Archimate)
- **4 modes** de routage (Straight, Orthogonal, Curved, Bezier)

---

## Traits Restants à Implémenter

### 1. INTERACTION & NAVIGATION

#### `useZoomable`
- Zoom sur un noeud spécifique (focus)
- "Drill-down" : entrer dans un container pour le voir en plein écran
- Breadcrumb de navigation dans la hiérarchie
- Zoom-to-fit automatique

#### `usePannable`
- Pan du canvas (déjà dans GraphCanvas, à extraire)
- Mini-map pour navigation rapide
- Scroll infini avec lazy loading

#### `useFocusable`
- Navigation clavier entre noeuds (Tab, flèches)
- Focus visuel distinct de la sélection
- Skip-links pour accessibilité

---

### 2. DONNÉES & MÉTADONNÉES

#### `useTaggable`
- Tags/labels multiples par noeud
- Catégorisation avec couleurs
- Filtrage par tags

#### `usePropertyable`
- Propriétés clé-valeur personnalisées
- Schéma de propriétés par type
- Propriétés calculées (formules)
- Héritage de propriétés parent→enfant

#### `useVersionable`
- Branches/variantes du diagramme
- Diff visuel entre versions

---

### 3. FILTRAGE & VUES

#### `useLayerable`
- Calques nommés (comme Figma/Illustrator)
- Visibilité par calque
- Verrouillage par calque
- Ordre z-index par calque

#### `useViewable`
- Vues sauvegardées (combinaison filtre + zoom + position)
- Vues prédéfinies par stakeholder
- Export de vue spécifique
- Présentation mode (slideshow de vues)

#### `useSearchable`
- Recherche textuelle globale
- Recherche par expression régulière
- Navigation entre résultats

---

### 4. APPARENCE & RENDU

#### `useThemeable`
- Thèmes globaux (light/dark/custom)
- Palettes Archimate standards
- Variables CSS/tokens

#### `useIconable`
- Icônes intégrées dans les noeuds
- Bibliothèque d'icônes
- Position de l'icône configurable

#### `useBorderable`
- Styles de bordure (solid, dashed, dotted)
- Bordures doubles
- Ombres portées

#### `useGradientable`
- Dégradés linéaires/radiaux
- Presets de dégradés

---

### 5. CONNEXIONS & RELATIONS

#### `useLabelableEdge`
- Labels sur les liens
- Position du label (start, middle, end)
- Rotation du label

#### `useRelationTypeable`
- Types de relations Archimate (flow, trigger, access, etc.)
- Validation de compatibilité source→target
- Style automatique par type

---

### 6. IMPORT/EXPORT & INTEROP

#### `useExportable`
- Export PNG/JPEG avec résolution
- Export PDF
- Export JSON (données brutes)

#### `useImportable`
- Import JSON
- Import SVG (parsing)
- Import Archimate Open Exchange

#### `useShareable`
- URL partageable (état encodé)
- Embed code (iframe)
- Collaboration temps réel (future)

---

### 7. VALIDATION & CONTRAINTES

#### `useValidatable`
- Règles de validation Archimate
- Validation des connexions
- Affichage des erreurs/warnings

#### `useConstrainable`
- Contraintes de taille min/max
- Contraintes de position (bounds)
- Contraintes de ratio

---

### 8. ANIMATION & TRANSITIONS

#### `useAnimatable`
- Transitions CSS sur changements
- Animations d'entrée/sortie
- Animation de flux (pour les liens)

---

### 9. INTELLIGENCE & AUTOMATISATION

#### `useLayoutable`
- Auto-layout (tree, grid, force-directed)
- Layout hiérarchique
- Layout par couches Archimate

#### `useSuggestable`
- Suggestions de connexions
- Auto-complétion de types

---

### 10. PERSISTANCE & SYNC

#### `useSyncable`
- Sync avec backend
- Sync offline-first
- Résolution de conflits

#### `useBackupable`
- Backup automatique
- Historique de backups

---

## Priorités suggérées

### Phase 1 - Fondations (P0) ✅ DONE
- ✅ `useCollapsible` - essentiel pour les grands diagrammes
- ✅ `useTypeable` - base d'Archimate
- ✅ `useUndoable` - UX critique
- ✅ `useKeyboardable` - productivité

### Phase 2 - Organisation (P1) ✅ DONE
- ✅ `useFilterable` - navigation dans complexité
- ✅ `useAlignable` + `useSnappable` - précision
- ✅ `useGroupable` - manipulation multiple
- ✅ `useZIndexable` - ordre d'affichage

### Phase 3 - Connexions (P2) ✅ DONE
- ✅ `useAnchorable` - points d'ancrage avec intersection
- ✅ `useRoutable` - liens propres
- ✅ `useArrowable` - flèches Archimate
- ✅ `useShapeable` - formes SVG

### Phase 4 - Pro (P3)
- `useViewable` - présentations
- `useValidatable` - qualité
- `useLayoutable` - auto-organisation
- `useVersionable` - historique
