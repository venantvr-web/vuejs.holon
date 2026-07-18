// src/composables/traits/useImportable.ts
import { useGraphStore } from '../../stores/graph'
import { z } from 'zod'
import type { Node, Edge } from '../../types'
import { nanoid } from 'nanoid'
import { fromArchimateXmiType } from './useTypeable'

/**
 * Stratégies de gestion des conflits d'IDs lors de l'import.
 */
export type ConflictStrategy = 'replace' | 'rename' | 'skip'

/**
 * Stratégies de fusion avec le graphe existant.
 */
export type MergeStrategy = 'append' | 'replace' | 'merge'

/**
 * Options de configuration pour l'import.
 */
export interface ImportOptions {
  /**
   * Stratégie de gestion des conflits d'IDs.
   * - replace: Remplace les noeuds existants
   * - rename: Renomme les noeuds importés
   * - skip: Ignore les noeuds en conflit
   * @default 'rename'
   */
  onConflict?: ConflictStrategy
  /**
   * Valider les données avant import.
   * @default true
   */
  validateBeforeImport?: boolean
  /**
   * Stratégie de fusion avec le graphe existant.
   * - append: Ajoute aux données existantes (les conflits d'ID sont gérés par
   *   `onConflict`)
   * - replace: Efface tout le graphe avant l'import
   * - merge: Fusionne champ à champ les éléments dont l'ID existe déjà (les
   *   `data` sont fusionnées clé à clé, l'entrant l'emportant) et ajoute les
   *   nouveaux ; `onConflict` est ignoré dans ce mode
   * @default 'append'
   */
  mergeStrategy?: MergeStrategy
}

/**
 * Résultat d'une opération d'import.
 */
export interface ImportResult {
  /**
   * Succès de l'import.
   */
  success: boolean
  /**
   * Nombre de noeuds importés.
   */
  nodesImported: number
  /**
   * Nombre d'arêtes importées.
   */
  edgesImported: number
  /**
   * Erreurs rencontrées lors de l'import.
   */
  errors: string[]
  /**
   * Avertissements non bloquants.
   */
  warnings: string[]
}

/**
 * Handlers (actions) exposés par le trait Importable.
 */
export interface ImportableHandlers {
  /**
   * Importe un graphe depuis JSON.
   * @param json - String JSON à importer
   * @param options - Options d'import
   * @returns Résultat de l'import
   */
  importFromJSON: (json: string, options?: ImportOptions) => Promise<ImportResult>
  /**
   * Importe un graphe depuis XML Archimate.
   * @param xml - String XML à importer
   * @param options - Options d'import
   * @returns Résultat de l'import
   */
  importFromArchimate: (xml: string, options?: ImportOptions) => Promise<ImportResult>
  /**
   * Valide des données JSON avant import.
   * @param data - Données à valider
   * @returns Résultat de validation ; `data` contient les données normalisées
   *   (valeurs par défaut appliquées) lorsque la validation réussit
   */
  validateImport: (data: unknown) => {
    valid: boolean
    errors: string[]
    data?: ValidatedImportData
  }
}

// Schémas Zod pour validation

/**
 * Schéma de validation pour la géométrie d'un noeud.
 */
const GeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive('La largeur doit être positive'),
  h: z.number().positive('La hauteur doit être positive'),
})

/**
 * Schéma de validation pour le style d'un noeud.
 */
const StylingSchema = z.object({
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().nonnegative(),
  opacity: z.number().min(0).max(1),
})

/**
 * Schéma de validation pour un noeud.
 */
const NodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  type: z.enum(['container', 'shape']),
  geometry: GeometrySchema,
  styling: StylingSchema,
  data: z.record(z.string(), z.unknown()).default({}),
})

/**
 * Types de flèches admis (miroir de `ArrowType` dans `types/index.ts`).
 * L'import reste tolérant : le champ est optionnel, mais s'il est présent il
 * doit désigner un marqueur connu.
 */
