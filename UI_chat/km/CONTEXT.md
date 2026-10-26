# Knowledge Manager — contexte Codex

L'identifiant unique du projet est **`km`**, toujours en minuscules : dossiers,
routes, clés de configuration et futurs webhooks.

## Lire avant d'intervenir

- `../../IA_CONTEXT.md` : architecture générale et limites du socle partagé.
- `../../nginx/default.conf` : routage HTTP, notamment `/km/`.
- `../../Dockerfile.km_front`, `../../nginx/km.conf`,
  `../../Dockerfile.nginx_front` et `../../docker-compose.yml` : images, routage
  et montage en lecture seule de la configuration KM.
- `config.ini` : base commune et trois chemins de webhooks KM. Les chemins
  restent vides tant que les workflows ne sont pas raccordés.
- [docs/README.md](docs/README.md) : vue d'ensemble fonctionnelle, circulation,
  correspondance des onze fiches avec les pages HTML et recette cible.
- [docs/Poc_n8n.pdf](docs/Poc_n8n.pdf) : référence fonctionnelle à lire avec la
  fiche de l'étape concernée avant d'implémenter son traitement.

Les chemins ci-dessus sont relatifs à ce fichier. Les fichiers exécutés font
référence si le contexte devient obsolète.

## Objectif et état initial

POC INNO de transformation des documents Sofinco (PDF, Word, etc.) volumineux et
parfois redondants en connaissances atomiques, normalisées, structurées et liées
entre elles. Préserver la traçabilité vers les documents et passages sources.

Le périmètre actuellement documenté suit `Poc_n8n.pdf` : un Word relu jusqu'à sa
publication en Markdown et JSON. Par décision utilisateur, le dépôt est désormais
spécifié pour tous types de fichiers ; cette ouverture ne garantit pas leur
compatibilité avec les traitements suivants. Le parcours de référence reste
fondé sur un Word relu et le découpage atomique reste une extension hors de ce
parcours.

Le module est indépendant des autres projets, avec n8n mutualisé. Les interfaces
sont en HTML/CSS/JavaScript natifs ; n8n porte l'orchestration et les traitements
métier. Aucun framework front ni nouveau service n'est nécessaire.

À cette étape, `index.html` explique les cinq pastilles de développement.
Le dépôt `pages/01_upload_raw_files.html` est développé côté navigateur et en
statut `development` ; les dix autres écrans restent provisoires (« Contenu à
venir »). Les workflows n8n ne sont pas implémentés et leurs chemins restent
vides. Aucun succès n'est simulé sans réponse serveur conforme.

## Gabarit et ajout d'une page

- `template.html` : modèle HTML à copier, avec les points d'insertion du contenu
  et des options contextuelles. Le modèle lui-même est consultable sous
  `/km/template.html` mais n'est pas une étape de la chaîne.
- `assets/km.css` : styles partagés inspirés de `../chats/chat3.html` (palette,
  typographie, fonds clairs et panneaux arrondis), sans limiter la largeur du site.
- `assets/km.js` : registre `pages` des identifiants, libellés exacts des dossiers,
  titres et destinations ; construction de la navigation et du bandeau communs.

Pour ajouter une page :

1. Copier `template.html` sous `pages/<identifiant>.html`, avec un nom en minuscules.
2. Adapter les liens CSS et JS en `../assets/km.css` et `../assets/km.js`.
3. Définir `data-km-page` sur le `body` et ajouter une entrée portant le même `id`
   au registre `pages`. Par défaut, le lien généré est `pages/<id>.html` ; le champ
   `path`, relatif à `/km/`, permet une autre destination. Les titres du bandeau
   et de l'onglet proviennent du registre. `data-km-title` est le titre de repli
   pour une page non enregistrée, comme le modèle.
4. Remplacer le contenu de `main#km-content` en conservant son identifiant et
   `tabindex="-1"`. Utiliser un `h2` pour le titre du corps : le bandeau fournit
   déjà le `h1` de la page.
