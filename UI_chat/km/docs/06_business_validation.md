# 06_business_validation — Validation métier

**Page associée :** [06_business_validation](../pages/06_business_validation.html).
**Stockage cible EC2 :** `/n8n/n8n_files/km/06_business_validation/`.
**État :** spécification cible ; écran provisoire sans approbation fonctionnelle.

## Objectif et provenance

**PDF :** prévoir une approbation Teams ou Outlook ; l'approbation donne un statut
validé, le refus renvoie en `draft`, avec une journalisation complète
([page 2](Poc_n8n.pdf#page=2)). Le refus des métadonnées est également cité dans
la recette ([page 3](Poc_n8n.pdf#page=3)).

**Décision de cadrage utilisateur :** en environnement INNO externe au SI
Sofinco, les connecteurs Outlook et Teams seront probablement indisponibles.

## Entrées

- Word à examiner et [rapport consolidé](04_reports.md).
- [Proposition de métadonnées](05_metadata.md) et résultat du contrôle de schéma.
- Justifications d'écarts et éléments de référence lorsqu'ils sont applicables.
- Identification de la version soumise à la décision ; le mécanisme reste à définir.

## Traitements et sorties

**PDF :** présenter les éléments au métier, recevoir une approbation ou un refus,
mettre à jour le statut documentaire et journaliser la décision.

- Approbation : passage au statut validé et poursuite vers
  [Connaissance validée](07_knowledges.md).
- Refus : retour `draft` et révision avant une nouvelle présentation.

Le PDF ne fixe pas le code technique du statut « validé », le contenu exact de
la décision ni tous les points de reprise. Une modification du document peut
nécessiter de reprendre les contrôles ; un refus des seules métadonnées peut
conduire à leur révision. Le routage détaillé reste à spécifier.

**Proposition INNO/interface :** validation dans l'interface `km` ou interaction
simulée explicitement signalée. Ce choix ne démontre pas une connexion réelle à
Microsoft 365 ni une identité Sofinco vérifiée.

Sorties attendues : décision rattachée à la version examinée, nouveau statut,
éléments de revue et événement de [journal](10_tracking_journal.md).

## Interactions humaines et interface prévues

**PDF :** la décision est une intervention métier, distincte de la proposition LLM.

**Proposition INNO/interface :** consulter le document, son rapport et ses
métadonnées, approuver ou refuser, et éventuellement commenter la décision.
Les règles de commentaire obligatoire, d'habilitation et de relance ne sont pas
définies ; elles ne doivent pas être présentées comme des exigences du PDF.

## Critères de vérification

- Une approbation est traçable et permet la publication de la version examinée.
- Un refus renvoie en `draft` et ne publie pas la proposition refusée.
- La décision et les modifications ultérieures restent distinguables.
- Une interaction simulée est identifiable, sans faux message d'envoi Outlook
  ou Teams ni validation silencieuse par le LLM.

## Points à définir

Validateurs et identification dans INNO ; périmètre de revue (contenu et/ou
métadonnées) ; code du statut validé ; format des décisions ; commentaires,
notifications et délais ; reprise après refus ; décisions répétées ou concurrentes.

[Vue d'ensemble](README.md) · [Métadonnées](05_metadata.md) · [Connaissance validée](07_knowledges.md)
