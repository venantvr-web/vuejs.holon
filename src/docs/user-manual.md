# Bienvenue dans Holon

Holon est un outil de modélisation d'architecture d'entreprise inspiré d'Archimate, pensé « local-first » : tout est stocké dans votre navigateur (IndexedDB), rien ne quitte votre poste.

## Premiers pas

- Glissez un élément (« Container » ou « Box ») depuis la **Bibliothèque** vers le canevas.
- Double-cliquez sur le label d'un nœud pour le renommer.
- Imbriquez des nœuds en les déposant dans un conteneur : la hiérarchie est préservée.

## Navigation

- **Molette** : zoom (centré sur le curseur)
- **Glisser le fond** ou **clic milieu** : déplacement du canevas
- **Maj + glisser** : sélection rectangle
- **Ctrl+F** : recherche globale

# Construire le modèle

## Nœuds et conteneurs

Chaque nœud peut recevoir un **type Archimate** (chip en bas du nœud sélectionné) : la couleur de la couche (Business, Application, Technology…) s'applique automatiquement. Les conteneurs peuvent être repliés (bouton « − » au survol) et s'ajustent automatiquement à leurs enfants (autosize).

## Relations

- Survolez un nœud et utilisez la poignée de connexion pour relier deux éléments.
- Le type de relation Archimate (composition, serving, flow…) se choisit dans l'inspecteur de droite, avec les marqueurs normalisés.
- Double-cliquez sur une arête pour la nommer.

## Organisation

- **Ctrl+G** : grouper la sélection (halo coloré nommé)
- **Layout** : mise en page automatique (hiérarchique, force, grille…)
- **Aligner** : alignement et distribution de la sélection

# Filtrer le diagramme

Le bouton **Filtre** de la barre d'outils ouvre le panneau de filtrage par requête. Idéal pour produire des vues ciblées (ex. présentation sans la couche technique).

## Syntaxe des requêtes

- `paiement` — le nom contient « paiement » (casse et accents ignorés)
- `couche:business` — par couche Archimate (`métier`, `application`, `technology`/`infra`…)
- `archi:business-actor` — par type Archimate précis
- `type:container` / `type:forme` — par nature de nœud
- `tag:critique`, `prop:owner=DSI`, `commentaire:2027`
- Combinez avec `et`, `ou`, `non` et des parenthèses ; `*` comme joker (`nom:pay*`), `=` pour l'égalité stricte, `~` pour une expression régulière.

## Modes

- **Conservés / Écartés** : la requête désigne ce qui reste visible, ou au contraire ce qui est retiré.
- **Estomper / Masquer** : les éléments écartés sont grisés ou totalement retirés du rendu (arêtes comprises).
- Sauvegardez vos requêtes fréquentes : elles sont conservées d'une session à l'autre.

# Partager et fiabiliser

## Export et import

Le menu **Exporter** produit du PNG (96 à 300 DPI), du SVG, du PDF et du JSON versionné. **Importer** accepte le JSON Holon et l'Archimate Open Exchange (XML), avec validation et gestion des conflits d'identifiants.

## Versions et vues

- **Versions** : instantanés nommés du modèle, restaurables à tout moment.
- **Vues** : combinaisons sauvegardées de zoom et de position pour retrouver un cadrage précis.

## Validation et suggestions

- **Valider** vérifie la conformité Archimate (relations permises, cycles de composition, nœuds orphelins…).
- **Suggérer** propose des connexions plausibles et des améliorations de structure.

# Raccourcis essentiels

## Édition

- **Ctrl+Z / Ctrl+Maj+Z** : annuler / rétablir
- **Ctrl+C / X / V** : copier / couper / coller
- **Ctrl+D** : dupliquer
- **Suppr** : supprimer la sélection

## Affichage

- **Ctrl+F** : rechercher
- **F1** : aide raccourcis
- **Échap** : annuler l'action en cours / désélectionner

Le thème clair/sombre se règle via l'icône soleil/lune, la langue via le sélecteur de la barre d'outils.