5. Ajouter les options propres à la page dans `nav[data-km-context]`. Le script
   ajoute les liens communs avant ces options sans supprimer leur contenu.

La racine du module est résolue depuis l'URL du script partagé ; les liens
fonctionnent aussi depuis les pages imbriquées. Le logo Sofinco est embarqué
dans `assets/logo-sofinco.png` et chargé localement par le script partagé. Le gabarit ne charge pas de données
métier ; seul le module de dépôt ajoute les appels n8n lorsqu’ils sont configurés.
`assets/km-upload.js`, `assets/km-upload-api.js` et `assets/km-upload.css` sont
propres à cette page ; les icônes PNG sont dans `assets/icons/`.

### Pastilles de développement

Dans le bandeau contextuel, la pastille se place immédiatement à gauche du titre
de la page ; dans le menu général, elle précède le libellé du lien.

Le fichier `statuses.json` associe les identifiants des pages à leurs statuts.
C'est l'unique source à modifier pour les pastilles du menu général et du
bandeau ; le registre `pages` dans `km.js` ne porte plus de statuts. Les statuts sont déclaratifs ; ce ne sont pas des résultats
de contrôles automatiques ou des états d'exécution n8n.

| Valeur `status` | Couleur | Signification |
| --- | --- | --- |
| `not_started` | Noir | Aucun développement encore lancé pour cette partie |
| `bugs` | Rouge | Bugs détectés et en cours d'investigation |
| `development` | Bleu | Développement en cours |
| `testing` | Orange | Phase de test |
| `validated` | Vert | Validé |

L'accueil affiche l'émoji 🏠 à la place d'une pastille dans le menu général et
le bandeau ; il ne porte pas de statut de développement. Le dépôt est en
`development`, les dix autres étapes restent en `not_started`.
Un statut absent ou inconnu (notamment le modèle non enregistré) utilise
`not_started`. Les libellés sont centralisés dans `statuses`, les couleurs dans
`assets/km.css` et le rendu dans `statusBadge`. Les pastilles ont une infobulle
et un libellé accessible ; seule la page d'accueil affiche la légende complète,
générée depuis les mêmes définitions via `[data-km-status-legend]`.

Le navigateur lit `/km/statuses.json` avec `cache: no-store` à l'ouverture,
toutes les 30 secondes lorsque l'onglet est visible et au retour sur la page ou
l'onglet. Le serveur KM répond avec `Cache-Control: no-store`, sans ETag ni
réponse conditionnelle 304. Une lecture en erreur conserve le dernier affichage
valide (noir avant la première réussite). Un statut absent ou inconnu vaut noir.
Le fichier est monté en lecture seule dans `km-front` ; les modifications en
place sur EC2 sont visibles sans republier l'image. Si l'éditeur remplace le
fichier, recréer seulement KM pour renouveler le montage. La première activation
nécessite une nouvelle image KM et le nouveau montage, décrits dans le guide.

### Navigation et préférences navigateur

Sur ordinateur, le menu occupe initialement 22 % de la largeur intérieure du
gabarit. La poignée utilise Pointer Events et la capture du pointeur ; les
flèches gauche/droite ajustent d'un point, Home et End atteignent 15 % et 33 %.
La préférence est conservée dans `localStorage` sous `km.sidebarWidthPercent`.
Les valeurs numériques sont bornées ; les valeurs invalides sont ignorées. Un
stockage indisponible n'empêche pas l'utilisation du gabarit.

À 1 100 px et moins, le menu devient un tiroir superposé de largeur
`min(360px, 90vw)`, ouvert par le hamburger. Le voile, Échap, le bouton de
fermeture ou la navigation ferment le tiroir. Le contenu arrière est inerte et
son défilement bloqué ; le focus reste dans le tiroir puis revient au déclencheur.
Le retour au mode ordinateur conserve le pourcentage mémorisé.

Le menu et le corps défilent indépendamment, le bandeau reste visible. Les
éléments de navigation sont accessibles au clavier et les animations respectent
la préférence de réduction des mouvements.

## Chaîne cible

### Dépôt multiformat — interface développée, raccordement n8n à réaliser

