
// src/services/markdown.ts

import type { Node } from '../types';

// Dépendances à installer plus tard (par ex. `gray-matter`)
// Pour l'instant, une implémentation factice.

/**
 * Parse un contenu Markdown avec Frontmatter YAML pour générer un noeud.
 * @param content - Le contenu du fichier .md
 * @returns Un objet partiel de Noeud (sans ID, parentId, etc.)
 */
export function parseMarkdown(content: string): Partial<Node> {
  // Logique de parsing (ex: utiliser gray-matter)
  // 1. Extraire le YAML (frontmatter) et le corps (body).
  // 2. Mapper les champs YAML aux propriétés du noeud (geometry, styling).
  // 3. Utiliser le body pour le champ `data.text`.

  console.warn('Parsing Markdown non implémenté. Utilisation de données factices.');

  // Exemple factice
  return {
    type: 'shape',
    geometry: { x: 50, y: 50, w: 150, h: 80 },
    styling: { fill: '#fff', stroke: '#000', strokeWidth: 2, opacity: 1 },
    data: {
      text: content.substring(0, 100), // Extrait du body
    },
  };
}
