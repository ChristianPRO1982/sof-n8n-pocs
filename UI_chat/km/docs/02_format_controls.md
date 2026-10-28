# 02_format_controls — Contrôles de format et template

**Page associée :** [02_format_controls](../pages/02_format_controls.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/02_format_controls/`.
**État :** spécification cible ; écran provisoire sans contrôles fonctionnels.

## Objectif et provenance

**PDF :** AUTO 1 impose des contrôles déterministes **sans LLM** sur les styles,
sections obligatoires, tableaux et acronymes, avec un rapport JSON et une
reproductibilité garantie ([page 2](Poc_n8n.pdf#page=2)). La préparation du YAML
des règles y est attribuée à Yasmine ; le YAML n'est pas fourni dans le PDF.

## Entrées

- Word relu pris en charge depuis le [dépôt](01a_upload_files.md), avec accès
  à sa source même si elle a rejoint [l'archive](01b_processed_files.md).
- Template et règles de contrôle YAML à fournir. La page
  [00a_templates](00a_templates.md) permet de préparer leur dépôt via des webhooks
  dédiés ; leur utilisation par les contrôles reste à définir.
- Éventuels glossaire et référentiels requis par les règles ; leur contenu n'est
  pas spécifié, même si ces listes sont prévues dans le socle du PDF.

## Traitements et sorties

**PDF :** vérifier les éléments structurels par des règles explicites, produire
le rapport JSON et obtenir OK pour le document 1, KO pour le document 2.

Les résultats alimentent le [rapport consolidé](04_reports.md), avec les résultats
de la [vérification des écarts](03_deltas.md). Les conditions de poursuite ou
d'arrêt avant la recherche d'écarts en cas de KO ne sont pas fixées par le PDF.

**Proposition INNO/interface :** rattacher chaque constat à sa règle et à un
emplacement du document, et identifier la version des règles utilisée pour
expliquer le résultat. Ces champs ne constituent pas un schéma JSON arrêté.

## Interactions humaines et interface prévues

**PDF :** un blocage consolidé doit retourner au rédacteur pour correction.

**Proposition INNO/interface :** vue des contrôles, résultats OK/KO, motifs et
localisation des problèmes ; consultation du rapport JSON. Le choix des règles
ne doit pas être remplacé par une évaluation opaque du LLM.

## Critères de vérification

- Document conforme : résultat OK ; document non conforme : résultat KO.
- À document, règles et configuration identiques, les résultats sont reproductibles.
- Aucun appel LLM ne décide de la conformité de format/template.
- Les constats sont disponibles pour le rapport et la correction peut être
  contrôlée de nouveau selon les mêmes règles.

## Points à définir

Template, YAML et versionnement ; règles précises pour styles, tableaux et
acronymes ; parser Word ; structure du rapport JSON ; classification des
anomalies et critère de blocage ; comportement face à un Word illisible ;
conditions de poursuite de la chaîne et interface de consultation.

[Vue d'ensemble](README.md) · [Écarts](03_deltas.md) · [Rapport](04_reports.md)