La fiche [01_upload_raw_files](docs/01_upload_raw_files.md) décrit la sélection
multiple par glisser-déposer ou bouton, la liste préparatoire (nom, taille,
retrait individuel) et le bouton « Accord » validant le lot entier. Les doublons
serveur portent un avertissement d'écrasement ; les conserver dans le lot et
valider autorise leur remplacement. Les doublons au sein de la sélection doivent
être retirés jusqu'à conserver un seul fichier par nom avant accord.

Le lot validé est figé et envoyé un fichier à la fois, avec attente du retour
n8n avant le suivant, poursuite après échec, bilan par fichier et relance manuelle.
Un retour absent ne vaut pas réussite ; vérifier l'état serveur avant de retenter.
n8n contrôle aussi les collisions à l'écriture : un nouveau doublon non annoncé
nécessite un nouvel accord, sans écrasement silencieux.

La liste serveur est placée à gauche sur PC et en haut sur smartphone ; la zone
d'upload à droite ou en bas. Elle charge à l'ouverture, peut être actualisée et
est actualisée après les opérations. La suppression est individuelle, confirmée
avec le nom du fichier, et l'entrée n'est retirée qu'après confirmation n8n.
Prévoir les états chargement, vide et erreur sans simuler de succès.
La suppression affiche le nom pendant l'opération et dans les retours d'erreur ;
une confirmation inexploitable indique un résultat incertain sans relance automatique.
La configuration du webhook n8n d'entrée et de réponse est détaillée dans la fiche de dépôt.

Dans la liste préparatoire, le suivi d'envoi et la liste serveur, chaque nom de
fichier est précédé d'une icône PNG locale de `assets/icons/` : `word.png`,
`excel.png`, `powerpoint.png`, `pdf.png` ou `image.png` selon l'extension,
sans distinction de casse. `file.png` est le repli générique pour les autres
types, les fichiers sans extension ou une icône spécialisée indisponible.
Le logo, les icônes et les images du toggle sont embarqués dans le conteneur
`km-front` et servis localement sous `/km/assets/`, sans dépendance à GitHub.
La correspondance détaillée et la recette sont dans la fiche de dépôt ; ces
icônes ne valent ni contrôle du format réel ni confirmation d'envoi.

Les contrats attendus sont fixés dans la fiche : liste GET, upload POST multipart
et suppression POST JSON, avec confirmation `ok:true` et révisions opaques pour
les conflits. La confirmation d'upload vérifie uniquement le nom,
sans contrôler la taille ni la révision ; la liste conserve une taille entière
en octets et une révision non vide.
Le module utilise `KM_WEBHOOK_BASE_URL` et les trois
`KM_FILES_{LIST,UPLOAD,DELETE}_WEBHOOK_PATH` de `config.ini`. Base commune :
`http://15.236.66.128/n8n/webhook/` ; chemins laissés vides, aucun workflow créé.
La barre « N8N - test : » propose trois bascules indépendantes « WH - list »,
« WH - upload » et « WH - delete », utilisant `toggle_blue_off.png`/`toggle_blue_on.png`. Chaque
bascule remplace `/webhook/` par `/webhook-test/` pour son opération et revient
sur OFF à chaque arrivée, y compris par l'historique. La suppression suit sa
propre bascule. Seule une bascule de liste la recharge ; basculer l'upload
ou la suppression n'appelle pas la liste. Après ces opérations, l'actualisation
suit le mode de la liste. Les deux modes doivent cibler le même stockage de dépôt.
Les opérations concurrentes dans cet écran sont bloquées pendant un lot.
Délais : liste/suppression 30 s, upload 120 s par fichier ; aucune relance automatique.
Sous 768 px, les panneaux sont empilés. Sans configuration, seule la sélection
locale est utilisable. Le stockage reste distinct de la prise en charge et de
l'archivage. Les tests locaux avec réponses simulées couvrent le navigateur ; la
recette distante reste à faire. Voir [les tests](tests/README.md).

### Parcours métier de référence — Word relu

