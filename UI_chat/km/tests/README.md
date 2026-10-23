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
bloque les requêtes du navigateur vers l'hôte distant n8n et les URL HTTPS
(notamment le logo distant). Il ne modifie pas `config.ini` ni les données métier.
Le serveur de test et l'onglet de test sont fermés à la fin ; fermer ensuite
l'instance Chrome lancée pour le test.

Couverture : sélection par bouton et drop, doublons, ordre séquentiel, accord de
remplacement et révision, échec intermédiaire, conflit, reprise manuelle, réponse
inexploitable, suppression annulée/refusée/confirmée, toggle et ses trois URL,
configuration absente, icônes de repli, clavier et largeurs 1 920, 1 366, 1 100,
768 et 390 px. Les captures sont écrites sous `/tmp/km-upload-<largeur>.png`.
La recette réelle EC2 reste à effectuer après raccordement des workflows ; les
tests locaux ne prouvent pas l'atomicité du contrôle des révisions dans n8n.
