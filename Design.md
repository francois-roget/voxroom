# VoxRoom — Design System & Spécifications graphiques

## Direction artistique : Signal

VoxRoom est un instrument de mesure en temps réel. L’esthétique s’inspire des interfaces de monitoring technique — dashboards de data center, oscilloscopes, terminaux — réinterprétée avec chaleur et lisibilité pour une salle de formation.

**L’idée centrale** : quand les réponses arrivent, on doit *sentir* que quelque chose est vivant. Pas d’animations gratuites, pas de couleurs criardes — mais chaque chiffre qui pulse, chaque barre qui s’étend doit communiquer l’activité réelle de la salle.

**Ce qui nous différencie des concurrents** :

- Mentimeter — violet/rose corporate, animations plates, esthétique SaaS 2019
- Slido — blanc austère, sans personnalité, conçu pour disparaître dans PowerPoint
- Kahoot — couleurs primaires saturées, fond noir, trop enfantin pour un formateur pro

VoxRoom occupe le territoire vide : **sobre, précis, vivant**.

-----

## Palette de couleurs

```css
:root {
  /* Fonds */
  --color-bg-base:     #0D1117;  /* noir bleu profond — fond principal */
  --color-bg-surface:  #161B22;  /* légèrement plus clair — cartes, panneaux */
  --color-bg-elevated: #1C2128;  /* éléments au-dessus des cartes */

  /* Bordures */
  --color-border:      #30363D;  /* séparations discrètes */
  --color-border-subtle: #21262D; /* séparations très légères */

  /* Accents */
  --color-accent:      #00E5A0;  /* vert électrique / menthe — accent principal */
  --color-accent-blue: #0EA5E9;  /* bleu cyan — accent secondaire */
  --color-accent-glow: rgba(0, 229, 160, 0.15); /* halo pour effets glow */

  /* Texte */
  --color-text-primary:   #F0F6FC;  /* blanc cassé — titres et corps */
  --color-text-secondary: #8B949E;  /* gris — labels, métadonnées */
  --color-text-muted:     #484F58;  /* gris foncé — désactivé, placeholder */

  /* Barres de résultats */
  --gradient-bar: linear-gradient(90deg, #00E5A0, #0EA5E9);

  /* États */
  --color-success: #00E5A0;
  --color-error:   #F85149;
}
```

**Pourquoi ce fond `#0D1117`** : c’est exactement la couleur de fond de GitHub en dark mode — familière pour les développeurs, perçue comme sérieuse et moderne. Elle est suffisamment sombre pour que le vert `#00E5A0` tranche depuis le fond d’une grande salle sans agresser les yeux.

**Pourquoi le vert `#00E5A0`** : il évoque les graphiques de monitoring en temps réel, les signaux vitaux, l’activité. Il est distinct du vert “succès” classique (trop saturé) et du vert “nature” (trop doux). C’est le vert d’un oscilloscope.

-----

## Typographie

|Rôle                      |Police                       |Import      |
|--------------------------|-----------------------------|------------|
|Titres, questions         |**Syne** — 700, 800          |Google Fonts|
|Chiffres, codes, compteurs|**JetBrains Mono** — 400, 600|Google Fonts|
|Corps, labels, boutons    |**Inter** — 400, 500, 600    |Google Fonts|

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

```css
--font-display: 'Syne', sans-serif;     /* questions, titres */
--font-mono:    'JetBrains Mono', monospace; /* chiffres, codes */
--font-body:    'Inter', sans-serif;    /* tout le reste */
```

**La règle d’or** : tout ce qui est un chiffre en temps réel (compteur de réponses, pourcentages, code de session) utilise JetBrains Mono. Les chiffres en monospace ne sautent pas visuellement quand ils changent — chaque chiffre occupe exactement la même largeur.

### Échelle typographique

```css
/* Vue présentateur (grand écran) */
--text-session-code:  clamp(4rem, 8vw, 7rem);   /* code AB12 */
--text-question:      clamp(2rem, 4vw, 3.5rem);  /* texte de la question */
--text-counter:       clamp(1.5rem, 3vw, 2.5rem); /* compteur de réponses */
--text-percent:       clamp(1.2rem, 2vw, 1.8rem); /* pourcentages résultats */

/* Vue participant (mobile) */
--text-question-mobile: 1.25rem;
--text-choice:          1rem;
```

