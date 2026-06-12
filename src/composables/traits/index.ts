// src/composables/traits/index.ts
// Export de tous les traits pour une utilisation facile

// === Traits de base ===
export {
  useDraggable,
  type DraggableOptions,
  type DraggableState,
  type DraggableHandlers,
} from './useDraggable'
export {
  useResizable,
  DEFAULT_AUTOSIZE_CONFIG,
  type AutosizeConfig,
  type ChildrenBounds,
  type ResizableOptions,
  type ResizableState,
  type ResizableHandlers,
} from './useResizable'
export {
  useDockable,
  useContainmentRules,
  DEFAULT_CONTAINMENT_RULES,
  type DockableOptions,
  type DockableState,
  type DockableHandlers,
  type ContainmentRule,
} from './useDockable'
export {
  useEditable,
  type EditableOptions,
  type EditableState,
  type EditableHandlers,
} from './useEditable'
export {
  useStyleable,
  type StyleableOptions,
  type StyleableState,
  type StyleableHandlers,
  PRESET_COLORS,
  FILL_TYPES,
  type FillType,
} from './useStyleable'
export {
  useConnectable,
  useConnectionState,
  type ConnectableOptions,
  type ConnectableState,
  type ConnectableHandlers,
} from './useConnectable'
export {
  useSelectable,
  useSelectionState,
  type SelectableOptions,
  type SelectableState,
  type SelectableHandlers,
} from './useSelectable'
export {
  useTooltipable,
  type TooltipableOptions,
  type TooltipableState,
  type TooltipableHandlers,
} from './useTooltipable'

// === Nouveaux traits ===

// Collapse/Expand
export {
  useCollapsible,
  type CollapsibleOptions,
  type CollapsibleState,
  type CollapsibleHandlers,
} from './useCollapsible'

// Z-Index / Ordre d'affichage
export {
  useZIndexable,
  useZIndexState,
  type ZIndexableOptions,
  type ZIndexableState,
  type ZIndexableHandlers,
} from './useZIndexable'

// Types Archimate
export {
  useTypeable,
  getAllArchimateTypes,
  ARCHIMATE_TYPES,
  type ArchimateLayer,
  type ArchimateType,
  type TypeableOptions,
  type TypeableState,
  type TypeableHandlers,
} from './useTypeable'

// Undo/Redo
export {
  useUndoable,
  useAutoSnapshot,
  useUndoState,
  type UndoableOptions,
  type UndoableState,
  type UndoableHandlers,
} from './useUndoable'

// Raccourcis clavier
export {
  useKeyboardable,
  useGlobalKeyboard,
  formatShortcut,
  type KeyboardShortcut,
  type KeyboardableOptions,
  type KeyboardableState,
  type KeyboardableHandlers,
} from './useKeyboardable'

// Verrouillage
export {
  useLockable,
  type LockableOptions,
  type LockableState,
  type LockableHandlers,
  type LockState,
} from './useLockable'

// Formes
export {
  useShapeable,
  generateShapePath,
  getShapesByCategory,
  NodeShape,
  SHAPE_METADATA,
  type ShapeableOptions,
  type ShapeableState,
  type ShapeableHandlers,
} from './useShapeable'

// Snap / Grille
export {
  useSnappable,
  useSnapState,
  type SnapConfig,
  type SnapGuide,
  type SnappableOptions,
  type SnappableState,
  type SnappableHandlers,
} from './useSnappable'

// Groupes
export {
  useGroupable,
  useGroupState,
  type NodeGroup,
  type GroupableOptions,
  type GroupableState,
  type GroupableHandlers,
} from './useGroupable'

// Alignement
export {
  useAlignable,
  type AlignmentType,
  type DistributionType,
  type AlignableHandlers,
} from './useAlignable'

// Clipboard
export {
  useClipboardable,
  useClipboardState,
  type ClipboardData,
  type ClipboardableHandlers,
} from './useClipboardable'

// Filtrage
export {
  useFilterable,
  PRESET_QUERIES,
  type SavedFilter,
  type FilterDisplayMode,
  type FilterableState,
  type FilterableHandlers,
} from './useFilterable'
export { parseFilterQuery, layerOfNode, type ParseResult } from './utils/filter-dsl'

// === Traits de connexions (edges) ===

// Points d'ancrage
export {
  useAnchorable,
  calculateEdgeIntersection,
  getNodeCenter,
  AnchorPosition,
  type AnchorPoint,
  type AnchorableOptions,
  type AnchorableState,
  type AnchorableHandlers,
} from './useAnchorable'

// Routage des liens
export {
  useRoutable,
  calculateEdgeRoute,
  calculateArrowAngle,
  generateArrowPath,
  RoutingType,
  type ControlPoint,
  type RoutePoint,
  type EdgeRoute,
  type RoutableOptions,
  type RoutableState,
  type RoutableHandlers,
} from './useRoutable'

// Flèches
export {
  useArrowable,
  ArrowType,
  ARROW_MARKERS,
  ARROW_TYPE_LABELS,
  START_MARKER_TYPES,
  END_MARKER_TYPES,
  type ArrowConfig,
  type ArrowableOptions,
  type ArrowableState,
  type ArrowableHandlers,
} from './useArrowable'

// Types de relations Archimate
export {
  useRelationTypeable,
  getRelationsByCategory,
  getAllRelationTypes,
  getRelationConfig,
  RelationType,
  RelationCategory,
  RELATION_CONFIGS,
  RELATION_TYPE_LABELS,
  type RelationConfig,
  type RelationValidation,
  type AccessType,
  type InfluenceStrength,
  type FlowType,
  type RelationTypeableOptions,
  type RelationTypeableState,
  type RelationTypeableHandlers,
} from './useRelationTypeable'

