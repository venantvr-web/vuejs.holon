// src/composables/traits/useModelingConfidence.ts
// Gestion de la maturité et confiance dans la modélisation SI
import { computed, type Ref } from 'vue';
import { useGraphStore } from '../../stores/graph';

// === NIVEAUX DE MATURITÉ ===

export enum ModelingMaturity {
  Unknown = 'unknown',           // "Je ne sais pas"
  Hypothesis = 'hypothesis',     // "Je suppose que..."
  Inferred = 'inferred',         // "Déduit de..." (code, logs, etc.)
  Declared = 'declared',         // "Quelqu'un m'a dit que..."
  Documented = 'documented',     // "C'est écrit dans..."
  Verified = 'verified',         // "J'ai vérifié que..."
  Certified = 'certified',       // "C'est validé officiellement"
}

// Labels pour l'UI
export const MATURITY_LABELS: Record<ModelingMaturity, string> = {
  [ModelingMaturity.Unknown]: 'Inconnu',
  [ModelingMaturity.Hypothesis]: 'Hypothèse',
  [ModelingMaturity.Inferred]: 'Déduit',
  [ModelingMaturity.Declared]: 'Déclaré',
  [ModelingMaturity.Documented]: 'Documenté',
  [ModelingMaturity.Verified]: 'Vérifié',
  [ModelingMaturity.Certified]: 'Certifié',
};

// Descriptions pour tooltips
export const MATURITY_DESCRIPTIONS: Record<ModelingMaturity, string> = {
  [ModelingMaturity.Unknown]: 'Information inconnue ou non renseignée',
  [ModelingMaturity.Hypothesis]: 'Supposition basée sur l\'expérience ou l\'intuition',
  [ModelingMaturity.Inferred]: 'Déduit à partir de preuves indirectes (code, logs, comportement)',
  [ModelingMaturity.Declared]: 'Information communiquée oralement ou par interview',
  [ModelingMaturity.Documented]: 'Référencé dans une documentation officielle',
  [ModelingMaturity.Verified]: 'Vérifié par test ou observation directe',
  [ModelingMaturity.Certified]: 'Validé et approuvé officiellement',
};

// === DISCRIMINANT VISUEL ===

export interface MaturityVisualStyle {
  // Bordure
  strokeDasharray: string;
  strokeWidth: number;
  // Opacité
  opacity: number;
  fillOpacity: number;
  // Badge/Indicateur
  badge: string;
  badgeColor: string;
  // Couleur de bordure additionnelle (pour distinction)
  borderAccent: string;
  // Pattern de fond (optionnel)
  pattern?: 'none' | 'dots' | 'lines' | 'crosshatch';
}

export const MATURITY_VISUAL_STYLES: Record<ModelingMaturity, MaturityVisualStyle> = {
  [ModelingMaturity.Unknown]: {
    strokeDasharray: '2,6',      // Très espacé = très incertain
    strokeWidth: 1,
    opacity: 0.4,
    fillOpacity: 0.2,
    badge: '?',
    badgeColor: '#9CA3AF',       // Gris
    borderAccent: '#9CA3AF',
    pattern: 'dots',
  },
  [ModelingMaturity.Hypothesis]: {
    strokeDasharray: '4,4',      // Pointillé régulier
    strokeWidth: 1,
    opacity: 0.6,
    fillOpacity: 0.4,
    badge: '~',
    badgeColor: '#F59E0B',       // Orange/Ambre
    borderAccent: '#F59E0B',
    pattern: 'lines',
  },
  [ModelingMaturity.Inferred]: {
    strokeDasharray: '8,4',      // Tirets moyens
    strokeWidth: 1.5,
    opacity: 0.7,
    fillOpacity: 0.5,
    badge: '*',
    badgeColor: '#8B5CF6',       // Violet
    borderAccent: '#8B5CF6',
    pattern: 'none',
  },
  [ModelingMaturity.Declared]: {
    strokeDasharray: '12,4',     // Tirets longs
    strokeWidth: 1.5,
    opacity: 0.8,
    fillOpacity: 0.6,
    badge: '"',
    badgeColor: '#3B82F6',       // Bleu
    borderAccent: '#3B82F6',
    pattern: 'none',
  },
  [ModelingMaturity.Documented]: {
    strokeDasharray: 'none',     // Solide
    strokeWidth: 1.5,
    opacity: 0.9,
    fillOpacity: 0.8,
    badge: '#',
    badgeColor: '#10B981',       // Vert émeraude
    borderAccent: '#10B981',
    pattern: 'none',
  },
  [ModelingMaturity.Verified]: {
    strokeDasharray: 'none',
    strokeWidth: 2,
    opacity: 1,
    fillOpacity: 0.9,
    badge: '!',
    badgeColor: '#059669',       // Vert foncé
    borderAccent: '#059669',
    pattern: 'none',
  },
  [ModelingMaturity.Certified]: {
    strokeDasharray: 'none',
    strokeWidth: 2.5,
    opacity: 1,
    fillOpacity: 1,
    badge: '=',
    badgeColor: '#047857',       // Vert très foncé
    borderAccent: '#047857',
    pattern: 'none',
  },
};

