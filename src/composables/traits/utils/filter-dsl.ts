// src/composables/traits/utils/filter-dsl.ts
import type { Node } from '../../../types';

/**
 * Mini-langage de filtrage (DSL) pour sélectionner des noeuds du graphe.
 *
 * Grammaire (insensible à la casse et aux accents) :
 *
 * - Terme nu              : `paiement` → le nom contient « paiement »
 * - Champ                 : `champ:valeur` (contient), `champ=valeur` (égalité stricte),
 *                           `champ~valeur` (expression régulière)
 * - Jokers                : `*` dans une valeur avec `:` (ex. `nom:pay*`)
 * - Chaînes               : guillemets pour les espaces (ex. `nom:"plan de paie"`)
 * - Booléens              : `et`/`and`, `ou`/`or`, `non`/`not`/`!`, parenthèses ;
 *                           la juxtaposition vaut ET implicite
 *
 * Champs reconnus (synonymes français/anglais) :
 * - `nom` / `name` / `label`        → data.name
 * - `type`                          → type du noeud (container/conteneur, shape/forme)
 * - `archi` / `archimate`           → data.archimateType (ex. business-actor)
 * - `couche` / `layer` / `domaine`  → couche Archimate, dérivée du préfixe du type
 *                                     (business, application, technology, motivation,
 *                                     strategy, implementation, physical, generic)
 * - `tag` / `étiquette`             → data.tags
 * - `commentaire` / `comment`       → data.comment
 * - `prop` / `propriété`            → `prop:clé=valeur` ou `prop:clé` (existence)
 *
 * Exemples :
 * - `couche:business`                          → toute la couche métier
 * - `non couche:technology`                    → masquer l'infrastructure
 * - `(tag:critique ou tag:obsolète) et couche:application`
 * - `nom:pay* et non type:container`
 */

/** Résultat de l'analyse d'une requête DSL. */
export type ParseResult =
  | { ok: true; matches: (node: Node) => boolean }
  | { ok: false; error: string };

// --- Normalisation (casse + accents) ---

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// --- Tokenizer ---

type Token =
  | { kind: 'lparen' | 'rparen' | 'and' | 'or' | 'not'; pos: number }
  | { kind: 'term'; field: string | null; op: ':' | '=' | '~'; value: string; pos: number };

const KEYWORDS: Record<string, 'and' | 'or' | 'not'> = {
  et: 'and',
  and: 'and',
  '&&': 'and',
  ou: 'or',
  or: 'or',
  '||': 'or',
  non: 'not',
  not: 'not',
};

