# Raah.ai Design System

Dark, purple, route-themed. Mobile first (design at 360 px wide, then scale up). Tokens live in `src/styles/tokens.css`. Do not hard-code colors in components.

## 1. Palette (given by the founder)

| Token | Hex | Role |
|---|---|---|
| `--canvas` | `#2D0845` | App background |
| `--surface` | `#3D0C5A` | Cards, sheets, inputs |
| `--violet` | `#9333EA` | Primary button fill, active route line, glow, borders |
| `--lilac` | `#C084FC` | Accent text, badges, route nodes, focus ring |
| `--white` | `#FFFFFF` | Primary text and icons |
| `--slate` | `#94A3B8` | Secondary text, hints, subtle borders |

Added for status UI (not in the original palette): `--surface-2 #4A1470`, `--ok #4ADE80`, `--warn #FBBF24`, `--danger #F87171`.

## 2. Contrast (computed, WCAG 2.x ratio)

| Pair | Ratio | Use |
|---|---|---|
| White on canvas | 17.04 | Body text |
| White on surface | 15.01 | Card text |
| Slate on canvas | 6.65 | Secondary text |
| Slate on surface | 5.86 | Secondary text in cards |
| Lilac on canvas | 6.45 | Accent text |
| Lilac on surface | 5.68 | Accent text in cards |
| White on violet | 5.38 | Button label |
| Canvas on lilac | 6.45 | Text inside lilac badges |
| ok / warn / danger on canvas | 9.78 / 10.21 / 6.16 | Status text |
| ok / warn / danger on surface | 8.62 / 8.99 / 5.43 | Status text in cards |
| **Violet on canvas** | **3.17** | **Fails 4.5 for text. Fills, borders and glows only** |
| **Violet on surface** | **2.79** | **Fails. Never text, never a thin icon** |

Rule: small text is white, slate, lilac or a status color. Violet is never used for text.

## 3. Logo

Files in `assets/`:
- `raah-logo-white.png`: logo + wordmark, transparent background. Header.
- `raah-logo-tagline-white.png`: with tagline "Seat nahi? Raah hai na." Splash / empty home.
- `raah-icon-white.png`: route glyph only, transparent. Loading and empty states.
- `raah-app-icon-2d0845.png`: 1024 px icon on the canvas color. Favicon / PWA icon.

The original logo PNGs have a different purple background than the app canvas. Do not use them on `--canvas`; use the transparent ones. Minimum logo height 28 px. Keep clear space equal to the height of the "a".

## 4. Typography

Inter (the wordmark looks like Inter; confirm with the designer). Fallback system-ui.
- Title 28/34 semibold. Section 20/26 semibold. Body 16/24. Small 14/20. Caption 12/16.
- Times are the most important data: use tabular numbers (`font-variant-numeric: tabular-nums`), 18 px semibold.

## 5. Components

- **Primary button**: violet fill, white label, radius 14, height 48, violet glow on hover/focus. Disabled: 40% opacity, no glow.
- **Secondary button**: transparent, 1 px lilac border, lilac label.
- **Chip (class, sort)**: surface fill, 1 px border; selected = violet fill + white label + check icon (do not rely on color alone).
- **Station combobox**: surface fill, border; typing filters by name or code; list items show name + code in slate.
- **Card**: surface fill, radius 20, 1 px border, 16 px padding.
- **Timeline**: vertical line in violet, nodes in lilac. Road legs use a dashed line and a car/road icon with "estimated".
- **Seat badge** (always icon + text, never color only): `AVL 12` (ok, check icon), `RAC 5` (warn), `WL 23` (danger). Add "Simulated" caption on the first badge of every card.
- **Wait badge**: green `Safe 3h 10m` (3 h or more), amber `OK 2h 05m` (2 to 3 h), red `Tight 1h 10m` (under the user's safe gap).
- **Prototype banner**: slate text on surface-2, always visible: "Prototype: sample 2016 timetable and SIMULATED seat availability."
- **Tabs**: underline in lilac for active.
- **Skeleton**: surface-2 shimmer (disabled under reduced motion).

## 6. Layout and motion

- 16 px side gutters, max content width 720 px centered on desktop. Cards stack on mobile.
- Motion: 150 to 200 ms ease-out for chips and cards. Route line draws in once on results load (400 ms). Respect `prefers-reduced-motion`.

## 7. Accessibility

- Touch targets at least 44 px. Visible focus ring (`--focus`).
- Every badge has text. Times read as e.g. "Departs Thursday 16:01".
- Results region is `aria-live="polite"`. Form fields have labels.
