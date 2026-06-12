// src/composables/traits/useExportable.ts
import { useGraphStore } from '../../stores/graph'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Formats d'export disponibles.
 */
export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json' | 'archimate'

/**
 * Options de configuration pour l'export.
 */
export interface ExportOptions {
  /**
   * Qualité de l'image (0-1) pour les exports PNG.
   * @default 1
   */
  quality?: number
  /**
   * Échelle de l'image (1-4) pour augmenter la résolution.
   * @default 1
   */
  scale?: number
  /**
   * Inclure les métadonnées dans l'export JSON/Archimate.
   * @default true
   */
  includeMetadata?: boolean
  /**
   * Nom du fichier pour le téléchargement.
   */
  filename?: string
}

/**
 * Handlers (actions) exposés par le trait Exportable.
 */
export interface ExportableHandlers {
  /**
   * Exporte le graphe en image PNG.
   * @param options - Options d'export
   * @returns Blob de l'image PNG
   */
  exportAsPNG: (options?: ExportOptions) => Promise<Blob>
  /**
   * Exporte le graphe en SVG natif.
   * @param options - Options d'export
   * @returns Blob du SVG
   */
  exportAsSVG: (options?: ExportOptions) => Promise<Blob>
  /**
   * Exporte le graphe en PDF.
   * @param options - Options d'export
   * @returns Blob du PDF
   */
  exportAsPDF: (options?: ExportOptions) => Promise<Blob>
  /**
   * Exporte le graphe en JSON sérialisé.
   * @param options - Options d'export
   * @returns String JSON
   */
  exportAsJSON: (options?: ExportOptions) => string
  /**
   * Exporte le graphe au format Archimate XML.
   * @param options - Options d'export
   * @returns String XML
   */
  exportAsArchimate: (options?: ExportOptions) => string
  /**
   * Télécharge un blob avec le nom de fichier spécifié.
   * @param blob - Blob à télécharger
   * @param filename - Nom du fichier
   */
  downloadFile: (blob: Blob, filename: string) => void
  /**
   * Télécharge une string comme fichier texte.
   * @param content - Contenu textuel
   * @param filename - Nom du fichier
   * @param mimeType - Type MIME
   */
  downloadText: (content: string, filename: string, mimeType: string) => void
}

/**
 * Trait permettant d'exporter le graphe dans différents formats.
 *
 * Supporte 5 formats : PNG, SVG, PDF, JSON et Archimate XML.
 * Utilise html2canvas pour PNG, jsPDF pour PDF, et génération native pour les autres.
 *
 * @returns Handlers pour l'export dans différents formats
 *
 * @example
 * ```typescript
 * const { exportAsPNG, exportAsJSON, downloadFile } = useExportable();
 * const pngBlob = await exportAsPNG({ quality: 0.9, scale: 2 });
 * downloadFile(pngBlob, 'diagram.png');
 * ```
 */
