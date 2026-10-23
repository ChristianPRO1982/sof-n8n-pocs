# Déployer KM depuis Docker Hub

L'image **`christianpro1982/km`** est construite et publiée manuellement depuis
le poste de développement. EC2 la télécharge ; aucune construction du front KM
n'est nécessaire sur le serveur.

Le service Compose `km-front` utilise
`christianpro1982/km:${KM_IMAGE_TAG:-latest}`. Le Nginx commun transmet `/km/` à
`km-front:80`. Aucun port hôte supplémentaire ni volume métier n'est ajouté.
L'ajout KM est strictement limité à son bloc de service. Il rejoint le réseau
HTTP `frontend` déjà utilisé par Nginx. Il ne rejoint ni `n8n_database` ni
`business_data`, ne dépend d'aucun autre service et ne crée aucun volume nommé.
Les définitions existantes de n8n, des deux bases, FastAPI et Nginx, leurs
montages, variables, dépendances et réseaux sont conservées telles quelles.

## Sur le poste de développement : vérifier puis publier

Conserver ici les sources KM, `Dockerfile.km_front`, son fichier `.dockerignore`,
`nginx/km.conf`, le script de publication et les tests. L'image embarque pages,
modèle, CSS, JS, logo et icônes PNG. Documentation, PDF, tests et configuration
ne sont pas copiés ; aucun téléchargement GitHub n'est requis à l'affichage.

Prérequis : Docker avec Buildx, accès en écriture au dépôt Docker Hub
`christianpro1982/km`, et builder capable de construire `linux/amd64` et
`linux/arm64`. Créer le dépôt Docker Hub avant la première publication. Sa
visibilité est gérée dans Docker Hub ; si le dépôt est privé, EC2 devra aussi
être authentifié pour télécharger l'image.

