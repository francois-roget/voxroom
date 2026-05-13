# CLAUDE.md — VoxRoom

Ce fichier guide Claude Code dans le développement de VoxRoom. Lis-le intégralement avant toute intervention sur le projet.

-----

## Ce qu’est VoxRoom

VoxRoom est une application web de live polling pour formateurs. Pendant une présentation, le formateur pose des questions à son audience via un code ou QR code. Les participants répondent depuis leur téléphone sans créer de compte. Les résultats s’affichent en temps réel sur une vue plein écran dédiée au vidéoprojecteur.

Il y a trois rôles distincts dans l’app :

- **Le formateur** — authentifié via Google, crée et pilote les sessions
- **Le participant** — anonyme, rejoint via un code court, répond aux questions
- **La vue présentateur** — page plein écran affichée sur le vidéoprojecteur, mise à jour en temps réel

-----

## Stack technique

|Couche         |Technologie                                |
|---------------|-------------------------------------------|
|Framework      |Next.js 16.2 (App Router)                  |
|Langage        |TypeScript strict                          |
|Auth           |NextAuth.js v5 — Google Provider uniquement|
|Base de données|MongoDB Atlas + Mongoose                   |
|Temps réel     |Pusher (WebSockets managés)                |
|Graphiques     |Recharts                                   |
|Nuage de mots  |react-wordcloud                            |
|QR Code        |qrcode.react                               |
|UI             |Tailwind CSS + shadcn/ui                   |
|Tests          |Vitest + mongodb-memory-server             |
|Déploiement    |Vercel                                     |

-----

## Architecture des routes

```
/app
  /api
    /auth/[...nextauth]      → NextAuth handler
    /pusher/auth             → Auth endpoint Pusher (canaux privés)
    /sessions                → GET (liste) + POST (créer)
    /sessions/[code]         → GET (détail)
    /questions               → POST (créer)
    /questions/[id]          → PATCH (modifier) + DELETE
    /questions/[id]/open     → POST (lancer)
    /questions/[id]/reveal   → POST (révéler résultats)
    /questions/[id]/close    → POST (fermer)
    /responses               → POST (soumettre une réponse)

  /(auth)
    /login                   → Page de connexion Google

  /(presenter)               → Layout protégé — formateur authentifié uniquement
    /dashboard               → Liste des sessions
    /sessions/new            → Créer une session
    /sessions/[code]/edit    → Gérer les questions d'une session
    /sessions/[code]/control → Panneau de contrôle en direct

  /(public)                  → Accessible sans compte
    /join                    → Saisie du code de session
    /session/[code]          → Vue participant (répondre)
    /present/[code]          → Vue présentateur plein écran
```

-----

## Modèles Mongoose

### User

```typescript
{
  _id: ObjectId,
  email: string,        // unique, index
  name: string,
  image: string,        // avatar Google
  createdAt: Date
}
```

### Session

```typescript
{
  _id: ObjectId,
  code: string,                          // 4 chars alphanum majuscules, unique, index
  name: string,
  ownerId: ObjectId,                     // ref → User
  status: 'waiting' | 'active' | 'closed',
  currentQuestionId: ObjectId | null,    // ref → Question
  createdAt: Date,
  closedAt: Date | null
}
```

### Question

```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,                            // ref → Session
  order: number,
  type: 'mcq' | 'wordcloud',
  text: string,
  choices: string[],                              // MCQ uniquement, vide pour wordcloud
  status: 'pending' | 'open' | 'revealed' | 'closed',
  openedAt: Date | null,
  revealedAt: Date | null
}
```

### Response

```typescript
{
  _id: ObjectId,
  questionId: ObjectId,    // ref → Question
  sessionId: ObjectId,     // ref → Session
  participantId: string,   // UUID v4, généré côté client, stocké en localStorage
  value: string,           // choix sélectionné (MCQ) ou mot saisi (wordcloud)
  createdAt: Date
}
```

-----

## Temps réel — Pusher

### Canaux

|Canal                   |Type  |Qui s’abonne                   |
|------------------------|------|-------------------------------|
|`session-{code}`        |Public|Participants + vue présentateur|
|`private-control-{code}`|Privé |Formateur uniquement           |

### Événements serveur → client

|Événement          |Canal                   |Payload                                        |
|-------------------|------------------------|-----------------------------------------------|
|`question:opened`  |`session-{code}`        |`{ question: { id, text, choices, type } }`    |
|`question:revealed`|`session-{code}`        |`{ results: { [choice]: { count, percent } } }`|
|`question:closed`  |`session-{code}`        |`{}`                                           |
|`response:new`     |`private-control-{code}`|`{ count: number, results: object }`           |

### Règle importante

Les clients ne publient jamais directement sur Pusher. Toutes les actions passent par les API routes Next.js, qui déclenchent les événements Pusher côté serveur via le SDK `pusher` (Node.js).

### Auth endpoint Pusher (`/api/pusher/auth`)

Quand un client tente de s’abonner à `private-control-{code}` :

1. pusher-js fait un POST automatique vers `/api/pusher/auth`
1. La route vérifie la session NextAuth
1. Elle vérifie en base que `session.user.id === voxroomSession.ownerId`
1. Si OK → renvoie `pusher.authorizeChannel(socket_id, channel_name)`
1. Sinon → 401 ou 403