1. Déposer et prendre en charge un Word relu (`01_upload_raw_files`).
2. Contrôler format/template sans LLM (`02_format_controls`).
3. Vérifier les écarts par rapport à une référence avec extraction JSON LLM
   (`03_deltas`), puis consolider le rapport et les orientations (`04_reports`).
4. Proposer les métadonnées par règles et LLM, contrôlées par JSON Schema
   (`05_metadata`).
5. Obtenir la validation métier ou le refus avec retour `draft`
   (`06_business_validation`).
6. Publier le Word validé, archiver les versions antérieures et passer à
   `published` (`07_knowledges`).
7. Convertir le Word en Markdown sans LLM avec contrôle de structure
   (`08_markdown`), puis déposer `{doc_id}.md` et `{doc_id}.json`
   dans `09_AI_Ready`.

Le journal `10_tracking_journal` suit l'ensemble du parcours, pas seulement sa fin.
Les numéros AUTO du PDF ne fixent pas l'ordre métier ; suivre son EPIC et la
circulation documentée dans [docs/README.md](docs/README.md).

**Décision utilisateur :** `01_processed_files` archive les fichiers sources
après leur prise en charge initiale et l'enregistrement des résultats associés,
sans attendre la validation métier ou AI Ready. Il s'agit d'une branche
d'archivage, distincte des connaissances validées et des archives de versions
publiées. La définition technique de cette prise en charge reste à préciser.

Chaque fiche de `docs/` porte le même nom que sa page HTML et distingue les
exigences du PDF, les décisions utilisateur et les propositions INNO/interface.
Les renvois aux pages du PDF permettent de retrouver la source. Les schémas,
contrats métier et fonctionnalités décrits comme cibles ne sont pas implémentés
dans n8n ; le contrat du dépôt est désormais attendu par le front.

Les templates, règles YAML, JSON Schema, vocabulaires, clés JSON finales et
règle `doc_id` restent à fournir. Les règles de transition `en_validation` et
d'acceptation des justifications restent à préciser. Les statuts documentaires
`draft`, `en_validation`, validé et `published` sont distincts des pastilles de
développement du registre JavaScript. Ne pas inventer de contrat de workflow à
partir des noms de dossiers ou d'un état publié du Word.

## Stockage de traitement sur EC2

Les onze dossiers fournis existent sous **`/n8n/n8n_files/km/`** sur EC2 :

```text
01_processed_files/
01_upload_raw_files/
02_format_controls/
03_deltas/
04_reports/
05_metadata/
06_business_validation/
07_knowledges/
08_markdown/
09_AI_Ready/
10_tracking_journal/
```

Conserver ces noms exacts, y compris les deux préfixes `01` et la casse de
`09_AI_Ready`. Ils ne sont pas recréés par cette initialisation.

Le montage Compose `./n8n_files:/home/node/.n8n-files` rend ces fichiers
accessibles dans le conteneur n8n sous **`/home/node/.n8n-files/km/`**, lorsque
le répertoire du déploiement est `/n8n`. Dans FastAPI, le montage existant
correspond à `/app/n8n_files/km/`.

Ces données de traitement sont distinctes de **`UI_chat/km/docs/`**, réservé à
la documentation de développement. Aucun stockage métier `km` n'est exposé
par Nginx.

## Environnement et démonstration

- L'EC2 AWS INNO est externe au SI Sofinco. L'état distant n'est pas vérifié
  par les fichiers de ce dépôt.
- Les connecteurs n8n vers Outlook Sofinco et Teams seront probablement
  indisponibles. Des emails et interactions sont envisagés ; leurs simulations
  éventuelles devront être explicites dans les futurs écrans et scénarios.
- Le PDF prévoit SharePoint et une approbation Teams/Outlook. Dans INNO, le
  stockage de fichiers EC2 et une validation via l'interface ou des simulations
  constituent l'adaptation proposée, encore à développer. Le mapping des listes
  Glossaire/Référentiels et des archives de versions reste à définir.
