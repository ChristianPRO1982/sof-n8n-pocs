# 02_format_controls — Contrôles de format et template

**Page associée :** [02_format_controls](../pages/02_format_controls.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/02_format_controls/`.
**État :** interface de consultation développée ; webhooks de lecture à raccorder.
Le workflow de contrôle reste lancé manuellement dans n8n.

## Objectif et provenance

**PDF :** AUTO 1 impose des contrôles déterministes **sans LLM** sur les styles,
sections obligatoires, tableaux et acronymes, avec un rapport JSON et une
reproductibilité garantie ([page 2](Poc_n8n.pdf#page=2)). La préparation du YAML
des règles y est attribuée à Yasmine ; le YAML n'est pas fourni dans le PDF.

## Entrées

- Word relu pris en charge depuis le [dépôt](01a_upload_files.md), avec accès
  à sa source même si elle a rejoint [l'archive](01b_processed_files.md).
- Template et règles de contrôle YAML à fournir. La page
  [00a_templates](00a_templates.md) permet de préparer leur dépôt via des webhooks
  dédiés ; leur utilisation par les contrôles reste à définir.
- Éventuels glossaire et référentiels requis par les règles ; leur contenu n'est
  pas spécifié, même si ces listes sont prévues dans le socle du PDF.

## Traitements et sorties

**PDF :** vérifier les éléments structurels par des règles explicites, produire
le rapport JSON et obtenir OK pour le document 1, KO pour le document 2.

Les résultats alimentent le [rapport consolidé](04_reports.md), avec les résultats
de la [vérification des écarts](03_deltas.md). Les conditions de poursuite ou
d'arrêt avant la recherche d'écarts en cas de KO ne sont pas fixées par le PDF.

**Proposition INNO/interface :** rattacher chaque constat à sa règle et à un
emplacement du document, et identifier la version des règles utilisée pour
expliquer le résultat. Ces champs ne constituent pas un schéma JSON arrêté.

## Interactions humaines et interface prévues

**PDF :** un blocage consolidé doit retourner au rédacteur pour correction.

**Proposition INNO/interface :** vue des contrôles, résultats OK/KO, motifs et
localisation des problèmes ; consultation du rapport JSON. Le choix des règles
ne doit pas être remplacé par une évaluation opaque du LLM.

## Critères de vérification

- Document conforme : résultat OK ; document non conforme : résultat KO.
- À document, règles et configuration identiques, les résultats sont reproductibles.
- Aucun appel LLM ne décide de la conformité de format/template.
- Les constats sont disponibles pour le rapport et la correction peut être
  contrôlée de nouveau selon les mêmes règles.

## Points à définir

Template, YAML et versionnement ; règles précises pour styles, tableaux et
acronymes ; parser Word ; structure du rapport JSON ; classification des
anomalies et critère de blocage ; comportement face à un Word illisible ;
conditions de poursuite de la chaîne et interface de consultation.

[Vue d'ensemble](README.md) · [Écarts](03_deltas.md) · [Rapport](04_reports.md)

## Consultation des rapports — MVP novembre 2026

Le WF `n8n/01 format control.json` traite un seul fichier avec un seul template
par exécution : LIMIT est une contrainte permanente. Les `.first()` sont adaptés
à ce fonctionnement. Après enregistrement des résultats et fin correcte du WF,
la source est déplacée vers le dossier de fichiers traités correspondant. Aucun
dossier error n'est prévu pour ce MVP. L'interface 01b gère déjà les dossiers
`01_processed_files` et `01_legacy_processed_files`.

La page 02 consulte les fichiers présents dans `02_format_controls/`. Le rapport
fourni par l'utilisateur porte le suffixe `.rapport.md` mais contient du **JSON** :
`[{template:{text},doc:{text},quality:{…}}]`. L'objet seul est également accepté.
Le nom du fichier n'est pas utilisé pour imposer un parseur Markdown.

Contrats attendus par cette nouvelle interface, à raccorder dans n8n :

| Action | Configuration | Requête et réponse |
| --- | --- | --- |
| Liste | `KM_FORMAT_CONTROLS_LIST_WEBHOOK_PATH` | GET sans paramètre → `{ok:true,files:[{name,size,revision}]}` ; tableau contenant cet objet également accepté |
| Voir | `KM_FORMAT_CONTROLS_VIEW_WEBHOOK_PATH` | GET avec `name` encodé → contenu JSON du rapport, objet ou tableau à un élément, sans enveloppe `ok` |

Les noms doivent être uniques, tailles entières en octets, révisions non vides.
Le serveur limite les lectures au dossier 02 et valide le nom avant de lire.
La base n8n est commune ; les clés sont isolées de
celles des sources, archives et templates. Aucun repli. Délais 30 s sans relance
automatique ; aucune requête distante n'est effectuée pour développer la page.

Trois toggles list/view/delete indépendants, OFF à chaque arrivée, y compris via l'historique.
Seul list recharge la liste ; view change le mode sans réseau. Les opérations
concurrentes sont bloquées. Une actualisation efface le détail précédent ; une
liste en erreur désactive la consultation et ne simule aucun fichier disponible.

Le détail affiche structure_score, completeness_score, sections_expected,
fields_expected/present/filled, sections_missing, fields_missing, fields_unfilled,
ainsi que le texte du document, du template et le JSON brut. Le contenu est rendu
comme texte, sans HTML exécutable. Une réponse incomplète ou invalide est refusée.
« Non documenté » compte comme non renseigné dans le calcul du WF ; aucun seuil
OK/KO ni validation métier n'est déduit de ces scores par le navigateur.
Aucun upload, déplacement, déclenchement du contrôle ou workflow
supplémentaire n'est créé par cette page. Les exigences Word/YAML ci-dessus
restent la cible documentaire, au-delà du contrôle Markdown actuel.

Recette locale simulée : `python3 UI_chat/km/tests/format-controls-browser.py`.


Le rapport s'ouvre dans l'encadré du fichier sélectionné, avec bordure de 3 px
en tirets et fond bleu clair. Un seul rapport est ouvert ; changer de fichier
supprime les résultats précédents. Fermer supprime le contenu sans réseau ;
chaque réouverture relit le rapport sans cache. Attente et erreur restent dans
l'encadré ; une erreur permet de réessayer manuellement. Actualiser ou changer
de mode efface les résultats. Les boutons exposent leur ouverture au clavier
et aux technologies d'assistance.


### Suppression d'un rapport

Chaque ligne propose « Supprimer », après Voir/Fermer. Confirmation avec le nom
exact du rapport ; annuler n'émet aucune requête. Clé dédiée
`KM_FORMAT_CONTROLS_DELETE_WEBHOOK_PATH`, initialement vide : le bouton est
désactivé si elle manque, sans repli. Le toggle WH - delete est indépendant,
OFF à chaque arrivée ; sa bascule ne fait aucun appel et conserve le rapport ouvert.

POST JSON `{name,expected_revision}` ; confirmation `{ok:true,name}` avec nom
exact (objet ou tableau à un élément accepté). Délai 30 s sans relance automatique.
Le serveur doit limiter la suppression au dossier `02_format_controls` et vérifier
la révision avant de supprimer. L'action concerne uniquement le rapport.

Les opérations concurrentes sont bloquées. La liste est relue selon son propre
mode après chaque tentative, et le détail est effacé. Un refus ou une réponse
invalide ne vaut pas suppression confirmée. La lecture peut rester indisponible
après l'action ; ce cas est signalé séparément du résultat de suppression.
Le workflow de suppression reste à raccorder ; aucun rapport distant n'est
supprimé pendant les tests locaux.