// === TYPES DE SOURCES ===

export type SourceType =
  | 'interview'      // Entretien avec une personne
  | 'document'       // Documentation écrite
  | 'code'           // Analyse de code source
  | 'observation'    // Observation directe (logs, monitoring)
  | 'assumption'     // Hypothèse/supposition
  | 'reverse-eng'    // Reverse engineering
  | 'vendor'         // Information fournisseur
  | 'audit'          // Rapport d'audit
  | 'other';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'interview': 'Interview',
  'document': 'Document',
  'code': 'Code source',
  'observation': 'Observation',
  'assumption': 'Hypothèse',
  'reverse-eng': 'Reverse engineering',
  'vendor': 'Fournisseur',
  'audit': 'Audit',
  'other': 'Autre',
};

// === ÉTATS TEMPORELS ===

export type TemporalState = 'as-is' | 'to-be' | 'transitional' | 'deprecated';

export const TEMPORAL_STATE_LABELS: Record<TemporalState, string> = {
  'as-is': 'État actuel',
  'to-be': 'État cible',
  'transitional': 'Transitoire',
  'deprecated': 'Obsolète',
};

export const TEMPORAL_STATE_STYLES: Record<TemporalState, { color: string; icon: string }> = {
  'as-is': { color: '#3B82F6', icon: '●' },
  'to-be': { color: '#10B981', icon: '◎' },
  'transitional': { color: '#F59E0B', icon: '◐' },
  'deprecated': { color: '#EF4444', icon: '○' },
};

// === SCOPE ===

export type ScopeStatus = 'in-scope' | 'out-of-scope' | 'to-detail' | 'excluded' | 'tbd';

export const SCOPE_STATUS_LABELS: Record<ScopeStatus, string> = {
  'in-scope': 'Dans le périmètre',
  'out-of-scope': 'Hors périmètre',
  'to-detail': 'À détailler',
  'excluded': 'Exclu',
  'tbd': 'À définir',
};

// === STRUCTURE DES MÉTADONNÉES ===

export interface ModelingSource {
  type: SourceType;
  reference: string;           // Nom du document, personne, etc.
  date?: string;               // ISO date
  author?: string;
  reliability?: number;        // 0-100
  notes?: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  status: 'open' | 'investigating' | 'answered' | 'wont-answer';
}

export interface Alternative {
  id: string;
  description: string;
  reason: string;              // Pourquoi pas retenu
  probability?: number;        // 0-100, si on hésite encore
}

export interface ModelingMetadata {
  // Maturité et confiance
  maturity: ModelingMaturity;
  confidence: number;          // 0-100%

  // Sources d'information
  sources: ModelingSource[];

  // Questions ouvertes
  openQuestions: OpenQuestion[];

  // Alternatives considérées
  alternatives: Alternative[];

  // Temporalité
  temporalState: TemporalState;
  validFrom?: string;          // ISO date
  validUntil?: string;         // ISO date

  // Scope
  scope: ScopeStatus;
  scopeNote?: string;

  // Notes de modélisation
  modelingNotes?: string;
  lastReviewedAt?: string;     // ISO date
  reviewedBy?: string;

  // Historique de maturité (progression)
  maturityHistory?: {
    date: string;
    from: ModelingMaturity;
    to: ModelingMaturity;
    reason?: string;
  }[];
}

