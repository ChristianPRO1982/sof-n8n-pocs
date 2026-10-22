# Contexte du projet pour les agents de développement

Dernière mise à jour : **22 octobre 2026** (socle et documentation fonctionnelle de `km` ; vérification générale du socle le 19 octobre 2026). Ce document décrit les fichiers locaux ; il ne certifie pas l’état du déploiement AWS ni des workflows distants.

## Lire en début de session

Ce fichier est le point d’entrée destiné à Codex et aux autres agents. Le lire avant d’explorer le dépôt, puis ouvrir uniquement les fichiers concernés par la demande. Appliquer aussi les éventuelles instructions `AGENTS.md` applicables et les consignes de l’utilisateur.

Maintenir ce document lorsqu’une modification change l’architecture, les points d’entrée, les contrats d’échange ou les commandes de développement. Les fichiers exécutés font référence si cette synthèse devient obsolète.

## Finalité et séparation des responsabilités

Site web professionnel hébergé sur AWS, servant de socle à plusieurs projets et démonstrateurs Sofinco. **n8n porte les workflows métier ; `UI_chat/` porte les interfaces web.**

Le principal cas d’usage présent est un assistant destiné aux conseillers clientèle sur les aides à la rénovation : MaPrimeRénov’, MaPrimeAdapt’, ANAH. La chaîne documentaire vise la sélection de sources, le scraping, les embeddings, la recherche RAG et la génération de réponses sourcées. Un autre module, **Taxon**, propose l’envoi de fichiers et la consultation des fichiers à traiter ou traités.

**Knowledge Manager**, identifiant unique **`km`** en minuscules, est un module POC indépendant pour transformer les documents Sofinco en connaissances atomiques, normalisées, liées et validées humainement. Lire `UI_chat/km/CONTEXT.md` avant d'y intervenir. L'accueil présente la légende des cinq statuts de développement et onze écrans provisoires partagent un gabarit responsive, un menu redimensionnable mémorisé dans le navigateur et un tiroir sur petits écrans. Le champ `status` du registre de pages pilote les pastilles dans les deux menus ; aucun workflow ni webhook `km` n'est implémenté.

