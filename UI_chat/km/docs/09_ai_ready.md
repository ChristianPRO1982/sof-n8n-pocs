# 09_AI_Ready — Publication Markdown et métadonnées

**Page associée :** [09_AI_Ready](../pages/09_ai_ready.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/09_AI_Ready/`.
**État :** spécification cible ; écran provisoire sans export fonctionnel.

## Objectif et provenance

**PDF :** AUTO 5 demande de créer `{doc_id}.md` et `{doc_id}.json`, déposer les
documents dans AI Ready et mettre à jour le journal
([page 3](Poc_n8n.pdf#page=3)). La page 1 fixe comme objectif le Markdown et ses
métadonnées en fin de chaîne.

**Décision utilisateur :** conserver la casse du dossier `09_AI_Ready` sur le
stockage, tout en utilisant `09_ai_ready` pour les noms de la page et de la fiche.

## Entrées

- Markdown produit et contrôlé dans [08_markdown](08_markdown.md).
- [Métadonnées](05_metadata.md) approuvées, cohérentes avec la version du Word
  publiée dans [07_knowledges](07_knowledges.md).
- Règle `doc_id`, JSON Schema et format AI Ready à fournir.

## Traitements et sorties

**PDF :** produire un couple de fichiers portant le même identifiant :

```text
09_AI_Ready/
  {doc_id}.md
  {doc_id}.json
```

Le fichier `.md` porte le contenu ; le `.json` porte les métadonnées associées.
Le PDF ne définit pas de payload final complet. Il ne faut donc pas inventer
ici de clés supplémentaires, de structure enveloppante ou de convention de version.

**Proposition INNO/interface :** vérifier la présence des deux fichiers et leur
cohérence avant de présenter le couple comme disponible. Rattacher le résultat
à la version approuvée et tracer sa publication dans le [journal](10_tracking_journal.md).
Les règles d'écriture, de contrôle final et de reprise restent à définir.

Le dépôt constitue l'aboutissement du périmètre documenté. Une ingestion dans
Sophia, un moteur RAG ou une autre base n'est pas spécifiée par le PDF et n'est
pas supposée réalisée par la présence des fichiers.

## Interactions humaines et interface prévues

**PDF :** aucune approbation supplémentaire n'est décrite à cette étape.

**Proposition INNO/interface :** liste des couples disponibles, consultation du
Markdown et des métadonnées, accès à la source et au suivi de publication.
Les téléchargements éventuels devront passer par un accès à définir : cette
documentation n'expose aucun stockage métier directement par Nginx.

## Critères de vérification

- Chaque export annoncé comme complet comporte `{doc_id}.md` et `{doc_id}.json`.
- Les deux fichiers concernent la même connaissance et la même version approuvée.
- Le JSON respecte le schéma lorsqu'il aura été fourni.
- La publication est tracée ; un fichier manquant ou une écriture échouée n'est
  pas présenté comme un couple complet.
- La version refusée au stade métier ne se retrouve pas publiée dans AI Ready.

## Points à définir

Règle `doc_id` ; format exact du JSON ; encodage et conventions de fichiers ;
versionnement et remplacement des couples ; traitement d'une publication partielle ;
contrôles finaux ; accès UI aux fichiers ; éventuel raccordement en aval, hors
du parcours actuel.

[Vue d'ensemble](README.md) · [Markdown](08_markdown.md) · [Journal](10_tracking_journal.md)
