# 00c_processed_legacy_files — Fichiers historiques traités

**Page associée :** [00c_processed_legacy_files](../pages/00c_processed_legacy_files.html).
**État :** interface de gestion développée, statut `development` conservé ;
quatre webhooks propres à cet écran à raccorder.
**Stockage :** à définir ; aucun dossier métier créé ni supposé existant sur EC2.

## Objectif et provenance

**Décision utilisateur :** consulter les fichiers historiques traités, les ouvrir,
les supprimer ou demander leur rejeu. L’écran reprend le gabarit, les styles et
les icônes des dépôts [templates](00a_templates.md) et
[historiques](00b_upload_legacy_files.md), avec un seul panneau de liste et aucun
upload manuel. Le contrôleur `../assets/km-processed-legacy.js` réutilise le
module API `../assets/km-upload-api.js` et les styles `../assets/km-upload.css`.

Le parcours automatique de préparation reste une extension du parcours Word
relu du PDF. Cette interface fournit des appels serveur et leurs retours ; elle
n’implémente pas le découpage, la génération, le transfert ou l’archivage.

## Liste et actions

- Charger la liste à l’ouverture et proposer « Actualiser ». Distinguer
  chargement, liste vide et erreur. Une erreur conserve les entrées précédentes
  éventuelles en les signalant périmées et en désactivant leurs actions.
- Afficher nom, taille et icône locale selon la correspondance partagée, avec
  repli vers `file.png`, puis « Voir », « Rejouer » et « Supprimer ».
- « Voir » ouvre le fichier dans un nouvel onglet, sans confirmation, avec
  `noopener,noreferrer` et le nom encodé dans le paramètre `name`.
- Confirmer le rejeu et la suppression en affichant le nom concerné. Une
  annulation n’appelle aucun webhook. Le message de suivi garde le nom du fichier.
- Pendant une opération, bloquer les actions concurrentes, l’actualisation et
  les quatre bascules. Après l’opération, rendre le focus à « Actualiser ».
- Ne retirer un fichier sur l’initiative du navigateur qu’après une confirmation
  de suppression conforme. Une confirmation de rejeu ne retire aucune entrée.
- Après suppression ou tentative de rejeu, actualiser la liste suivant son
  propre mode. Le résultat serveur de cette lecture fait référence.

## Configuration isolée et modes test

La base `KM_WEBHOOK_BASE_URL` est commune ; les quatre nouvelles clés sont vides :

```ini
KM_PROCESSED_LEGACY_FILES_LIST_WEBHOOK_PATH=
KM_PROCESSED_LEGACY_FILES_VIEW_WEBHOOK_PATH=
KM_PROCESSED_LEGACY_FILES_DELETE_WEBHOOK_PATH=
KM_PROCESSED_LEGACY_FILES_REPLAY_WEBHOOK_PATH=
```

Le préfixe `KM_PROCESSED_LEGACY_FILES` ne se replie jamais sur `KM_FILES`,
`KM_TEMPLATES` ou `KM_LEGACY_FILES`. Un chemin absent ou invalide désactive
l’action correspondante ; l’absence de liste empêche les actions sur fichiers.
Une configuration absente ne produit aucune réussite simulée.

Quatre bascules indépendantes : « WH - list », « WH - view », « WH - replay »
et « WH - delete ». OFF utilise `/webhook/`, ON `/webhook-test/`. Les bascules
reviennent à OFF à chaque arrivée, y compris après retour par l’historique.
Seule celle de liste la recharge ; changer les autres ne fait aucun appel.
Après une action, la liste suit toujours sa propre bascule. Test et production
doivent viser le même stockage de fichiers historiques traités.

## Contrats attendus par le front

| Opération | Requête | Réponse attendue |
| --- | --- | --- |
| Liste | GET sans cache | `{"ok":true,"files":[{"name":"historique.pdf","size":123,"revision":"v1"}]}` |
| Voir | GET avec `?name=...` encodé | Contenu du fichier, avec type MIME adapté et présentation inline si le navigateur le permet |
| Suppression | POST JSON : `{"name":"historique.pdf","expected_revision":"v1"}` | `{"ok":true,"name":"historique.pdf"}` après suppression effective |
| Rejouer | POST JSON : `{"name":"historique.pdf","expected_revision":"v1"}` | `{"ok":true,"name":"historique.pdf"}` après prise en compte de la demande |

La liste exige des noms non vides uniques, une taille entière positive ou nulle
en octets et une révision opaque non vide. Le nom confirmé doit correspondre
exactement au fichier concerné. Une réussite exige HTTP 2xx, `ok:true` et le nom
attendu. Une révision obsolète doit être refusée par le serveur avec HTTP 409 et
`{"ok":false,"code":"conflict","message":"…"}`. Les autres erreurs utilisent
un statut approprié et `{"ok":false,"code":"…","message":"…"}`.

Le serveur doit valider les noms et limiter les opérations au stockage concerné,
contrôler les révisions et les accès concurrents, et ne pas interpoler le nom reçu
dans une commande shell. Ces garanties sont à réaliser dans les workflows.

Délais : 30 secondes pour liste, suppression et demande de rejeu. Aucun nouvel
essai automatique. Une interruption, un dépassement ou une confirmation
inexploitable signale un résultat incertain à vérifier côté serveur avant de
retenter. Une simple présence dans la liste ne prouve pas l’état d’un rejeu.

## Sens de « Rejouer »

Le front transmet une demande au webhook dédié. Le workflow décidera de toutes
les actions nécessaires ; le navigateur ne déplace aucun fichier. Il affiche
« Demande de rejeu prise en compte » uniquement après confirmation conforme,
en précisant que la réussite du traitement n’est pas encore confirmée.
Cette réponse ne vaut ni découpage terminé, ni génération réussie, ni publication.
La relance effective, la gestion des dérivés existants et l’historique d’exécution
restent à définir avec le workflow. Aucun workflow n8n n’est créé ici.

## Archivage automatique cible et traçabilité

La source issue de [00b](00b_upload_legacy_files.md) ne doit rejoindre l’archive
qu’après préparation réussie, enregistrement des documents produits et transfert
réussi de tous les dérivés dans l’entrée standard [01a](01a_upload_files.md).
Un échec ou résultat partiel conserve la source en attente. Cette règle métier
est distincte des actions manuelles présentes dans cet écran.

Les liens vers les documents dérivés, passages sources et templates/version,
ainsi que les événements du [journal](10_tracking_journal.md), restent à définir
et ne sont pas inventés par le contrat de liste. L’archivage ne certifie ni
conformité, ni validation métier, ni publication. Il reste distinct des
[sources standard prises en charge](01b_processed_files.md) et des archives de
versions des [connaissances publiées](07_knowledges.md).

## Vérifications

La suite [processed-legacy-browser.mjs](../tests/processed-legacy-browser.mjs)
simule les réponses n8n : liste vide/en erreur/invalide, Voir et encodage,
confirmations et annulations, conflits de révision, retours invalides, délais,
rejeu accepté sans retrait automatique, bascules et absence de concurrence.
Elle vérifie l’isolation des quatre configurations, les clés absentes, le retour
par l’historique, les icônes, le clavier et cinq largeurs. Les tests du module API
couvrent les préfixes et les contrats de confirmation. Voir [les tests](../tests/README.md).
La recette réelle reste à réaliser après raccordement. Aucun fichier métier
n’est déplacé ou supprimé par les tests avec réponses simulées.

[Vue d’ensemble](README.md) · [Dépôt historique](00b_upload_legacy_files.md) · [Journal](10_tracking_journal.md)
