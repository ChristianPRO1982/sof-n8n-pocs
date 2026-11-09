# 00b_upload_legacy_files — Import des fichiers historiques

**Page associée :** [00b_upload_legacy_files](../pages/00b_upload_legacy_files.html).
**État :** interface développée, statut `development` ; webhooks historiques non raccordés.
**Stockage :** à définir ; aucun dossier métier créé ni supposé existant sur EC2.

## Objectif et provenance

**Décision utilisateur :** créer une entrée dédiée aux documents historiques qui
ne suivent pas les templates actuels. Cette préparation est une extension du
parcours Word relu du [PDF](Poc_n8n.pdf), pas une exigence de celui-ci.
Un historique doit pouvoir produire un ou plusieurs fichiers basés sur les
nouveaux templates, avant de rejoindre les contrôles et validations habituels.

Cette livraison fournit le dépôt navigateur et le cadrage du parcours. Elle ne
réalise ni extraction, ni découpage, ni génération, ni transfert, ni archivage.
Un dépôt confirmé ne prouve aucune transformation du document.

## Interface et contrats du dépôt

La page reprend le [dépôt standard](01a_upload_files.md) et ses modules partagés :

- Tous types de fichiers, sélection multiple, bouton et glisser-déposer, liste
  préparatoire avec nom, taille, icône locale et retrait individuel.
- Liste serveur à gauche sur ordinateur et en haut sous 768 px ; actualisation
  initiale, manuelle et après les opérations.
- Accord global sur le lot, avertissement des remplacements, un seul fichier
  par nom dans la sélection et contrôle serveur des révisions attendu.
- Envois séquentiels, attente de confirmation par fichier, poursuite après échec,
  bilan et reprise manuelle après vérification serveur et nouvel accord.
- Suppression individuelle confirmée, résultat incertain si la réponse est
  inexploitable, aucun succès simulé ni relance automatique.
- Trois bascules test indépendantes, initialement OFF : liste, upload et
  suppression. Seule la bascule de liste déclenche sa relecture.

Les contrats sont ceux du dépôt standard, appliqués uniquement aux historiques :
GET de liste avec `ok:true`, `files` et, par fichier, `name`, `size`, `revision` ;
POST multipart d’upload avec `file`, `overwrite`, `expected_revision` si
remplacement ; POST JSON de suppression avec `name`, `expected_revision`.
L’upload confirme `ok:true` et `file.name`, la suppression `ok:true` et `name`.
Les conflits retournent HTTP 409. Délais : 30 s pour liste/suppression et 120 s
par upload. Ces contrats sont attendus par le front, sans workflow historique
implémenté. Accepter un format au dépôt ne garantit pas sa prise en charge future.

## Configuration et isolation

La base `KM_WEBHOOK_BASE_URL` reste commune. Les trois clés suivantes sont vides :

```ini
KM_LEGACY_FILES_LIST_WEBHOOK_PATH=
KM_LEGACY_FILES_UPLOAD_WEBHOOK_PATH=
KM_LEGACY_FILES_DELETE_WEBHOOK_PATH=
```

L’identifiant de page sélectionne explicitement `KM_LEGACY_FILES`. Aucun repli
vers `KM_FILES` ou `KM_TEMPLATES` n’est permis. Sans configuration, la sélection
locale fonctionne, les opérations serveur sont indisponibles et un message
signale le service non raccordé. Le mode test utilise `/webhook-test/` et doit
viser le même stockage historique que le mode production.

## Consultation — bouton et webhook

Le bouton « Voir » précède « Supprimer » pour chaque fichier historique. Il
ouvre directement le webhook GET dans un nouvel onglet, sans confirmation,
avec `name` en paramètre de requête, encodé par `URLSearchParams`. L'ouverture
utilise `noopener,noreferrer`. Le bouton est désactivé pendant une opération,
si la liste n'est pas disponible ou si la clé
`KM_LEGACY_FILES_VIEW_WEBHOOK_PATH` est absente ou invalide. Le toggle indépendant
« WH - view » sélectionne production (`/webhook/`) ou test (`/webhook-test/`)
avec ce même chemin ; il revient sur OFF à chaque arrivée, y compris par
l'historique. Le basculer ne fait aucun appel réseau et conserve le lot ainsi
que ses résultats. Il est bloqué pendant les opérations en cours. Cette
configuration ne conditionne pas la disponibilité des opérations de dépôt.
Aucun workflow de consultation n'est créé dans le dépôt ; le raccordement réel
n8n reste à réaliser. Le navigateur reçoit directement le binaire, sans passer
par le parseur de confirmation JSON des autres opérations.