Préparation manuelle, une seule fois (réutiliser le builder s'il existe déjà) :

```sh
docker login
docker buildx create --name km-publisher --driver docker-container --use
docker buildx inspect --bootstrap
```

Si le builder existe déjà, le sélectionner avec `docker buildx use km-publisher`.
Aucun mot de passe ni jeton n'est ajouté au dépôt. Conserver l'authentification
dans le mécanisme habituel de Docker.

Avant publication, effectuer les [vérifications locales](../tests/README.md).
Puis, depuis la racine du dépôt, choisir une version encore inutilisée :

```sh
./scripts/publish-km.sh 0.1.0
```

Le script vérifie le builder `docker-container`, consulte le tag de version et
refuse de continuer s'il existe déjà ou si sa disponibilité ne peut pas être
établie. Il construit les deux architectures et publie les tags
`christianpro1982/km:0.1.0` et `christianpro1982/km:latest` pour la même livraison.
Une erreur arrête la commande. Les versions sont conservées : ne jamais
réutiliser un numéro, même pour corriger une livraison. Le script ne protège
pas contre deux publications simultanées ; lancer une seule publication à la fois.
En cas d'échec de publication, vérifier les deux tags avant de poursuivre :
leur mise à jour n'est pas une transaction atomique.

Après publication, contrôler le manifeste :

```sh
docker buildx imagetools inspect christianpro1982/km:0.1.0
docker buildx imagetools inspect christianpro1982/km:latest
```

Les deux doivent désigner la livraison prévue et inclure `linux/amd64` et
`linux/arm64`. Tester également l'image téléchargée selon les instructions de
test avant de mettre à jour EC2. Ce guide et les scripts ne publient rien tant
que la commande de publication n'est pas exécutée explicitement.

## Fichiers à conserver sur EC2

Pour le front KM, seul ce fichier source est nécessaire :

```text
/home/ubuntu/n8n/UI_chat/km/config.ini
```

Il est monté en lecture seule dans `/usr/share/nginx/html/km/config.ini`, servi
sous `/km/config.ini` avec `Cache-Control: no-store`. Il ne contient que des
paramètres publics : `KM_WEBHOOK_BASE_URL` et les trois
`KM_FILES_{LIST,UPLOAD,DELETE}_WEBHOOK_PATH`. La base reste
`http://15.236.66.128/n8n/webhook/` ; les chemins sont à renseigner lorsque les
workflows seront raccordés. Ne pas écraser des valeurs déjà configurées sur EC2
lors du transfert d'un fichier modèle. Le montage exige un fichier existant.

Les HTML, CSS, JS et images KM sur EC2 deviennent inutiles **après migration
vérifiée**. Aucune suppression automatique n'est prévue. Garder `config.ini`,
le fichier Compose et tous les fichiers nécessaires aux autres services.
Conserver aussi `n8n_data/`, `n8n_files/` et les volumes PostgreSQL : ils ne sont
pas remplacés par l'image du front.

## Sur EC2 : première migration

Publier l'image avant cette étape. **Conserver le Compose actuellement utilisé
sur EC2 et y insérer uniquement ce bloc sous `services:`**, au même niveau que
les autres services. Ne pas remplacer les définitions des services existants
par celles d'une ancienne version du dépôt.

```yaml
  km-front:
    image: christianpro1982/km:${KM_IMAGE_TAG:-latest}
    restart: unless-stopped
    volumes:
      - type: bind
        source: ./UI_chat/km/config.ini
        target: /usr/share/nginx/html/km/config.ini
        read_only: true
        bind:
          create_host_path: false
    networks:
      - frontend
```

Le réseau `frontend` existe déjà dans la configuration restaurée. Ne pas modifier
les réseaux ou volumes globaux, ni les blocs des services existants, y compris
le `depends_on` de Nginx. Préparer le fichier de configuration KM avant démarrage.
Conserver le même répertoire, fichier `.env` et nom de projet Compose que la
stack existante pour toutes les commandes.

Le proxy `/km/` est déjà prévu dans `nginx/default.conf`. S'il n'est pas encore
installé sur EC2, intégrer uniquement son routage KM et l'exclusion KM de
`Dockerfile.nginx_front.dockerignore`, sans remplacer le reste de la configuration
Nginx du serveur. Le Dockerfile et les sources des autres interfaces restent
nécessaires à cette construction du Nginx commun.

Depuis le répertoire de déploiement :

```sh
cd /home/ubuntu/n8n
docker compose config --quiet
docker compose pull km-front
docker compose up -d --no-deps km-front
docker compose ps km-front
```

Ces commandes ciblent uniquement KM ; elles ne recréent aucun service existant.
Si le proxy KM n'était pas encore installé, reconstruire uniquement Nginx après
intégration de son routage :

```sh
docker compose up -d --build --no-deps nginx
```

Cette commande optionnelle ne cible ni n8n ni les bases. Si le proxy est déjà
actif, ne pas reconstruire Nginx. Le dépôt privé nécessite un `docker login`
préalable sur EC2. La configuration des services existants reste celle du serveur.

## Sur EC2 : mises à jour et retour arrière

Pour utiliser la dernière livraison, avec `KM_IMAGE_TAG` absent ou égal à
`latest` dans l'environnement et l'éventuel fichier `.env` :

```sh
docker compose pull km-front
docker compose up -d --no-deps km-front
```

Pour déployer une version précise ou revenir à une livraison précédente,
utiliser le même tag pour **les deux commandes** :

```sh
KM_IMAGE_TAG=0.1.0 docker compose pull km-front
KM_IMAGE_TAG=0.1.0 docker compose up -d --no-deps km-front
```

Ces affectations ne persistent pas. Pour conserver ce choix aux prochains
lancements, ajouter ou modifier `KM_IMAGE_TAG=0.1.0` dans le fichier `.env` du
répertoire de déploiement, sans remplacer ses autres paramètres. Revenir à
`latest` demande de modifier ce même paramètre.

Le proxy résout `km-front` via le DNS Docker avec une validité de cinq secondes.
Il récupère une nouvelle IP sans reconstruction ni redémarrage du Nginx commun.
Une courte erreur 502 reste possible pendant la recréation et le renouvellement
DNS. Les mises à jour KM ne redémarrent ni n8n ni PostgreSQL.

Pour modifier seulement les webhooks, éditer `UI_chat/km/config.ini` puis
recharger la page : aucune reconstruction ni publication. Si l'éditeur remplace
le fichier (nouvel inode), recréer le conteneur pour renouveler le montage :

```sh
docker compose up -d --no-deps --force-recreate km-front
```

Appliquer aussi `KM_IMAGE_TAG` à cette commande si une version précise était
sélectionnée temporairement. Le contrôle de santé lit uniquement l'accueil
statique ; il ne teste pas n8n ni les webhooks.

## Recette après déploiement

Vérifier `/km/`, le modèle, les onze liens et les images locales (200), `/km`
(301), `/km/config.ini` (200 et `no-store`), une URL inexistante et les chemins
`/km/CONTEXT.md`, `/km/docs/`, `/km/tests/` (404). Vérifier l'absence de requêtes
GitHub et le responsive. Aucun appel métier n'est requis avec les chemins vides.

Diagnostic :

```sh
docker compose logs --tail=50 km-front nginx
docker compose exec km-front nginx -t
```

Les [tests locaux](../tests/README.md) couvrent les contrats du front, Compose,
le script de publication simulé et le routage Docker isolé. Ils ne remplacent
pas le contrôle des manifestes après publication ni la recette EC2. Aucun
workflow métier n'est ajouté par cette distribution Docker Hub.
