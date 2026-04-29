# Interface ChatBot "MaPrimeRénov’" — POC Sofinco

---

## 1. Contexte

Sofinco souhaite démontrer un chatbot IA capable d’aider les conseillers clientèle à répondre à des questions sur les aides à la rénovation (MaPrimeRénov’, MaPrimeAdapt’, ANAH).

Le moteur du chatbot est entièrement géré par n8n :
- ingestion documentaire
- RAG
- sélection des sources
- appel LLM
- génération de la réponse

L’interface web n’a aucun rôle métier.  
Elle sert uniquement à fournir une expérience utilisateur claire, crédible et démontrable.

---

## 2. Objectif

Créer une interface web de chatbot moderne, simple et crédible, inspirée des outils professionnels (type Copilot), avec une logique de **séduction métier**.

L’interface doit permettre :

1. à un conseiller de poser une question rapidement ;
2. de visualiser une phase de traitement compréhensible ;
3. de lire une réponse claire issue de documents officiels ;
4. de recommencer facilement avec une nouvelle question.

---

## 3. Public cible

Conseillers clientèle Sofinco.

Usage réel :

> “Mon client m’a posé une question.  
> J’utilise le chatbot pour obtenir rapidement des éléments de compréhension afin de répondre.”

L’outil est un **support interne rapide**, pas un outil de production automatique de réponse.

---

## 4. Architecture

```txt
Utilisateur (navigateur)
   ↓
Interface web (HTML / JS)
   ↓
Webhook n8n (POST)
   ↓
Workflow RAG / LLM
   ↓
Réponse JSON (Markdown)
   ↓
Affichage dans l’interface
```

---

## 5. Contraintes du POC

* Un seul aller / retour :

  1. question utilisateur
  2. réponse n8n
* Aucune mémoire de conversation
* Aucune persistance côté front
* Pas de multi-tour
* Pas d’édition de réponse

Après réponse :
→ l’utilisateur doit recommencer une nouvelle question

---

## 6. Contrat API (interface → n8n)

### Requête

```json
{
  "sessionId": "string",
  "message": "string"
}
```

### Réponse attendue

```json
{
  "answer": "markdown string"
}
```

Important :

* `answer` contient du Markdown complet
* les sources sont déjà incluses dans ce Markdown
* aucun retraitement n’est fait côté front

---

## 7. Responsabilités

### Interface web

L’interface doit gérer uniquement :

* affichage UI
* saisie utilisateur
* appel webhook
* état de chargement
* affichage du Markdown
* transitions visuelles
* reset

### n8n

n8n gère :

* logique métier
* RAG
* fiabilité des réponses
* sources
* format du Markdown

---

## 8. Design UX global

### Style

* inspiré de Copilot / outils professionnels
* chat centré (type ChatGPT)
* moderne et soigné
* micro-interactions légères
* intégration subtile du branding Sofinco

### Ton visuel

* sérieux
* lisible
* rapide à comprendre
* zéro effet “gadget”

---

## 9. Structure de l’interface

### Zone principale

* écran centré
* largeur limitée (lisibilité)
* historique minimal :

  * question utilisateur
  * réponse assistant

### Éléments présents

* champ de saisie
* bouton envoyer
* zone chat
* bouton "Nouvelle question"

---

## 10. Comportement utilisateur

### Étape 1 — Question

* l’utilisateur saisit une question
* envoi immédiat au webhook
* désactivation du champ de saisie

---

### Étape 2 — Phase d’attente (élément clé UX)

Affichage d’un bloc externe au chat (pas une bulle).

Ce bloc représente le traitement en cours.

#### Contenu fixe :

1. Compréhension de la question
2. Recherche dans la documentation
3. Rédaction de la réponse

#### Comportement visuel :

* animation de progression (type serpentin / loader évolutif)
* mise en avant de l’étape active
* impression que le système travaille réellement

---

### Étape 3 — Réception de la réponse

Quand la réponse arrive :

* disparition complète du bloc d’attente
* affichage de la réponse dans le chat

---

## 11. Affichage de la réponse

### Rendu

* affichage fidèle du Markdown
* aucun retraitement du contenu
* respect des titres, listes, liens

### Animation

* effet machine à écrire (progressif)
* lecture confortable
* vitesse contrôlée

---

## 12. Fin de cycle

Après affichage complet :

* champ de saisie désactivé
* affichage d’un bouton :

```txt
Nouvelle question
```

### Reset

* suppression du chat
* retour à l’état initial
* aucune mémoire conservée

---

## 13. Gestion des erreurs

En cas d’erreur :

* message simple et clair :

```txt
Une erreur est survenue. Veuillez réessayer.
```

* bouton pour relancer

---

## 14. Vie privée / avertissement

Afficher un message visible :

> Ce chatbot est un démonstrateur.
> Les échanges peuvent être enregistrés à des fins d’analyse et d’amélioration.
> Merci de ne pas saisir de données personnelles ou confidentielles.

---

## 15. Objectif de démonstration

L’interface doit permettre de montrer :

* rapidité d’accès à l’information
* crédibilité des réponses
* transparence (sources dans le Markdown)
* simplicité d’usage

Le but est de donner l’impression d’un **outil déjà utilisable en interne**.