// === DEFAULT VALUES ===

export const DEFAULT_MODELING_METADATA: ModelingMetadata = {
  maturity: ModelingMaturity.Unknown,
  confidence: 0,
  sources: [],
  openQuestions: [],
  alternatives: [],
  temporalState: 'as-is',
  scope: 'tbd',
};

// === COMPOSABLE ===

export interface ModelingConfidenceOptions {
  nodeId?: Ref<string>;
  edgeId?: Ref<string>;
}

export interface ModelingConfidenceState {
  metadata: Ref<ModelingMetadata>;
  maturity: Ref<ModelingMaturity>;
  confidence: Ref<number>;
  visualStyle: Ref<MaturityVisualStyle>;
  temporalState: Ref<TemporalState>;
  scope: Ref<ScopeStatus>;
  hasOpenQuestions: Ref<boolean>;
  openQuestionsCount: Ref<number>;
  sourcesCount: Ref<number>;
  isFullyDocumented: Ref<boolean>;
}

export interface ModelingConfidenceHandlers {
  // Maturité
  setMaturity: (maturity: ModelingMaturity, reason?: string) => void;
  upgradeMaturity: (reason?: string) => void;
  downgradeMaturity: (reason?: string) => void;

  // Confiance
  setConfidence: (confidence: number) => void;

  // Sources
  addSource: (source: Omit<ModelingSource, 'date'>) => void;
  removeSource: (index: number) => void;

  // Questions
  addQuestion: (question: Omit<OpenQuestion, 'id' | 'status'>) => string;
  updateQuestion: (id: string, updates: Partial<OpenQuestion>) => void;
  answerQuestion: (id: string) => void;
  removeQuestion: (id: string) => void;

  // Alternatives
  addAlternative: (alt: Omit<Alternative, 'id'>) => string;
  removeAlternative: (id: string) => void;

  // Temporalité
  setTemporalState: (state: TemporalState) => void;
  setValidityPeriod: (from?: string, until?: string) => void;

  // Scope
  setScope: (scope: ScopeStatus, note?: string) => void;

  // Notes
  setModelingNotes: (notes: string) => void;
  markAsReviewed: (by?: string) => void;

  // Bulk
  setMetadata: (metadata: Partial<ModelingMetadata>) => void;
  resetMetadata: () => void;

  // Helpers
  getVisualStyleForMaturity: (maturity: ModelingMaturity) => MaturityVisualStyle;
  calculateSuggestedMaturity: () => ModelingMaturity;
}

