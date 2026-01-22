// src/composables/useExportSvg.ts
import { useGraphStore } from '../stores/graph';
import { useGeometry } from './useGeometry';

/**
 * Composable pour exporter le graphe en SVG.
 */
export function useExportSvg() {
  const graphStore = useGraphStore();
  const { getNodeAbsolutePosition } = useGeometry();

  /**
   * Calcule le bounding box de tous les noeuds.
   */
  function calculateBoundingBox() {
    const nodes = Object.values(graphStore.nodes);
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const pos = getNodeAbsolutePosition(node.id);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + node.geometry.w);
      maxY = Math.max(maxY, pos.y + node.geometry.h);
    }

    // Ajouter une marge
    const padding = 20;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }

  /**
   * Génère le contenu SVG pour un noeud et ses enfants récursivement.
   */
  function renderNodeToSvg(nodeId: string, depth = 0): string {
    const node = graphStore.nodes[nodeId];
    if (!node) return '';

    const { x, y, w, h } = node.geometry;
    const { fill, stroke, strokeWidth } = node.styling;
    const name = node.data.name || node.id.substring(0, 5);

    let svg = `  <g transform="translate(${x} ${y})">\n`;
    svg += `    <rect width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="4"/>\n`;
    svg += `    <text x="10" y="20" fill="#333" font-size="14" font-family="sans-serif">${escapeXml(name)}</text>\n`;

    // Rendre les enfants récursivement
    if (node.type === 'container') {
      const children = Object.values(graphStore.nodes).filter(n => n.parentId === nodeId);
      for (const child of children) {
        svg += renderNodeToSvg(child.id, depth + 1);
      }
    }

    svg += `  </g>\n`;
    return svg;
  }

  /**
   * Génère le SVG complet du graphe.
   */
  function generateSvg(): string {
    const bbox = calculateBoundingBox();
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bbox.minX} ${bbox.minY} ${width} ${height}">\n`;
    svg += `  <style>\n`;
    svg += `    text { user-select: none; }\n`;
    svg += `  </style>\n`;

    // Fond
    svg += `  <rect x="${bbox.minX}" y="${bbox.minY}" width="${width}" height="${height}" fill="#f9fafb"/>\n`;

    // Arêtes
    svg += `  <g class="edges">\n`;
    for (const edge of Object.values(graphStore.edges)) {
      const sourceNode = graphStore.nodes[edge.sourceId];
      const targetNode = graphStore.nodes[edge.targetId];
      if (!sourceNode || !targetNode) continue;

      const sourcePos = getNodeAbsolutePosition(edge.sourceId);
      const targetPos = getNodeAbsolutePosition(edge.targetId);

      const x1 = sourcePos.x + sourceNode.geometry.w / 2;
      const y1 = sourcePos.y + sourceNode.geometry.h / 2;
      const x2 = targetPos.x + targetNode.geometry.w / 2;
      const y2 = targetPos.y + targetNode.geometry.h / 2;

      svg += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="2"/>\n`;
    }
    svg += `  </g>\n`;

    // Noeuds racines
    svg += `  <g class="nodes">\n`;
    const rootNodes = Object.values(graphStore.nodes).filter(n => n.parentId === null);
    for (const node of rootNodes) {
      svg += renderNodeToSvg(node.id);
    }
    svg += `  </g>\n`;

    svg += `</svg>`;
    return svg;
  }

  /**
   * Télécharge le SVG en tant que fichier.
   */
  function downloadSvg(filename = 'holon-export.svg') {
    const svgContent = generateSvg();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Copie le SVG dans le presse-papier.
   */
  async function copyToClipboard(): Promise<boolean> {
    try {
      const svgContent = generateSvg();
      await navigator.clipboard.writeText(svgContent);
      return true;
    } catch {
      return false;
    }
  }

  return {
    generateSvg,
    downloadSvg,
    copyToClipboard,
    calculateBoundingBox,
  };
}

/**
 * Échappe les caractères spéciaux XML.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
