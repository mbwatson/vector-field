# Particle Performance Benchmarks

## Reproducing the benchmark

Run the deterministic particle benchmark against a Vite production build:

```sh
npm run benchmark:particles
```

The runner opens headless Chromium at a 1280×720 viewport with device scale
factor 1. Each scenario uses fixed particle positions, skips particle spawn
animation, warms up for 60 frames, and records 180 frames. Results are emitted
as JSON so runs can be compared without parsing console tables.

The benchmark-only API is enabled by the `benchmark=1` query parameter. Normal
application frames do not collect timings.

## Local baseline — 2026-07-19

Environment:

- Vite production build served with `vite preview`
- Headless Chromium 149.0.7827.55
- Linux 6.8.0-134-generic, Node.js 24.9.0
- Intel Core i7-1280P
- 1280×720 viewport, device scale factor 1

All values below are milliseconds. `Work` measures synchronous application
work inside `draw()`; `interval` measures time between animation frame starts.

| Scenario | Particle render median / p95 | Work median / p95 | Interval median / p95 |
| --- | ---: | ---: | ---: |
| 500 paused uniform | 9.9 / 14.5 | 10.1 / 14.7 | 21.9 / 26.1 |
| 2,500 paused uniform | 48.6 / 64.4 | 48.8 / 64.7 | 59.6 / 77.1 |
| 5,000 paused uniform | 95.2 / 117.6 | 95.3 / 117.8 | 114.3 / 139.2 |
| 2,500 running uniform, `⟨-y, x⟩` | 49.8 / 55.7 | 50.7 / 56.4 | 62.5 / 68.8 |
| 2,500 running magnitude, `⟨-y, x⟩` | 103.9 / 130.6 | 104.5 / 131.0 | 117.3 / 146.0 |
| 2,500 running magnitude, `⟨sin(x+y), cos(xy)⟩` | 109.7 / 143.3 | 110.1 / 144.0 | 122.1 / 162.8 |

Across these scenarios, the cached background copy measured 0.1 ms median and
0.2 ms p95. At 2,500 running particles, culling measured 0.1–0.2 ms and the
integration pass measured 0.3–0.8 ms.

### Interpretation

The first optimization target is particle rendering. Uniform rendering scales
almost linearly at about 19 microseconds per particle, while magnitude mode
roughly doubles its cost. The background copy, culling, and integration are not
material bottlenecks in this baseline, so stacked canvases and culling changes
should not come before bulk Canvas drawing and magnitude-color batching.

The current phase boundaries affect attribution: magnitude mode evaluates a
field sample and selects a color during particle rendering, then reuses that
sample during integration. Uniform mode evaluates during integration. The
rendering number for magnitude scenarios therefore includes field evaluation,
magnitude normalization, color interpolation, style changes, coordinate
conversion, and ellipse submission. Follow-up profiling should split those
costs after the bulk uniform path establishes the renderer-only improvement.

These are directional local headless results, not a supported-device claim.
Representative desktop and physical mid-tier mobile measurements at native
device pixel ratio are still required before choosing the supported particle
budget.

## Bulk uniform Canvas path — 2026-07-19

Uniform particles were changed from one set of p5 style and ellipse calls per
particle to one native Canvas path and fill per frame. The same production
benchmark produced:

| Scenario | Baseline work median / p95 | Batched work median / p95 | Median speedup |
| --- | ---: | ---: | ---: |
| 500 paused uniform | 10.1 / 14.7 | 0.6 / 0.9 | 16.8× |
| 2,500 paused uniform | 48.8 / 64.7 | 1.8 / 2.8 | 27.1× |
| 5,000 paused uniform | 95.3 / 117.8 | 3.3 / 4.6 | 28.9× |
| 2,500 running uniform, `⟨-y, x⟩` | 50.7 / 56.4 | 2.4 / 3.7 | 21.1× |

All running scenarios retained their configured 2,500 particles through the
measurement period. Magnitude-mode timings remained within normal run-to-run
variation, as expected because that path was deliberately left unchanged.