export function useModelingConfidence(
  options: ModelingConfidenceOptions
): ModelingConfidenceState & ModelingConfidenceHandlers {
  const graphStore = useGraphStore();

  // Déterminer l'ID cible (node ou edge)
  const targetId = computed(() => {
    return options.nodeId?.value ?? options.edgeId?.value ?? '';
  });

  const isNode = computed(() => !!options.nodeId);

  // Récupérer les métadonnées depuis le store
  const metadata = computed((): ModelingMetadata => {
    if (isNode.value) {
      const node = graphStore.nodes[targetId.value];
      return (node?.data?.modelingMetadata as ModelingMetadata) ?? { ...DEFAULT_MODELING_METADATA };
    } else {
      const edge = graphStore.edges[targetId.value];
      return (edge as any)?.modelingMetadata ?? { ...DEFAULT_MODELING_METADATA };
    }
  });

  // États dérivés
  const maturity = computed(() => metadata.value.maturity);
  const confidence = computed(() => metadata.value.confidence);
  const temporalState = computed(() => metadata.value.temporalState);
  const scope = computed(() => metadata.value.scope);

  const visualStyle = computed(() => MATURITY_VISUAL_STYLES[maturity.value]);

  const hasOpenQuestions = computed(() =>
    metadata.value.openQuestions.some(q => q.status === 'open' || q.status === 'investigating')
  );

  const openQuestionsCount = computed(() =>
    metadata.value.openQuestions.filter(q => q.status === 'open' || q.status === 'investigating').length
  );

  const sourcesCount = computed(() => metadata.value.sources.length);

  const isFullyDocumented = computed(() =>
    maturity.value === ModelingMaturity.Verified ||
    maturity.value === ModelingMaturity.Certified
  );

  // Helper pour mettre à jour les métadonnées
  function updateMetadata(updates: Partial<ModelingMetadata>) {
    const newMetadata = { ...metadata.value, ...updates };

    if (isNode.value) {
      const node = graphStore.nodes[targetId.value];
      if (node) {
        graphStore.updateNode(targetId.value, {
          data: {
            ...node.data,
            modelingMetadata: newMetadata,
          },
        });
      }
    } else {
      // Pour les edges, on aurait besoin d'une méthode updateEdge
      (graphStore as any).updateEdge?.(targetId.value, {
        modelingMetadata: newMetadata,
      });
    }
  }

  // Ordre des maturités pour upgrade/downgrade
  const MATURITY_ORDER: ModelingMaturity[] = [
    ModelingMaturity.Unknown,
    ModelingMaturity.Hypothesis,
    ModelingMaturity.Inferred,
    ModelingMaturity.Declared,
    ModelingMaturity.Documented,
    ModelingMaturity.Verified,
    ModelingMaturity.Certified,
  ];

  function setMaturity(newMaturity: ModelingMaturity, reason?: string) {
    const history = metadata.value.maturityHistory ?? [];
    history.push({
      date: new Date().toISOString(),
      from: maturity.value,
      to: newMaturity,
      reason,
    });

    updateMetadata({
      maturity: newMaturity,
      maturityHistory: history,
    });
  }

  function upgradeMaturity(reason?: string) {
    const currentIndex = MATURITY_ORDER.indexOf(maturity.value);
    if (currentIndex < MATURITY_ORDER.length - 1) {
      setMaturity(MATURITY_ORDER[currentIndex + 1], reason);
    }
  }

  function downgradeMaturity(reason?: string) {
    const currentIndex = MATURITY_ORDER.indexOf(maturity.value);
    if (currentIndex > 0) {
      setMaturity(MATURITY_ORDER[currentIndex - 1], reason);
    }
  }

  function setConfidence(newConfidence: number) {
    updateMetadata({ confidence: Math.max(0, Math.min(100, newConfidence)) });
  }

  function addSource(source: Omit<ModelingSource, 'date'>) {
    const sources = [...metadata.value.sources];
    sources.push({
      ...source,
      date: new Date().toISOString(),
    });
    updateMetadata({ sources });
  }

  function removeSource(index: number) {
    const sources = metadata.value.sources.filter((_, i) => i !== index);
    updateMetadata({ sources });
  }

  function addQuestion(question: Omit<OpenQuestion, 'id' | 'status'>): string {
    const id = `q-${Date.now()}`;
    const questions = [...metadata.value.openQuestions];
    questions.push({
      ...question,
      id,
      status: 'open',
    });
    updateMetadata({ openQuestions: questions });
    return id;
  }

  function updateQuestion(id: string, updates: Partial<OpenQuestion>) {
    const questions = metadata.value.openQuestions.map(q =>
      q.id === id ? { ...q, ...updates } : q
    );
    updateMetadata({ openQuestions: questions });
  }

  function answerQuestion(id: string) {
    updateQuestion(id, { status: 'answered' });
  }

  function removeQuestion(id: string) {
    const questions = metadata.value.openQuestions.filter(q => q.id !== id);
    updateMetadata({ openQuestions: questions });
  }

  function addAlternative(alt: Omit<Alternative, 'id'>): string {
    const id = `alt-${Date.now()}`;
    const alternatives = [...metadata.value.alternatives];
    alternatives.push({ ...alt, id });
    updateMetadata({ alternatives });
    return id;
  }

  function removeAlternative(id: string) {
    const alternatives = metadata.value.alternatives.filter(a => a.id !== id);
    updateMetadata({ alternatives });
  }

  function setTemporalState(state: TemporalState) {
    updateMetadata({ temporalState: state });
  }

  function setValidityPeriod(from?: string, until?: string) {
    updateMetadata({ validFrom: from, validUntil: until });
  }

  function setScope(newScope: ScopeStatus, note?: string) {
    updateMetadata({ scope: newScope, scopeNote: note });
  }

  function setModelingNotes(notes: string) {
    updateMetadata({ modelingNotes: notes });
  }

  function markAsReviewed(by?: string) {
    updateMetadata({
      lastReviewedAt: new Date().toISOString(),
      reviewedBy: by,
    });
  }

  function setMetadata(updates: Partial<ModelingMetadata>) {
    updateMetadata(updates);
  }

  function resetMetadata() {
    updateMetadata({ ...DEFAULT_MODELING_METADATA });
  }

  function getVisualStyleForMaturity(mat: ModelingMaturity): MaturityVisualStyle {
    return MATURITY_VISUAL_STYLES[mat];
  }

  // Suggère un niveau de maturité basé sur les sources
  function calculateSuggestedMaturity(): ModelingMaturity {
    const sources = metadata.value.sources;

    if (sources.length === 0) {
      return ModelingMaturity.Unknown;
    }

    // Vérifier les types de sources
    const hasAudit = sources.some(s => s.type === 'audit');
    const hasDocument = sources.some(s => s.type === 'document');
    const hasCode = sources.some(s => s.type === 'code');
    const hasObservation = sources.some(s => s.type === 'observation');
    const hasInterview = sources.some(s => s.type === 'interview');
    const hasOnlyAssumption = sources.every(s => s.type === 'assumption');

    if (hasAudit) {
      return ModelingMaturity.Certified;
    }
    if ((hasCode || hasObservation) && hasDocument) {
      return ModelingMaturity.Verified;
    }
    if (hasDocument) {
      return ModelingMaturity.Documented;
    }
    if (hasInterview) {
      return ModelingMaturity.Declared;
    }
    if (hasCode || hasObservation) {
      return ModelingMaturity.Inferred;
    }
    if (hasOnlyAssumption) {
      return ModelingMaturity.Hypothesis;
    }

    return ModelingMaturity.Unknown;
  }

  return {
    // State
    metadata: computed(() => metadata.value),
    maturity: computed(() => maturity.value),
    confidence: computed(() => confidence.value),
    visualStyle: computed(() => visualStyle.value),
    temporalState: computed(() => temporalState.value),
    scope: computed(() => scope.value),
    hasOpenQuestions: computed(() => hasOpenQuestions.value),
    openQuestionsCount: computed(() => openQuestionsCount.value),
    sourcesCount: computed(() => sourcesCount.value),
    isFullyDocumented: computed(() => isFullyDocumented.value),
    // Handlers
    setMaturity,
    upgradeMaturity,
    downgradeMaturity,
    setConfidence,
    addSource,
    removeSource,
    addQuestion,
    updateQuestion,
    answerQuestion,
    removeQuestion,
    addAlternative,
    removeAlternative,
    setTemporalState,
    setValidityPeriod,
    setScope,
    setModelingNotes,
    markAsReviewed,
    setMetadata,
    resetMetadata,
    getVisualStyleForMaturity,
    calculateSuggestedMaturity,
  };
}

