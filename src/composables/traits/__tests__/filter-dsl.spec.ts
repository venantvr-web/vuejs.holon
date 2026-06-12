// src/composables/traits/__tests__/filter-dsl.spec.ts
import { describe, it, expect } from 'vitest'
import { parseFilterQuery, layerOfNode } from '../utils/filter-dsl'
import type { Node } from '../../../types'

function makeNode(data: Record<string, unknown>, type: 'container' | 'shape' = 'shape'): Node {
  return {
    id: 'n1',
    parentId: null,
    type,
    geometry: { x: 0, y: 0, w: 100, h: 60 },
    styling: { fill: '#fff', stroke: '#333', strokeWidth: 1, opacity: 1 },
    data,
  }
}

function matches(query: string, node: Node): boolean {
  const result = parseFilterQuery(query)
  if (!result.ok) throw new Error(`Requête invalide : ${result.error}`)
  return result.matches(node)
}

describe('parseFilterQuery — termes simples', () => {
  it('correspond sur le nom avec un terme nu (contient, insensible à la casse)', () => {
    const node = makeNode({ name: 'Service de Paiement' })
    expect(matches('paiement', node)).toBe(true)
    expect(matches('PAIEMENT', node)).toBe(true)
    expect(matches('facturation', node)).toBe(false)
  })

  it('est insensible aux accents', () => {
    const node = makeNode({ name: 'Référentiel Métier' })
    expect(matches('referentiel', node)).toBe(true)
    expect(matches('métier', node)).toBe(true)
  })

  it('supporte les chaînes entre guillemets', () => {
    const node = makeNode({ name: 'Plan de paie' })
    expect(matches('"plan de paie"', node)).toBe(true)
    expect(matches("nom:'plan de'", node)).toBe(true)
  })

  it('supporte les jokers *', () => {
    const node = makeNode({ name: 'Payroll Engine' })
    expect(matches('nom:pay*', node)).toBe(true)
    expect(matches('nom:*engine', node)).toBe(true)
    expect(matches('nom:bill*', node)).toBe(false)
  })

  it('supporte l’égalité stricte avec =', () => {
    const node = makeNode({ name: 'CRM' })
    expect(matches('nom=crm', node)).toBe(true)
    expect(matches('nom=cr', node)).toBe(false)
  })

  it('supporte les expressions régulières avec ~', () => {
    const node = makeNode({ name: 'API Gateway v2' })
    expect(matches('nom~v[0-9]+$', node)).toBe(true)
    expect(matches('nom~^gateway', node)).toBe(false)
  })
})

describe('parseFilterQuery — champs', () => {
  it('filtre par type de noeud avec synonymes FR', () => {
    const container = makeNode({ name: 'Domaine' }, 'container')
    expect(matches('type:container', container)).toBe(true)
    expect(matches('type:conteneur', container)).toBe(true)
    expect(matches('type:forme', container)).toBe(false)
  })

  it('filtre par couche dérivée du type Archimate', () => {
    const node = makeNode({ name: 'Facturation', archimateType: 'business-process' })
    expect(matches('couche:business', node)).toBe(true)
    expect(matches('couche:métier', node)).toBe(true)
    expect(matches('layer:application', node)).toBe(false)
  })

  it('reconnaît les synonymes infra/technique pour la couche technology', () => {
    const node = makeNode({ name: 'Serveur', archimateType: 'technology-node' })
    expect(matches('couche:infra', node)).toBe(true)
    expect(matches('couche:technique', node)).toBe(true)
    expect(matches('domaine:technology', node)).toBe(true)
  })

  it('filtre par type Archimate complet', () => {
    const node = makeNode({ name: 'Client', archimateType: 'business-actor' })
    expect(matches('archi:business-actor', node)).toBe(true)
    expect(matches('archi:actor', node)).toBe(true)
    expect(matches('archi:application', node)).toBe(false)
  })

  it('filtre par tag (chaînes et objets { name })', () => {
    const stringTags = makeNode({ name: 'A', tags: ['critique', 'legacy'] })
    const objectTags = makeNode({ name: 'B', tags: [{ name: 'critique', color: '#f00' }] })
    expect(matches('tag:critique', stringTags)).toBe(true)
    expect(matches('tag:critique', objectTags)).toBe(true)
    expect(matches('tag:nouveau', stringTags)).toBe(false)
  })

  it('filtre par propriété avec prop:clé=valeur et existence prop:clé', () => {
    const node = makeNode({ name: 'A', owner: 'DSI', criticality: 'high' })
    expect(matches('prop:owner=dsi', node)).toBe(true)
    expect(matches('prop:owner', node)).toBe(true)
    expect(matches('prop:missing', node)).toBe(false)
    expect(matches('prop:criticality=low', node)).toBe(false)
  })

  it('filtre par commentaire', () => {
    const node = makeNode({ name: 'A', comment: 'À décommissionner en 2027' })
    expect(matches('commentaire:décommissionner', node)).toBe(true)
    expect(matches('comment:2027', node)).toBe(true)
  })
})

describe('parseFilterQuery — opérateurs booléens', () => {
  const node = makeNode({
    name: 'Moteur de paie',
    archimateType: 'application-component',
    tags: ['critique'],
  })

  it('combine avec ET (explicite et implicite)', () => {
    expect(matches('paie et couche:application', node)).toBe(true)
    expect(matches('paie couche:application', node)).toBe(true)
    expect(matches('paie and couche:business', node)).toBe(false)
  })

  it('combine avec OU', () => {
    expect(matches('couche:business ou tag:critique', node)).toBe(true)
    expect(matches('couche:business or couche:technology', node)).toBe(false)
  })

  it('supporte la négation non/not/!/-', () => {
    expect(matches('non couche:business', node)).toBe(true)
    expect(matches('not tag:critique', node)).toBe(false)
    expect(matches('!couche:technology', node)).toBe(true)
    expect(matches('-tag:critique', node)).toBe(false)
  })

  it('respecte les parenthèses et la précédence (ET > OU)', () => {
    // Sans parenthèses : a ou (b et c)
    expect(matches('couche:business ou tag:critique et paie', node)).toBe(true)
    // Avec parenthèses : (a ou b) et c
    expect(matches('(couche:business ou tag:critique) et facturation', node)).toBe(false)
  })
})

describe('parseFilterQuery — erreurs', () => {
  it('signale un champ inconnu', () => {
    const result = parseFilterQuery('foo:bar')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('foo')
  })

  it('signale un guillemet non fermé', () => {
    const result = parseFilterQuery('nom:"sans fin')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Guillemet')
  })

  it('signale une parenthèse manquante', () => {
    const result = parseFilterQuery('(a ou b')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Parenthèse')
  })

  it('signale une valeur manquante', () => {
    const result = parseFilterQuery('nom:')
    expect(result.ok).toBe(false)
  })

  it('signale une expression incomplète', () => {
    const result = parseFilterQuery('a et')
    expect(result.ok).toBe(false)
  })

  it('accepte la requête vide (aucun filtre)', () => {
    const result = parseFilterQuery('   ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.matches(makeNode({ name: 'x' }))).toBe(true)
  })
})

describe('layerOfNode', () => {
  it('dérive la couche du préfixe du type Archimate', () => {
    expect(layerOfNode(makeNode({ archimateType: 'business-actor' }))).toBe('business')
    expect(layerOfNode(makeNode({ archimateType: 'technology-node' }))).toBe('technology')
  })

  it('retombe sur data.layer puis null', () => {
    expect(layerOfNode(makeNode({ layer: 'application' }))).toBe('application')
    expect(layerOfNode(makeNode({}))).toBe(null)
  })
})