-----

## Espacements & Layout

```css
--space-xs:  0.25rem;   /*  4px */
--space-sm:  0.5rem;    /*  8px */
--space-md:  1rem;      /* 16px */
--space-lg:  1.5rem;    /* 24px */
--space-xl:  2rem;      /* 32px */
--space-2xl: 3rem;      /* 48px */
--space-3xl: 4rem;      /* 64px */

--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
```

-----

## Composants

### Carte (surface élevée)

```css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}
```

### Code de session

Affiché en très grand dans l’état d’attente. Légère lueur verte pour la lisibilité en salle.

```css
.session-code {
  font-family: var(--font-mono);
  font-size: var(--text-session-code);
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.15em;
  text-shadow:
    0 0 20px var(--color-accent-glow),
    0 0 40px var(--color-accent-glow);
}
```

### Compteur de réponses (live)

```css
.response-counter {
  font-family: var(--font-mono);
  font-size: var(--text-counter);
  font-weight: 600;
  color: var(--color-text-primary);
}

.response-counter span {
  color: var(--color-accent);
}
```

### Barre de résultats MCQ

```css
.result-bar-track {
  height: 48px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
}

.result-bar-fill {
  height: 100%;
  background: var(--gradient-bar);
  border-radius: var(--radius-md);
  transform-origin: left;
  /* L'animation est gérée via JS/Framer Motion au reveal */
}

.result-bar-label {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.result-bar-percent {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-accent);
  min-width: 3.5ch; /* évite les sauts de layout */
}
```

### Bouton de réponse participant (mobile)

```css
.choice-button {
  width: 100%;
  min-height: 64px;
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 200ms ease, background 200ms ease;
  text-align: left;
}

.choice-button:hover {
  border-color: var(--color-accent);
  background: rgba(0, 229, 160, 0.05);
}

.choice-button.selected {
  border-color: var(--color-accent);
  background: rgba(0, 229, 160, 0.1);
}

.choice-button.selected::after {
  /* animation de pulse de confirmation */
  content: '';
  animation: pulse-confirm 400ms ease-out;
}
```

-----

## Animations

Toutes les animations de l’app suivent ces principes :

- **Durées courtes** (200–800ms) — rien ne traîne
- **Easing expressif** — `easeOut` pour les apparitions, `spring` pour les interactions
- **Pas d’animations en boucle** sauf le pulse du compteur live

### Tokens d’animation

```css
--duration-fast:    200ms;
--duration-normal:  400ms;
--duration-slow:    800ms;

--ease-out:  cubic-bezier(0.16, 1, 0.3, 1);
--ease-in:   cubic-bezier(0.4, 0, 1, 1);
```

### Keyframes CSS

```css
/* Pulse du compteur quand une nouvelle réponse arrive */
@keyframes pulse-counter {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.15); color: var(--color-accent); }
  100% { transform: scale(1); }
}

/* Confirmation de vote (bouton participant) */
@keyframes pulse-confirm {
  0%   { box-shadow: 0 0 0 0 var(--color-accent-glow); }
  100% { box-shadow: 0 0 0 20px transparent; }
}

/* Entrée d'un élément (fade + rise) */
@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Glow pulsant sur le code de session en état d'attente */
@keyframes glow-pulse {
  0%, 100% { text-shadow: 0 0 20px var(--color-accent-glow), 0 0 40px var(--color-accent-glow); }
  50%       { text-shadow: 0 0 30px var(--color-accent-glow), 0 0 60px var(--color-accent-glow); }
}
```

### Animations Framer Motion (React)

```typescript
// Barre de résultats — fill animé avec overshoot
export const barVariants = {
  hidden: { scaleX: 0 },
  visible: (percent: number) => ({
    scaleX: percent / 100,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
    },
  }),
};

// Pourcentage — count-up
// Utiliser useMotionValue + useTransform de Framer Motion
// ou une lib légère comme react-countup

// Entrée staggerée des barres de résultats
export const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// Mot du wordcloud — entrée spring
export const wordVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};
```

-----

## Vues — comportement visuel détaillé

