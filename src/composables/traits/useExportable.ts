// src/composables/traits/useExportable.ts
import { useGraphStore } from '../../stores/graph'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { ARCHIMATE_TYPES, type ArchimateLayer } from './useTypeable'
import type { Node } from '../../types'

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
  /**
   * Titre du document, utilisé pour la page de couverture du PDF et les
   * en-têtes Archimate. Si omis, on utilise « Holon Architecture Model ».
   */
  title?: string
  /**
   * Auteur du document, utilisé en couverture PDF et métadonnées XMP.
   */
  author?: string
  /**
   * Inclure une table des matières dans le PDF (page 2 après la couverture).
   * @default true
   */
  includeTOC?: boolean
  /**
   * Inclure une page « vue d'ensemble » avec le diagramme complet en image.
   * @default true
   */
  includeOverview?: boolean
  /**
   * Inclure une section par couche Archimate listant les éléments
   * appartenant à cette couche.
   * @default true
   */
  includeLayerSections?: boolean
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
   * Construit l'index inverse type Archimate → couche. Mémoïsé par appel
   * (peu coûteux).
   */
  function buildTypeToLayerMap(): Map<string, ArchimateLayer> {
    const map = new Map<string, ArchimateLayer>()
    for (const [layerKey, layer] of Object.entries(ARCHIMATE_TYPES)) {
      for (const typeKey of Object.keys(layer.types)) {
        map.set(typeKey, layerKey as ArchimateLayer)
      }
    }
    return map
  }

  /**
   * Charge un PNG en `<img>` HTML pour pouvoir l'injecter dans jsPDF
   * (qui prend un HTMLImageElement déjà chargé).
   */
  function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Échec du chargement de l'image PNG pour le PDF"))
      }
      img.src = url
    })
  }

  /**
   * Export PDF multi-pages structuré en utilisant jsPDF :
   *
   * 1. Page de couverture (titre, auteur, date, totaux)
   * 2. Table des matières (numéros de page calculés après coup)
   * 3. Vue d'ensemble (diagramme complet en image, ajusté à la page)
   * 4. Une section par couche Archimate présente dans le graphe
   *
   * Toutes les pages reçoivent un en-tête (titre) et un pied (numéro / total).
   */
  async function exportAsPDF(options: ExportOptions = {}): Promise<Blob> {
    const {
      quality = 0.95,
      scale = 2,
      title = 'Holon Architecture Model',
      author,
      includeTOC = true,
      includeOverview = true,
      includeLayerSections = true,
    } = options

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 18
    const contentW = pageW - margin * 2

    const nodes = Object.values(graphStore.nodes) as Node[]
    const edges = Object.values(graphStore.edges)
    const typeToLayer = buildTypeToLayerMap()

    // Pré-grouper les noeuds par couche Archimate pour les sections.
    const nodesByLayer = new Map<ArchimateLayer, Node[]>()
    for (const node of nodes) {
      const t = node.data?.archimateType as string | undefined
      if (!t) continue
      const layer = typeToLayer.get(t)
      if (!layer) continue
      const bucket = nodesByLayer.get(layer) ?? []
      bucket.push(node)
      nodesByLayer.set(layer, bucket)
    }

    // Pré-capture éventuelle de l'image de vue d'ensemble.
    let overviewImage: HTMLImageElement | null = null
    if (includeOverview) {
      try {
        const pngBlob = await exportAsPNG({ quality, scale })
        overviewImage = await loadImageFromBlob(pngBlob)
      } catch {
        // On continue sans page « Vue d'ensemble » plutôt que d'annuler tout
        // l'export ; l'utilisateur garde au moins le TOC et les sections.
        overviewImage = null
      }
    }

    // --- Page 1 : couverture ---
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(28)
    pdf.text(title, pageW / 2, 80, { align: 'center' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.setTextColor(90)
    const dateText = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    pdf.text(`Exporté le ${dateText}`, pageW / 2, 100, { align: 'center' })
    if (author) pdf.text(`Par ${author}`, pageW / 2, 108, { align: 'center' })

    pdf.setFontSize(11)
    pdf.setTextColor(120)
    pdf.text(`${nodes.length} noeud${nodes.length > 1 ? 's' : ''}`, pageW / 2, 124, {
      align: 'center',
    })
    pdf.text(`${edges.length} relation${edges.length > 1 ? 's' : ''}`, pageW / 2, 132, {
      align: 'center',
    })
    pdf.setTextColor(0)

    // --- Table des matières (placeholder ; remplie après) ---
    let tocPageNumber = 0
    if (includeTOC) {
      pdf.addPage()
      tocPageNumber = pdf.getNumberOfPages()
    }

    // --- Vue d'ensemble ---
    let overviewPageNumber = 0
    if (overviewImage) {
      pdf.addPage()
      overviewPageNumber = pdf.getNumberOfPages()
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text("Vue d'ensemble", margin, margin + 8)
      pdf.setDrawColor(200)
      pdf.line(margin, margin + 12, pageW - margin, margin + 12)

      // Ajuster l'image dans la zone disponible (contentW × contentH).
      const availH = pageH - margin * 2 - 20
      const ratio = overviewImage.height / overviewImage.width
      let drawW = contentW
      let drawH = drawW * ratio
      if (drawH > availH) {
        drawH = availH
        drawW = drawH / ratio
      }
      const drawX = margin + (contentW - drawW) / 2
      const drawY = margin + 20
      pdf.addImage(overviewImage, 'PNG', drawX, drawY, drawW, drawH)
    }

    // --- Sections par couche ---
    const layerSections: Array<{ label: string; page: number }> = []
    if (includeLayerSections) {
      for (const [layerKey, layerNodes] of nodesByLayer) {
        const layer = ARCHIMATE_TYPES[layerKey]
        pdf.addPage()
        layerSections.push({ label: layer.label, page: pdf.getNumberOfPages() })

        // En-tête de section avec pastille couleur.
        pdf.setFillColor(layer.color)
        pdf.rect(margin, margin + 2, 6, 6, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.text(`Couche ${layer.label}`, margin + 10, margin + 8)
        pdf.setDrawColor(200)
        pdf.line(margin, margin + 12, pageW - margin, margin + 12)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(120)
        pdf.text(
          `${layerNodes.length} élément${layerNodes.length > 1 ? 's' : ''}`,
          margin,
          margin + 18
        )
        pdf.setTextColor(0)

        // Liste des éléments, paginée si nécessaire.
        const tableTop = margin + 24
        const lineHeight = 6
        let y = tableTop
        pdf.setFontSize(10)
        for (const node of layerNodes) {
          if (y > pageH - margin - lineHeight) {
            pdf.addPage()
            y = margin + 8
          }
          const name = (node.data?.name as string) || node.id
          const archimateType = (node.data?.archimateType as string) || ''
          // Les `types` de chaque couche sont typés en union restreinte ;
          // pour la lookup générique, on assoupli à `Record<string, …>`.
          const types = layer.types as Record<string, { label: string; icon: string }>
          const typeLabel = types[archimateType]?.label ?? archimateType
          pdf.setFont('helvetica', 'bold')
          pdf.text(name, margin, y)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(120)
          pdf.text(typeLabel, margin + 80, y)
          pdf.setTextColor(0)
          y += lineHeight
        }
      }
    }

    // --- Remplir la TOC maintenant que tous les numéros de page sont connus ---
    if (includeTOC) {
      pdf.setPage(tocPageNumber)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text('Table des matières', margin, margin + 8)
      pdf.setDrawColor(200)
      pdf.line(margin, margin + 12, pageW - margin, margin + 12)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      let y = margin + 24
      const entries: Array<{ label: string; page: number }> = []
      if (overviewPageNumber > 0) {
        entries.push({ label: "Vue d'ensemble", page: overviewPageNumber })
      }
      entries.push(...layerSections)
      for (const entry of entries) {
        pdf.text(entry.label, margin, y)
        pdf.text(String(entry.page), pageW - margin, y, { align: 'right' })
        // Pointillés de remplissage (rendus comme une simple ligne pour rester
        // lisible avec n'importe quelle police PDF).
        pdf.setDrawColor(220)
        pdf.line(margin + pdf.getTextWidth(entry.label) + 2, y - 1, pageW - margin - 6, y - 1)
        y += 8
      }
    }

    // --- En-tête et numéros de page sur toutes les pages sauf la couverture ---
    const totalPages = pdf.getNumberOfPages()
    for (let p = 2; p <= totalPages; p++) {
      pdf.setPage(p)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(140)
      pdf.text(title, margin, 8)
      pdf.text(`${p} / ${totalPages}`, pageW - margin, 8, { align: 'right' })
      pdf.setTextColor(0)
    }

    return pdf.output('blob')
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
