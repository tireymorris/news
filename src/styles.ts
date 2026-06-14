/**
 * SINGLE SOURCE OF TRUTH for the entire hyperwave visual identity.
 *
 * Provider colors/badges are generated from src/providers/catalog.ts.
 */

import {
  providerBadgeClass,
  providerBadgeCss,
  providerColorRecord,
  providerCssVariables,
  providerStyleMap,
} from "./providers";

// ------------------------------------------------------------------
// News Provider Colors (from provider registry)
// ------------------------------------------------------------------
export const providers = providerColorRecord();

// Provider color for CSS variable
export function providerColor(provider: keyof typeof providers): string {
  const c = providers[provider].color;
  return `hsl(${c.h} ${c.s}% ${c.l}%)`;
}

export function providerBackground(provider: keyof typeof providers): string {
  const c = providers[provider].background;
  return `hsl(${c.h} ${c.s}% ${c.l}%)`;
}

// ------------------------------------------------------------------
// Color Tokens (HSL) - Midcentury Modern Palette
// ------------------------------------------------------------------
export const colors = {
  background:        { h: 47,  s: 100, l: 97 },
  foreground:        { h: 30,  s: 25,  l: 15 },
  card:              { h: 47,  s: 80,  l: 98 },
  cardForeground:    { h: 30,  s: 25,  l: 15 },
  popover:           { h: 47,  s: 80,  l: 98 },
  popoverForeground: { h: 30,  s: 25,  l: 15 },
  primary:           { h: 42,  s: 96,  l: 45 },
  primaryForeground: { h: 47,  s: 100, l: 97 },
  secondary:         { h: 90,  s: 28,  l: 45 },
  secondaryForeground:{ h: 47,  s: 100, l: 97 },
  muted:             { h: 45,  s: 30,  l: 88 },
  mutedForeground:   { h: 30,  s: 12,  l: 40 },
  accent:            { h: 5,   s: 50,  l: 53 },
  accentForeground:  { h: 47,  s: 100, l: 97 },
  destructive:       { h: 5,   s: 70,  l: 50 },
  destructiveForeground:{ h: 47, s: 100, l: 97 },
  border:            { h: 40,  s: 30,  l: 78 },
  input:             { h: 45,  s: 30,  l: 92 },
  ring:              { h: 42,  s: 96,  l: 45 },
} as const;

function kebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Convert a color token to a CSS hsl() string with optional alpha. */
export function hsl(token: keyof typeof colors, alpha?: number): string {
  const c = colors[token];
  return alpha !== undefined
    ? `hsl(${c.h} ${c.s}% ${c.l}% / ${alpha})`
    : `hsl(${c.h} ${c.s}% ${c.l}%)`;
}

/** Convert a color token to a Tailwind-compatible CSS variable reference. */
export function cssVar(token: keyof typeof colors): string {
  return `hsl(var(--${kebab(token)}))`;
}

// ------------------------------------------------------------------
// Typography Tokens - Midcentury Modern
// ------------------------------------------------------------------
export const fonts = {
  display: "'Lilita One', 'Cooper Black', 'Arial Black', sans-serif",
  body:    "'DM Sans', system-ui, -apple-system, sans-serif",
} as const;

export const type = {
  size: {
    xs:   "text-xs",
    sm:   "text-sm",
    base: "text-base",
    lg:   "text-lg",
    xl:   "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
    "6xl": "text-6xl",
    "7xl": "text-7xl",
  } as const,
  weight: {
    normal:    "font-normal",
    medium:    "font-medium",
    semibold:  "font-semibold",
    bold:      "font-bold",
    extrabold: "font-extrabold",
    black:     "font-black",
  } as const,
  tracking: {
    tighter: "tracking-tighter",
    tight:   "tracking-tight",
    normal:  "tracking-normal",
    wide:    "tracking-wide",
    wider:   "tracking-wider",
    widest:  "tracking-widest",
  } as const,
  leading: {
    none:    "leading-none",
    tight:   "leading-tight",
    snug:    "leading-snug",
    normal:  "leading-normal",
    relaxed: "leading-relaxed",
    loose:   "leading-loose",
  } as const,
} as const;

// ------------------------------------------------------------------
// Spacing Tokens
// ------------------------------------------------------------------
export const space = {
  0:   "0",
  px:  "px",
  0.5: "0.5",
  1:   "1",
  2:   "2",
  3:   "3",
  4:   "4",
  5:   "5",
  6:   "6",
  8:   "8",
  10:  "10",
  12:  "12",
  14:  "14",
  16:  "16",
} as const;

// ------------------------------------------------------------------
// Border Tokens
// ------------------------------------------------------------------
export const border = {
  width: {
    default: "border",
    0:       "border-0",
    2:       "border-2",
    3:       "border-[3px]",
  } as const,
  radius: {
    none:  "rounded-none",
    sm:    "rounded-sm",
    md:    "rounded-md",
    lg:    "rounded-lg",
    xl:    "rounded-xl",
    full:  "rounded-full",
  } as const,
} as const;