-----

## Règles métier à respecter systématiquement

- **Un participant = une réponse par question** — vérifier l’unicité `(questionId, participantId)` avant d’insérer en base
- **Seul le propriétaire contrôle sa session** — toujours vérifier `ownerId === session.user.id` dans les routes de contrôle
- **Les réponses ne sont acceptées que si `question.status === 'open'`** — rejeter avec 403 sinon
- **Le code de session** est généré aléatoirement : 4 caractères `[A-Z0-9]`, stocké en majuscules, comparé en insensible à la casse
- **Le `participantId`** est un UUID v4 généré à la première visite et stocké dans `localStorage` — ne jamais le stocker en cookie

-----

## Authentification

- Google OAuth via NextAuth.js v5
- Sessions JWT en cookie HttpOnly
- `proxy.ts` (anciennement `middleware.ts` en Next.js 15) protège toutes les routes `/(presenter)`
- Les routes `/(public)` et les API routes de soumission de réponses sont accessibles sans auth
- Toujours utiliser `getServerSession()` dans les API routes pour récupérer l’utilisateur courant

-----

## Environnements

|Env            |MongoDB       |Pusher            |
|---------------|--------------|------------------|
|Local / Preview|`voxroom-dev` |app `voxroom-dev` |
|Production     |`voxroom-prod`|app `voxroom-prod`|

Ne jamais écrire en dur des URI ou des clés — toujours passer par les variables d’environnement.

### Variables d’environnement attendues

```env
NEXTAUTH_SECRET=
NEXTAUTH_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

MONGODB_URI=

PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

-----

## Conventions de code

### TypeScript

- Mode strict activé dans `tsconfig.json` — ne jamais utiliser `any`
- Typer tous les paramètres de fonction et valeurs de retour
- Définir les types partagés dans `/types/index.ts`

### Composants React

- Tous les composants sont des fonctions (pas de classes)
- Préférer les Server Components par défaut — n’ajouter `'use client'` que si nécessaire (interactivité, hooks, Pusher)
- Les composants qui s’abonnent à Pusher sont toujours des Client Components

### API routes

- Toujours valider le body des requêtes avant de toucher à la base
- Toujours vérifier l’authentification en premier dans les routes protégées
- Retourner des codes HTTP explicites : 200, 201, 400, 401, 403, 404, 500
- Wrapper les opérations MongoDB dans un try/catch

### Structure des fichiers

```
/app              → routes Next.js (App Router)
/components       → composants réutilisables
  /ui             → composants shadcn/ui
  /presenter      → composants de la vue présentateur
  /participant    → composants de la vue participant
/lib
  /db.ts          → connexion MongoDB (singleton)
  /pusher.ts      → instance Pusher serveur
  /pusher-client.ts → instance Pusher client
  /utils.ts       → fonctions utilitaires (generateSessionCode, aggregateResults…)
/models           → schémas Mongoose (User, Session, Question, Response)
/types            → types TypeScript partagés
```

### Connexion MongoDB

Utiliser un singleton pour éviter les connexions multiples en développement avec Turbopack :

```typescript
// lib/db.ts
import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI!);
  isConnected = true;
}
```

Appeler `connectDB()` en début de chaque API route.

-----

## Tests

### Lancer les tests

```bash
npm run test          # mode watch
npm run test:run      # single run (CI)
```

### Ce qu’on teste

- **Unitaires** : `generateSessionCode`, `aggregateResults` et toute logique pure dans `/lib/utils.ts`
- **Intégration** : API routes avec mongodb-memory-server + mocks NextAuth et Pusher
- **Auth Pusher** : les trois cas de `/api/pusher/auth` (propriétaire OK, autre user → 403, non auth → 401)

### Ce qu’on ne teste pas automatiquement

Le temps réel (Pusher) est validé manuellement via la checklist définie dans `voxroom-spec-technique.md`.

### Mock Pusher dans les tests

```typescript
vi.mock('pusher', () => ({
  default: vi.fn().mockImplementation(() => ({
    trigger: vi.fn().mockResolvedValue({}),
    authorizeChannel: vi.fn().mockReturnValue({ auth: 'mock-token' }),
  })),
}));
```

-----

## Ce qu’il ne faut pas faire

- Ne pas installer de librairie sans valider avec le développeur si elle n’est pas dans la stack définie
- Ne pas créer de routes API sans vérification d’authentification sur les endpoints protégés
- Ne pas utiliser `mongoose.connect()` directement dans les composants ou API routes — toujours passer par `lib/db.ts`
- Ne pas publier d’événements Pusher depuis le client — uniquement depuis les API routes
- Ne pas stocker le `participantId` en base de données Users — c’est un identifiant anonyme local
- Ne pas modifier le schéma des modèles Mongoose sans en discuter — cela peut casser les données existantes
- Ne pas committer le fichier `.env.local`

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **voxroom** (565 symbols, 769 relationships, 5 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/voxroom/context` | Codebase overview, check index freshness |
| `gitnexus://repo/voxroom/clusters` | All functional areas |
| `gitnexus://repo/voxroom/processes` | All execution flows |
| `gitnexus://repo/voxroom/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
