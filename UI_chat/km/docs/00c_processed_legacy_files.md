# 00c_processed_legacy_files — Fichiers historiques traités

**Page associée :** [00c_processed_legacy_files](../pages/00c_processed_legacy_files.html).
**État :** page descriptive du fonctionnement cible, statut `not_started` ;
aucune consultation de données ni opération d’archivage implémentée.
**Stockage :** à définir ; aucun dossier métier créé ni supposé existant sur EC2.

## Objectif et provenance

**Décision utilisateur :** retrouver les sources historiques après leur
préparation réussie, avec des liens vers les nouveaux documents produits selon
les templates. L’identifiant utilise `legacy`, comme le dépôt historique.
Cette archive appartient à une extension du parcours Word relu du PDF.

## Entrées et condition d’archivage cible

La source provient du [dépôt historique](00b_upload_legacy_files.md).
Elle ne peut rejoindre l’archive que lorsque les trois conditions sont réunies :

- La préparation et le découpage ont réussi.
- Les documents produits et leur traçabilité ont été enregistrés.
- Tous les documents produits ont été transférés avec succès dans l’entrée
  standard [01a_upload_files](01a_upload_files.md).

Un dépôt seul, un traitement interrompu ou un transfert partiel ne suffisent
pas : conserver la source en attente et tracer le résultat. Le futur workflow
n8n devra sécuriser les reprises et le déplacement ; cette page ne les réalise pas.

## Consultation prévue

Présenter la source archivée, les résultats de préparation et les liens vers
chaque document dérivé, les passages sources utilisés et les templates employés
avec leurs versions. Relier ces éléments au [journal](10_tracking_journal.md).
Les identifiants, formats de données et modalités d’accès restent à définir.

Les dérivés suivent ensuite les contrôles et validations habituels. L’archivage
de l’historique ne certifie ni leur conformité, ni leur validation métier, ni
leur publication. Cette archive est distincte des
[sources standard prises en charge](01b_processed_files.md) et des archives de
versions des [connaissances publiées](07_knowledges.md).

## Livraison actuelle et recette cible

L’écran explique ce parcours et propose des liens vers les dépôts historique
et standard. Il n’affiche aucune source fictive, ne lit aucune donnée métier et
ne propose aucune action de traitement ou d’approbation.

La recette future vérifiera la correspondance d’une source avec plusieurs
dérivés, la conservation de la traçabilité après archivage et l’absence
d’archivage en cas d’échec ou de transfert partiel. Un refus métier ultérieur
d’un dérivé doit rester distinct de la réussite de préparation de l’historique.

## Points à définir

Emplacement de l’archive ; déplacement et gestion de ses échecs ; identifiants et
liens persistants ; consultation des fichiers ; reprises et doublons ; droits,
conservation et format des événements du journal. Aucun webhook supplémentaire
n’est créé pour cette page descriptive.

[Vue d’ensemble](README.md) · [Dépôt historique](00b_upload_legacy_files.md) · [Journal](10_tracking_journal.md)
