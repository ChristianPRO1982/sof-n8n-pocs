# 01b_processed_files — Sources prises en charge

**Page associée :** [01b_processed_files](../pages/01b_processed_files.html).
**Dossiers gérés :** `01_processed_files/` et `01_legacy_processed_files/`.
**État :** interface de gestion développée ; archivage et rejeu métier portés par n8n.
Le statut déclaratif courant est défini dans `statuses.json`.

## Objectif et provenance

**Décision utilisateur :** ce dossier est un ajout au parcours du PDF. Il contient
les fichiers de `01a_upload_files` traités, déplacés après leur prise en charge
initiale et l'enregistrement des résultats associés, sans attendre la validation
métier ni la publication AI Ready.

Le [PDF, pages 1–3](Poc_n8n.pdf#page=1), décrit le dépôt initial et la publication,
mais ne prescrit pas ce dossier. Les archives de versions de connaissances
mentionnées pages 2–3 ont une autre finalité.

## Entrées

- Source Word issue de [01a_upload_files](01a_upload_files.md).
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

[Vue d'ensemble](README.md) · [Dépôt initial](01a_upload_files.md) · [Journal](10_tracking_journal.md)

## Gestion de la liste et webhooks

La page reprend 00c : liste serveur, Actualiser, Voir, Rejouer, Supprimer,
sans upload. n8n scanne les deux dossiers et renvoie leur fusion en un seul GET.
Les lignes affichent nom, taille, icône locale et dossier ; le legacy est bleu clair.
Chaque identité `(folder, name)` doit être unique ; un même nom dans les deux
dossiers est accepté. Dossier obligatoire, limité aux deux valeurs ci-dessus.

Base commune `KM_WEBHOOK_BASE_URL` et clés dédiées, initialement vides :

```ini
KM_PROCESSED_FILES_LIST_WEBHOOK_PATH=
KM_PROCESSED_FILES_VIEW_WEBHOOK_PATH=
KM_PROCESSED_FILES_REPLAY_WEBHOOK_PATH=
KM_PROCESSED_FILES_DELETE_WEBHOOK_PATH=
```

Aucun repli vers les autres dépôts ; chaque clé absente désactive sa fonction.
Quatre bascules indépendantes list/view/replay/delete, OFF au chargement et au
retour par l’historique. Seule list recharge la liste. Après action, la lecture
suit le mode de list. Opérations concurrentes bloquées, délais de 30 s sans
relance automatique ; retours invalides signalés comme incertains.

| Action | Requête | Réponse attendue |
| --- | --- | --- |
| Liste | GET sans paramètres | `{"ok":true,"files":[{"folder":"01_processed_files","name":"document.pdf","size":1234,"revision":"opaque"}]}` |
| Voir | GET avec `folder` et `name` encodés | Fichier ouvert en nouvel onglet, `noopener,noreferrer` |
| Rejouer | POST JSON `{actualFolder,targetFolder,name,expected_revision}` | `{"ok":true,"name":"document.pdf"}` ; `folder` exact s’il est présent |
| Supprimer | POST JSON `{folder,name,expected_revision}` | `{"ok":true,"name":"document.pdf"}` ; dossier exact s’il est présent |

La réponse de liste accepte l’objet seul ou un tableau contenant exactement
cet objet. Taille entière en octets et révision non vide restent obligatoires.
Confirmer le rejeu avec le nom, le dossier actuel et la destination ; confirmer
la suppression avec le dossier et le nom. Le serveur doit contrôler le
dossier autorisé et la révision dans ce dossier avant l’opération. Une confirmation
de rejeu annonce uniquement la prise en compte ; aucun retrait local. La liste
est rechargée après chaque tentative d’action. La suppression ne retire
localement que l’identité confirmée, même en présence d’un homonyme.

Pour Rejouer uniquement, `folder` est remplacé par `actualFolder` et `targetFolder` :

| actualFolder | targetFolder |
| --- | --- |
| `01_processed_files` | `01_upload_raw_files` |
| `01_legacy_processed_files` | `01_upload_legacy_files` |

Le navigateur applique cette correspondance fixe ; n8n valide les dossiers et
réalise le traitement. La confirmation reste `ok:true`, nom exact et contrôle du
champ `folder` s’il est fourni. Le rejeu 00c conserve son contrat existant.
 Aucun Autocut en
deux étapes, déplacement, stockage ou workflow n’est créé par cette interface.
La recette locale utilise `tests/processed-legacy-browser.mjs` avec l’argument
`01b_processed_files` et des réponses n8n simulées uniquement.
