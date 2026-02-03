---
description: C'est un workflow utilisé pour auditer les applications
---

## Objectif

Réaliser un audit **haut niveau** de l’UI/UX, de la logique applicative et de la fiabilité d’une application ou d’un code généré par IA, selon les standards 2026 de **Visual Excellence** et **Responsible App**.

Ce workflow permet de :

- Détecter les défauts UX, structurels et fonctionnels.
- Générer un rapport d’audit clair et exploitable.
- Déclencher une boucle d’auto-correction jusqu’à atteindre un niveau production-ready.

---

## Étape 1 — Vérification de l’Environnement

1. Ouvrir le navigateur intégré et accéder à l’URL locale de développement.
2. Vérifier :
    - La stabilité du build.
    - Que le compilateur Next.js 16 a terminé le rendu initial.
    - L’absence d’erreurs bloquantes dans la console.
3. Vérifier la connectivité :
    - API opérationnelles.
    - Connexion base de données valide.
    - Absence de timeouts ou d’erreurs réseau.

---

## Étape 2 — Audit d’Excellence Visuelle

Analyser l’interface selon les **standards visuels non négociables** :

### 1. Architecture de l’Information (IA)

- L’interface est-elle organisée autour des objectifs utilisateurs ?
- Le contenu est-il compréhensible en moins de 3 secondes ?

### 2. Grille Modulaire Bento

- Le layout est-il structuré dans une grille dense, modulaire et claire ?
- Les espacements sont-ils cohérents et standardisés ?

### 3. Effets de Profondeur & Glassmorphism

- Les effets de flou, transparence et profondeur sont-ils cohérents ?
- La hiérarchie visuelle guide-t-elle naturellement l’attention ?

### 4. Système Typographique

- Les polices sont-elles lisibles, hiérarchisées et réactives ?
- La structure visuelle est-elle immédiatement compréhensible ?

### 5. Audit de la Sidebar

- La sidebar est-elle visuellement sobre ?
- Les éléments sont-ils regroupés par intention utilisateur plutôt que par fonctionnalités techniques ?

---

## Étape 3 — Audit d’Interaction & de Confiance

Effectuer un **stress test UX** :

### 1. Feedback Immédiat

- Toutes les interactions réagissent-elles en moins de 100 ms ?

### 2. États Système

Vérifier l’existence et la qualité de :

- **Loading State** : Skeleton loaders ou placeholders.
- **Empty State** : Message clair + CTA.
- **Error State** : Messages non accusateurs et récupérables.
- **Success State** : Notifications ou confirmations visuelles.

### 3. UI Optimiste

- L’interface se met-elle à jour immédiatement avant la réponse serveur ?

### 4. Vérification d’Intention

- Les modales sont-elles réservées aux actions critiques ou destructrices ?
- Les popovers et inline edits sont-ils utilisés pour les actions rapides ?

---

## Étape 4 — Rapport d’Audit

Générer un rapport structuré sous le format suivant :

### Squad Status

- **Score Visuel :** [1–10]
- **Score Fonctionnel :** [1–10]
- **Score Confiance :** [1–10]

### Visual Wins

- Liste des éléments UI remarquables et différenciants.

### Critical Fails (Correction Immédiate Requise)

- Grilles cassées.
- Problèmes de navigation.
- Bruit visuel.
- Problèmes d’accessibilité.
- Incohérences UX majeures.

### Bugs Logiques & de Confiance

- Endpoints cassés.
- États de chargement manquants.
- Interactions ambiguës.
- Bugs UX bloquants.

---

## Étape 5 — Boucle d’Auto-Correction Récursive

### Seuil de Qualité

**9/10 minimum sur chaque catégorie.**

### Action si un score < 9 :

1. **Diagnostic**
    - Analyser les « Critical Fails » et les bugs listés dans le rapport.
2. **Assignation & Correction**
    - Si **Visuel < 9** → Assumer le rôle de **Design Lead** et refactoriser le layout, la hiérarchie et le style.
    - Si **Fonctionnel < 9** → Assumer le rôle de **Builder** et corriger la logique, les flux et les API.
    - Si **Confiance < 9** → Assumer le rôle de **Product Engineer** et renforcer les états, messages et feedbacks.
3. **Validation**
    - Relancer automatiquement la commande `audit`.
    - **Condition de sortie :**
        - Tous les scores ≥ 9
        - OU après 3 tentatives échouées → escalade humaine avec statut `Blocked`.

---

## Étape 6 — Synchronisation Finale

Lorsque tous les scores ≥ 9 :

1. Mettre à jour `PLAN.md` → `Verified & Polished`
2. Commit du code avec le préfixe :
[AUTO-HEALED]
3. Valider la version comme **production-ready**.

---

## Mode d’Exécution

Ce workflow doit être exécuté :

- Après toute génération IA.
- Après chaque refactor majeur.
- Avant toute mise en production.

Objectif : **zéro dette UX, zéro dette produit, zéro dette logique.**