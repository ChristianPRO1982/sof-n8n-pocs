# 10_tracking_journal — Journal de suivi

**Page associée :** [10_tracking_journal](../pages/10_tracking_journal.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/10_tracking_journal/`.
**État :** spécification cible ; écran provisoire sans journal fonctionnel.

## Objectif et provenance

**PDF :** le journal figure dans le parcours (page 1) et les listes du socle
SharePoint (page 2). La validation doit être complètement journalisée
([page 2](Poc_n8n.pdf#page=2)) et la publication AI Ready met à jour le journal
([page 3](Poc_n8n.pdf#page=3)). Le bilan demande le versionnement des workflows,
la qualité, les faux écarts, le coût et la latence LLM
([page 4](Poc_n8n.pdf#page=4)).

**Décision de cadrage utilisateur :** dans INNO, le stockage EC2 remplace le
besoin de dépendre d'une liste SharePoint accessible. Le dossier cible n'impose
pas à lui seul le format ou le moteur de persistance du journal.

## Entrées

Événements et résultats du parcours : prise en charge, archivage de la source,
contrôles, écarts, rapport, métadonnées, décisions humaines, publication du Word,
conversion et publication du couple AI Ready.

## Traitements et sorties

Le journal est **transversal**, même si son dossier porte le préfixe `10`. Il
ne faut pas attendre la fin de chaîne pour enregistrer une décision ou un échec.

**PDF :** tracer la validation et la publication AI Ready, puis fournir des
éléments pour la recette et le bilan.

**Proposition INNO/interface :** enregistrer des événements reliés au document,
à sa version et à l'exécution n8n, avec date, étape, résultat et références des
artefacts. Les décisions humaines pourraient identifier l'acteur, le motif et
les justifications. Ces éléments sont une proposition de contenu, pas un schéma
de données définitif ni une preuve d'authentification Sofinco.

Sorties attendues : historique consultable du parcours et éléments permettant
de reconstituer les scénarios de [recette](README.md). Les versions de workflows
et les mesures LLM peuvent nécessiter des artefacts de bilan complémentaires ;
leur emplacement et leur format restent à décider.

## Interactions humaines et interface prévues

**PDF :** les interventions métier doivent être traçables ; une recommandation
cible et un Go/No Go concluent le bilan.

**Proposition INNO/interface :** historique par document et exécution, filtres
par étape et résultat, accès aux rapports et décisions, distinction visible des
interactions simulées. Le journal doit permettre de comprendre un refus ou un
arrêt sans le confondre avec une publication réussie.

## Critères de vérification

- Les trois scénarios et le refus des métadonnées peuvent être reconstitués à
  partir des événements et de leurs résultats associés.
- L'archivage initial de la source et les versions publiées sont distinguables.
- Les approbations, refus et reprises ne se remplacent pas silencieusement.
- La réussite AI Ready reste distinguable de la seule publication du Word.
- Les éléments de bilan permettent d'examiner qualité, faux écarts, coût et
  latence, sans les présenter comme des mesures déjà disponibles.

## Points à définir

Format et stockage effectif des événements ; identifiants et corrélation des
exécutions ; horodatage ; contenu des décisions ; visibilité et conservation ;
traitement des erreurs de journalisation ; collecte des mesures LLM ; emplacement
des versions de workflows et organisation du bilan Go/No Go.

[Vue d'ensemble](README.md) · [Archive des sources](01_processed_files.md) · [AI Ready](09_ai_ready.md)