const ArrowTypeSchema = z.enum([
  'none',
  'dot',
  'small-dot',
  'arrow',
  'filled-arrow',
  'diamond',
  'filled-diamond',
  'circle',
  'filled-circle',
  'square',
  'filled-square',
  'archi-composition',
  'archi-aggregation',
  'archi-assignment',
  'archi-realization',
  'archi-serving',
  'archi-access',
  'archi-influence',
  'archi-trigger',
  'archi-flow',
])

/**
 * Schéma de validation pour une arête.
 */
const EdgeSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  routing: z.enum(['straight', 'orthogonal', 'curved', 'bezier']).default('straight'),
  startArrow: ArrowTypeSchema.optional(),
  endArrow: ArrowTypeSchema.optional(),
  arrowSize: z.number().positive().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Schéma de validation pour un fichier JSON complet.
 */
const ImportDataSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Données d'import validées et normalisées (valeurs par défaut appliquées).
 */
export type ValidatedImportData = z.infer<typeof ImportDataSchema>

/**
 * Trait permettant d'importer des graphes depuis différents formats.
 *
 * Supporte JSON et Archimate XML avec validation Zod complète.
 * Gère les conflits d'IDs et offre différentes stratégies de fusion.
 *
 * @returns Handlers pour l'import depuis différents formats
 *
 * @example
 * ```typescript
 * const { importFromJSON, validateImport } = useImportable();
 * const result = await importFromJSON(jsonString, {
 *   onConflict: 'rename',
 *   mergeStrategy: 'append'
 * });
 * console.log(`Importé ${result.nodesImported} noeuds`);
 * ```
 */