export function useExportable(): ExportableHandlers {
  const graphStore = useGraphStore()

  /**
   * Trouve l'élément SVG du canvas.
   */
  function findSVGElement(): SVGSVGElement | null {
    return document.querySelector('svg.graph-canvas') as SVGSVGElement
  }

  /**
   * Export PNG en utilisant html2canvas.
   */
  async function exportAsPNG(options: ExportOptions = {}): Promise<Blob> {
    const { quality = 1, scale = 1 } = options

    const svgElement = findSVGElement()
    if (!svgElement) {
      throw new Error('Élément SVG du canvas non trouvé')
    }

    // Capturer le parent du SVG pour inclure le background
    const container = svgElement.parentElement
    if (!container) {
      throw new Error('Container du SVG non trouvé')
    }

    const canvas = await html2canvas(container, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
    })

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Échec de la création du blob PNG'))
          }
        },
        'image/png',
        quality
      )
    })
  }

  /**
   * Export SVG natif.
   */
  async function exportAsSVG(_options: ExportOptions = {}): Promise<Blob> {
    const svgElement = findSVGElement()
    if (!svgElement) {
      throw new Error('Élément SVG du canvas non trouvé')
    }

    // Cloner le SVG pour ne pas modifier l'original
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

    // Ajouter les namespaces nécessaires
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    // Sérialiser le SVG
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(clonedSvg)

    // Ajouter la déclaration XML
    const svgData = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`

    return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  }

  /**
   * Export PDF en utilisant jsPDF.
   */
  async function exportAsPDF(options: ExportOptions = {}): Promise<Blob> {
    const { quality = 0.95, scale = 2 } = options

    // D'abord, obtenir l'image PNG
    const pngBlob = await exportAsPNG({ quality, scale })
    const pngUrl = URL.createObjectURL(pngBlob)

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          // Créer le PDF avec les dimensions de l'image
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height],
          })

          // Ajouter l'image au PDF
          pdf.addImage(img, 'PNG', 0, 0, img.width, img.height)

          // Convertir en blob
          const pdfBlob = pdf.output('blob')
          URL.revokeObjectURL(pngUrl)
          resolve(pdfBlob)
        } catch (error) {
          URL.revokeObjectURL(pngUrl)
          reject(error)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(pngUrl)
        reject(new Error("Échec du chargement de l'image pour le PDF"))
      }
      img.src = pngUrl
    })
  }

  /**
   * Export JSON du graphe complet.
   */
  function exportAsJSON(options: ExportOptions = {}): string {
    const { includeMetadata = true } = options

    const exportData: Record<string, unknown> = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: Object.values(graphStore.nodes),
      edges: Object.values(graphStore.edges),
    }

    if (includeMetadata) {
      exportData.metadata = {
        nodeCount: Object.keys(graphStore.nodes).length,
        edgeCount: Object.keys(graphStore.edges).length,
        exportTool: 'Holon Architecture Modeler',
      }
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Export au format Archimate XML (version simplifiée).
   */
  function exportAsArchimate(options: ExportOptions = {}): string {
    const { includeMetadata = true } = options

    const nodes = Object.values(graphStore.nodes)
    const edges = Object.values(graphStore.edges)

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<archimate:model\n'
    xml += '  xmlns:archimate="http://www.opengroup.org/xsd/archimate/3.0/"\n'
    xml += '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
    xml +=
      '  xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd"\n'
    xml += `  identifier="${generateUUID()}"\n`
    xml += '  version="4.9.0">\n'

    // Nom du modèle
    xml += '  <name>Holon Architecture Model</name>\n'

    if (includeMetadata) {
      xml += `  <metadata>\n`
      xml += `    <dc:creator>Holon Architecture Modeler</dc:creator>\n`
      xml += `    <dc:date>${new Date().toISOString()}</dc:date>\n`
      xml += `  </metadata>\n`
    }

    // Elements (nodes)
    xml += '  <elements>\n'
    for (const node of nodes) {
      const archimateType = node.data?.archimateType || 'BusinessActor'
      xml += `    <element xsi:type="archimate:${archimateType}" id="${node.id}" name="${escapeXML(node.data?.name || node.id)}">\n`
      if (node.data?.documentation) {
        xml += `      <documentation>${escapeXML(node.data.documentation)}</documentation>\n`
      }
      xml += `    </element>\n`
    }
    xml += '  </elements>\n'

    // Relations (edges)
    xml += '  <relationships>\n'
    for (const edge of edges) {
      const relationType = edge.data?.relationType || 'Association'
      xml += `    <relationship xsi:type="archimate:${relationType}" id="${edge.id}" source="${edge.sourceId}" target="${edge.targetId}">\n`
      if (edge.data?.name) {
        xml += `      <name>${escapeXML(edge.data.name)}</name>\n`
      }
      xml += `    </relationship>\n`
    }
    xml += '  </relationships>\n'

    xml += '</archimate:model>\n'

    return xml
  }

  /**
   * Télécharge un blob comme fichier.
   */
  function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Télécharge une string comme fichier texte.
   */
  function downloadText(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    downloadFile(blob, filename)
  }

  return {
    exportAsPNG,
    exportAsSVG,
    exportAsPDF,
    exportAsJSON,
    exportAsArchimate,
    downloadFile,
    downloadText,
  }
}

/**
 * Génère un UUID simple pour Archimate.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Échappe les caractères spéciaux XML.
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