### Vue présentateur `/present/[code]`

Conçue pour le plein écran (F11). Fond `#0D1117` bord à bord, aucun élément d’UI navigateur visible.

**État 1 — Attente**

Composition centrée verticalement. Dans l’ordre de haut en bas :

- Logo VoxRoom en petit (coin supérieur gauche, discret)
- Texte “Rejoignez sur **voxroom.app**” en `--color-text-secondary`
- Code de session en très grand, police JetBrains Mono, couleur `#00E5A0`, animation `glow-pulse` en boucle de 3s
- QR code dans un cadre `--color-bg-surface`, suffisamment grand pour être lu depuis 5 mètres
- Compteur de participants connectés en bas : `3 personnes connectées` en JetBrains Mono

**État 2 — Question ouverte**

- Question en grand centré — Syne 700, `--text-question`
- Choix de réponse affichés en pastilles numérotées (sans résultats pour ne pas influencer)
- Coin inférieur droit : compteur `██ réponses` qui pulse à chaque nouvelle réponse

**État 3 — Résultats révélés**

- Question reste visible en haut, plus petite
- Barres de résultats avec animation de fill simultanée (0 → valeur en 800ms, easeOutExpo)
- Léger overshoot configurable : les barres dépassent de 3-5% puis reviennent
- Pourcentages en JetBrains Mono avec count-up animé
- La barre majoritaire a une intensité légèrement supérieure (opacity 1 vs 0.85 pour les autres)

**Transitions entre états**

Chaque changement d’état passe par un fade out (200ms) puis fade in + enter (400ms). Jamais de transition brutale.

-----

### Vue participant `/session/[code]`

Optimisée mobile-first. Fond identique `#0D1117` pour la cohérence.

- Texte de la question centré, lisible sans zoomer
- Boutons de réponse full-width, min 64px de hauteur, tap confortable
- Au tap : bordure passe en `#00E5A0`, pulse de confirmation, message “Réponse enregistrée ✓”
- État d’attente : animation subtile (spinner ou point qui pulse) + texte “En attente de la prochaine question”

-----

### Dashboard formateur

Fond `#0D1117`, cartes `#161B22`. Design plus fonctionnel que spectaculaire — l’accent vert est réservé aux actions principales (Nouvelle session, Lancer).

-----

## Tailwind — configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#0D1117',
          surface:  '#161B22',
          elevated: '#1C2128',
        },
        border: {
          DEFAULT: '#30363D',
          subtle:  '#21262D',
        },
        accent: {
          DEFAULT: '#00E5A0',
          blue:    '#0EA5E9',
          glow:    'rgba(0, 229, 160, 0.15)',
        },
        text: {
          primary:   '#F0F6FC',
          secondary: '#8B949E',
          muted:     '#484F58',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        body:    ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-bar': 'linear-gradient(90deg, #00E5A0, #0EA5E9)',
      },
      keyframes: {
        'pulse-counter': {
          '0%, 100%': { transform: 'scale(1)' },
          '40%':      { transform: 'scale(1.15)' },
        },
        'glow-pulse': {
          '0%, 100%': { textShadow: '0 0 20px rgba(0,229,160,0.15), 0 0 40px rgba(0,229,160,0.15)' },
          '50%':      { textShadow: '0 0 30px rgba(0,229,160,0.25), 0 0 60px rgba(0,229,160,0.25)' },
        },
        enter: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-counter': 'pulse-counter 300ms ease-out',
        'glow-pulse':    'glow-pulse 3s ease-in-out infinite',
        'enter':         'enter 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}

export default config
```

-----

## Ce qu’il ne faut pas faire

- Ne pas utiliser de fond blanc ou gris clair — même pour les modales et overlays
- Ne pas utiliser d’autres couleurs d’accent que `#00E5A0` et `#0EA5E9` — la cohérence fait la force
- Ne pas animer des éléments inutiles — chaque animation doit signifier quelque chose
- Ne pas utiliser des tailles de texte inférieures à 14px — accessibilité et lisibilité en salle
- Ne pas casser la hiérarchie de fond : `base` → `surface` → `elevated` dans cet ordre uniquement
- Ne pas utiliser d’autres polices que Syne, JetBrains Mono et Inter
