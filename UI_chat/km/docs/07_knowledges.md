# 07_knowledges — Connaissance validée

**Page associée :** [07_knowledges](../pages/07_knowledges.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/07_knowledges/`.
**État :** spécification cible ; écran provisoire sans publication fonctionnelle.

## Objectif et provenance

**PDF :** publier le Word validé dans le bon dossier, archiver les versions
précédentes et passer au statut `published`
([pages 2–3](Poc_n8n.pdf#page=2)). Le socle prévoit une bibliothèque Connaissance
validée et un espace Archives/versions sur SharePoint (page 2).

**Décision de cadrage utilisateur :** représenter ce stockage dans les dossiers
du POC EC2 ; ne pas supposer que SharePoint est accessible depuis INNO.

## Entrées

- Word ayant reçu une [approbation métier](06_business_validation.md).
- Métadonnées approuvées et décision rattachées à cette version.
- Versions précédentes éventuelles et règles de classement à fournir.

## Traitements et sorties

**PDF :** copier le Word validé dans l'emplacement de connaissance validée,
archiver les versions antérieures et mettre à jour le statut `published`.
Le Word publié alimente ensuite la [conversion Markdown](08_markdown.md).

**Proposition INNO/interface :** conserver les liens entre le Word publié, ses
métadonnées et sa décision d'approbation, puis enregistrer la publication et les
opérations de versionnement dans le [journal](10_tracking_journal.md).

Le code `published` concerne ici la publication de la connaissance Word. Il ne
prouve pas que la conversion Markdown ou la publication AI Ready a abouti.

L'archive des versions précédentes doit recevoir un emplacement et une règle
propres, encore à définir. Elle ne doit pas être assimilée au dossier
[01b_processed_files](01b_processed_files.md), qui archive les sources prises en
charge, avant même leur validation.

## Interactions humaines et interface prévues

**PDF :** la publication suit l'approbation métier ; aucune deuxième approbation
n'est décrite à cette étape.

**Proposition INNO/interface :** liste des connaissances publiées, consultation
du Word et des métadonnées approuvées, accès à la décision, à l'historique des
versions et à l'avancement de conversion. La présence d'une action manuelle de
publication ou de relance reste à arbitrer.

## Critères de vérification

- Le document publié correspond à la version approuvée, avec ses métadonnées.
- La version refusée n'est pas publiée.
- Le remplacement par une nouvelle version approuvée conserve l'historique prévu.
- Les états de publication du Word et d'export AI Ready restent distinguables.

## Points à définir

Règles de classement et nommage ; emplacement des archives de versions ; liens
entre versions et `doc_id` ; déclenchement de publication ; traitement des échecs
de copie ou d'archivage ; conservation et accès aux versions précédentes.

[Vue d'ensemble](README.md) · [Validation métier](06_business_validation.md) · [Markdown](08_markdown.md)
