# Prompt : générer un modèle Archimate Holon depuis une base de code

Copiez le prompt ci-dessous dans un agent de code (Claude Code, etc.) lancé à la racine de la solution à cartographier. Il produit un fichier JSON directement importable dans Holon via **Importer → JSON**.

---

## Prompt à copier

Tu es un architecte d'entreprise. Parcours cette solution logicielle et produis une cartographie de type Archimate au format JSON Holon, destinée à être présentée à un comité de direction (COMEX) : privilégie la lisibilité et les regroupements métier aux détails techniques exhaustifs.

### Étape 1 — Analyse de la solution

Explore le dépôt pour identifier :

1. **Domaines fonctionnels** : modules métier, bounded contexts, dossiers de premier niveau significatifs (facturation, paiement, catalogue, identité…).
2. **Composants applicatifs** : applications, services, API, frontaux, jobs/batchs, et leurs frontières (un service = un déployable, en général).
3. **Services applicatifs exposés** : endpoints REST/GraphQL/files de messages, regroupés par capacité (« Service de paiement », pas une boîte par endpoint).
4. **Données** : bases, schémas principaux, objets métier centraux.
5. **Infrastructure** : conteneurs Docker, orchestrateurs, bases, files, caches, services cloud (cherche docker-compose, Kubernetes, Terraform, CI/CD).
6. **Dépendances** : qui appelle qui (imports inter-modules, URLs d'API, topics de message), qui lit/écrit quelles données, qui est déployé sur quoi.

### Étape 2 — Modélisation

Construis une hiérarchie à 3 niveaux maximum :

- Un **conteneur racine par domaine fonctionnel** (`archimateType: business-function`).
- Dans chaque domaine, des **composants applicatifs** (`application-component`) et leurs **services** (`application-service`) ; les objets de données centraux en `application-data-object`.
- Un **conteneur racine « Infrastructure »** avec les nœuds techniques (`technology-node`, `technology-system-software`, `technology-artifact`).

Relations (edges) à créer :

- `serving` : un service applicatif sert un autre composant ou un acteur.
- `flow` : flux de données/messages entre composants.
- `access` : composant → objet de données.
- `assignment` : nœud d'infrastructure → composant qu'il héberge.

Renseigne `data.tags` avec des étiquettes utiles au filtrage (`critique`, `legacy`, `externe`…) et `data.comment` avec une phrase de description par élément. Ajoute `data.props` utiles : `owner`, `techno`, `repo`.

### Étape 3 — Format de sortie

Produis un unique fichier `archimate-holon.json` conforme à ce schéma (validation Zod stricte à l'import) :

```json
{
  "version": "1.0",
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "metadata": { "source": "nom-du-depot", "generator": "agent" },
  "nodes": [
    {
      "id": "dom-paiement",
      "parentId": null,
      "type": "container",
      "geometry": { "x": 100, "y": 100, "w": 520, "h": 380 },
      "styling": { "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1, "opacity": 1 },
      "data": {
        "name": "Domaine Paiement",
        "archimateType": "business-function",
        "comment": "Encaissement et remboursements",
        "tags": ["critique"],
        "owner": "Équipe Paiement"
      }
    },
    {
      "id": "app-payment-api",
      "parentId": "dom-paiement",
      "type": "container",
      "geometry": { "x": 24, "y": 48, "w": 220, "h": 120 },
      "styling": { "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1, "opacity": 1 },
      "data": {
        "name": "Payment API",
        "archimateType": "application-component",
        "comment": "Spring Boot, REST"
      }
    }
  ],
  "edges": [
    {
      "id": "e-payment-sert-checkout",
      "sourceId": "app-payment-api",
      "targetId": "app-checkout-front",
      "routing": "orthogonal",
      "data": { "name": "sert", "relationType": "serving" }
    }
  ]
}
```

Contraintes impératives :

- **IDs** : uniques, lisibles, kebab-case, préfixés (`dom-`, `app-`, `svc-`, `data-`, `infra-`, `e-`).
- **Géométrie** : coordonnées des enfants **relatives à leur parent** ; prévois ~40 px de marge en haut des conteneurs pour le titre ; dimensionne les conteneurs pour englober leurs enfants sans chevauchement ; espace les domaines racines d'au moins 80 px.
- **type** : `container` pour tout élément ayant des enfants ; `shape` sinon. `parentId: null` pour les racines.
- **archimateType** : uniquement des valeurs de la nomenclature `couche-element` en minuscules (ex. `business-actor`, `business-process`, `application-component`, `application-service`, `application-data-object`, `technology-node`, `technology-system-software`, `technology-artifact`, `motivation-goal`, `strategy-capability`).
- **styling** : laisse `fill: "#ffffff"` (Holon applique la couleur de couche Archimate automatiquement) ; ne mets pas `customFill`.
- **Volumétrie cible** : 30 à 80 nœuds. Regroupe plutôt que d'énumérer ; ce diagramme doit rester lisible par un dirigeant en une minute.
- Chaque edge référence des `sourceId`/`targetId` existants ; pas de relation dupliquée dans le même sens.

### Étape 4 — Auto-vérification

Avant de livrer, vérifie : JSON parsable ; tous les `parentId` existent ; aucun cycle de composition ; aucune géométrie négative (`w`/`h` > 0) ; chaque nœud a `data.name` et `data.archimateType` ; les enfants tiennent dans leur parent. Termine par un court résumé : nombre de domaines, composants, relations, et les choix de regroupement effectués.

---

## Après génération

1. Dans Holon : **Importer → JSON**, stratégie « append » (ou « replace » pour repartir de zéro).
2. Ajustez la mise en page si besoin (**Layout → Hiérarchique**, puis ajustements manuels).
3. Pour une vue COMEX : ouvrez **Filtre** et appliquez par exemple `non couche:technology` (mode Masquer) pour ne montrer que le métier et l'applicatif, ou `tag:critique` (mode Estomper) pour mettre en avant les systèmes critiques.
