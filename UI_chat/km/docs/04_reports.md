# 04_reports — Rapport consolidé

**Page associée :** [04_reports](../pages/04_reports.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/04_reports/`.
**État :** spécification cible ; écran provisoire sans consolidation fonctionnelle.

## Objectif et provenance

**PDF :** le rapport consolidé organise l'orientation du document : blocage vers
le rédacteur, écart vers une justification, sinon passage `en_validation`
([page 3](Poc_n8n.pdf#page=3)). L'EPIC le situe après les contrôles et la
vérification des écarts, avant les métadonnées (page 1).

## Entrées

- Résultats des [contrôles de format](02_format_controls.md).
- Résultats de la [vérification des écarts](03_deltas.md).
- Document source, référence et versions associées aux résultats.
- Justifications humaines lorsqu'un écart est constaté.

## Traitements et sorties

**PDF :** consolider les résultats et appliquer les orientations suivantes.

| Situation | Orientation prévue |
| --- | --- |
| Blocage | Retour rédacteur pour correction |
| Écart | Demande de justification |
| Sinon | `en_validation` |

Le PDF ne fournit pas de règles détaillées de priorité pour un document cumulant
blocage et écart, ni d'acteur d'acceptation des justifications. Il ne précise pas
non plus l'instant exact de `en_validation` par rapport à la proposition des
[métadonnées](05_metadata.md), placée ensuite dans l'EPIC. Ces décisions restent
à fixer avant d'implémenter l'ordonnancement.

**Proposition INNO/interface :** conserver dans un rapport consultable les
constats, les justifications, l'orientation et les liens vers leurs preuves.
Enregistrer les décisions et reprises dans le [journal](10_tracking_journal.md).

## Interactions humaines et interface prévues

**PDF :** correction par le rédacteur en cas de blocage ; justification d'un écart.

**Proposition INNO/interface :** synthèse des contrôles et écarts, zone de
justification, indication des actions attendues et navigation vers les éléments
détaillés. Un échange simulé doit être présenté comme tel en environnement INNO.

## Critères de vérification

- Le cas non conforme produit un retour rédacteur avant publication.
- Le cas avec écart expose une justification enregistrée et examinable.
- Le cas conforme peut poursuivre vers métadonnées et validation.
- Les résultats absents ou en erreur ne sont pas présentés comme un rapport
  complet et conforme ; l'orientation de ces cas reste à spécifier.

## Points à définir

Format du rapport ; définition du blocage ; priorité des situations cumulées ;
critères et acteur d'acceptation d'une justification ; transition `en_validation` ;
gestion des résultats incomplets ; reprise des contrôles après modification.

[Vue d'ensemble](README.md) · [Métadonnées](05_metadata.md) · [Validation métier](06_business_validation.md)