export function useImportable(): ImportableHandlers {
  const graphStore = useGraphStore()

  /**
   * Valide des données JSON avec Zod.
   */
  function validateImport(data: unknown): {
    valid: boolean
    errors: string[]
    data?: ValidatedImportData
  } {
    // safeParse renvoie les données normalisées (valeurs par défaut appliquées)
    // sans lever d'exception ; on les propage pour que l'import s'appuie sur
    // elles plutôt que sur l'entrée brute.
    const parsed = ImportDataSchema.safeParse(data)
    if (parsed.success) {
      return { valid: true, errors: [], data: parsed.data }
    }
    return {
      valid: false,
      errors: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
    }
  }

  /**
   * Résout les conflits d'IDs selon la stratégie choisie.
   */
  function resolveIDConflicts(
    nodes: Node[],
    edges: Edge[],
    strategy: ConflictStrategy
  ): { nodes: Node[]; edges: Edge[]; warnings: string[] } {
    const warnings: string[] = []
    const idMapping = new Map<string, string>()

    // Traiter les noeuds
    const resolvedNodes = nodes
      .map((node) => {
        const existingNode = graphStore.nodes[node.id]

        if (!existingNode) {
          // Pas de conflit
          return node
        }

        // Conflit détecté
        if (strategy === 'skip') {
          warnings.push(`Noeud ${node.id} ignoré (déjà existant)`)
          return null
        } else if (strategy === 'rename') {
          const newId = nanoid()
          idMapping.set(node.id, newId)
          warnings.push(`Noeud ${node.id} renommé en ${newId}`)
          return { ...node, id: newId }
        } else {
          // replace
          warnings.push(`Noeud ${node.id} remplacé`)
          return node
        }
      })
      .filter((n): n is Node => n !== null)

    // Remapper les parentId vers les IDs renommés : sans cela, les enfants
    // d'un conteneur renommé restaient rattachés au noeud PRÉ-EXISTANT du
    // graphe (hiérarchie silencieusement corrompue au ré-import).
    const reparentedNodes = resolvedNodes.map((node) => {
      if (node.parentId && idMapping.has(node.parentId)) {
        return { ...node, parentId: idMapping.get(node.parentId)! }
      }
      return node
    })

    // Traiter les arêtes avec mise à jour des références
    const resolvedEdges = edges
      .map((edge) => {
        const updatedEdge = { ...edge }

        // Mettre à jour les références si des noeuds ont été renommés
        if (idMapping.has(edge.sourceId)) {
          updatedEdge.sourceId = idMapping.get(edge.sourceId)!
        }
        if (idMapping.has(edge.targetId)) {
          updatedEdge.targetId = idMapping.get(edge.targetId)!
        }

        // Vérifier conflit d'ID d'arête
        const existingEdge = graphStore.edges[edge.id]
        if (existingEdge) {
          if (strategy === 'skip') {
            warnings.push(`Arête ${edge.id} ignorée (déjà existante)`)
            return null
          } else if (strategy === 'rename') {
            const newId = nanoid()
            warnings.push(`Arête ${edge.id} renommée en ${newId}`)
            updatedEdge.id = newId
          } else {
            warnings.push(`Arête ${edge.id} remplacée`)
          }
        }

        return updatedEdge
      })
      .filter((e): e is Edge => e !== null)

    return { nodes: reparentedNodes, edges: resolvedEdges, warnings }
  }

  /**
   * Fusionne intelligemment un lot de noeuds/arêtes avec le graphe existant :
   * un élément dont l'ID existe déjà est mis à jour champ à champ (les `data`
   * sont fusionnées clé à clé, l'entrant l'emportant), un élément inconnu est
   * ajouté tel quel.
   */
  async function applyMerge(
    nodes: Node[],
    edges: Edge[]
  ): Promise<{ nodesImported: number; edgesImported: number; warnings: string[] }> {
    const warnings: string[] = []
    let nodesImported = 0
    let edgesImported = 0

    for (const node of nodes) {
      const existing = graphStore.nodes[node.id]
      if (existing) {
        await graphStore.updateNode(node.id, {
          parentId: node.parentId,
          type: node.type,
          geometry: { ...existing.geometry, ...node.geometry },
          styling: { ...existing.styling, ...node.styling },
          data: { ...existing.data, ...node.data },
        })
        warnings.push(`Noeud ${node.id} fusionné`)
      } else {
        await graphStore.importNode(node)
      }
      nodesImported++
    }

    for (const edge of edges) {
      const existing = graphStore.edges[edge.id]
      if (existing) {
        await graphStore.updateEdge(edge.id, {
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          routing: edge.routing,
          data: { ...existing.data, ...edge.data },
        })
        warnings.push(`Arête ${edge.id} fusionnée`)
      } else {
        await graphStore.importEdge(edge)
      }
      edgesImported++
    }

    return { nodesImported, edgesImported, warnings }
  }

  /**
   * Importe depuis JSON.
   */
  async function importFromJSON(json: string, options: ImportOptions = {}): Promise<ImportResult> {
    const { onConflict = 'rename', validateBeforeImport = true, mergeStrategy = 'append' } = options

    const result: ImportResult = {
      success: false,
      nodesImported: 0,
      edgesImported: 0,
      errors: [],
      warnings: [],
    }

    try {
      // Parser le JSON
      const data = JSON.parse(json)

      // Validation : quand elle est active, on repart des données normalisées
      // (routing par défaut, data à {}) plutôt que de l'entrée brute.
      let normalized: { nodes: Node[]; edges: Edge[] } | null = null
      if (validateBeforeImport) {
        const validation = validateImport(data)
        if (!validation.valid) {
          result.errors = validation.errors
          return result
        }
        normalized = validation.data as unknown as { nodes: Node[]; edges: Edge[] }
      }

      // Extraire nodes et edges (données validées si disponibles, sinon brutes)
      let { nodes, edges } = (normalized ?? data) as { nodes: Node[]; edges: Edge[] }

      // Stratégie 'merge' : les éléments dont l'ID existe déjà sont fusionnés
      // champ à champ avec l'existant (l'entrant prime, les `data` sont
      // fusionnées clé à clé) ; les nouveaux sont ajoutés. La résolution de
      // conflits par renommage/skip ne s'applique donc pas à ce mode.
      if (mergeStrategy === 'merge') {
        const merged = await applyMerge(nodes, edges)
        result.nodesImported = merged.nodesImported
        result.edgesImported = merged.edgesImported
        result.warnings = merged.warnings
        result.success = true
        return result
      }

      // Résoudre les conflits d'IDs (stratégie 'rename' remappe aussi les
      // références source/target des arêtes).
      const resolved = resolveIDConflicts(nodes, edges, onConflict)
      nodes = resolved.nodes
      edges = resolved.edges
      result.warnings = resolved.warnings

      // Appliquer la stratégie de merge
      if (mergeStrategy === 'replace') {
        await graphStore.clearAll()
      }

      // Importer les noeuds en préservant leurs IDs (importNode utilise
      // IndexedDB.put directement sans générer de nouvel identifiant).
      for (const node of nodes) {
        await graphStore.importNode(node)
        result.nodesImported++
      }

      // Importer les arêtes en préservant leurs IDs.
      for (const edge of edges) {
        await graphStore.importEdge(edge)
        result.edgesImported++
      }

      result.success = true
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Erreur inconnue lors de l'import"
      )
    }

    return result
  }

  /**
   * Importe depuis XML Archimate (version simplifiée).
   */
  async function importFromArchimate(
    xml: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      nodesImported: 0,
      edgesImported: 0,
      errors: [],
      warnings: ['Import Archimate XML en mode simplifié'],
    }

    try {
      // Parser le XML
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xml, 'text/xml')

      // Vérifier erreurs de parsing
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        result.errors.push('Erreur de parsing XML: ' + parserError.textContent)
        return result
      }

      // Extraire les éléments (noeuds)
      const elementNodes = xmlDoc.querySelectorAll('element')
      const nodes: Node[] = []

      elementNodes.forEach((elem, index) => {
        const id = elem.getAttribute('id') || nanoid()
        const name = elem.getAttribute('name') || `Element ${index + 1}`
        const typeAttr = elem.getAttribute('xsi:type') || 'archimate:BusinessActor'
        const xmiType = typeAttr.replace('archimate:', '')
        // Le nom standard Open Group (PascalCase) est reconverti en type interne
        // (kebab-case) afin que la couche, la couleur et l'icône soient
        // reconnues. Un type inconnu est conservé brut plutôt que perdu.
        const archimateType = fromArchimateXmiType(xmiType) ?? xmiType

        // Créer un noeud avec position par défaut
        nodes.push({
          id,
          parentId: null,
          type: 'shape',
          geometry: { x: 100 + index * 150, y: 100, w: 120, h: 80 },
          styling: {
            fill: '#e3f2fd',
            stroke: '#1976d2',
            strokeWidth: 2,
            opacity: 1,
          },
          data: {
            name,
            archimateType,
          },
        })
      })

      // Extraire les relations (arêtes)
      const relationshipNodes = xmlDoc.querySelectorAll('relationship')
      const edges: Edge[] = []

      relationshipNodes.forEach((rel) => {
        const id = rel.getAttribute('id') || nanoid()
        const source = rel.getAttribute('source')
        const target = rel.getAttribute('target')
        const typeAttr = rel.getAttribute('xsi:type') || 'archimate:Association'
        const relationType = typeAttr.replace('archimate:', '')

        if (source && target) {
          edges.push({
            id,
            sourceId: source,
            targetId: target,
            routing: 'straight',
            data: {
              relationType,
            },
          })
        }
      })

      // Utiliser importFromJSON pour le reste du traitement
      const jsonData = {
        nodes,
        edges,
        metadata: {
          importedFrom: 'archimate',
        },
      }

      const jsonResult = await importFromJSON(JSON.stringify(jsonData), options)
      return {
        ...jsonResult,
        warnings: [...result.warnings, ...jsonResult.warnings],
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Erreur inconnue lors de l'import Archimate"
      )
    }

    return result
  }

  return {
    importFromJSON,
    importFromArchimate,
    validateImport,
  }
}