Le parcours fonctionnel documenté de `km` prend pour référence `UI_chat/km/docs/Poc_n8n.pdf` : Word relu → contrôles de format sans LLM → écarts et rapport → métadonnées par règles/LLM → validation métier → Word publié → conversion Markdown sans LLM → couple Markdown/JSON AI Ready, avec journal transversal. Lire [la vue d'ensemble et les onze fiches](UI_chat/km/docs/README.md) avant le développement métier. `01_processed_files` est un ajout utilisateur : archivage des sources après prise en charge initiale, avant validation. Le multiformat et le découpage atomique restent des extensions. Les interactions Microsoft 365 du PDF sont à adapter au POC INNO ; les schémas et règles encore absents sont explicitement signalés.

- **Interface** : saisie, appels aux webhooks, chargement/progression, rendu Markdown, liens, erreurs et réinitialisation.
- **n8n** : orchestration, accès aux données, ingestion, RAG, appels LLM et contenu des réponses.
- **FastAPI** : fonctions complémentaires, notamment vérification de présence de PDF et extraction de pages.
- **PostgreSQL / pgvector** : stockage relationnel et capacité de stockage vectoriel. Les connexions effectives des workflows ne sont pas vérifiables dans ce dépôt.

Le fonctionnement initial du chatbot est un cycle question/réponse, sans mémoire de conversation ni persistance du chat côté navigateur. Un `sessionId` est envoyé mais ne suffit pas à établir un fonctionnement multi-tour. Les échanges peuvent être enregistrés côté workflows, selon l’avertissement prévu dans l’interface.

## Architecture présente dans le dépôt

```text
Navigateur
  → Nginx :80
      ├─ /                 → fichiers statiques de UI_chat/
      ├─ /n8n/             → service n8n:5678
      ├─ /km/              → module Knowledge Manager, fichiers statiques de UI_chat/km/
      └─ /taxon/docs/      → documents générés, montage en lecture seule

Interfaces → webhooks n8n → workflows métier / données / LLM

Services Docker complémentaires :
  postgres : pgvector/pgvector:pg16, port hôte 5432
  fastapi  : Python 3.11, Uvicorn sur le port interne 8000
```

L’hébergement EC2 Ubuntu est décrit dans `INSTALL_N8N_AWS.md`. Le déploiement fourni repose sur Docker Compose ; aucun provisionnement AWS automatisé n’est présent dans les fichiers suivis.

### Services et persistance

| Service Compose | Construction / image | Particularités |
| --- | --- | --- |
| `nginx` | `Dockerfile.nginx_front`, base `nginx:alpine` | Copie `UI_chat/` dans l’image ; charge `nginx/default.conf` ; expose le port 80. |
| `n8n` | `n8nio/n8n:2.18.5` | URL publique et préfixe `/n8n/` définis dans Compose ; fuseau `Europe/Paris`. |
| `postgres` | `pgvector/pgvector:pg16` | Volume nommé `pgdata`, base et utilisateur configurés dans Compose. |
| `fastapi` | `Dockerfile` | Dépendances gérées avec `uv` ; montage de `n8n_files/` ; aucun port hôte publié dans le Compose actuel. |

Volumes n8n : `./n8n_data` → `/home/node/.n8n`, `./n8n_files` → `/home/node/.n8n-files`. Le même répertoire `n8n_files/` est accessible à FastAPI sous `/app/n8n_files`. Nginx lit `./n8n_files/taxon/docs` sous `/var/www/taxon-docs`.

## Carte des fichiers : où intervenir

| Besoin | Fichiers à ouvrir |
| --- | --- |
| Chatbot de la page d’accueil | `UI_chat/index.html` |
| Portail d’administration et liens vers les variantes | `UI_chat/admin.html` |
| Variantes de chat | `UI_chat/chats/chat1.html`, `chat2.html`, `chat3.html`, `chat4.html` |
| Variante de pré-test avec webhook dédié | `UI_chat/chats/chat3_v11.html` |
| Moteur RAG n8n V12, copie de la v11 avec webhook de test dédié | `UI_chat/chats/chat3_v12.html` |
| URLs des webhooks, animation, debug | `UI_chat/config.ini` |
| Contrôle d’accès de l’interface | `UI_chat/auth.js`, `UI_chat/access.html`, `UI_chat/md5.html` |
| Gestion des sources documentaires | `UI_chat/sources/sources.html` |
| Gestion des classifications | `UI_chat/sources/thematiques.html`, `sousthematiques.html`, `categories.html` |
| Taxon : envoi de fichier / choix Prod ou Test | `UI_chat/taxon/index.html` |
| Taxon : listes de fichiers et liens vers les documents | `UI_chat/taxon/liste.html` |
| Knowledge Manager (`km`) : contexte, accueil, PDF de référence et documentation fonctionnelle | `UI_chat/km/CONTEXT.md`, `UI_chat/km/index.html`, `UI_chat/km/docs/README.md` puis fiche de l'étape concernée |
| Knowledge Manager (`km`) : gabarit, styles, registre de navigation et écrans provisoires | `UI_chat/km/template.html`, `UI_chat/km/assets/km.css`, `UI_chat/km/assets/km.js`, `UI_chat/km/pages/` |
| API PDF et routes UI complémentaires | `app/main.py` |
| Routage web et exposition des documents | `nginx/default.conf` |
| Services, images, ports, volumes | `docker-compose.yml`, `Dockerfile`, `Dockerfile.nginx_front` |
| Schéma SQL et exemples de données | `BDD/renov_lien.sql`, `BDD/exemple_insert_renov_lien.sql`, `BDD/sources_rag_augmente.csv` |
| Dépendances Python | `pyproject.toml`, `uv.lock`, `.python-version` |

Le front est écrit en **HTML/CSS/JavaScript natif**, avec beaucoup de code intégré aux pages. Aucun projet npm, framework front ou étape de compilation JavaScript n’est présent. Les variantes partagent du code copié mais divergent : identifier la page demandée avant de modifier les autres.

Les fichiers `.old`, `index.html.prod` et `index.html.maintenance` sont des variantes conservées. Nginx sert `index.html` à la racine ; le suffixe `.prod` ne sélectionne pas automatiquement la version de production. `Dockerfile.ui_chat` existe mais n’est pas utilisé par le Compose actuel.

Le module `km` est accessible directement sous `/km/`, avec redirection depuis `/km`. Ses fichiers inexistants retournent 404 sans repli vers le chatbot. Son contexte Codex et son dossier `docs/` sont bloqués en HTTP. Le stockage de traitement EC2 `/n8n/n8n_files/km/` est distinct de cette documentation ; le montage existant le rend accessible dans n8n sous `/home/node/.n8n-files/km/`. Aucun montage web des données `km` n'est ajouté.

## Configuration et contrats d’échange

### Configuration du navigateur

`UI_chat/config.ini` est chargé par `fetch`, avec plusieurs chemins candidats selon la profondeur de la page. Il est servi au navigateur : ne pas y ajouter de secrets serveur.

- `WEBHOOK_URL` : chatbot principal et plusieurs variantes ; pointe actuellement vers une URL `webhook-test`.
- `CHAT3_V11_WEBHOOK_URL` : variante `chat3_v11.html`.
- `CHAT3_V12_WEBHOOK_URL` : variante `chat3_v12.html`, accessible depuis la carte « MOTEUR RAG N8N V12 » de l’administration ; webhook `webhook-test/e5ab868a-abbf-432a-8835-fa883d07cd38`.
- `SOURCES_WEBHOOK_C/R/U/D` : CRUD des sources.
- `SOURCES_TAG_LINK_WEBHOOK_C/D` : associations entre sources et classifications.
- `TAGS_WEBHOOK_C/R/U/D` : CRUD des classifications.
- `TAXON_WEBHOOK_PROD_URL`, `TAXON_WEBHOOK_TEST_URL` : envoi de fichiers Taxon.
- `TAXON_FILES_WEBHOOK_URL` : consultation des listes Taxon.
- `DEBUG_MODE`, `ANIMATION`, `TYPEWRITER_SPEED_MS` : comportement de l’interface.
- `ADMIN_ACCESS_KEY` : valeur attendue par le contrôle d’accès côté navigateur ; `auth.js` attend une empreinte MD5 de 32 caractères hexadécimaux. La valeur versionnée est un placeholder.

Des URLs de repli sont aussi codées dans certaines pages. Pour modifier une destination, rechercher la clé ou l’URL dans la page concernée et dans Compose ; ne pas supposer que tout est centralisé.

### Chatbot

Requête HTTP `POST`, corps JSON :

```json
{"sessionId":"identifiant généré côté navigateur","message":"question utilisateur"}
```

Réponse simple prévue :

```json
{"answer":"Réponse en Markdown, sources incluses"}
```

Plusieurs pages savent également lire des flux et des formats historiques n8n. Le chatbot principal reconnaît notamment les événements `{"type":"progress","message":"…"}` et `{"type":"final","answer":"…"}`. Les parseurs diffèrent selon la variante : lire `readResponsePayload`, `parseStreamEventLine` et les fonctions associées avant de changer le contrat. Conserver le rendu Markdown, les sources et la gestion des liens.

### Administration et Taxon

Les pages de classifications utilisent des requêtes JSON `POST` de forme `{ "action": ..., "table": ..., "data": ... }`. Vérifier les fonctions `apiCall` et de construction du payload dans la page visée pour les valeurs et champs exacts.

Taxon envoie un `FormData` contenant un champ **`file`** par `POST` au webhook Prod ou Test sélectionné. La page des listes effectue des `GET` sur le webhook de listes avec un contexte distinguant fichiers à traiter et fichiers traités. Les documents traités sont proposés via `/taxon/docs/`.

### API Python

Routes principales déclarées dans `app/main.py` :

- `GET /health` : `{"status":"ok"}`.
- `GET /pdf/exists/{filename}` : présence d’un PDF.
- `GET /pdf/extract/{filename}/{startPage}/{endPage}` : extraction et téléchargement, pages numérotées à partir de 1, bornes inclusives.
- Routes complémentaires pour `/taxon`, les fichiers partagés UI et la configuration ; montage statique de `/taxon`.

Les PDF sont recherchés dans `n8n_files/poc2/pdf/` puis `n8n_files/pocs2/pdf/`. L’extraction écrit un fichier voisin nommé `<nom>_p<début>-<fin>.pdf`. Les bibliothèques présentes sont `pdftools` et `PyPDF2<3`.

## Modèle relationnel fourni

`BDD/renov_lien.sql` définit :

- `renov_lien` : URL, titre, score de 0 à 10, dates et indicateur `smart_scraping`.
- `renov_thematique` et `renov_sousthematique` : hiérarchie des thématiques.
- `renov_categorie` : catégories.
- `renov_lien_sousthematique` et `renov_lien_categorie` : associations avec suppression en cascade.

Certains commentaires parlent de `renov_liens` au pluriel ; le schéma fourni utilise **`renov_lien`**. Ce SQL n’est pas monté comme script d’initialisation dans Compose. Ne pas en déduire le schéma exact de la base distante ni les tables vectorielles.

## Développement et vérifications ciblées

Depuis la racine, pour installer les dépendances Python verrouillées :

```bash
uv sync --frozen
```

Pour démarrer l’API localement avec les fichiers UI présents :

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Pour construire et lancer la stack Docker locale, lorsque la tâche nécessite son exécution :

```bash
docker compose up -d --build
```

Les fichiers UI et la configuration Nginx sont copiés dans l’image : un simple redémarrage ne prend pas en compte leurs modifications. Reconstruire le service `nginx` pour les appliquer dans Docker.

Contrôle de cohérence Compose sans démarrer les services : `docker compose config --quiet`.

Aucune suite de tests ni CI n’est présente dans les fichiers suivis lors de cette vérification. Adapter la validation au changement : syntaxe, affichage et navigation pour l’UI ; réponses HTTP et cas limites pour l’API. Un appel aux webhooks configurés peut déclencher de vrais workflows distants, y compris depuis un front lancé localement ; utiliser des réponses simulées pour une vérification purement locale.

## Limites connues et points à vérifier selon la tâche

- **Workflows absents du dépôt** : aucun export n8n versionné. La logique interne, les prompts, les credentials, les tables effectivement utilisées et les modèles LLM nécessitent un export ou un accès distinct.
- **Déploiement non inspecté** : pas de vérification de l’instance AWS, de ses règles réseau, des sauvegardes ni des workflows actifs. Les URLs locales ne prouvent pas l’état distant.
- **Documentation historique** : `INSTALL_N8N_AWS.md` mentionne notamment un service `n9n` et une fonction HTML→PDF absents du code actuel. Le README mentionne des variables JWT qui ne correspondent pas à une authentification implémentée dans `app/main.py`.
- **Routage FastAPI** : Nginx ne déclare actuellement aucun proxy vers FastAPI. Ses routes PDF ne sont donc pas exposées par cette configuration web.
- **Image FastAPI à vérifier avant déploiement** : le Dockerfile copie `app/`, mais pas `UI_chat/`, alors que le montage `StaticFiles` exige `UI_chat/taxon/` au démarrage. Le Compose ne fournit pas non plus ce répertoire au conteneur.
- **Contrôle d’accès UI** : `auth.js` vérifie une empreinte MD5 et un cookie côté navigateur (`ui_chat_admin_auth`, 30 jours). Ce mécanisme ne démontre pas une protection serveur des webhooks ou des documents.
- **Configuration d’hébergement** : le Compose décrit HTTP sur une IP publique, des cookies n8n non sécurisés et des identifiants PostgreSQL de démonstration. Ne pas considérer cette configuration comme une description vérifiée de la sécurité de production.

Ces constats documentent l’existant ; ils ne constituent pas une demande de correction automatique hors du périmètre de la tâche.

## Documentation complémentaire à consulter au besoin

- `UI_chat/instructions.md` : intention UX et contrat initial du chatbot Sofinco ; à confronter aux variantes actuelles.
- `organisation.md` : schéma de la chaîne sources → scraping → embeddings → chatbot.
- `INSTALL_N8N_AWS.md` : historique des POC et procédure d’installation EC2/Docker.
- `POC_V4.md` : courte note sur les métadonnées de pages scrapées.
- `README.md` : quelques commandes et variables historiques.

Pour une demande courante, ce contexte et les fichiers de la fonctionnalité concernée doivent suffire. Élargir l’exploration uniquement lorsqu’une dépendance ou une incohérence le justifie.
