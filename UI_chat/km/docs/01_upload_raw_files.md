# 01_upload_raw_files — Dépôt des sources

**Page associée :** [01_upload_raw_files](../pages/01_upload_raw_files.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/01_upload_raw_files/`.
**État :** interface développée, statut `development` ; raccordement n8n à réaliser.
Les chemins des webhooks sont volontairement vides : aucun dépôt ou succès réel
n’est possible tant que les workflows ne sont pas raccordés.

## Objectif et provenance

**PDF :** la chaîne commence par le dépôt d'un Word relu dans Documents métier
bruts ([page 1](Poc_n8n.pdf#page=1)). Le socle SharePoint et ses bibliothèques
sont décrits [page 2](Poc_n8n.pdf#page=2).

**Décisions utilisateur :** adapter le stockage au POC INNO sur EC2 et ouvrir
le dépôt à tous types de fichiers, avec sélection multiple. Cette ouverture
concerne le dépôt ; le parcours métier de référence reste celui d'un Word relu.
Accepter un fichier au dépôt ne garantit pas sa compatibilité avec les contrôles
et traitements suivants. Le découpage en documents atomiques reste une extension.

## Entrées

- Un ou plusieurs fichiers de tout type à déposer sur le serveur.
- Pour le parcours métier de référence : Word relu par le métier.
- Template et jeu de test attendus : document conforme, non conforme et avec écart.
- Références et règles nécessaires aux étapes suivantes, à fournir séparément.

Le PDF ne précise ni les extensions Word acceptées par les traitements ni les
limites de taille. Les limites techniques du dépôt restent à définir ; aucun
filtre limité aux fichiers Word n'est retenu pour cet écran.

## Traitements et sorties

**PDF :** prendre en charge le document pour lancer les contrôles de
[format/template](02_format_controls.md), puis la suite de la chaîne.

**Décision utilisateur :** après prise en charge initiale et enregistrement des
résultats associés, déplacer la source vers
[01_processed_files](01_processed_files.md). Ne pas attendre AI Ready.

**Proposition INNO/interface :** conserver un lien entre la source déposée, la
prise en charge et les résultats pour suivre le parcours malgré le déplacement.
La définition technique de cette prise en charge et de ses premiers résultats
reste à arrêter ; le dépôt seul ne suffit pas à déclarer la source traitée.

La sortie immédiate du dépôt est un fichier stocké, confirmé par n8n. Ce succès
ne vaut ni conformité ni approbation ni publication. Le déclenchement des
traitements métier à partir du dépôt reste à définir.

Les sorties ultérieures de la prise en charge sont les premiers résultats
enregistrés, l'archive source et les éléments de suivi dans le
[journal](10_tracking_journal.md). Le bouton « Accord » décrit ci-dessous
autorise l'envoi et les remplacements annoncés, pas la validation métier.

## Interactions humaines et interface prévues

**PDF :** le document a été relu avant son dépôt ; un retour rédacteur est prévu
si le rapport consolidé révèle un blocage.

Les règles suivantes sont des **décisions utilisateur**, précisées par le plan
validé. Elles sont mises en œuvre côté navigateur ; les opérations serveur
nécessitent des workflows conformes aux contrats ci-dessous.

### Disposition et liste serveur

- Sur PC, deux panneaux côte à côte : fichiers serveur à gauche, upload à droite.
- Sous 768 px, deux panneaux empilés : fichiers serveur en haut, upload en bas.
- La liste serveur porte uniquement sur `01_upload_raw_files/`, sans inclure
  les archives ni les autres étapes. Elle charge à l'ouverture, peut être
  actualisée manuellement et est actualisée après les envois et suppressions.
- Distinguer les états chargement, liste vide et erreur. Une erreur de lecture
  ne signifie pas qu'aucun fichier n'existe ; ne pas présenter les collisions
  comme vérifiées tant que la liste n'a pas été obtenue.

### Sélection et accord sur le lot

1. Sélectionner plusieurs fichiers par glisser-déposer ou par le bouton de
   sélection de fichiers. La sélection seule ne déclenche aucun envoi.
2. Afficher une liste préparatoire avec le nom et la taille de chaque fichier.
   Permettre d'en retirer individuellement avant validation.
3. Comparer les noms avec ceux du serveur. Pour chaque nom déjà présent,
   afficher un avertissement explicite de danger : le fichier serveur sera
   écrasé si l'utilisateur conserve cette entrée et valide le lot.
4. Si plusieurs fichiers sélectionnés ont le même nom, demander de retirer
   les entrées en trop. Bloquer l'accord tant qu'il en reste plusieurs.
5. Le bouton « Accord » valide toute la liste et autorise tous les remplacements
   annoncés. Il n'y a pas d'accord séparé par fichier. Le récapitulatif doit
   rendre ces remplacements visibles avant validation. Une liste vide ne peut
   pas être validée.

### Icônes des fichiers à uploader et uploadés

**Décision utilisateur :** afficher une icône PNG locale devant le nom de chaque
fichier dans la liste préparatoire et dans la liste des fichiers présents sur le
serveur. Conserver cette icône dans le suivi d'envoi et le bilan, quel que soit
l'état du fichier. Utiliser les ressources existantes de
[`assets/icons/`](../assets/icons/), sans les remplacer par des émojis.

La même correspondance s'applique aux deux listes, à partir de la dernière
extension du nom, sans distinction entre majuscules et minuscules :

| Extensions du fichier | Icône PNG à utiliser |
| --- | --- |
| `.doc`, `.docx`, `.docm` | [word.png](../assets/icons/word.png) |
| `.xls`, `.xlsx`, `.xlsm`, `.csv` | [excel.png](../assets/icons/excel.png) |
| `.ppt`, `.pptx`, `.pptm` | [powerpoint.png](../assets/icons/powerpoint.png) |
| `.pdf` | [pdf.png](../assets/icons/pdf.png) |
| `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.tif`, `.tiff`, `.avif`, `.ico` | [image.png](../assets/icons/image.png) |
| Toute autre extension, extension inconnue ou nom sans extension | [file.png](../assets/icons/file.png) (générique) |

Si une icône spécialisée ne peut pas être chargée, utiliser `file.png` en repli.
Si l'icône générique est elle-même indisponible, conserver le nom et les actions
du fichier accessibles sans boucler sur les tentatives de chargement.

Les icônes ont une taille d'affichage homogène, conservent leurs proportions et
précèdent le nom sur PC comme sur smartphone. Le nom reste affiché en texte ;
les images sont décoratives (`alt=""`) pour éviter une lecture redondante.
Cette indication visuelle par extension ne constitue ni une validation du format
réel, ni un filtre d'acceptation, ni un indicateur de réussite de l'envoi.

Les images et les deux états du toggle sont embarqués dans le conteneur KM
et servis sous `/km/assets/`. Le logo est local : `assets/logo-sofinco.png`.
Aucun téléchargement GitHub n’est nécessaire pour afficher le front.

### Envoi séquentiel et retours n8n

- Après « Accord », figer le lot validé. Envoyer un seul fichier à la fois et
  attendre son retour n8n, ou le constat d'un échec/retour absent, avant le suivant.
- Afficher pour chaque fichier les états en attente, en cours, réussi ou échoué.
  Un succès exige une confirmation n8n du stockage effectif ; le simple départ
  de la requête ne suffit pas. Sans webhook branché, aucune réussite simulée.
- En cas d'échec, conserver le fichier et le message d'erreur dans le bilan,
  puis poursuivre avec le suivant. Ne pas renvoyer automatiquement les échecs.
- Afficher un bilan final avec les réussites et les échecs. Les échecs peuvent
  être relancés manuellement, après vérification de l'état serveur et nouvel
  accord si un remplacement doit être autorisé.
- Un retour absent ou inexploitable ne prouve ni le succès ni l'absence du
  fichier serveur. Afficher l'incertitude avec l'échec et vérifier l'état
  serveur avant une nouvelle tentative. La reprise manuelle et les confirmations
  attendues sont précisées dans le contrat ci-dessous ; une simple présence
  du nom ne suffit pas à confirmer le succès de cet envoi.

### Collisions au moment de l'écriture

La comparaison faite par l'interface prépare l'avertissement. n8n doit aussi
contrôler les collisions au moment de l'écriture et respecter les remplacements
autorisés pour le lot. Si un doublon apparaît après l'accord et n'avait pas été
annoncé, ne pas l'écraser : signaler le conflit sur le fichier, poursuivre les
autres envois et demander un nouvel accord avant son remplacement. Aucun
remplacement non annoncé n'est autorisé.

### Suppression depuis la liste serveur

Proposer une suppression individuelle, avec confirmation affichant le nom du
fichier concerné. Une annulation ne déclenche aucune suppression. Retirer l'entrée
seulement après confirmation de réussite par n8n, puis actualiser la liste.
En cas de refus ou de retour absent, afficher l'erreur et vérifier l'état serveur
sans annoncer une réussite. Cette action concerne le fichier déposé, pas les
archives ni les résultats des étapes suivantes.

## Configuration et contrats n8n attendus

| Capacité cible | Résultat attendu par l'interface |
| --- | --- |
| Lister les fichiers du dossier de dépôt | Noms des fichiers présents, ou erreur explicite |
| Déposer un fichier par requête | Confirmation du stockage effectif, ou erreur/conflit |
| Autoriser un remplacement annoncé | Respect de l'accord utilisateur et contrôle de collision à l'écriture |
| Supprimer un fichier identifié | Confirmation de suppression, ou erreur explicite |

L'interface charge `UI_chat/km/config.ini` sans cache. Les clés suivantes sont
montées en lecture seule, servies sous `/km/config.ini` ; les trois chemins
restent à renseigner avec ceux des futurs workflows :

```ini
KM_WEBHOOK_BASE_URL=http://15.236.66.128/n8n/webhook/
KM_FILES_LIST_WEBHOOK_PATH=
KM_FILES_UPLOAD_WEBHOOK_PATH=
KM_FILES_DELETE_WEBHOOK_PATH=
```

La base est commune. Chaque chemin est relatif, composé de segments
alphanumériques, tirets ou underscores séparés par `/`. Les URL absolues,
remontées de répertoire, paramètres et chemins encodés sont refusés. Aucun
identifiant de workflow ni aucune URL de secours n'est inventé.

La barre affiche « N8N - test : », puis deux bascules indépendantes :
« WH - list » et « WH - upload », avec `toggle_blue_off.png` et
`toggle_blue_on.png` de `assets/icons/`. Chaque bascule OFF utilise la base
configurée ; ON remplace uniquement son segment final `/webhook/` par
`/webhook-test/` pour l'opération concernée. La suppression suit le mode de
« WH - list », puisqu'elle agit sur les fichiers affichés.
Les deux choix ne sont pas mémorisés : OFF à chaque arrivée, y compris au retour
par l'historique (rechargement en cas de restauration depuis le cache de navigation).

Les deux bascules sont désactivées pendant les opérations. Basculer « WH - list »
invalide la liste précédente, la recharge et recalcule les collisions. Basculer
« WH - upload » ne déclenche aucun appel de liste. Les actualisations après envoi
utilisent le mode de « WH - list », indépendamment du mode d'upload ; on peut ainsi
écouter un seul webhook de test n8n à la fois. Les deux modes doivent cibler le
même stockage de dépôt pour que les avertissements de remplacement soient utiles ;
le contrôle atomique des collisions reste obligatoire côté serveur.
Une bascule retire les résultats terminés ; une sélection encore en attente est
conservée. Sans configuration utilisable, la sélection locale reste possible,
mais les opérations non raccordées sont désactivées.

### Requêtes et confirmations

Ces contrats sont **attendus par le front**, pas implémentés dans n8n.
Les fichiers concernent exclusivement le dossier de dépôt KM.

| Opération | Requête | Confirmation JSON attendue |
| --- | --- | --- |
| Liste | `GET`, sans cache | `{"ok":true,"files":[{"name":"document.pdf","size":1234,"revision":"opaque"}]}` |
| Upload | `POST multipart/form-data` : champ binaire `file`, `overwrite` chaîne `true` ou `false`, `expected_revision` si remplacement | `{"ok":true,"file":{"name":"document.pdf","size":1234,"revision":"nouvelle"}}` |
| Suppression | `POST application/json` : `{"name":"document.pdf","expected_revision":"opaque"}` | `{"ok":true,"name":"document.pdf"}` |

Une entrée fichier porte un nom non vide, une taille entière positive ou nulle
en octets et une révision non vide. Les noms sont comparés exactement, avec
casse, sans normalisation implicite. Les doublons dans une réponse de liste
rendent cette réponse invalide.

La révision est un identifiant opaque que le serveur renouvelle après chaque
modification. n8n doit contrôler la révision et la collision au moment de
l'opération, de façon atomique avec l'écriture ou la suppression. Un remplacement
exige `overwrite=true` et la révision annoncée lors de l'accord. Un fichier apparu
entre-temps, ou une révision devenue différente, doit produire un conflit plutôt
qu'un écrasement. Cette garantie nécessite l'implémentation serveur ; le front
ne peut pas l'assurer seul.

Un conflit utilise HTTP 409 et `{"ok":false,"code":"conflict","message":"…"}`.
Les autres erreurs utilisent un statut HTTP approprié et la même enveloppe.
Une réussite exige HTTP 2xx, `ok:true` et les champs attendus. L'upload vérifie
également que le nom et la taille confirmés correspondent au fichier envoyé ;
la suppression vérifie le nom confirmé. Une réponse générique « workflow lancé »
ne confirme pas le stockage.

Délais : 30 secondes pour liste/suppression, 120 secondes par fichier envoyé.
Un dépassement, une connexion interrompue, une réponse inexploitable ou une erreur
serveur potentiellement postérieure à l'écriture est présenté sans réussite et
sans relance automatique. Le serveur peut avoir effectué l'opération malgré
l'absence de réponse. La reprise manuelle commence par une nouvelle lecture de
la liste, puis exige un nouvel accord avant envoi et tout remplacement annoncé.
La présence d'un nom ne suffit jamais à certifier la réussite de l'envoi précédent.

Aucun format ni plafond de taille arbitraire n'est ajouté au front. Les limites
existantes de Nginx/n8n restent applicables ; leurs erreurs sont affichées. Le
lot est figé pendant l'envoi ; sélection, suppression, actualisation manuelle et
changement d'environnement sont bloqués jusqu'à la fin.

L'affichage et les accords relèvent du navigateur ; les opérations sur le
stockage et l'orchestration restent à réaliser dans n8n. Aucun workflow de
contrôle métier, déplacement vers l'archive ou publication n'est créé ici.

## Critères de vérification — recette future

Les scénarios ci-dessous servent à la recette complète, notamment après
raccordement réel des workflows. Des vérifications locales automatisées avec
réponses simulées couvrent le front : envoi séquentiel et poursuite après échec,
révisions et conflits, reprise, retour invalide, suppression, toggle, configuration
absente, icônes et repli, clavier et absence de débordement aux largeurs 1 920,
1 366, 1 100, 768 et 390 px. Les tests du module d'accès couvrent aussi les délais,
les erreurs HTTP et le refus de chemins invalides. Voir
[les instructions de test](../tests/README.md). Aucun webhook distant n'a été
appelé ; la recette EC2 et les contrôles métier restent à faire.

- Sélectionner plusieurs fichiers de types différents par le bouton, puis par
  glisser-déposer ; vérifier nom, taille et retrait individuel avant accord.
- Vérifier l'ordre des panneaux sur PC et smartphone.
- Vérifier l'icône devant chaque nom dans la sélection, le suivi d'envoi et la
  liste serveur : Word, Excel/CSV, PowerPoint, PDF et images. Vérifier la même
  correspondance pour les extensions en majuscules et les noms à plusieurs points.
- Vérifier le repli vers `file.png` pour une extension inconnue, un nom sans
  extension et une icône spécialisée indisponible ; si le générique manque,
  le nom et les actions restent utilisables. Contrôler les proportions et
  l'absence de lecture redondante par un lecteur d'écran.
- Vérifier qu'aucun fichier ne part avant « Accord » et que le lot est figé
  après validation.
- Présenter un lot avec fichiers nouveaux et doublons serveur : avertissements
  visibles, retrait possible, accord global et écrasement des seuls doublons
  annoncés et conservés.
- Présenter deux fichiers sélectionnés de même nom : accord bloqué jusqu'au
  retrait des entrées en trop.
- Vérifier un seul envoi à la fois et l'attente du résultat avant le suivant.
  Provoquer un échec intermédiaire : les suivants partent, le bilan le conserve
  et sa relance est manuelle.
- Tester un retour n8n absent ou inexploitable : aucune réussite annoncée,
  incertitude visible et vérification serveur avant nouvelle tentative.
- Tester chargement, liste vide, actualisation et erreur de liste serveur :
  une liste indisponible ne vaut pas absence de doublons.
- Faire apparaître un doublon après l'accord : absence d'écrasement silencieux,
  conflit visible et nouvel accord nécessaire.
- Tester suppression confirmée, annulée et refusée, ainsi qu'un retour absent :
  aucune entrée retirée sur la seule initiative de l'interface.
- Vérifier qu'aucune réussite d'envoi ou de suppression n'est simulée sans
  confirmation n8n.

- Un Word conforme et un Word non conforme peuvent chacun entrer dans la chaîne.
- Le dépôt reste distinct de la conformité, de l'approbation et de la publication.
- Le passage dans l'archive intervient après la prise en charge initiale, avec
  accès aux résultats associés ; un traitement ultérieur peut encore être refusé.
- Une correction du rédacteur peut être présentée à nouveau, selon une règle de
  reprise et de versionnement à définir.

Le [guide de déploiement](deployment.md) décrit le conteneur autonome, le
montage de configuration et les commandes de mise à jour.

## Points à définir

Restent à fournir : chemins des trois webhooks et workflows conformes aux
contrats ; limites de taille et nombre de fichiers côté serveur ; règles serveur
de nommage (caractères autorisés) ; mécanisme atomique de révision et de contrôle
des collisions ; gestion des fichiers déjà en cours de prise en charge et
articulation des remplacements avec le versionnement métier. La comparaison
exacte des noms, les délais et le seuil responsive sont désormais fixés ci-dessus.

Restent aussi à définir : compatibilité des formats avec les étapes suivantes,
déclenchement manuel ou automatique des traitements métier, contenu des premiers
résultats, condition exacte de déplacement vers l'archive et comportement en cas
d'échec de cette prise en charge. Ces inconnues ne remettent pas en question les
règles d'accord global, de remplacement annoncé et d'envoi séquentiel ci-dessus.

[Vue d'ensemble](README.md) · [Archive des sources](01_processed_files.md) · [Contrôles](02_format_controls.md)