### Réglages n8n

Chaîne : Webhook → validation du nom → lecture du fichier → Respond to Webhook.

- Webhook : HTTP Method `GET`, Path identique à la valeur de
  `KM_LEGACY_FILES_VIEW_WEBHOOK_PATH` dans `config.ini`, Respond
  `Using 'Respond to Webhook' Node`. Le nom reçu est dans `$json.query.name`.
- Valider côté serveur un nom simple non vide : refuser les séparateurs `/`
  et `\`, les caractères de contrôle, `.` et `..`. Ne jamais accepter un chemin
  complet du navigateur. Limiter la lecture au dossier historique déjà utilisé
  par l'upload ; ce dossier exact reste à confirmer. Le montage Compose local
  actuel le rend accessible sous `/files/km/`. Pour le sélecteur de lecture,
  échapper les caractères de glob du nom afin de lire exactement un fichier.
- Read/Write Files from Disk : `Read File(s) From Disk`, File(s) Selector =
  chemin exact validé du fichier, Put Output File in Field = `data`.
- Respond to Webhook : Respond With `Binary File`, Response Data Source
  `Specify Myself`, Input Field Name `data`, Response Code `200`.
  Response Headers : `Content-Disposition: inline` et
  `Content-Type: {{ $binary.data.mimeType || 'application/octet-stream' }}`
  (expression n8n). Prévoir une réponse 400 pour un nom invalide et 404 pour
  un fichier absent ; aucune branche ne doit finir sans réponse.

Le MIME doit correspondre au fichier réel : PDF et images peuvent s'afficher
directement ; Word et Excel sont généralement téléchargés par le navigateur.
En test, activer « Listen for test event » et « WH - view » ; en production,
publier/activer le workflow et laisser ce toggle sur OFF.

## Préparation cible — à développer dans n8n

1. Prendre en charge le fichier historique et identifier les templates utiles
   depuis [00a_templates](00a_templates.md).
2. Extraire le contenu, le découper et produire un ou plusieurs documents aux
   nouveaux formats, en conservant les liens vers les passages sources.
3. Enregistrer les documents produits et les templates employés, avec leurs
   versions, pour retrouver l’origine de chaque document dérivé.
4. Transférer automatiquement les documents produits dans l’entrée standard
   [01a_upload_files](01a_upload_files.md), sans redépôt manuel imposé.
5. Archiver la source historique pour la future consultation
   [00c_processed_legacy_files](00c_processed_legacy_files.md) seulement après
   réussite de la préparation, enregistrement des produits et transfert réussi.

Un échec ou un résultat partiel conserve la source en attente. L’archivage ne
vaut pas conformité ou approbation : chaque document produit suit les contrôles,
la validation humaine et la publication de la chaîne standard. Le
[journal](10_tracking_journal.md) devra tracer la préparation, ses erreurs, les
transferts et l’archivage, sans attendre la fin du parcours standard.

## Vérifications

La suite locale avec réponses simulées doit couvrir ce troisième dépôt et
l’isolation des trois configurations, notamment les clés historiques vides alors
que les deux autres dépôts sont configurés. Vérifier doublons, remplacements,
conflits, envois séquentiels, reprises, retours invalides, suppression, bascules,
icônes, clavier et cinq largeurs. Voir [les tests](../tests/README.md).

Recette métier future : un historique produit plusieurs fichiers reliés à leurs
passages sources et templates ; tous rejoignent l’entrée standard ; la source
n’est archivée qu’après succès complet. Un échec partiel ne vaut jamais réussite.

## Points à définir lors du développement métier

Stockages historiques d’entrée et d’archive ; formats réellement traitables et
formats de sortie ; extraction et éventuel OCR ; sélection/version des templates ;
règles de découpage et couverture du contenu ; rôle éventuel du LLM ; critères de
réussite ; traçabilité et identification des dérivés ; contrats des traitements ;
reprise sans duplication après transfert partiel ; droits et conservation.
Aucun de ces choix n’est déduit des seuls noms des pages.

[Vue d’ensemble](README.md) · [Historiques traités](00c_processed_legacy_files.md) · [Entrée standard](01a_upload_files.md)