// === HELPERS GLOBAUX ===

export function getMaturityColor(maturity: ModelingMaturity): string {
  return MATURITY_VISUAL_STYLES[maturity].badgeColor;
}

export function getMaturityBadge(maturity: ModelingMaturity): string {
  return MATURITY_VISUAL_STYLES[maturity].badge;
}

export function isMaturitySufficient(
  maturity: ModelingMaturity,
  required: ModelingMaturity
): boolean {
  const MATURITY_ORDER: ModelingMaturity[] = [
    ModelingMaturity.Unknown,
    ModelingMaturity.Hypothesis,
    ModelingMaturity.Inferred,
    ModelingMaturity.Declared,
    ModelingMaturity.Documented,
    ModelingMaturity.Verified,
    ModelingMaturity.Certified,
  ];
  return MATURITY_ORDER.indexOf(maturity) >= MATURITY_ORDER.indexOf(required);
}

// Générer le style SVG pour un élément
export function generateMaturitySvgStyle(maturity: ModelingMaturity): Record<string, string | number> {
  const style = MATURITY_VISUAL_STYLES[maturity];
  return {
    'stroke-dasharray': style.strokeDasharray,
    'stroke-width': style.strokeWidth,
    'opacity': style.opacity,
    'fill-opacity': style.fillOpacity,
  };
}
