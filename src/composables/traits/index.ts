// src/composables/traits/index.ts
// Export de tous les traits pour une utilisation facile

// === Traits de base ===
export { useDraggable, type DraggableOptions, type DraggableState, type DraggableHandlers } from './useDraggable';
export { useResizable, type ResizableOptions, type ResizableState, type ResizableHandlers } from './useResizable';
export { useDockable, type DockableOptions, type DockableState, type DockableHandlers } from './useDockable';
export { useEditable, type EditableOptions, type EditableState, type EditableHandlers } from './useEditable';
export { useStyleable, type StyleableOptions, type StyleableState, type StyleableHandlers, PRESET_COLORS, FILL_TYPES, type FillType } from './useStyleable';
export { useConnectable, useConnectionState, type ConnectableOptions, type ConnectableState, type ConnectableHandlers } from './useConnectable';
export { useSelectable, useSelectionState, type SelectableOptions, type SelectableState, type SelectableHandlers } from './useSelectable';
export { useTooltipable, type TooltipableOptions, type TooltipableState, type TooltipableHandlers } from './useTooltipable';

// === Nouveaux traits ===

// Collapse/Expand
export { useCollapsible, type CollapsibleOptions, type CollapsibleState, type CollapsibleHandlers } from './useCollapsible';

// Z-Index / Ordre d'affichage
export { useZIndexable, useZIndexState, type ZIndexableOptions, type ZIndexableState, type ZIndexableHandlers } from './useZIndexable';

// Types Archimate
export {
  useTypeable,
  getAllArchimateTypes,
  ARCHIMATE_TYPES,
  type ArchimateLayer,
  type ArchimateType,
  type TypeableOptions,
  type TypeableState,
  type TypeableHandlers
} from './useTypeable';

// Undo/Redo
export { useUndoable, useAutoSnapshot, useUndoState, type UndoableOptions, type UndoableState, type UndoableHandlers } from './useUndoable';

// Raccourcis clavier
export {
  useKeyboardable,
  useGlobalKeyboard,
  formatShortcut,
  type KeyboardShortcut,
  type KeyboardableOptions,
  type KeyboardableState,
  type KeyboardableHandlers
} from './useKeyboardable';

// Verrouillage
export { useLockable, type LockableOptions, type LockableState, type LockableHandlers, type LockState } from './useLockable';

// Formes
export {
  useShapeable,
  generateShapePath,
  getShapesByCategory,
  NodeShape,
  SHAPE_METADATA,
  type ShapeableOptions,
  type ShapeableState,
  type ShapeableHandlers
} from './useShapeable';

// Snap / Grille
export { useSnappable, useSnapState, type SnapConfig, type SnapGuide, type SnappableOptions, type SnappableState, type SnappableHandlers } from './useSnappable';

// Groupes
export { useGroupable, useGroupState, type NodeGroup, type GroupableOptions, type GroupableState, type GroupableHandlers } from './useGroupable';

// Alignement
export { useAlignable, type AlignmentType, type DistributionType, type AlignableHandlers } from './useAlignable';

// Clipboard
export { useClipboardable, useClipboardState, type ClipboardData, type ClipboardableHandlers } from './useClipboardable';

// Filtrage
export {
  useFilterable,
  PRESET_FILTERS,
  type FilterCriteria,
  type SavedFilter,
  type FilterDisplayMode,
  type FilterableState,
  type FilterableHandlers
} from './useFilterable';

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
  type AnchorableHandlers
} from './useAnchorable';

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
  type RoutableHandlers
} from './useRoutable';

// Flèches
export {
  useArrowable,
  ArrowType,
  ARROW_MARKERS,
  ARROW_TYPE_LABELS,
  type ArrowConfig,
  type ArrowableOptions,
  type ArrowableState,
  type ArrowableHandlers
} from './useArrowable';

// === Traits globaux (Application) ===

// Thèmes
export {
  useThemeable,
  useThemeState,
  PRESET_THEMES,
  type Theme,
  type ColorPalette,
  type ArchimateLayerColors,
  type ThemeableState,
  type ThemeableHandlers
} from './useThemeable';

// Event Sourcing & Lignage
export {
  useHistorable,
  useHistoryState,
  EventType,
  type HistoryEvent,
  type ObjectLineage,
  type HistorableOptions,
  type HistorableState,
  type HistorableHandlers
} from './useHistorable';
