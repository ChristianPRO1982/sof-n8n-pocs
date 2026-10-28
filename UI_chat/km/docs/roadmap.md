Tu as déjà réalisé la première étape : l'upload des documents sources et des templates.

En reprenant ton cahier des charges et en intégrant la transformation d'un document historique en plusieurs fiches atomiques, je découperais le POC en 9 macro-étapes.

### 1. Réception des documents et des templates&#x20;

Déjà réalisé

L'utilisateur dépose un ou plusieurs documents sources et les templates de destination. n8n récupère les fichiers et leurs informations pour démarrer le traitement.

### 2. Extraction et compréhension du contenu

Transformer les documents sources en texte exploitable (Markdown par exemple). Une IA analyse ensuite leur contenu pour identifier les différentes connaissances métiers présentes.

### 3. Découpage et génération des fiches atomiques

L'IA répartit les informations dans les différents templates disponibles. Elle produit autant de fiches que nécessaire, en évitant les doublons et en conservant les références au document d'origine.

### 4. Contrôle automatique de conformité

Un traitement déterministe vérifie chaque fiche : rubriques obligatoires, structure du template, champs manquants, formats et règles de cohérence. Les contrôles doivent être reproductibles, sans dépendre du LLM.

### 5. Vérification des écarts par IA

Un LLM compare les fiches produites aux informations sources et, lorsque disponible, aux documents de référence. Il identifie les contradictions, les informations perdues et les éventuelles règles obsolètes.

### 6. Rapport consolidé et proposition des métadonnées

n8n rassemble les résultats des contrôles dans un rapport unique. L'IA propose les métadonnées de chaque fiche : résumé, domaine métier, mots-clés, audience, version et autres champs prévus dans le cahier des charges.

### 7. Validation humaine

Les fiches, leurs métadonnées et le rapport sont présentés à un responsable métier. Celui-ci peut approuver les documents, demander des corrections ou justifier certains écarts, par exemple via Teams ou Outlook.

### 8. Publication des documents

Les fiches validées sont déposées dans Connaissance validée sur SharePoint. Elles sont ensuite converties en Markdown et publiées dans AI Ready, accompagnées d'un JSON de métadonnées. Les anciennes versions sont archivées.

### 9. Journalisation et recette

Chaque traitement est tracé : documents entrants, fiches générées, anomalies, validations et publications. Le POC est testé sur les trois scénarios du cahier des charges : document conforme, document non conforme et écart justifié.

### Une distinction importante

Ton cahier des charges PDF prévoit surtout le contrôle et la publication d'un document Word déjà rédigé, tandis que ton expérimentation actuelle ajoute une fonction de génération de plusieurs fiches à partir d'un document historique.

L'étape 3 constitue donc une extension du cahier des charges initial, mais elle s'intègre naturellement avant les contrôles.

Je te conseille de construire les workflows n8n dans cet ordre, en validant chaque macro-étape avant de passer à la suivante.