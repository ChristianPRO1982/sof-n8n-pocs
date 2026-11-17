Oui. Après comparaison des trois fiches avec le PDF original, je trouve que **le moteur de découpage fonctionne bien, mais que la qualité documentaire des sorties reste insuffisante pour une démonstration métier**.

Ce qui est intéressant, c'est que les défauts observés permettent d'identifier assez précisément où améliorer notre workflow n8n.

## **1. Ce qui fonctionne vraiment bien**

La principale réussite est la gestion de l'historique.

Le document original présente plusieurs évolutions du produit entre avril 2024 et octobre 2026. La consolidation du 16 octobre 2026 est explicitement la seule applicable.&#x20;

source_historique_financement_travaux_POC(2).pdf



Nos trois fiches reprennent bien :

- Le montant de **4 000 à 30 000 €** et la durée de **12 à 72 mois**.
- L'éligibilité des propriétaires occupants et des locataires sous conditions.
- Les exclusions actuelles.
- Les sept étapes du processus.
- L'obligation de validation humaine.

Aucune ancienne limite financière ne semble avoir contaminé les fiches produites.

C'est une bonne validation de notre architecture : **LLM pour le classement, code déterministe pour la génération.**

## **2. Les problèmes identifiés**

| Priorité | Problème                                                                      | Mon analyse                            |
| -------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| Haute    | Des champs restent `Non documenté` alors que la source contient l'information | Défaut de répartition du LLM           |
| Haute    | Certaines informations sont rangées dans le mauvais champ                     | Défaut de classement sémantique        |
| Moyenne  | Les fiches ne sont pas totalement autonomes                                   | Limite du découpage sans reformulation |
| Moyenne  | Les informations de provenance ne sont pas correctement remplies              | Limite du contrat de données           |
| Basse    | Présentation Markdown imparfaite                                              | Problème de génération déterministe    |

### **Problème A — Les informations existantes sont parfois perdues pour une fiche**

Quelques exemples frappants :

**Fiche produit**

`Public concerné : Non documenté`

Pourtant, le PDF définit précisément les bénéficiaires.

**Fiche éligibilité**

`Dispositif concerné : Non documenté`

Alors que nous connaissons parfaitement le dispositif : « Crédit Travaux Repère ».

**Fiche procédure**

`Titre / sujet précis : Non documenté`

Alors que le document contient le nom du dispositif et décrit son circuit de traitement.

Ce problème est particulièrement intéressant sur le plan technique.

Notre contrôle `Validate cut plan` vérifie que **chaque fragment possède une destination**, mais il ne vérifie pas que **chaque champ reçoit les informations disponibles**.

Ces deux garanties sont différentes.

### **Problème B — Une mauvaise affectation**

Dans la fiche éligibilité, tu as :

> Justificatifs nécessaires : [...] Aucun seuil de revenus chiffré n'est donné par le présent dossier.

La dernière phrase est bien présente dans le PDF, mais elle relève des conditions d'éligibilité plutôt que des justificatifs.

Le texte est conservé, mais son classement est incorrect.

C'est précisément une erreur que notre vérificateur déterministe ne peut pas détecter facilement sans une nouvelle analyse sémantique.

### **Problème C — Des formulations peu autonomes**

Dans la fiche produit :

> Finalité du produit : Elle finance la rénovation intérieure...

Le pronom « Elle » renvoie à une phrase précédente du document original.

Le résultat reste compréhensible, mais une fiche indépendante devrait plutôt expliciter son sujet.

Cela révèle une limite structurelle de notre choix initial : **copier les fragments sans jamais les réécrire**.

Je ne changerais pas immédiatement cette règle, car elle garantit une forte fidélité à la source. Il faut simplement accepter que fidélité textuelle et qualité rédactionnelle soient deux objectifs différents.

### **Problème D — Provenance mal exploitée**

Les trois fiches affichent :

`Document(s) source(s) : Non documenté`

C'est techniquement décevant puisque notre workflow connaît le nom du fichier initial.

Nous pourrions renseigner ce champ de manière déterministe, sans solliciter le LLM.

Pour les pages et sections, c'est plus compliqué : nous avons perdu la provenance par page dans le Markdown transmis au découpage, alors que le PDF comporte deux pages clairement identifiées.

### **Problème E — Un véritable point de vigilance sur la conservation intégrale**

J'ai également repéré dans le PDF original le pied de page :

> DOCUMENT FICTIF - Usage exclusif de recette technique - Aucune valeur commerciale ou contractuelle

Il figure sur les deux pages du PDF, mais n'apparaît pas dans les trois fiches.&#x20;

source_historique_financement_travaux_POC(2).pdf



Surtout, il était déjà absent du Markdown que nous avions fourni au LLM.

Cela signifie que notre garantie actuelle de 100 % porte sur **le Markdown extrait**, et non sur le PDF original.

Ce n'est pas nécessairement gênant si nous choisissons volontairement d'ignorer les pieds de page, mais il faut bien distinguer ces deux périmètres.

## **3. Mon diagnostic sur l'architecture**

**Extraction PDF → Markdown**

À surveiller

Le périmètre de conservation doit être clarifié.

**Balisage déterministe**

Conservation exacte du Markdown d'entrée.

**Répartition LLM**

À améliorer

Des champs pertinents restent vides ou mal alimentés.

**Validation déterministe**

La couverture et la structure sont vérifiées.

**Génération Markdown**

Les fichiers sont générés conformément au plan.

## **4. Ce que je préconise**

Je ne toucherais pas au moteur de génération pour le moment. Il exécute correctement les instructions reçues.

**Notre principale faiblesse est le contrat entre le LLM et les templates.**

Aujourd'hui, nous demandons au LLM :

*« Pour chaque fragment, choisis une destination. »*

Mais nous ne lui demandons pas explicitement :

*« Pour chaque champ des templates, vérifie que tu as recherché toutes les informations pertinentes du document. »*

Je pense que notre prochaine amélioration devrait être **un contrôle bidirectionnel de la répartition**, toujours dans le même appel LLM :

- Sens 1 : chaque fragment doit avoir une destination — déjà opérationnel.
- Sens 2 : chaque champ du template doit être examiné et recevoir les fragments pertinents lorsqu'ils existent.

Cela ne garantira pas une classification sémantique parfaite, mais devrait réduire sensiblement les faux `Non documenté`.

**Mon verdict :** je garderais l'architecture actuelle, qui est simple et cohérente. Nous avons un bon moteur technique de découpage, mais pas encore un bon moteur de remplissage. C'est maintenant le prompt de répartition qu'il faut améliorer, avant d'envisager un LLM rédacteur supplémentaire.

Je te propose de commencer par cette seule amélioration, puis de comparer les résultats sur le même PDF.