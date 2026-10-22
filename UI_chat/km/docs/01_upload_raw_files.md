# 01_upload_raw_files — Dépôt des sources

**Page associée :** [01_upload_raw_files](../pages/01_upload_raw_files.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/01_upload_raw_files/`.
**État :** spécification cible ; écran provisoire sans dépôt fonctionnel.

## Objectif et provenance

**PDF :** la chaîne commence par le dépôt d'un Word relu dans Documents métier
bruts ([page 1](Poc_n8n.pdf#page=1)). Le socle SharePoint et ses bibliothèques
sont décrits [page 2](Poc_n8n.pdf#page=2).

**Décision utilisateur :** retenir ici le périmètre Word du PDF. Le dépôt
multiformat et le découpage en documents atomiques restent des extensions.
Adapter le stockage au POC INNO sur EC2.

## Entrées

- Word relu par le métier et destiné au parcours de contrôle.
- Template et jeu de test attendus : document conforme, non conforme et avec écart.
- Références et règles nécessaires aux étapes suivantes, à fournir séparément.

Le PDF ne précise ni les extensions Word acceptées ni les limites de taille.

## Traitements et sorties

**PDF :** prendre en charge le document pour lancer les contrôles de
[format/template](02_format_controls.md), puis la suite de la chaîne.

**Décision utilisateur :** après prise en charge initiale et enregistrement des
résultats associés, déplacer la source vers
[01_processed_files](01_processed_files.md). Ne pas attendre AI Ready.

**Proposition INNO/interface :** conserver un lien entre la source déposée, la
prise en charge et les résultats pour suivre le parcours malgré le déplacement.
La définition technique de cette prise en charge et de ses premiers résultats
reste à arrêter ; le dépôt seul ne suffit pas à déclarer la source traitée.

Sorties attendues : source prise en charge, premiers résultats enregistrés,
archive source et éléments de suivi dans le [journal](10_tracking_journal.md).

## Interactions humaines et interface prévues

**PDF :** le document a été relu avant son dépôt ; un retour rédacteur est prévu
si le rapport consolidé révèle un blocage.

**Proposition INNO/interface :** formulaire de dépôt, liste des sources en
attente, accès au résultat de leur prise en charge et aux erreurs éventuelles.
L'interface ne doit pas simuler une réussite d'envoi si aucun webhook n'est branché.

## Critères de vérification

- Un Word conforme et un Word non conforme peuvent chacun entrer dans la chaîne.
- Le dépôt reste distinct de la conformité, de l'approbation et de la publication.
- Le passage dans l'archive intervient après la prise en charge initiale, avec
  accès aux résultats associés ; un traitement ultérieur peut encore être refusé.
- Une correction du rédacteur peut être présentée à nouveau, selon une règle de
  reprise et de versionnement à définir.

## Points à définir

Extensions, taille et nommage des fichiers ; gestion des doublons et versions ;
déclenchement manuel ou automatique ; contrat d'envoi UI/n8n ; contenu des premiers
résultats ; condition exacte de déplacement et comportement en cas d'échec.

[Vue d'ensemble](README.md) · [Archive des sources](01_processed_files.md) · [Contrôles](02_format_controls.md)
