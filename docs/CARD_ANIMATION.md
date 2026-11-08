# Pass card interaction

The hero pass card has two CSS-driven effects; no contract, wallet or hosting change is involved.

- **Hover** (fine pointer only): a 0.65s looping 3D swing (`pass-shake`) using `rotateY` and `translateZ`; the card keeps its -8° tilt.
- **Click / Enter / Space**: a 0.55s one-shot `pass-burst` (scale 1.06, rotateY 8°, glow ring), driven by a React `is-bursting` class and cleared on `animationend`.
- **Accessibility**: the card is keyboard-focusable (`role="button"`, `tabIndex=0`), has a translated `aria-label` (`pass.animate`), and respects `prefers-reduced-motion: reduce` (animations disabled).
- **i18n**: dictionaries have 158 keys per language; parity tests still cover them.
- **No layout change** except `perspective` on `.pass-wrap`; the card stays inside the hero.
- **Source**: the effects live in the front-end stylesheet (`src/style.css`, keyframes) and the React view component (`src/App.jsx`, click state and handler).

