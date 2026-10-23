# Knowledge Manager — contexte Codex

L'identifiant unique du projet est **`km`**, toujours en minuscules : dossiers,
routes, clés de configuration et futurs webhooks.

## Lire avant d'intervenir

- `../../IA_CONTEXT.md` : architecture générale et limites du socle partagé.
- `../../nginx/default.conf` : routage HTTP, notamment `/km/`.
- `../../Dockerfile.nginx_front` et `../../docker-compose.yml` : construction,
  services et montages des fichiers.
- `../config.ini` : configuration navigateur existante, à consulter lors de la
  future intégration n8n ; aucune clé ni aucun webhook `km` n'est encore défini.
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

À cette étape, `index.html` explique les cinq pastilles de suivi du développement dans un gabarit partagé avec
onze écrans provisoires sous `pages/`. Chaque écran affiche le titre de l'étape
et `Contenu à venir`. Les fichiers statiques et le logo distant sont chargés, sans
appel métier ni contrôle d'accès supplémentaire. Aucun workflow, webhook,
connecteur, template métier ou écran de traitement fonctionnel n'est implémenté.

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
fonctionnent aussi depuis les pages imbriquées. Le logo Sofinco est chargé depuis
`https://raw.githubusercontent.com/ChristianPRO1982/sof-n8n-pocs/refs/heads/main/UI_chat/logo-sofinco.png`
par le script partagé pour toutes les pages. Les onze pages actuelles
restent statiques ; le gabarit n'implique aucun chargement de données métier.

### Pastilles de développement

Dans le bandeau contextuel, la pastille se place immédiatement à gauche du titre
de la page ; dans le menu général, elle précède le libellé du lien.

Le champ `status` de chaque entrée du registre `pages` est l'unique valeur à
modifier pour mettre à jour sa pastille dans le menu général et dans le menu
contextuel de la page. Les statuts sont déclaratifs ; ce ne sont pas des résultats
de contrôles automatiques ou des états d'exécution n8n.

| Valeur `status` | Couleur | Signification |
| --- | --- | --- |
| `not_started` | Noir | Aucun développement encore lancé pour cette partie |
| `bugs` | Rouge | Bugs détectés et en cours d'investigation |
| `development` | Bleu | Développement en cours |
| `testing` | Orange | Phase de test |
| `validated` | Vert | Validé |

L'accueil affiche l'émoji 🏠 à la place d'une pastille dans le menu général et
le bandeau ; il ne porte pas de statut de développement. Les onze étapes sont
initialement en `not_started`.
Un statut absent ou inconnu (notamment le modèle non enregistré) utilise
`not_started`. Les libellés sont centralisés dans `statuses`, les couleurs dans
`assets/km.css` et le rendu dans `statusBadge`. Les pastilles ont une infobulle
et un libellé accessible ; seule la page d'accueil affiche la légende complète,
générée depuis les mêmes définitions via `[data-km-status-legend]`.

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

### Dépôt multiformat — spécification validée, non implémentée

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

Les capacités n8n à prévoir sont lister, déposer, autoriser un remplacement et
supprimer dans `01_upload_raw_files/`. Aucun webhook ni contrat JSON n'est fixé
ou implémenté ; les limites de taille et règles techniques de nommage restent
à définir. Le succès du stockage est distinct de la prise en charge métier et
de l'archivage. La recette décrite dans la fiche reste à exécuter.

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
contrats d'échange et fonctionnalités décrits comme cibles ne sont pas implémentés.

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

Nginx sert `UI_chat/km/` sous `/km/` et redirige `/km` vers `/km/`. Les fichiers
inexistants du module retournent 404, sans repli vers le chatbot. `CONTEXT.md`
et `docs/` sont bloqués en HTTP et ne font pas partie de l'interface publique.

L'image Nginx copie déjà `UI_chat/`. Depuis le répertoire du déploiement, après
transfert des changements, reconstruire uniquement le service web :

```bash
docker compose up -d --build --no-deps nginx
```

Vérifier `/km/` (200 et légende des cinq statuts), la concordance des pastilles
dans les deux menus, les onze liens et leur état actif,
`/km` (301 vers `/km/`), une URL inexistante (404), `/km/CONTEXT.md` et `/km/docs/`
(404). Vérifier les tailles 1 920, 1 366, 1 100, 768 et 390 px, les bornes et la
persistance du menu ainsi que l'ouverture, la fermeture et le focus du tiroir.
Aucun appel aux webhooks distants n'est nécessaire pour ces contrôles. Maintenir
ce contexte lors de l'ajout de points d'entrée ou de contrats d'échange.
