# Holon - Moteur de Modélisation d'Architecture Holonique

Holon est une application web expérimentale pour la modélisation d'architectures basées sur la théorie des **Holons** d'Arthur Koestler. Le principe fondamental est que chaque composant (un "holon") est simultanément une entité autonome et une partie d'un système plus grand.

Cette application fournit un canevas infini où chaque nœud peut contenir d'autres nœuds, permettant une imbrication sans limite pour représenter des systèmes complexes. Malgré cette structure hiérarchique, les connexions (arêtes) peuvent se former entre n'importe quels nœuds, peu importe leur profondeur.

## Philosophie Core

1.  **Tout est Conteneur** : N'importe quel nœud, qu'il s'agisse d'une simple forme ou d'un groupe complexe, peut servir de parent à d'autres nœuds.
2.  **État Aplati (Flattened State)** : Pour permettre des connexions inter-niveaux et simplifier la gestion de l'état, tous les nœuds et arêtes sont stockés dans des structures de données plates (`Record<ID, Item>`). La hiérarchie est maintenue via une référence `parentId`.
3.  **Local First** : Toutes les données sont stockées et manipulées directement dans le navigateur en utilisant IndexedDB. L'application est entièrement fonctionnelle hors ligne. Des fonctionnalités d'import/export (JSON, Markdown) assurent la portabilité des données.

## Stack Technique

*   **Framework** : Vue 3 (Composition API, `<script setup>`)
*   **Langage** : TypeScript (Strict)
*   **State Management** : Pinia
*   **Persistance Locale** : Dexie.js (wrapper pour IndexedDB)
*   **Rendu** : SVG Natif
*   **Styling** : Tailwind CSS

## Fonctionnalités

*   **Canevas SVG** : Un canevas de rendu principal avec des capacités de zoom et de panoramique.
*   **Rendu Récursif** : Les nœuds de type `container` peuvent afficher une hiérarchie imbriquée d'autres nœuds.
*   **Bibliothèque de Composants** : Une barre latérale contenant des "templates" de nœuds prêts à être glissés-déposés sur le canevas.
*   **Drag & Drop** : Créez de nouveaux nœuds en glissant des items depuis la bibliothèque.
*   **Gestion des Coordonnées Complexes** :
    *   **Liens Absolus** : Les arêtes sont rendues dans un calque global. Les coordonnées de leurs points d'ancrage sont calculées en temps réel en remontant l'arbre des parents pour obtenir une position absolue ("World Space").
    *   **Dépose Précise** : Lors d'un drop, les coordonnées de l'écran ("Screen Space") sont converties en coordonnées locales du nœud parent cible, en tenant compte du zoom et du pan actuels du canevas.
*   **Persistance Automatique** : Toute modification est automatiquement sauvegardée dans IndexedDB.

## Structure du Projet

```
src/
├── types/index.ts          # Interfaces TypeScript (Node, Edge, etc.)
├── db/index.ts             # Configuration de la base de données Dexie.js
├── services/markdown.ts    # Logique pour le parsing de fichiers Markdown
├── stores/
│   ├── graph.ts            # Store Pinia pour les nœuds, arêtes et synchro DB
│   └── library.ts          # Store Pinia pour les templates de la sidebar
├── composables/
│   └── useGeometry.ts      # Le cœur de la logique mathématique pour les coordonnées
└── components/
    ├── layout/Sidebar.vue
    ├── canvas/GraphCanvas.vue  # Point d'entrée SVG, gère le drop, zoom/pan
    ├── canvas/NodeRenderer.vue # Composant récursif qui affiche un nœud et ses enfants
    └── canvas/EdgeLayer.vue    # Calque SVG unique qui dessine tous les liens
```

## Le Challenge Critique : La Géométrie

La complexité principale de ce projet réside dans la gestion des différents systèmes de coordonnées. Le composable `useGeometry` a été conçu pour résoudre ce problème.

### `getNodeAbsolutePosition(nodeId)`

*   **Problème** : Les nœuds sont positionnés *relativement* à leur parent. Cependant, le `EdgeLayer`, qui est un calque unique et global, doit savoir où dessiner les lignes en coordonnées *absolues* (World Space).
*   **Solution** : Cette fonction prend l'ID d'un nœud, récupère sa géométrie `{x, y}`, puis remonte récursivement la chaîne des `parentId` en additionnant les coordonnées de chaque parent jusqu'à la racine. Le résultat est la position totale du nœud par rapport au coin supérieur gauche du canevas.

### `screenToLocalCoordinates(screenX, screenY, svgElement, targetParentId)`

*   **Problème** : Lorsqu'un utilisateur dépose un item sur le canevas, l'événement du navigateur nous donne `clientX`/`clientY` (Screen Space). Nous devons convertir ce point en une coordonnée locale au sein du nœud parent cible, en tenant compte des transformations (zoom/pan) appliquées au SVG.
*   **Solution** :
    1.  On récupère la Matrice de Transformation Courante (`CTM`) du `svgElement`.
    2.  On **inverse** cette matrice pour créer une fonction de transformation de `Screen Space` -> `SVG Space`.
    3.  On applique cette transformation au point `clientX`/`clientY` pour obtenir la coordonnée dans le monde SVG non transformé.
    4.  Si la cible est un nœud imbriqué (`targetParentId` n'est pas `null`), on soustrait la position absolue de ce parent (calculée avec `getNodeAbsolutePosition`) pour obtenir la coordonnée finale, relative à ce parent.

## Pour Commencer

1.  **Installer les dépendances :**
    ```bash
    npm install
    ```

2.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    ```

3.  **Ouvrir l'application** : Naviguez vers l'URL fournie par votre outil de build (ex: `http://localhost:5173`).
