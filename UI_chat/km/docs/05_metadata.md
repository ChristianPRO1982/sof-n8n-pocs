# 05_metadata — Proposition des métadonnées

**Page associée :** [05_metadata](../pages/05_metadata.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/05_metadata/`.
**État :** spécification cible ; écran provisoire sans génération fonctionnelle.

## Objectif et provenance

**PDF :** le prérequis « Schéma des métadonnées » et AUTO 2 décrivent les champs,
la répartition entre règles et LLM et le contrôle par JSON Schema
([page 2](Poc_n8n.pdf#page=2)). Yasmine y est désignée pour le schéma, le format
AI Ready et la règle `doc_id`. Ces livrables ne sont pas inclus dans le PDF.

## Entrées

- Word relu pris en charge, contenu accessible et
  [rapport consolidé](04_reports.md) permettant la poursuite du parcours.
- Référentiels et règles pour les valeurs déterministes.
- JSON Schema, vocabulaires et règle d'identification à fournir.
- Accès LLM autorisé ; OpenAI est le fournisseur initial envisagé pour INNO.

## Champs et répartition des traitements

Les libellés ci-dessous reprennent les douze champs du prérequis du PDF. Leurs
types, contraintes et clés JSON définitives ne sont pas encore spécifiés.

| Champ cité dans le PDF | Production prévue ou limite de spécification |
| --- | --- |
| `domain` | Par règles, selon AUTO 2 ; référentiel attendu |
| `doc_type` | Par règles ; typologie attendue |
| `audience` | Proposition par LLM, à valider par le métier |
| `summary` | Proposition de résumé par LLM, à valider par le métier |
| `scope_notes` | Proposition par LLM, à valider par le métier |
| mots-clés | Proposition par LLM ; nom de clé JSON et vocabulaire à fixer |
| processus concerné | Proposition par LLM, appelée « processus » dans AUTO 2 ; clé JSON et référentiel à fixer |
| `owner` | Champ attendu ; mode d'attribution et référentiel non précisés |
| `version` | Par règles ; convention de versionnement attendue |
| `last_updated` | Champ attendu ; AUTO 2 prévoit des « dates » par règles, sans préciser le calcul de ce champ |
| `status` | Champ attendu, lié aux décisions et à la publication décrites dans le PDF ; codification et transitions complètes à définir |
| `doc_id` | Par règles ; construction, unicité et stabilité à définir |

La validation métier doit pouvoir porter sur les valeurs proposées, sans
assimiler une sortie JSON valide à une proposition métier correcte. Les statuts
documentaires n'ont aucun lien avec le champ `status` des pastilles du menu.

## Traitements et sorties

**PDF :** produire `domain`, `doc_type`, `doc_id`, dates et version par règles ;
proposer `summary`, mots-clés, `audience`, processus et `scope_notes` par LLM ;
contrôler le résultat via JSON Schema. Le prérequis LLM demande une sortie JSON
conforme (page 1).

Sortie attendue : proposition structurée de métadonnées, résultat du contrôle de
schéma et éléments présentables à la [validation métier](06_business_validation.md).
Les métadonnées validées doivent ensuite accompagner la version publiée jusqu'au
couple [AI Ready](09_ai_ready.md).

**Proposition INNO/interface :** afficher pour chaque champ sa valeur et sa
provenance (règle, LLM ou intervention humaine), les erreurs de schéma et le lien
vers le document. Conserver les propositions et décisions dans le
[journal](10_tracking_journal.md). Le détail des données conservées reste à fixer.

## Interactions humaines et interface prévues

**PDF :** approbation métier ou refus des métadonnées ; le refus est un cas
complémentaire de recette ([page 3](Poc_n8n.pdf#page=3)).

**Proposition INNO/interface :** vue des champs et de leur provenance, accès au
JSON et à son contrôle, puis présentation au validateur. L'édition directe et
la régénération éventuelle des champs sont des possibilités à arbitrer ; aucune
action de ce type n'est implémentée ou imposée par le PDF.

## Critères de vérification

- Les douze champs attendus sont couverts par le futur schéma ; ne pas inventer
  leur caractère obligatoire avant sa livraison.
- Les champs déterministes restent produits par règles, ceux du LLM sont
  identifiables comme propositions et soumis à la revue humaine.
- La conformité JSON Schema est vérifiable et les défauts sont visibles avant
  toute présentation du résultat comme conforme.
- Le refus est tracé, renvoie le document en `draft` et ne publie pas la version
  refusée ; une révision doit permettre une nouvelle présentation.
- Les métadonnées publiées correspondent à la décision humaine et au document
  retenu, et ne sont pas remplacées silencieusement par une nouvelle génération.

## Points à définir

JSON Schema définitif ; types, champs obligatoires et vocabulaires ; clés JSON
des mots-clés et du processus ; règle `doc_id` ; attribution de `owner` ; dates et
versions ; codification de `status` ; prompt et modèle ; stratégie d'erreur ou de
reprise LLM ; droits d'édition et périmètre exact de la validation humaine.

[Vue d'ensemble](README.md) · [Rapport](04_reports.md) · [Validation métier](06_business_validation.md)