// ------------------------------------------------------------------
// Animation Tokens
// ------------------------------------------------------------------
export const animation = {
  duration: {
    fast:    "duration-150",
    normal:  "duration-300",
    slow:    "duration-500",
    slower:  "duration-700",
    slowest: "duration-1000",
  } as const,
  ease: {
    default: "ease-out",
    inOut:   "ease-in-out",
    bounce:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
  } as const,
} as const;

// ------------------------------------------------------------------
// Layout Tokens
// ------------------------------------------------------------------
export const layout = {
  maxWidth:  "max-w-5xl",
  center:    "mx-auto",
  fullWidth: "w-full",
} as const;

// ------------------------------------------------------------------
// Z-Index Tokens
// ------------------------------------------------------------------
export const z = {
  behind:  "z-0",
  base:    "z-10",
  overlay: "z-20",
  modal:   "z-30",
  top:     "z-50",
} as const;

// ------------------------------------------------------------------
// Shadow Tokens - Warm, chunky shadows for MCM vibe
// ------------------------------------------------------------------
export const shadow = {
  none:   "shadow-none",
  sm:     "shadow-sm",
  md:     "shadow-md",
  lg:     "shadow-lg",
  xl:     "shadow-xl",
  retro:  "shadow-[0_4px_0_hsl(var(--border)),0_6px_12px_rgba(43,33,24,0.08)]",
  retroHover: "shadow-[0_8px_0_hsl(var(--border)),0_12px_24px_rgba(43,33,24,0.12)]",
} as const;

// ------------------------------------------------------------------
// Opacity Tokens
// ------------------------------------------------------------------
export const opacity = {
  0:   "opacity-0",
  5:   "opacity-5",
  10:  "opacity-10",
  20:  "opacity-20",
  30:  "opacity-30",
  40:  "opacity-40",
  50:  "opacity-50",
  60:  "opacity-60",
  70:  "opacity-70",
  80:  "opacity-80",
  90:  "opacity-90",
  100: "opacity-100",
} as const;

// ------------------------------------------------------------------
// Bundled Theme
// ------------------------------------------------------------------
export const theme = {
  colors,
  fonts,
  type,
  space,
  border,
  animation,
  layout,
  z,
  shadow,
  opacity,
} as const;

// ==================================================================
// THEME CSS - All custom properties, keyframes & utilities in one place
// ==================================================================

