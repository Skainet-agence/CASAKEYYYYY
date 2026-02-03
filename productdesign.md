# Product Design Document : EstateFix AI

## 1. Vision du Produit
**EstateFix AI** est une application web premium destinée aux conciergeries de luxe. Elle permet de transformer des photos immobilières amateurs ("prises à l'arrache") en visuels de haute qualité (Standard "Architectural Digest", 4K, Éclairage parfait), tout en intégrant des modifications structurelles ou décoratives via une interface simplifiée.

L'objectif est de masquer la complexité du "Prompt Engineering" pour l'utilisateur final en proposant une expérience visuelle et assistée par IA.

---

## 2. Parcours Utilisateur (User Flow)

### 2.1 Authentification
- **Accès** : Login simple par mot de passe (Application privée/Interne).
- **Cible** : Clients professionnels (Conciergerie) non-experts en tech.

### 2.2 Importation (Upload)
- **Action** : L'utilisateur charge une photo brute (mauvais éclairage, désordre, cadrage iPhone).
- **Validation** : Prévisualisation simple et confirmation.

### 2.3 Interface d'Édition "Coloriage" (Inpainting)
L'utilisateur n'écrit pas de longs prompts complexes. Il interagit visuellement :
1.  **Outils** : 5 couleurs disponibles, correspondant à 5 "calques" ou "zones" d'intérêt.
2.  **Action** : L'utilisateur colorie grossièrement les zones à modifier sur la photo.
3.  **Instruction** : Pour chaque couleur/zone, une petite fenêtre de chat s'ouvre. L'utilisateur y tape quelques mots-clés simples (ex: "Canapé cuir blanc", "Enlever les cartons", "Ciel bleu").
4.  **Validation** : Lancer le traitement.

### 2.4 Traitement Backend (Le "Cœur" du système)
Le processus est invisible pour l'utilisateur mais se déroule en plusieurs étapes orchestrées :

1.  **Analyse & Reformulation (Gemini)** :
    *   Analyse de l'image source et des zones coloriées.
    *   Interprétation des mots-clés simplistes de l'utilisateur.
    *   **Output** : Génération d'un prompt technique ultra-détaillé, structuré (Markdown/Anglais), optimisé pour le modèle de génération d'image (détails de textures, lumières, styles).

2.  **Génération & Upscaling (Nano Banana Pro)** :
    *   **Amélioration Globale** : Traitement de la photo pour atteindre une qualité 4K, corriger le flou, et balancer la luminosité (Intérieur cosy ou Extérieur ensoleillé).
    *   **Inpainting** : Application des modifications demandées (zones coloriées + prompts reformulés par Gemini) sur l'image haute définition.

### 2.5 Résultat & Affinage
- **Affichage** : Présentation "Avant/Après" ou vue directe du résultat 4K.
- **Chat de Retouche (Seed Persistante)** :
    - Un chat est disponible sous l'image générée.
    - L'utilisateur peut demander des ajustements (ex: "Change le coussin en bleu").
    - **Processus** : La *seed* de l'image est conservée. Gemini reformule la demande de retouche et renvoie l'instruction à *Nano Banana Pro* pour une modification cohérente sans régénérer toute l'image aléatoirement.

---

## 3. Architecture Technique

### 3.1 Frontend
- **Framework** : React + Vite.
- **UI Kit** : TailwindCSS (Design Premium, Minimaliste, "Luxe").
- **Canvas** : `react-konva` ou `fabric.js` pour la gestion des calques de coloriage sur l'image.

### 3.2 Services AI
- **Cerveau (Logique & Prompts)** : **Google Gemini** (via `@google/generative-ai`).
    - Rôle : "Traducteur" d'intention utilisateur vers langage machine expert.
- **Moteur Visuel (Rendu)** : **Nano Banana Pro** (API).
    - Rôle : Upscaling, Denoising, Inpainting High-Fidelity.

### 3.3 Backend / Infrastructure
- **Hosting** : Netlify / Vercel.
- **Stockage** : Firebase Storage (pour les images temporaires et finales) ou solution équivalente.
- **Orchestration** : Serverless Functions (Netlify Functions) pour sécuriser les clés API et orchestrer les appels entre Gemini et Nano Banana Pro.

---

## 4. Design & UX "Premium"
- **Esthétique** : Interface épurée, animations fluides (framer-motion), typographie moderne.
- **Feedback** : Indicateurs de chargement sophistiqués ("Analyse de la structure...", "Optimisation de la lumière...", "Rendu final...") pour faire patienter l'utilisateur pendant le traitement GPU.
