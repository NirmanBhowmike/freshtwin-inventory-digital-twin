# FreshTwin — authoritative engineering handoff

**Current release:** v0.5, deployed and verified in production; updated November 22, 2026 (America/Chicago).

## Source and deployment
- Public repository: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin
- Public application: https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/
- Protected main branch; production Git-connected Cloudflare Worker deploys `dist/` after `npm run build`.
- Main release PR #9 introduced joint optimization. The published source has original-code copyright reserved; the attributed Dingdong benchmark data is CC BY 4.0.

## Functional implementation — complete
- Phase 1: deterministic simulations, asynchronous product switching, usable inventory accounting, FEFO mass conservation, resilient UI and mobile layout.
- Phase 2: ten named vegetable scenarios with editable assumptions, clean separation from the real anonymous benchmark catalog.
- Phase 3: cost-consistent rolling order search, paired Monte Carlo and uncertainty metrics, pseudo-stockout diagnostics, explicit scientific limits.
- Phase 4: coupled ten-vegetable replenishment for a single hypothetical store; strict cumulative procurement budget and reserved refrigerated-capacity constraint; three fair constrained policies, seeded paths, day-level audits and exports.

## Data and scientific boundaries
- FreshRetailNet-50K extract: 865 distinct anonymous product IDs, one representative 90-day store-product series per ID (77,850 daily records), selected histories can come from different stores.
- Physical units, product names, real spoilage, retail costs, latent lost sales and on-hand states are not measured in the benchmark.
- Named vegetables represent synthetic operating scenarios. The full ten-product search is a bounded marginal-value heuristic, **not a globally optimal multi-stage model**. Exact enumeration is validated only for tiny finite static instances.
- Terminal cost convention carries usable ending stock and paid pending orders at cost basis. Inferences and CI/CVaR are conditional on simulated scenarios.

## Automated acceptance
- Node numerical and provenance regressions: 42 passed on v0.5 release.
- Public Cloudflare Chromium browser acceptance: 24 general + 12 joint-store checks passed, including 390/768/1512px and empirical asset fetching.
- Reference run: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45088531951
- Reproducible sensitivity/constraint benchmark: `npm run benchmark`; see `docs/OPTIMIZATION_BENCHMARKS.md`.

## Scientific development opportunities
- Calibrated stockout-censored likelihood or demand model with external ground truth.
- Stochastic supplier lead times, coherent real single-store operational data, calibrated purchase/expiry economics.
- Multi-period globally certified mixed-integer or stochastic optimization benchmark for small stores; compare with the current approximate coupled policy.
- Cross-SKU substitution, minimum service requirements, and uncertainty calibration.

## Core files
- `src/engine.js`, `src/joint.js`, `src/empirical.js`, `src/vegetables.js` — mathematical and data engines.
- `public/index.html`, `public/app.js`, `public/joint-ui.js` — presentation and interactions.
- `tests/` — invariants and regression tests; `scripts/benchmark_joint.mjs` — scenario benchmarking.
- `docs/METHODOLOGY.md`, `docs/PHASE4_JOINT_OPTIMIZATION.md`, `docs/OPTIMIZATION_BENCHMARKS.md`, `docs/DATA_SOURCE.md` — mathematical and provenance documentation.
