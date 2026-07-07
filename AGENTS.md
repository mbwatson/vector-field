# Vector Field Simulator Agent Guide

## Product purpose

This is an interactive, browser-based teaching tool for building intuition about two-dimensional vector fields. It should help students predict, experiment, observe, and explain how symbolic fields determine direction, speed, trajectories, and deformation.

Prefer familiar, responsive classroom interactions over architectural novelty. Desktop+mobile and touchscreen behavior, dark and light themes, accessibility, and clear mathematical feedback are first-class product behavior.

## Technical baseline and ownership

The application is framework-free JavaScript built with Vite and p5.js in instance mode. Keep it that way unless a framework migration is explicitly requested.

- `src/main.js` owns p5 lifecycle callbacks, shared application state, DOM wiring, render invalidation, and pointer/touch interactions.
- `src/parser.js` owns the expression language, evaluation, validation errors, and LaTeX generation.
- `src/vectorField.js` owns compiled vector functions and the sampled visible vector grid.
- `src/plane.js` owns world/pixel conversion and static grid, axis, and vector drawing.
- `src/particle.js` owns individual particle state, field-sample caching, and integration.
- `src/particleSystem.js` owns particle creation, culling, batched Canvas rendering, and sample invalidation.
- `src/settings.js` owns validated local preferences and field-only share URLs.
- `src/gestures.js` owns pure pinch calculations.
- `src/theme.js` and `src/vectorEncoding.js` own pure appearance rules.
- `index.html` and `src/styles.css` own DOM structure and responsive presentation.

`src/main.js` is large, but size alone is not a reason to split it. Add a module only when it establishes a coherent ownership boundary or independently testable responsibility. Do not add speculative wrappers or general-purpose state abstractions.

## Contracts that must keep working

- Share URLs contain exactly `fx` and `fy`. Preferences and viewport state remain local.
- Preferences use the versioned `vector-field.preferences.v1` localStorage key. For a new preference, add a default, validator, persistence/UI wiring, reload behavior, and tests.
- Viewport center and zoom are transient session state.
- The defaults remain dark mode, color-based vector magnitude, the cyan-to-pink vector palette, and uniformly pink particles unless a product change explicitly says otherwise.
- Theme, notation, palette, display, and particle preferences survive reloads without changing a field loaded from a share URL.
- Invalid expressions leave the last valid field active and show a useful error.
- Zero, constant, expensive, and singular fields such as `1/x` must not crash rendering or send particles to `NaN`/`Infinity`.
- Keep world-to-screen mapping isotropic. Reuse `Plane` conversion methods instead of duplicating coordinate math.
- Mouse painting, right/middle/Space-drag panning, wheel zoom, and UI clicks must remain isolated.
- On touchscreens, one touch paints and two touches pan/pinch without painting. Drawer touches must never become ghost canvas touches.
- Keyboard shortcuts must not interfere with inputs, selects, textareas, editable elements, or dialogs.
- Preserve control labels, focus behavior, and ARIA state such as `aria-pressed` and `aria-expanded`.

## Rendering and performance invariants

- Grid lines, axes, and field vectors are static-layer content cached in a p5 graphics buffer. Do not move them into unconditional per-frame drawing.
- A settled paused scene must stop the p5 loop. State changes while paused must request a frame or resume the loop when particle spawn animation requires it.
- Uniform particles are drawn as one native Canvas path. Magnitude-colored particles are grouped into reusable color bins and drawn by bin. Do not replace these with one p5 draw call per particle.
- A particle's field sample is cached at its current position and reused between magnitude rendering and integration. Invalidate samples when the active field changes.
- Treat 2,500 running particles at approximately 60 FPS on validated mobile hardware as a supported target. Running or magnitude-colored operation at 5,000 particles is not currently a supported target.
- Profile before adding spatial indexes, stacked canvases, alternative renderers, or other performance infrastructure. Use `benchmarks/particle-performance.md` for benchmark context.

## Decision-making rules

- Make the smallest change consistent with the existing architecture and user experience.
- Do not introduce React, Vue, Svelte, a general-purpose state library, a server, or account-based synchronization unless explicitly requested.
- Do not change the expression language as a side effect of unrelated work.
- Prefer pure functions for parser, gesture, encoding, validation, and coordinate logic.
- Preserve behavior while refactoring; do not combine a broad architectural rewrite with a feature change.
- Use existing browser APIs, DOM patterns, p5 lifecycle patterns, and local helpers before adding dependencies or wrappers.
- Avoid particle history, trajectory rendering, spatial indexing, logarithmic magnitude scaling, or a Three.js rewrite without a demonstrated requirement and profiling evidence.

## Code conventions

- Use plain JavaScript ES modules.
- Match existing JavaScript style: tabs for indentation, semicolons, and named exports for reusable logic.
- Keep Vitest unit tests beside source files as `src/*.test.js`.
- Keep browser behavior tests in `tests/browser/`.
- Use comments to explain non-obvious invariants or tradeoffs, not to restate the code.
- Avoid unrelated formatting or cleanup in focused changes.

## Testing and verification

Use the narrowest checks appropriate to the change, and broaden when behavior crosses boundaries:

- Pure logic, models, parser, settings, gestures, or encoding: `npm test`
- DOM, CSS, canvas interactions, persistence, responsive layout, keyboard, or accessibility: `npm test` plus relevant Playwright coverage with `npm run test:browser`
- Build, import, dependency, or production-bundling changes: `npm run build`
- Particle hot-path changes: tests and build, then `npm run benchmark:particles`
- Touch or gesture changes: relevant Playwright checks in both desktop and mobile projects

Representative regression fields are:

- Rotation: `⟨-y, x⟩`
- Radial growth: `⟨x, y⟩`
- Zero: `⟨0, 0⟩`
- Constant: `⟨1, 0⟩`
- Singular: `⟨1/x, 1/y⟩`
- Strong variation: `⟨y^3 - 9y, x^3 - 9x⟩`
- Expensive evaluation: `⟨sin(x + y), cos(x*y)⟩`

Do not run `npm run deploy-local`; it targets the maintainer's Raspberry Pi.

## Documentation authority

Use this order when sources disagree:

1. Current code and tests define implemented behavior.
2. `README.md` and `benchmarks/particle-performance.md` document the current product and measured performance.
3. `plan.md` contains useful constraints and proposed work, but roadmap items may not be implemented.
4. `notes.md` contains ideas and is not a requirements document.

Do not infer that a feature works merely because preparatory state, preferences, or notes exist. In particular, inspector preferences may appear before the complete inspector experience is implemented and tested.
