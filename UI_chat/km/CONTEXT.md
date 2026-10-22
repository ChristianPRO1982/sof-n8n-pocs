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
- `docs/` : emplacement réservé à la documentation détaillée à venir.

Les chemins ci-dessus sont relatifs à ce fichier. Les fichiers exécutés font
référence si le contexte devient obsolète.

## Objectif et état initial

POC INNO de transformation des documents Sofinco (PDF, Word, etc.) volumineux et
parfois redondants en connaissances atomiques, normalisées, structurées et liées
entre elles. Préserver la traçabilité vers les documents et passages sources.

Le module est indépendant des autres projets, avec n8n mutualisé. Les interfaces
sont en HTML/CSS/JavaScript natifs ; n8n porte l'orchestration et les traitements
métier. Aucun framework front ni nouveau service n'est nécessaire.

À cette étape, `index.html` affiche uniquement `Hello world!`, sans appel réseau
ni contrôle d'accès supplémentaire. Aucun workflow, webhook, connecteur, template
métier ou écran de traitement n'est implémenté. Ne pas supposer qu'ils existent.

## Chaîne cible

1. Importer les documents sources et les découper en fichiers plus petits suivant
   des templates fournis ultérieurement.
2. Qualifier les fichiers et produire leurs métadonnées via un LLM.
3. Soumettre les résultats à une validation humaine.
4. Transformer les connaissances validées en Markdown et JSON de métadonnées.
5. Déposer les résultats dans `09_AI_Ready`, la base de connaissances exploitable.

Les règles détaillées des contrôles, deltas, rapports, liens et statuts restent à
documenter avant le développement métier. Les noms de dossiers seuls ne
constituent pas un contrat de workflow.

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

Vérifier `/km/` (200 et texte `Hello world!`), `/km` (301 vers `/km/`), une URL
inexistante (404), `/km/CONTEXT.md` et `/km/docs/` (404). Aucun appel aux webhooks
distants n'est nécessaire pour ces contrôles. Maintenir ce contexte lors de
l'ajout de points d'entrée ou de contrats d'échange.
