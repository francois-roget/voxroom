# VoxRoom — Découpage en sprints

> Rythme : 1 sprint = 1 weekend (samedi + dimanche)
> Durée estimée : 4 sprints pour une v1 démo-ready

-----

## Sprint 1 — Fondations & Auth

**Objectif** : L’infrastructure est en place, le formateur peut se connecter et créer une session.

### Stories

- [ ] Initialiser le projet Next.js 16.2 avec TypeScript et Tailwind
- [ ] Configurer MongoDB Atlas et Mongoose (connexion, modèles User + Session)
- [ ] Intégrer NextAuth.js v5 avec Google Provider
- [ ] Créer le middleware de protection des routes `/(presenter)`
- [ ] Page de login (`/login`) avec bouton “Se connecter avec Google”
- [ ] Page dashboard (`/dashboard`) listant les sessions du formateur (vide pour l’instant)
- [ ] API route `POST /api/sessions` — créer une session (génération du code court)
- [ ] Page de création de session (`/sessions/new`) avec formulaire basique
- [ ] Déployer sur Vercel avec les variables d’environnement configurées

### Démo de fin de sprint

> Le formateur se connecte avec son compte Google, crée une session nommée “Formation React — Avril”, voit le code généré (ex: `AB12`), et retrouve la session dans son dashboard. Le tout est en ligne sur Vercel.

-----

## Sprint 2 — Questions & Participation

**Objectif** : Le cycle de vie complet d’une question fonctionne, sans temps réel pour l’instant.

### Stories

- [ ] Modèles Mongoose `Question` et `Response`
- [ ] Page d’édition de session (`/sessions/[code]/edit`) — ajouter / réordonner / supprimer des questions (MCQ et wordcloud)
- [ ] API routes CRUD pour les questions
- [ ] Page publique “Rejoindre” (`/join`) — saisie du code de session
- [ ] Génération et stockage du `participantId` en localStorage à la première visite
- [ ] Page participant (`/session/[code]`) — affiche la question ouverte et le formulaire de réponse
- [ ] API route `POST /api/responses` — enregistrer une réponse (avec vérification doublon)
- [ ] Page de contrôle (`/sessions/[code]/control`) — boutons Lancer / Fermer une question (sans live pour l’instant)

### Démo de fin de sprint

> Le formateur crée une session avec 2 questions (1 MCQ, 1 wordcloud), ouvre la session, partage le code. Sur un autre appareil, un participant rejoint, voit la question et répond. Le formateur voit la réponse après refresh de sa page de contrôle.

-----

## Sprint 3 — Temps réel & Vue présentateur

**Objectif** : Les résultats s’affichent en live, la vue plein écran pour le vidéoprojecteur est fonctionnelle.

### Stories

- [ ] Intégrer Pusher (configuration, variables d’env, client Pusher dans le projet)
- [ ] Émettre les événements Pusher depuis les API routes (question:opened, question:revealed, question:closed)
- [ ] Abonner la page participant aux événements — mise à jour sans reload
- [ ] Page présentateur (`/present/[code]`) — fond sombre, grandes typos, responsive grand écran
  - État “attente” : code de session + QR code
  - État “question ouverte” : texte + compteur de réponses animé
  - État “résultats révélés” : graphique à barres animé (MCQ) via Recharts
- [ ] Nuage de mots temps réel sur la vue présentateur (react-wordcloud)
- [ ] Panneau de contrôle mis à jour en live (compteur de réponses sans refresh)
- [ ] Bouton “Révéler les résultats” dans le panneau de contrôle

### Démo de fin de sprint

> Laptop à gauche avec la vue présentateur en plein écran, téléphone à droite en vue participant. Le formateur lance une question depuis son panneau de contrôle. La question apparaît instantanément sur les deux écrans. Le participant répond, le compteur s’incrémente en live. Le formateur révèle : les barres s’animent sur le vidéoprojecteur.

-----

## Sprint 4 — Polish, QR Code & démo LinkedIn

**Objectif** : Le produit est propre, documenté et prêt à être montré publiquement.

### Stories

- [ ] Générer et afficher le QR code sur la vue présentateur (qrcode.react)
- [ ] Animations de transition entre les états de la vue présentateur (CSS transitions)
- [ ] Page participant optimisée mobile (tap confortable, feedback visuel immédiat)
- [ ] Historique des sessions et résultats agrégés dans le dashboard
- [ ] Gestion des erreurs (session inexistante, question déjà répondue, session fermée)
- [ ] README complet sur GitHub (setup, stack, screenshots)
- [ ] Domaine custom sur Vercel (`voxroom.app`)
- [ ] Enregistrement de la vidéo démo pour LinkedIn (30 secondes, deux appareils)

### Démo de fin de sprint

> Post LinkedIn avec vidéo démo + lien vers le projet GitHub. App accessible publiquement sur `voxroom.app`, README soigné avec captures d’écran.

-----

## Récapitulatif

|Sprint|Thème                    |Livrable clé                                   |
|------|-------------------------|-----------------------------------------------|
|S1    |Fondations & Auth        |Connexion Google + création de session en ligne|
|S2    |Questions & Participation|Cycle complet sans temps réel                  |
|S3    |Temps réel & Présentateur|Vue plein écran + live polling fonctionnel     |
|S4    |Polish & Publication     |App publique + démo LinkedIn                   |

-----

## Backlog post-v1 (idées pour la suite)

- Export PDF des résultats d’une session
- Timer visible sur la vue présentateur
- Mode “quiz” avec score par participant
- Thèmes visuels pour la vue présentateur (clair / sombre / custom)
- Intégration dans Reveal.js ou slides web