export const themeCss = `
:root {
  --background: ${colors.background.h} ${colors.background.s}% ${colors.background.l}%;
  --foreground: ${colors.foreground.h} ${colors.foreground.s}% ${colors.foreground.l}%;
  --card: ${colors.card.h} ${colors.card.s}% ${colors.card.l}%;
  --card-foreground: ${colors.cardForeground.h} ${colors.cardForeground.s}% ${colors.cardForeground.l}%;
  --popover: ${colors.popover.h} ${colors.popover.s}% ${colors.popover.l}%;
  --popover-foreground: ${colors.popoverForeground.h} ${colors.popoverForeground.s}% ${colors.popoverForeground.l}%;
  --primary: ${colors.primary.h} ${colors.primary.s}% ${colors.primary.l}%;
  --primary-foreground: ${colors.primaryForeground.h} ${colors.primaryForeground.s}% ${colors.primaryForeground.l}%;
  --secondary: ${colors.secondary.h} ${colors.secondary.s}% ${colors.secondary.l}%;
  --secondary-foreground: ${colors.secondaryForeground.h} ${colors.secondaryForeground.s}% ${colors.secondaryForeground.l}%;
  --muted: ${colors.muted.h} ${colors.muted.s}% ${colors.muted.l}%;
  --muted-foreground: ${colors.mutedForeground.h} ${colors.mutedForeground.s}% ${colors.mutedForeground.l}%;
  --accent: ${colors.accent.h} ${colors.accent.s}% ${colors.accent.l}%;
  --accent-foreground: ${colors.accentForeground.h} ${colors.accentForeground.s}% ${colors.accentForeground.l}%;
  --destructive: ${colors.destructive.h} ${colors.destructive.s}% ${colors.destructive.l}%;
  --destructive-foreground: ${colors.destructiveForeground.h} ${colors.destructiveForeground.s}% ${colors.destructiveForeground.l}%;
  --border: ${colors.border.h} ${colors.border.s}% ${colors.border.l}%;
  --input: ${colors.input.h} ${colors.input.s}% ${colors.input.l}%;
  --ring: ${colors.ring.h} ${colors.ring.s}% ${colors.ring.l}%;
  --radius: 1rem;
  --chart-1: ${colors.primary.h} ${colors.primary.s}% ${colors.primary.l}%;
  --chart-2: ${colors.secondary.h} ${colors.secondary.s}% ${colors.secondary.l}%;
  --chart-3: ${colors.accent.h} ${colors.accent.s}% ${colors.accent.l}%;
  --chart-4: 200 60% 45%;
  --chart-5: 25 65% 45%;
${providerCssVariables()}
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: ${fonts.body};
  min-height: 100vh;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(227, 181, 5, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(188, 75, 81, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(106, 153, 78, 0.04) 0%, transparent 70%);
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${fonts.display};
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.15;
}

::selection {
  background: hsl(var(--primary) / 0.3);
  color: hsl(var(--foreground));
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #fefae0;
}

::-webkit-scrollbar-thumb {
  background: #d4c9a0;
  border-radius: 999px;
  border: 2px solid #fefae0;
}

::-webkit-scrollbar-thumb:hover {
  background: #bc4b51;
}

/* Retro card styling */
.article-card {
  background: hsl(var(--card));
  position: relative;
  border-radius: 1rem;
  border: 2px solid hsl(var(--border));
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 4px 0 hsl(var(--border)),
    0 6px 12px rgba(43, 33, 24, 0.08);
}

.article-card:hover {
  transform: translateY(-4px) rotate(0deg) !important;
  box-shadow:
    0 8px 0 hsl(var(--border)),
    0 12px 24px rgba(43, 33, 24, 0.12);
  border-color: hsl(var(--primary));
}

.article-card:hover .article-title {
  color: hsl(var(--accent));
}

.article-card-odd { transform: rotate(-0.4deg); }
.article-card-even { transform: rotate(0.4deg); }

/* Search input styling */
.search-input {
  background: hsl(var(--input));
  color: hsl(var(--foreground));
  font-family: ${fonts.body};
  border-radius: 999px;
  border: 2px solid hsl(var(--border));
  box-shadow: 0 3px 0 hsl(var(--border));
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.search-input:focus {
  border-color: hsl(var(--primary));
  box-shadow: 0 3px 0 hsl(var(--primary));
  outline: none;
}

/* Article badge - pill shaped */
.article-badge {
  font-family: ${fonts.body};
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.3rem 0.75rem;
  background: hsl(var(--secondary));
  color: #fefae0;
  border-radius: 999px;
  display: inline-block;
}

/* Provider badges - color-coded */
.provider-badge {
  font-family: ${fonts.body};
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  display: inline-block;
}
${providerBadgeCss()}

/* Timestamp */
.timestamp {
  font-family: ${fonts.body};
  font-size: 0.8rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.02em;
}

/* Live dot */
.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #bc4b51;
  display: inline-block;
  position: relative;
}

.live-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #bc4b51;
  animation: livePulse 2s ease-out infinite;
}

/* Starburst decoration */
.starburst {
  position: relative;
  display: inline-block;
}

.starburst::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, #e3b505 2px, transparent 2px);
  background-size: 12px 12px;
  border-radius: 50%;
  opacity: 0.3;
  animation: starburstSpin 20s linear infinite;
  pointer-events: none;
}

/* Boomerang divider */
.boomerang-divider {
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--accent)) 50%, hsl(var(--secondary)) 80%, transparent 100%);
  border-radius: 999px;
  margin: 0 auto;
  max-width: 200px;
}

/* Small live dot for compact header */
.live-dot-sm {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #bc4b51;
  display: inline-block;
  position: relative;
}

.live-dot-sm::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid #bc4b51;
  animation: livePulse 2s ease-out infinite;
}

/* Animations */
@keyframes articleReveal {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  60% {
    transform: translateY(-4px) scale(1.01);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.article-reveal {
  opacity: 0;
  animation: articleReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.stagger-1 { animation-delay: 0.06s; }
.stagger-2 { animation-delay: 0.12s; }
.stagger-3 { animation-delay: 0.18s; }
.stagger-4 { animation-delay: 0.24s; }
.stagger-5 { animation-delay: 0.30s; }
.stagger-6 { animation-delay: 0.36s; }
.stagger-7 { animation-delay: 0.42s; }
.stagger-8 { animation-delay: 0.48s; }
.stagger-9 { animation-delay: 0.54s; }
.stagger-10 { animation-delay: 0.60s; }

@keyframes headerSlide {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.98);
  }
  70% {
    transform: translateY(4px) scale(1.01);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.header-slide {
  animation: headerSlide 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes searchFade {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.search-fade {
  animation: searchFade 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s forwards;
  opacity: 0;
}

@keyframes livePulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes starburstSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.4s ease forwards;
}

/* Cursor blink */
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.cursor-blink {
  animation: cursorBlink 1s step-end infinite;
}

/* Retro prompt */
.search-prompt {
  font-family: ${fonts.display};
  color: hsl(var(--primary));
  font-size: 1.25rem;
}
`;

