# 01_processed_files — Sources prises en charge

**Page associée :** [01_processed_files](../pages/01_processed_files.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/01_processed_files/`.
**État :** spécification cible ; écran provisoire sans archivage fonctionnel.

## Objectif et provenance

**Décision utilisateur :** ce dossier est un ajout au parcours du PDF. Il contient
les fichiers de `01_upload_raw_files` traités, déplacés après leur prise en charge
initiale et l'enregistrement des résultats associés, sans attendre la validation
métier ni la publication AI Ready.

Le [PDF, pages 1–3](Poc_n8n.pdf#page=1), décrit le dépôt initial et la publication,
mais ne prescrit pas ce dossier. Les archives de versions de connaissances
mentionnées pages 2–3 ont une autre finalité.

## Entrées

- Source Word issue de [01_upload_raw_files](01_upload_raw_files.md).
- Preuve de sa prise en charge initiale et résultats associés enregistrés.

Une source simplement déposée ne remplit pas ces conditions. La nature exacte
des résultats initiaux doit encore être définie avec le premier workflow.

## Traitements et sorties

**Décision utilisateur :** archiver la source prise en charge pendant que les
contrôles, la validation et la publication suivent leur propre parcours.

**Proposition INNO/interface :** conserver la possibilité de retrouver cette
source depuis ses résultats et le [journal](10_tracking_journal.md), sans dépendre
de sa présence dans le dossier d'arrivée. Tracer le déplacement et son résultat.

Sortie attendue : source archivée et accessible pour la suite du traitement.
La présence dans ce dossier ne signifie ni « conforme », ni « validé », ni
`published`. Un blocage ou un refus peut encore survenir.

Ce dossier n'est ni [07_knowledges](07_knowledges.md), qui reçoit le Word validé,
ni un emplacement décidé pour les versions précédentes de cette connaissance.

## Interactions humaines et interface prévues

**Proposition INNO/interface :** consultation des sources prises en charge,
date de prise en charge, résultats disponibles et navigation vers leur parcours.
Ne pas proposer de validation métier implicite depuis cette liste.

## Critères de vérification

- La source rejoint l'archive après la prise en charge initiale, même si la
  décision métier est encore en attente.
- Les résultats restent reliés à la source après son déplacement.
- Une source dont le parcours devient bloquant ne prend pas un statut validé du
  seul fait de son archivage.
- L'archive des sources reste distincte de la gestion des versions publiées.

## Points à définir

Condition technique de fin de prise en charge ; opération de déplacement et
gestion de son échec ; résolution des liens après déplacement ; doublons,
versions sources et reprise ; durée de conservation et droits d'accès.

[Vue d'ensemble](README.md) · [Dépôt initial](01_upload_raw_files.md) · [Journal](10_tracking_journal.md)