- Le POC doit démontrer la faisabilité de la chaîne et la capacité d'un LLM,
  initialement OpenAI, à réaliser les tâches demandées.
- L'orchestrateur initial est n8n ; la cible pourra être Microsoft Power
  Automate. Garder les responsabilités documentées pour permettre cette évolution.
- Il s'agit d'un POC, sans engagement de périmètre MVP à cette étape.

## Publication et vérification

**Contrainte d'intégration :** le `docker-compose.yml` restauré par l'utilisateur
est la référence. Ajouter uniquement `km-front` sur le réseau HTTP existant
`frontend`, avec `config.ini` et `statuses.json` en lecture seule. Ne modifier aucun
service existant (n8n, postgres_n8n, pgv, FastAPI, Nginx), ni leurs volumes,
variables, dépendances ou réseaux. Ne pas reconstituer la stack à partir d'une
ancienne description d'architecture. Les commandes d'exploitation KM ciblent
`km-front` avec `--no-deps` et conservent le nom de projet Compose existant.

Le front KM est servi par le conteneur `km-front`, utilisant
`christianpro1982/km:${KM_IMAGE_TAG:-latest}` depuis Docker Hub, sans `build` dans
Compose. `Dockerfile.km_front` et `nginx/km.conf` restent sur le poste de
développement pour construire l’image. La publication manuelle est préparée
par `scripts/publish-km.sh VERSION` (amd64/arm64, version et latest) ; aucune
publication réelle n’a été effectuée. Le Nginx commun transmet `/km/` au service interne,
sans nouveau port hôte. Son image exclut désormais KM grâce à
`Dockerfile.nginx_front.dockerignore`. Le proxy résout `km-front` à l'exécution
via le DNS Docker (validité 5 s) pour supporter sa recréation avec une nouvelle IP.

Seuls les fichiers du front et ses images sont copiés dans l'image KM ; ni docs,
ni PDF, ni tests, ni données métier. Les chemins de contexte, docs et tests sont
bloqués en HTTP dans les deux serveurs. Les URL inexistantes retournent 404,
sans repli vers le chatbot ; `/km` redirige vers `/km/`.

`UI_chat/km/config.ini` est monté en lecture seule et servi sous `/km/config.ini`
avec `Cache-Control: no-store`. Il ne contient que des paramètres publics.
Une modification en place ne nécessite pas de reconstruction ; un remplacement
du fichier peut nécessiter une recréation du conteneur pour renouveler le montage.
Le contrôle de santé vérifie l'accueil statique, sans appel n8n.

Première migration après publication de l’image et transfert des configurations :

```sh
docker compose pull km-front
docker compose up -d --no-deps km-front
```

Si le routage KM n’est pas encore installé sur EC2, intégrer uniquement ce
routage au Nginx existant et le reconstruire avec `--no-deps nginx` ; sinon
ne pas le recréer. Son bloc Compose reste inchangé.

Évolutions ultérieures après publication depuis le poste de développement :

```sh
docker compose pull km-front
docker compose up -d --no-deps km-front
```

Pour KM, seuls `UI_chat/km/config.ini` et `UI_chat/km/statuses.json` sont
nécessaires comme fichiers source sur EC2 ; pages, scripts et images viennent de Docker Hub. Les sources restent dans
le dépôt de développement. Ne rien supprimer automatiquement. Le tag peut être
fixé avec `KM_IMAGE_TAG` pour déploiement précis ou retour arrière.

Voir [le guide de déploiement](docs/deployment.md) pour la configuration, la
recréation du montage et la recette HTTP. Les tests locaux ont vérifié les deux
images, 29 routes directes et via proxy, les 404, le montage en lecture seule,
la mise à jour de configuration sans reconstruction, le healthcheck et la
récupération DNS avec changement d'IP sans redémarrage du proxy. Les tests
navigateur simulés couvrent les cinq largeurs et l'absence de requêtes externes.
Aucun workflow distant ni déploiement EC2 n'a été exécuté. Maintenir ce contexte
lors de l'ajout de points d'entrée ou de contrats d'échange.
