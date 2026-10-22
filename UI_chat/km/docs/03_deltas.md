# 03_deltas — Vérification des écarts

**Page associée :** [03_deltas](../pages/03_deltas.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/03_deltas/`.
**État :** spécification cible ; écran provisoire sans comparaison fonctionnelle.

## Objectif et provenance

**PDF :** AUTO 3 prévoit une comparaison du document avec une référence, une
extraction JSON par LLM et la détection des écarts de règles, étapes, seuils et
termes. L'écart du document 3 doit être détecté et expliqué
([page 3](Poc_n8n.pdf#page=3)). Le parcours de l'EPIC place cette vérification
avant le rapport consolidé et la proposition de métadonnées (page 1).

## Entrées

- Document pris en charge et disponible pour comparaison.
- Référence de comparaison à désigner ; ne pas supposer qu'il s'agit de la
  dernière version du même document.
- Configuration LLM autorisée et règles d'extraction à définir.

## Traitements et sorties

**PDF :** extraire les éléments comparables en JSON avec un LLM, comparer à la
référence et expliquer les écarts détectés. Transmettre les résultats au
[rapport consolidé](04_reports.md).

Le PDF ne fournit ni schéma de cette extraction ni méthode de comparaison. Le
JSON Schema des métadonnées ne doit pas être supposé applicable à cette extraction.

**Proposition INNO/interface :** présenter pour chaque écart le passage du
document, la référence correspondante, la catégorie et l'explication. Distinguer
le constat proposé par le LLM de son examen humain. Ne pas conclure à une absence
d'écart si la référence manque ou si l'extraction échoue.

## Interactions humaines et interface prévues

**PDF :** un écart demande une justification dans le rapport ; l'écart justifié
constitue l'un des scénarios de recette.

**Proposition INNO/interface :** consultation côte à côte des éléments comparés,
accès au résultat JSON et navigation vers la justification dans le rapport.
L'évaluation ou l'acceptation d'une justification reste à spécifier.

## Critères de vérification

- L'écart du jeu de test est détecté et expliqué, avec une référence identifiable.
- Les écarts alimentent le rapport sans être assimilés à des anomalies de format.
- Une justification ne fait pas disparaître l'historique du constat.
- Les faux écarts, la qualité des explications, le coût et la latence sont
  observables pour le bilan demandé page 4 du PDF.

## Points à définir

Références et versions ; schéma d'extraction JSON ; prompt et modèle ; méthode
de comparaison ; catégories et seuils de décision ; traitement des faux écarts,
des références indisponibles et des échecs LLM ; règle de reprise après correction.

[Vue d'ensemble](README.md) · [Contrôles](02_format_controls.md) · [Rapport](04_reports.md)