function tokenize(query: string): Token[] | { error: string } {
  const tokens: Token[] = [];
  let i = 0;

  const readQuoted = (): string | null => {
    // i pointe sur le guillemet ouvrant
    const quote = query[i];
    i++;
    let out = '';
    while (i < query.length && query[i] !== quote) {
      out += query[i];
      i++;
    }
    if (i >= query.length) return null; // guillemet non fermé
    i++; // guillemet fermant
    return out;
  };

  const readWord = (): string => {
    let out = '';
    while (i < query.length && !/[\s():=~"']/.test(query[i])) {
      out += query[i];
      i++;
    }
    return out;
  };

  // Comme readWord mais autorise `=` : nécessaire pour `prop:clé=valeur`.
  const readValueWord = (): string => {
    let out = '';
    while (i < query.length && !/[\s():~"']/.test(query[i])) {
      out += query[i];
      i++;
    }
    return out;
  };

  while (i < query.length) {
    const ch = query[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const pos = i;
    if (ch === '(') {
      tokens.push({ kind: 'lparen', pos });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', pos });
      i++;
      continue;
    }
    if (ch === '!' || (ch === '-' && isOperatorBefore(tokens))) {
      tokens.push({ kind: 'not', pos });
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const value = readQuoted();
      if (value === null) return { error: `Guillemet non fermé à la position ${pos + 1}` };
      tokens.push({ kind: 'term', field: null, op: ':', value, pos });
      continue;
    }

    const word = readWord();
    if (!word) return { error: `Caractère inattendu « ${ch} » à la position ${pos + 1}` };

    const keyword = KEYWORDS[normalize(word)];
    // `champ:` collé au mot → c'est un terme, pas un mot-clé
    if (keyword && query[i] !== ':' && query[i] !== '=' && query[i] !== '~') {
      tokens.push({ kind: keyword, pos });
      continue;
    }

    // Terme avec champ explicite ?
    const opChar = query[i];
    if (opChar === ':' || opChar === '=' || opChar === '~') {
      i++;
      let value: string;
      if (query[i] === '"' || query[i] === "'") {
        const quoted = readQuoted();
        if (quoted === null) return { error: `Guillemet non fermé à la position ${i}` };
        value = quoted;
      } else {
        value = readValueWord();
      }
      if (!value) return { error: `Valeur manquante pour « ${word}${opChar} » (position ${pos + 1})` };
      tokens.push({ kind: 'term', field: word, op: opChar, value, pos });
      continue;
    }

    tokens.push({ kind: 'term', field: null, op: ':', value: word, pos });
  }

  return tokens;
}

function isOperatorBefore(tokens: Token[]): boolean {
  const last = tokens[tokens.length - 1];
  return !last || last.kind === 'and' || last.kind === 'or' || last.kind === 'not' || last.kind === 'lparen';
}

// --- AST et parseur (descente récursive) ---

type Ast =
  | { kind: 'and' | 'or'; left: Ast; right: Ast }
  | { kind: 'not'; child: Ast }
  | { kind: 'term'; field: string | null; op: ':' | '=' | '~'; value: string };

function parseTokens(tokens: Token[]): Ast | { error: string } {
  let index = 0;

  const peek = () => tokens[index];

  // expression := orExpr
  // orExpr     := andExpr (OR andExpr)*
  // andExpr    := unary (AND? unary)*   — juxtaposition = ET implicite
  // unary      := NOT unary | '(' expression ')' | TERM

  function parseOr(): Ast | { error: string } {
    let left = parseAnd();
    if ('error' in left) return left;
    while (peek()?.kind === 'or') {
      index++;
      const right = parseAnd();
      if ('error' in right) return right;
      left = { kind: 'or', left, right };
    }
    return left;
  }

  function parseAnd(): Ast | { error: string } {
    let left = parseUnary();
    if ('error' in left) return left;
    while (true) {
      const next = peek();
      if (!next) break;
      if (next.kind === 'and') {
        index++;
        const right = parseUnary();
        if ('error' in right) return right;
        left = { kind: 'and', left, right };
        continue;
      }
      // ET implicite par juxtaposition
      if (next.kind === 'term' || next.kind === 'lparen' || next.kind === 'not') {
        const right = parseUnary();
        if ('error' in right) return right;
        left = { kind: 'and', left, right };
        continue;
      }
      break;
    }
    return left;
  }

  function parseUnary(): Ast | { error: string } {
    const token = peek();
    if (!token) return { error: 'Expression incomplète en fin de requête' };
    if (token.kind === 'not') {
      index++;
      const child = parseUnary();
      if ('error' in child) return child;
      return { kind: 'not', child };
    }
    if (token.kind === 'lparen') {
      index++;
      const inner = parseOr();
      if ('error' in inner) return inner;
      if (peek()?.kind !== 'rparen') {
        return { error: `Parenthèse fermante manquante (position ${token.pos + 1})` };
      }
      index++;
      return inner;
    }
    if (token.kind === 'term') {
      index++;
      return { kind: 'term', field: token.field, op: token.op, value: token.value };
    }
    return { error: `Opérateur inattendu à la position ${token.pos + 1}` };
  }

  const ast = parseOr();
  if ('error' in ast) return ast;
  const remaining = peek();
  if (remaining) {
    return { error: `Élément inattendu à la position ${remaining.pos + 1}` };
  }
  return ast;
}

// --- Évaluation ---

const FIELD_ALIASES: Record<string, 'name' | 'type' | 'archi' | 'layer' | 'tag' | 'comment' | 'prop'> = {
  nom: 'name',
  name: 'name',
  label: 'name',
  type: 'type',
  archi: 'archi',
  archimate: 'archi',
  couche: 'layer',
  layer: 'layer',
  domaine: 'layer',
  tag: 'tag',
  etiquette: 'tag',
  commentaire: 'comment',
  comment: 'comment',
  prop: 'prop',
  propriete: 'prop',
};

/** Synonymes de valeurs pour les couches Archimate (FR → canonique). */
const LAYER_SYNONYMS: Record<string, string> = {
  metier: 'business',
  business: 'business',
  applicatif: 'application',
  application: 'application',
  technique: 'technology',
  techno: 'technology',
  infra: 'technology',
  infrastructure: 'technology',
  technology: 'technology',
  motivation: 'motivation',
  strategie: 'strategy',
  strategy: 'strategy',
  implementation: 'implementation',
  physique: 'physical',
  physical: 'physical',
  generique: 'generic',
  generic: 'generic',
};

const TYPE_SYNONYMS: Record<string, string> = {
  conteneur: 'container',
  container: 'container',
  forme: 'shape',
  shape: 'shape',
  boite: 'shape',
};

/** Dérive la couche Archimate d'un noeud (préfixe du type, ex. business-actor → business). */
export function layerOfNode(node: Node): string | null {
  const archimateType = node.data?.archimateType as string | undefined;
  if (archimateType) {
    const dash = archimateType.indexOf('-');
    return dash > 0 ? archimateType.slice(0, dash) : archimateType;
  }
  const explicit = node.data?.layer as string | undefined;
  return explicit ?? null;
}

function compareString(target: string, op: ':' | '=' | '~', rawValue: string): boolean {
  const normalizedTarget = normalize(target);
  const normalizedValue = normalize(rawValue);
  switch (op) {
    case '=':
      return normalizedTarget === normalizedValue;
    case '~':
      try {
        return new RegExp(rawValue, 'i').test(target);
      } catch {
        return false;
      }
    case ':':
      if (normalizedValue.includes('*')) {
        const pattern = normalizedValue
          .split('*')
          .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*');
        return new RegExp(`^${pattern}$`).test(normalizedTarget) ||
               new RegExp(pattern).test(normalizedTarget);
      }
      return normalizedTarget.includes(normalizedValue);
  }
}

function evaluateTerm(node: Node, field: string | null, op: ':' | '=' | '~', value: string): boolean {
  const resolved = field ? FIELD_ALIASES[normalize(field)] : 'name';
  if (field && !resolved) {
    // Champ inconnu : aucun noeud ne correspond (l'erreur est signalée au parsing).
    return false;
  }

  switch (resolved) {
    case 'name': {
      const name = (node.data?.name as string | undefined) ?? '';
      return compareString(name, op, value);
    }
    case 'type': {
      const wanted = TYPE_SYNONYMS[normalize(value)] ?? normalize(value);
      return normalize(node.type) === wanted;
    }
    case 'archi': {
      const archimateType = (node.data?.archimateType as string | undefined) ?? '';
      return compareString(archimateType, op, value);
    }
    case 'layer': {
      const layer = layerOfNode(node);
      if (!layer) return false;
      const wanted = LAYER_SYNONYMS[normalize(value)] ?? normalize(value);
      return normalize(layer) === wanted;
    }
    case 'tag': {
      const tags = node.data?.tags as unknown;
      if (!Array.isArray(tags)) return false;
      return tags.some(tag => {
        // Les tags peuvent être des chaînes ou des objets { name }
        const tagName = typeof tag === 'string' ? tag : (tag?.name as string | undefined) ?? '';
        return compareString(tagName, op, value);
      });
    }
    case 'comment': {
      const comment = (node.data?.comment as string | undefined) ?? '';
      return compareString(comment, op, value);
    }
    case 'prop': {
      const [key, expected] = value.split('=');
      if (!key) return false;
      const actual = node.data?.[key];
      if (expected === undefined) return actual !== undefined && actual !== null && actual !== '';
      return compareString(String(actual ?? ''), op === '~' ? '~' : ':', expected);
    }
  }
  return false;
}

/** Liste des champs valides, pour le message d'erreur. */
const VALID_FIELDS = Object.keys(FIELD_ALIASES).join(', ');

function collectUnknownField(ast: Ast): string | null {
  switch (ast.kind) {
    case 'term':
      if (ast.field && !FIELD_ALIASES[normalize(ast.field)]) return ast.field;
      return null;
    case 'not':
      return collectUnknownField(ast.child);
    case 'and':
    case 'or':
      return collectUnknownField(ast.left) ?? collectUnknownField(ast.right);
  }
}

function evaluate(ast: Ast, node: Node): boolean {
  switch (ast.kind) {
    case 'and':
      return evaluate(ast.left, node) && evaluate(ast.right, node);
    case 'or':
      return evaluate(ast.left, node) || evaluate(ast.right, node);
    case 'not':
      return !evaluate(ast.child, node);
    case 'term':
      return evaluateTerm(node, ast.field, ast.op, ast.value);
  }
}

/**
 * Analyse une requête DSL et retourne un prédicat de correspondance,
 * ou une erreur lisible destinée à l'utilisateur.
 */
export function parseFilterQuery(query: string): ParseResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: true, matches: () => true };
  }

  const tokens = tokenize(trimmed);
  if ('error' in tokens) return { ok: false, error: tokens.error };

  const ast = parseTokens(tokens);
  if ('error' in ast) return { ok: false, error: ast.error };

  const unknownField = collectUnknownField(ast);
  if (unknownField) {
    return {
      ok: false,
      error: `Champ inconnu « ${unknownField} ». Champs valides : ${VALID_FIELDS}`,
    };
  }

  return { ok: true, matches: (node: Node) => evaluate(ast, node) };
}
