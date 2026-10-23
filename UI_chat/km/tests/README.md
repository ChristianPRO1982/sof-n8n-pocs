# Vérifier le dépôt KM localement

Ces tests ne nécessitent aucun workflow et ne doivent appeler aucun webhook distant.
Node.js 22 ou plus est nécessaire pour les scripts de test, pas pour servir le site.

Tests du module d'accès (contrats, chemins, icônes et timeout) :

```sh
node UI_chat/km/tests/upload-api.test.mjs
```

Tests navigateur avec Chrome/Chromium : lancer une instance isolée, puis utiliser
l'URL WebSocket `DevTools listening on…` affichée dans le terminal :

```sh
google-chrome --headless --remote-debugging-port=0 --user-data-dir=/tmp/km-upload-browser-tests about:blank
node UI_chat/km/tests/upload-browser.mjs 'ws://127.0.0.1:PORT/devtools/browser/IDENTIFIANT'
```

Adapter le chemin du navigateur si nécessaire. Le test sert les fichiers statiques
et une configuration dédiée en mémoire sur localhost, simule les réponses n8n et
utilise une configuration dédiée simulée sous `/km/config.ini` et charge les
images locales. Il bloque les requêtes vers l'hôte distant n8n et les URL HTTPS,
et échoue si une requête HTTP(S) hors du serveur local est tentée. Il ne modifie pas `config.ini` ni les données métier.
Le serveur de test et l'onglet de test sont fermés à la fin ; fermer ensuite
l'instance Chrome lancée pour le test.

Couverture : sélection par bouton et drop, doublons, ordre séquentiel, accord de
remplacement et révision, échec intermédiaire, conflit, reprise manuelle, réponse
inexploitable, suppression annulée/refusée/confirmée, toggle et ses trois URL,
configuration absente, icônes de repli, clavier et largeurs 1 920, 1 366, 1 100,
768 et 390 px. Les captures sont écrites sous `/tmp/km-upload-<largeur>.png`.
La recette réelle EC2 reste à effectuer après raccordement des workflows ; les
tests locaux ne prouvent pas l'atomicité du contrôle des révisions dans n8n.

## Vérifications Docker isolées

Depuis la racine du dépôt, avec accès au moteur Docker :

```sh
docker compose config --quiet
docker build -f Dockerfile.km_front -t km-front-local-check .
docker build -f Dockerfile.nginx_front -t km-gateway-local-check .
python3 UI_chat/km/tests/docker-smoke.py
```

Le script crée un réseau Docker interne temporaire et des conteneurs de test
avec des noms uniques. Il utilise un faux service n8n, une copie temporaire de
la configuration et aucun volume métier. Aucun port n'est publié ; les requêtes
HTTP locales utilisent les IP du réseau de test (accès depuis l'hôte requis).
Les conteneurs et le réseau sont supprimés à la fin ; les deux images de test
restent disponibles pour une nouvelle exécution.

Il vérifie les configurations Nginx, 28 routes (accueil, modèle, onze pages et
assets) directement et via le proxy, les 404, le montage en lecture seule,
`Cache-Control: no-store`, l'exclusion des docs/tests/PDF et l'absence de KM dans
l'image commune. Il vérifie aussi la modification de configuration sans
reconstruction, le healthcheck, puis recrée KM avec une autre IP et vérifie la
récupération du proxy sans le redémarrer. Les services habituels du projet ne
sont ni démarrés ni modifiés par ce script.

## Configuration Docker Hub et publication simulée

```sh
bash -n scripts/publish-km.sh
python3 UI_chat/km/tests/dockerhub-config.py
```

Ces tests vérifient que Compose choisit `christianpro1982/km:latest` par défaut,
un tag explicite via `KM_IMAGE_TAG`, aucun `build` pour KM, son rattachement
exclusif au réseau HTTP `frontend`, aucune dépendance et un unique montage
`config.ini` en lecture seule. Un faux exécutable Docker vérifie les commandes du script de
publication : deux architectures et deux tags, refus d'un tag existant, d'une
erreur d'authentification, d'un builder incompatible ou d'une version invalide.
Aucune authentification, construction ou publication réelle n'est déclenchée.

## Image téléchargée après publication

Depuis le poste de développement, après publication manuelle et contrôle des
manifestes décrit dans [le guide](../docs/deployment.md) :

```sh
docker pull christianpro1982/km:0.1.0
docker build -f Dockerfile.nginx_front -t km-gateway-local-check .
KM_TEST_FRONT_IMAGE=christianpro1982/km:0.1.0 python3 UI_chat/km/tests/docker-smoke.py
```

Cela teste le contenu et le routage de l'image téléchargée pour l'architecture
locale, sans toucher aux services habituels. La présence des deux architectures
se vérifie séparément avec `docker buildx imagetools inspect`. Cette recette
nécessite une publication préalable ; elle n'a pas été exécutée lors de la
préparation des scripts.
