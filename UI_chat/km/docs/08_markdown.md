# 08_markdown — Conversion Markdown

**Page associée :** [08_markdown](../pages/08_markdown.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/08_markdown/`.
**État :** spécification cible ; écran provisoire sans conversion fonctionnelle.

## Objectif et provenance

**PDF :** AUTO 4 vise une conversion Word vers Markdown **sans LLM**, avec
conservation des titres, listes et tableaux et contrôle de la structure générée
([page 3](Poc_n8n.pdf#page=3)). La mention « À voir » indique que la conversion
reste à éprouver ; aucun outil ni algorithme n'est fourni.

## Entrées

- Word publié dans [07_knowledges](07_knowledges.md).
- Métadonnées approuvées, dont l'identification à utiliser pour l'export.
- Règles de conversion et critères de contrôle de structure à définir.

## Traitements et sorties

**PDF :** convertir le Word sans réécriture par LLM, préserver sa structure
utile et contrôler le Markdown produit.

Sorties attendues : Markdown et résultat du contrôle de structure, destinés à
préparer la [publication AI Ready](09_ai_ready.md). Le nom final `{doc_id}.md`
est prescrit à l'étape AI Ready ; le nom des fichiers intermédiaires n'est pas
fixé par le PDF.

**Proposition INNO/interface :** rattacher le Markdown à la version Word publiée,
présenter les anomalies de conversion et tracer le résultat dans le
[journal](10_tracking_journal.md). Une conversion en erreur ne doit pas être
présentée comme un export AI Ready réussi.

Le découpage de documents, la réorganisation en connaissances atomiques et la
reformulation du texte ne sont pas décrits dans cet automate.

## Interactions humaines et interface prévues

**PDF :** un contrôle de structure est demandé, sans préciser s'il comporte une
revue manuelle supplémentaire.

**Proposition INNO/interface :** aperçu du Markdown, accès au Word source et
résultats du contrôle pour observer titres, listes et tableaux. Les actions de
relance ou de correction manuelle restent à décider, notamment leurs effets sur
la validation déjà obtenue.

## Critères de vérification

- La conversion n'appelle pas de LLM pour générer ou reformuler le Markdown.
- Les titres, listes et tableaux du jeu de test sont conservés selon des
  critères explicites à fournir.
- Le Markdown reste rattaché à la version approuvée puis publiée du Word.
- Un contrôle de structure est disponible avant de déclarer l'export conforme.

## Points à définir

Convertisseur et formats Word pris en charge ; dialecte Markdown ; règles de
conversion des tableaux et listes complexes ; traitement des images, liens et
éléments non décrits par le PDF ; contrôle de structure et seuil de blocage ;
nommage intermédiaire ; gestion d'erreur et reprise.

[Vue d'ensemble](README.md) · [Connaissance validée](07_knowledges.md) · [AI Ready](09_ai_ready.md)