// Z-order et visibilité des edges
export {
  useEdgeLayering,
  useEdgeLayeringState,
  useNodeZIndexWithEdgeBoost,
  EdgeVisibilityMode,
  VISIBILITY_MODE_LABELS,
  DEFAULT_EDGE_LAYERING_CONFIG,
  type EdgeLayeringConfig,
  type EdgeComputedStyle,
  type EdgeLayeringOptions,
  type EdgeLayeringState,
  type EdgeLayeringHandlers,
  type EdgeLayeringGlobalState,
  type EdgeLayeringGlobalHandlers,
} from './useEdgeLayering'

// === Traits globaux (Application) ===

// Thèmes
export {
  useThemeable,
  useThemeState,
  PRESET_THEMES,
  type Theme,
  type ColorPalette,
  type ThemeableState,
  type ThemeableHandlers,
} from './useThemeable'

// Event Sourcing & Lignage
export {
  useHistorable,
  useHistoryState,
  EventType,
  type HistoryEvent,
  type ObjectLineage,
  type HistorableOptions,
  type HistorableState,
  type HistorableHandlers,
} from './useHistorable'

// Confiance et maturité de modélisation
export {
  useModelingConfidence,
  ModelingMaturity,
  MATURITY_LABELS,
  MATURITY_DESCRIPTIONS,
  MATURITY_VISUAL_STYLES,
  SOURCE_TYPE_LABELS,
  TEMPORAL_STATE_LABELS,
  TEMPORAL_STATE_STYLES,
  SCOPE_STATUS_LABELS,
  DEFAULT_MODELING_METADATA,
  getMaturityColor,
  getMaturityBadge,
  isMaturitySufficient,
  generateMaturitySvgStyle,
  type MaturityVisualStyle,
  type SourceType,
  type TemporalState,
  type ScopeStatus,
  type ModelingSource,
  type OpenQuestion,
  type Alternative,
  type ModelingMetadata,
  type ModelingConfidenceOptions,
  type ModelingConfidenceState,
  type ModelingConfidenceHandlers,
} from './useModelingConfidence'

// Export/Import
export {
  useExportable,
  type ExportFormat,
  type ExportOptions,
  type ExportableHandlers,
} from './useExportable'

export {
  useImportable,
  type ConflictStrategy,
  type MergeStrategy,
  type ImportOptions,
  type ImportResult,
  type ImportableHandlers,
} from './useImportable'

// Navigation et visualisation
export {
  useViewable,
  type SavedView,
  type ViewableState,
  type ViewableHandlers,
} from './useViewable'

export {
  useSearchable,
  type SearchScope,
  type SearchOptions,
  type SearchResult,
  type SearchableState,
  type SearchableHandlers,
} from './useSearchable'

export {
  useZoomable,
  type ZoomableOptions,
  type ZoomableState,
  type ZoomableHandlers,
} from './useZoomable'

export {
  usePannable,
  type PannableOptions,
  type PannableState,
  type PannableHandlers,
} from './usePannable'

export {
  useFocusable,
  useFocusTrap,
  useFocusedNodeState,
  type FocusableOptions,
  type FocusableState,
  type FocusableHandlers,
  type SpatialDirection,
} from './useFocusable'

export { useLayerVisibility, isNodeLayerHidden, getArchimateLayers } from './useLayerVisibility'

// === Données et Layout (Sprint 6) ===

// Propriétés personnalisées
export {
  usePropertyable,
  PREDEFINED_TEMPLATES,
  type PropertyType,
  type CustomProperty,
  type PropertyTemplate,
  type PropertyableOptions,
  type PropertyableState,
  type PropertyableHandlers,
} from './usePropertyable'

// Tags
export {
  useTaggable,
  PREDEFINED_TAGS,
  type Tag,
  type TaggableOptions,
  type TaggableState,
  type TaggableHandlers,
} from './useTaggable'

// Labels sur arêtes
export {
  useLabelableEdge,
  type EdgeLabel,
  type LabelableEdgeOptions,
  type LabelableEdgeState,
  type LabelableEdgeHandlers,
} from './useLabelableEdge'

// Layout automatique
export {
  useLayoutable,
  type LayoutAlgorithm,
  type LayoutOptions,
  type ForceLayoutOptions,
  type HierarchicalLayoutOptions,
  type LayoutableState,
  type LayoutableHandlers,
} from './useLayoutable'

// === Validation et Qualité (Sprint 7) ===

// Validation Archimate
export {
  useValidatable,
  type ValidationSeverity,
  type ValidationCategory,
  type ValidationIssue,
  type ValidationResult,
  type ValidationRule,
  type ValidatableState,
  type ValidatableHandlers,
} from './useValidatable'

// Contraintes architecturales
export {
  useConstrainable,
  type ConstraintType,
  type ConstraintSeverity,
  type GraphPattern,
  type ArchitecturalConstraint,
  type ConstraintViolation,
  type ConstraintAnalysisResult,
  type ArchitecturalMetric,
  type ConstrainableState,
  type ConstrainableHandlers,
} from './useConstrainable'

// === Intelligence et Polish (Sprint 8) ===

// Suggestions intelligentes
export {
  useSuggestable,
  type SuggestionType,
  type SuggestionPriority,
  type Suggestion,
  type ConnectionSuggestion,
  type PatternSuggestion,
  type SuggestionContext,
  type SuggestableState,
  type SuggestableHandlers,
} from './useSuggestable'

// Gestion de versions
export {
  useVersionable,
  type GraphSnapshot,
  type ChangeType,
  type NodeChange,
  type EdgeChange,
  type GraphDiff,
  type VersionBranch,
  type VersionableState,
  type VersionableHandlers,
} from './useVersionable'