// ==================================================================
// COMPONENT STYLE MAPPINGS
// ==================================================================

export function providerBadge(source: string): string {
  return providerBadgeClass(source);
}

export const styles = {
  // ================================================================
  // LAYOUT
  // ================================================================
  layout: {
    html:        "",
    body:        "bg-background text-foreground m-0 p-0 min-h-screen antialiased",
    resetStyle:  "* { box-sizing: border-box; margin: 0; outline: none; color: unset; }",
  },

  // ================================================================
  // HEADER
  // ================================================================
  header: {
    container:   "w-full border-b border-border bg-background",
    content:     "w-full max-w-5xl mx-auto px-6 py-2",
    topRow:      "flex justify-start mb-0.5",
    titleRow:    "flex items-center justify-start gap-1.5",
    title:       "font-display text-xl md:text-2xl tracking-wide text-foreground",
    subtitle:    "inline-block text-[9px] tracking-[0.12em] uppercase text-muted-foreground font-body font-bold bg-muted px-2.5 py-0.5 rounded-full",
    metaRow:     "flex items-center justify-start gap-2 mt-1",
    liveDot:     "live-dot-sm",
    divider:     "w-4 h-0.5 bg-border rounded-full",
    dividerSm:   "w-3 h-0.5 bg-border rounded-full",
    waveDivider: "",
  },

  // ================================================================
  // MAIN
  // ================================================================
  main: {
    container:   "flex min-h-screen flex-col gap-8 p-6 md:p-10 relative z-10",
    content:     "w-full max-w-5xl mx-auto",
  },

  // ================================================================
  // SEARCH
  // ================================================================
  search: {
    container:   "mb-12 search-fade",
    wrapper:     "relative max-w-2xl",
    prompt:      "absolute left-5 top-1/2 -translate-y-1/2 search-prompt select-none pointer-events-none",
    input:       "w-full pl-12 pr-6 py-4 text-base text-foreground placeholder:text-muted-foreground/60 font-body text-lg search-input",
    cursor:      "absolute right-6 top-1/2 -translate-y-1/2 text-primary font-body text-lg cursor-blink",
    resultsContainer: "mt-4 pl-2",
    resultsText: "text-sm text-muted-foreground font-body font-medium",
  },

  // ================================================================
  // ARTICLES
  // ================================================================
  articles: {
    list:        "m-0 list-none p-0 space-y-5",
    item:        "m-0 list-none p-0",
    card:        "p-6 md:p-7 article-card",
    title:       "text-xl md:text-2xl font-display leading-tight text-foreground article-title",
    link:        "no-underline text-foreground hover:text-accent visited:text-foreground block mb-3",
    meta:        "flex items-center gap-3 font-body flex-wrap",
    emptyState:  "py-16 text-center text-muted-foreground font-body text-lg",
    infiniteScroll: "w-full mt-8",
  },

  // ================================================================
  // PROVIDER STYLES
  // ================================================================
  providerStyle(source: string): string {
    const provider = Object.values(providers).find(
      (entry) => entry.name.toLowerCase() === source.toLowerCase(),
    );
    const key = provider
      ? Object.entries(providers).find(([, entry]) => entry === provider)?.[0]
      : undefined;

    return key ? styles.providers[key] : styles.util.badge;
  },

  // ================================================================
  // UTILITIES (reusable across components)
  // ================================================================
  util: {
    timestamp:   "timestamp",
    badge:       "article-badge",
    providerBadge: "provider-badge",
    flexCenter:  "flex items-center gap-2",
    blockLink:   "block no-underline",
  },

  // ================================================================
  // PROVIDERS
  // ================================================================
  providers: providerStyleMap(),

  // ================================================================
  // ANIMATIONS (custom utility classes defined in themeCss)
  // ================================================================
  animations: {
    signalReveal: "article-reveal",
    headerSlide:  "header-slide",
    searchFade:   "search-fade",
    stagger: (n: number) => `stagger-${Math.min(n, 10)}`,
  },

  // ================================================================
  // UI PRIMITIVES
  // ================================================================
  ui: {
    card: {
      base:        "bg-card text-card-foreground article-card",
      header:      "flex flex-col space-y-1.5 p-6",
      title:       "text-3xl font-display leading-none tracking-wide",
      description: "text-sm text-muted-foreground font-body",
      content:     "p-6 pt-0",
      footer:      "flex items-center p-6 pt-0",
    },
    input: {
      base: "flex h-14 w-full bg-input px-5 py-3 text-base font-body text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 search-input",
    },
  },

  // ================================================================
  // THEME CSS - injected as <style> in Layout
  // ================================================================
  theme: {
    css: themeCss,
  },
} as const;
