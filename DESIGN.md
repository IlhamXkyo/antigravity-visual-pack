---
colors:
  canvas: "#0b0c0e"
  surface-1: "#121418"
  surface-2: "#181b21"
  surface-3: "#20242c"
  hairline: "rgba(255, 248, 235, 0.08)"
  hairline-strong: "rgba(255, 248, 235, 0.16)"
  ink: "#f4f3ef"
  ink-secondary: "#a6a9b1"
  ink-muted: "#6e727d"
  primary: "#f59e0b"
  secondary: "#14b8a6"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
typography:
  display-xl: "clamp(2.25rem, 4.5vw, 4rem)"
  title-lg: "clamp(1.5rem, 2.8vw, 2.35rem)"
  title-md: "1.25rem"
  body-md: "1rem"
  code: "0.875rem"
  font-sans: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
  font-display: "'Space Grotesk', system-ui, sans-serif"
  font-mono: "'JetBrains Mono', monospace"
rounded:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "56px"
  section: "clamp(4rem, 8vw, 7rem)"
components:
  button-primary: "bg-[#f59e0b] text-[#0b0c0e] font-semibold rounded-[10px] active:scale-[0.97] transition-transform duration-[50ms]"
  card: "bg-[#181b21] border border-[rgba(255,248,235,0.08)] rounded-[16px] p-[6px]"
---

# DESIGN.md: Antigravity Visual & Architecture Pack Showcase

## 1. Visual Identity
Warm Obsidian Studio (`#0b0c0e`) paired with Daylight Paper Editorial mode (`#f6f4ee`) for eye comfort across mobile OLED screens and desktop monitors. Precision technical telemetry meets tactile storytelling and a playful mechanical-origami companion ("Kuro").

## 2. Color Discipline
- Primary chromatic accent is Warm Amber (`#f59e0b`) for CTAs, active indicators, and companion highlights.
- Secondary accent is Precision Teal (`#14b8a6`) for QA pass badges, safe-area guides, and Hydrogen/Argon telemetry.
- Zero saturated neon purple/cyan glows.

## 3. Typography Discipline
- Headings use `Space Grotesk` with `-0.03em` letter-spacing.
- Body copy uses `Plus Jakarta Sans` with `1.65` line-height.
- All counters, frame indices, radius calculations, and FPS telemetry enforce `font-variant-numeric: tabular-nums`.

## 4. Surface Elevation & Concentric Geometry
- 4-Layer surface hierarchy (`canvas` -> `surface-1` -> `surface-2` -> `surface-3`).
- Every nested container obeys $R_{\text{inner}} = \max(0, R_{\text{outer}} - P)$.

## 5. Anti-Patterns
- No ungrounded glass cards with rainbow shadows.
- No linear easing on primary visual entrances.
- No inaccessible auto-motion without a visible Pause/Play control and `@media (prefers-reduced-motion)` compliance.
