// src/shims.d.ts — déclarations pour les imports non-TS gérés par Vite.

// Permet `import md from 'chemin.md?raw'` avec typage string.
declare module '*.md?raw' {
  const content: string
  export default content
}