The optimized uniform path is comfortably inside the provisional 12–14 ms p95
application-work budget at 5,000 particles on this machine. The next measured
optimization should reuse native Canvas paths for precomputed magnitude-color
bins; it should not change field evaluation or integration behavior.

Headless frame intervals remained around 22–28 ms median even when measured
application work fell below 5 ms. This is browser scheduling behavior in the
synthetic environment and reinforces the decision to use synchronous frame work
for before/after optimization comparisons. Physical-device frame cadence still
needs separate validation.

## Batched magnitude-color paths — 2026-07-19

Magnitude colors were quantized into 64 cached gradient colors. Each frame
assigns particles to reusable color bins, then draws one native Canvas path per
occupied bin. A particle's field sample is still evaluated at most once at its
current position and reused by integration.

| Scenario | Previous work median / p95 | Batched work median / p95 | Median speedup |
| --- | ---: | ---: | ---: |
| 2,500 running magnitude, `⟨-y, x⟩` | 102.9 / 124.6 | 4.3 / 6.2 | 23.9× |
| 2,500 running magnitude, `⟨sin(x+y), cos(xy)⟩` | 110.5 / 151.1 | 5.7 / 7.7 | 19.4× |

Both magnitude scenarios are now inside the provisional 12–14 ms p95
application-work budget on this machine. The trigonometric field costs about
1.4 ms more at the median than the polynomial field, but parsed field evaluation
does not dominate at this particle count.

Uniform results in this run remained comfortably within budget, although they
were 0.6–1.3 ms slower than the preceding run. This is treated as local run
variation because the uniform path was unchanged; physical-device measurements
remain necessary before setting a supported count.

## Physical mobile validation — Pixel 9a

Two consecutive runs were recorded on a Pixel 9a running GrapheneOS and Vanadium
151 at native device pixel ratio 2.625. The viewport was 411×784 CSS pixels, the
tab remained visible, and the second run started immediately to expose sustained
load or thermal degradation.

| Scenario | Cool work median / p95 | Sustained work median / p95 | Worst interval p95 |
| --- | ---: | ---: | ---: |
| 500 paused uniform | 0.8 / 1.3 | 0.8 / 1.3 | 17.7 |
| 2,500 paused uniform | 3.3 / 3.6 | 3.1 / 3.4 | 17.0 |
| 5,000 paused uniform | 5.6 / 6.1 | 5.6 / 6.2 | 18.7 |
| 2,500 running uniform, `⟨-y, x⟩` | 6.9 / 7.3 | 8.0 / 9.9 | 17.6 |
| 2,500 running magnitude, `⟨-y, x⟩` | 7.8 / 8.5 | 10.2 / 11.3 | 19.1 |
| 2,500 running magnitude, `⟨sin(x+y), cos(xy)⟩` | 10.8 / 12.6 | 10.7 / 12.2 | 18.3 |

All values are milliseconds. No measured frame interval exceeded 33.3 ms. The
second run showed some variability in the uniform and polynomial scenarios, but
the expensive trigonometric case stayed flat and every p95 application-work
measurement remained inside the 12–14 ms target.

Based on these measurements, the supported mobile target is **2,500 active
particles at approximately 60 FPS**, including magnitude coloring and a
representative trigonometric field. Paused uniform rendering is also validated
at 5,000 particles. Running or magnitude-colored operation at 5,000 particles
has not been validated and is not part of the current target.

The original benchmark reported the percentage of intervals strictly above
16.7 ms. That threshold was too sensitive to timer precision and normal vsync
jitter around 16.6–16.7 ms, so subsequent reports use 20 ms for visible 60 FPS
cadence misses while retaining 33.3 ms as the 30 FPS threshold.

## Paused render lifecycle

The p5 draw loop now stops when the simulation is paused and visible particle
spawn animations have settled. Playback and new or respawned particles restart
continuous rendering; appearance, field, viewport, layer, and clear operations
request a single frame while paused. Benchmark mode remains continuous so its
paused scenarios still collect a complete sample.

An automated desktop and mobile browser check counts background blits to verify
that the settled paused canvas remains idle, playback resumes repeated frames,
and pausing stops them again. This makes steady-state paused frame work zero
rather than merely reducing the cost of frames that have no visual changes.
