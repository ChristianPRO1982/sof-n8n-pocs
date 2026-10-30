# 00a_templates — Gestion des templates

**Page associée :** [00a_templates](../pages/00a_templates.html).
**État :** interface développée, statut `development` ; raccordement n8n à réaliser.

## Objectif et provenance

**Décision utilisateur :** gérer les fichiers templates avec les mêmes fonctions
que le [dépôt des sources](01a_upload_files.md), via des webhooks distincts.
La page est placée juste après l’accueil, avant les pages historiques
`00b_upload_legacy_files` et `00c_processed_legacy_files`, puis l’entrée standard
`01a_upload_files` et `01b_processed_files`.
Le dépôt confirme le stockage du template ; son utilisation dans les contrôles
ou les traitements suivants n'est pas implémentée par cet écran.

## Interface et fonctionnement

- Liste serveur à gauche sur ordinateur, au-dessus de la sélection sous 768 px ;
  chargement initial, actualisation manuelle et après les opérations.
- Tous types de fichiers, sélection multiple par bouton ou glisser-déposer,
  icônes locales selon l'extension, nom, taille et retrait individuel.
- Un seul fichier par nom dans la sélection avant « Accord ». Les fichiers déjà
  présents sont signalés ; l'accord autorise leur remplacement à la révision annoncée.
- Lot figé, envoi séquentiel avec confirmation par fichier, poursuite après échec,
  bilan et reprise manuelle après actualisation et nouvel accord.
- Suppression individuelle confirmée avec le nom ; retrait uniquement après
  confirmation serveur conforme. Aucun succès simulé ni relance automatique.
- Quatre bascules indépendantes « WH - list », « WH - upload », « WH - view », « WH - delete »,
  initialement OFF, y compris au retour par l'historique. Seule la bascule de liste
  recharge la liste ; les actualisations suivent toujours son mode.

Les styles et le contrôleur sont partagés avec le dépôt des sources. Le préfixe
est choisi explicitement par l'identifiant de page : `KM_TEMPLATES` ici,
`KM_FILES` pour les sources. Les lots et les bascules restent propres à chaque page.

## Configuration n8n

La base publique `KM_WEBHOOK_BASE_URL` de `../config.ini` est commune. Ajouter
les chemins relatifs dans les clés suivantes, initialement vides :

```ini
KM_TEMPLATES_LIST_WEBHOOK_PATH=
KM_TEMPLATES_UPLOAD_WEBHOOK_PATH=
KM_TEMPLATES_DELETE_WEBHOOK_PATH=
KM_TEMPLATES_VIEW_WEBHOOK_PATH=
```

Le mode test remplace `/webhook/` par `/webhook-test/`, en conservant le chemin
propre à l'opération. Aucun repli vers les clés `KM_FILES_*` n'est permis.
Sans configuration, la sélection locale fonctionne, les opérations serveur sont
indisponibles et un message l'indique. Ne mettre aucun secret dans cette configuration.

## Contrats d'échange

Les contrats et règles de confirmation sont identiques à ceux de la
[fiche du dépôt](01a_upload_files.md), appliqués aux seuls templates :

| Opération | Requête | Confirmation attendue |
| --- | --- | --- |
| Liste | GET | `{"ok":true,"files":[{"name":"modele.docx","size":123,"revision":"v1"}]}` |
| Envoi | POST multipart : `file`, `overwrite`, `expected_revision` si remplacement | `{"ok":true,"file":{"name":"modele.docx"}}` |
| Suppression | POST JSON : `name`, `expected_revision` | `{"ok":true,"name":"modele.docx"}` |

La liste exige des noms uniques, une taille entière en octets et une révision
opaque non vide. La confirmation d'envoi vérifie le nom, sans exiger taille ni
révision. Une collision non autorisée ou une révision modifiée doit retourner
un conflit HTTP 409 ; aucun écrasement silencieux. Délais : 30 s pour liste et
suppression, 120 s par envoi. Une confirmation inexploitable ou une interruption
signale un résultat incertain à vérifier avant toute nouvelle tentative.

## Stockage et traitements ultérieurs

Le bouton « Voir », à gauche de « Supprimer », ouvre un GET vers
`KM_TEMPLATES_VIEW_WEBHOOK_PATH` avec le nom encodé en paramètre `name`, dans
un nouvel onglet sans confirmation (`noopener,noreferrer`). Il suit uniquement
« WH - view », initialement OFF ; il est désactivé pendant une opération, sans
liste valide ou sans configuration de consultation. Une clé vide ne bloque pas
le dépôt. Le toggle conserve les lots et résultats et ne lance aucun appel.
Le contrat binaire et les réglages n8n sont ceux de la
[consultation historique](00b_upload_legacy_files.md#réglages-n8n), en utilisant
le chemin et le dossier propres aux templates. Le workflow reste à configurer.

La [préparation historique](00b_upload_legacy_files.md) devra employer ces modèles
pour produire les nouveaux documents, avec traçabilité des templates et versions.
Cette consommation reste à développer ; déposer un template ne la déclenche pas.

Le stockage physique et les workflows templates restent à définir. Aucun dossier
métier `00a_templates` n'est créé ni supposé existant sur EC2. Les workflows devront
isoler les templates des sources et viser le même stockage templates en test et
production. La sélection, le versionnement métier et la consommation des templates
par les contrôles restent à définir avec les traitements concernés.

## Vérifications

Les [tests locaux](../tests/README.md) utilisent des réponses n8n simulées :
liste, sélection et doublons, envoi séquentiel, remplacement, conflits, échecs,
reprise, suppression, bascules indépendantes, icônes, clavier et cinq largeurs.
Ils vérifient les clés dédiées, l'absence de repli vers les sources lorsque la
configuration templates est vide et la compatibilité du dépôt des sources.
La recette avec les workflows réels reste à réaliser après raccordement.

[Vue d'ensemble](README.md) · [Dépôt des sources](01a_upload_files.md) · [Contrôles de format](02_format_controls.md)
