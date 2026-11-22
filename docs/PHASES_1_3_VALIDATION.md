# Phases 1–3 validation and engineering change log

Date: 2026-11-22. Working release: FreshTwin v0.4, development branch `feat/phases-1-3-validated-vegetable-modes`.

## Phase 1 — Existing defects and model accounting

| Problem | Evidence / source | Correction | Verification |
| --- | --- | --- | --- |
| Rapid successive product clicks could appear stale during asynchronous shard loading | Initial live Chromium assessment reported a product chart not updated within the original short wait | Latest-request token, in-flight shard cache, progress status, disabled conflicting decisions, and rejected-response recovery | Browser test waits on actual chart ID and deliberately sends rapid selections across multiple shards |
| Seed reproduction was inconclusive under the initial browser test sequence | First browser assessment reported one seed-restoration failure | Deterministic seeded histories and simulation streams; explicit seed and control reset; data source state consistent across runs | Regression test compares entire policy objects; browser test restores the original seed and compares SVG trajectory |
| Decision Lab overflow at 390 px | Initial assessment measured 727 px of document width at a 390 px viewport | Grid min-width normalization and responsive layout; tables scroll within containers | Browser suite checks document width at 390, 768, and 1512 px; table scrolling retained |
| Local preview could not serve the empirical and vegetable module files | Prior `scripts/dev.mjs` only special-cased `engine.js` | Allowlist the `engine.js`, `empirical.js`, and `vegetables.js` source modules | Browser suite starts the repository's local server and fetches actual `public/data` shards |
| End-of-horizon paid orders were expensed even when outstanding | Prior engine included `spent += ordered * cost` but provided no terminal credit | Cost-basis opening inventory capitalized; ending usable stock and outstanding paid orders credited; all policies use same equation | Unit regression for open/pipeline valuation, cost decomposition, and no artificial terminal charge |
| Parameter changes displayed old results without clear indication | Input sliders changed settings without re-running comparisons | Explicit stale-results indicator, reset action and rerun workflow | Browser test changes intensity then checks stale notice and recalculation |

## Phase 2 — Product identity and usability

- Named vegetable scenario: ten unique SKUs with product-specific daily demand, demand variability, purchase and selling costs, holding, shortage, disposal, shelf life, lead time, storage footprint, opening stock, and older-cohort share.
- Benchmark scenario: all 865 anonymized product IDs retained with original normalized historical sales, stockout records, store IDs and publisher attribution.
- Modes are separate. **No anonymous ID is assigned a fictitious vegetable name.**
- Editing vegetable assumptions changes simulated scenarios; the real benchmark source observations are not rewritten.
- CSV uploads remain browser-local and are not substituted for the immutable source benchmark.
- Mobile UI includes keyboard-focusable product controls and field labels. Full WCAG assessment is a separate task.

## Phase 3 — Model validity and experiments

- FEFO batch aging, on-order pipeline tracking, next-day-through-lead-time arrivals and daily mass-balance invariants.
- Explicit evaluated objective: opening asset + purchased orders − usable ending on-hand and outstanding-order assets + holding + spoilage + shortage.
- Freshness-aware candidate search performs a short-horizon FEFO scenario rollout and uses the same economic components as the performance evaluation. Exact enumeration validates **small sampled candidate decisions only**, not multi-period global optimality.
- Controlled known-truth synthetic demand tests across several forced stocking limits, plus the existing 70/20-day chronological pseudo-stockout benchmark diagnostic.
- Independent seeded Monte Carlo scenarios, paired policy-difference intervals, cost dispersion, expiration and CVaR90 descriptions.
- Explicit rank distinction: lowest cost may differ from highest service; an advanced policy may legitimately cost more.
- A short-life controlled regression confirms that expiration emerges from actual inventory batches rather than being manually inserted into a chart.

## Test inventory

- Existing suite: source/catalog and inventory simulation tests preserved.
- New regressions: product parameter validation, mass balance, terminal asset conservation, deterministic replay, synthetic known-truth errors, bounded-search vs exact sampled candidate enumeration, missing late-horizon arrival, cost identity, Monte Carlo reproducibility, genuine model-generated expiration.
- Browser acceptance: real Chromium with published benchmark shards; checks products, selectors, consecutive asynchronous clicks, seeds, exports, CSV import/restore, recorded and illustrative data modes, responsive widths and JavaScript errors. **Actual verified GitHub Actions results:** browser suite run #45085398138 passed **24/24** on 2026-11-22 using real benchmark shards and a local preview server. Quality run #45085398163 passed **28/28** Node tests and production build. These results predate Cloudflare production acceptance.

## Known limits / release gate

Do not call this a validated physical-store digital twin. No model can identify real lost demand from anonymous normalized sales alone without further assumptions and testing. No real unit economics or grocery purchase orders are known. Phase 4 (joint capacity and budget) remains blocked until Phase 1–3 checks and deployment are verified. The course recording and two-page submission discussion remain separate follow-up work.
## Verified pre-merge browser gate (2026-11-22)
- [Chromium interactive acceptance run](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085398138): **24 passes, 0 failures**, no uncaught browser errors or failed benchmark asset responses.
- [Node tests and static build](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085398163): **28 tests passed**, 0 failures; build succeeded.
- Confirmed rapid product requests select the newest ID, restore seed reproduces chart, 128 paired trials render, CSV and research exports work, inventory ledger reconciles, and 390/768/1512px document widths do not overflow.
- These are **real Chromium tests against GitHub's preview server**, not an assertion of verified Cloudflare production deployment.
- Phase 4 remains out of scope until this review is merged and Cloudflare production has been checked.

## Live Cloudflare production acceptance — verified

- After merging Phases 1–3 into protected `main`, a dedicated [public-endpoint validation workflow](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085856763) ran successfully on 2026-11-22.
- Its preflight verified the production page served `Version 0.4.0` and the attributed FreshRetailNet-50K catalog endpoint was accessible.
- The same **24/24 Chromium browser checks passed against the public workers.dev URL**. This includes named vegetable/benchmark modes, real dataset, rapid product selection, seed reproducibility, cost/expiration ledger, 128-trial evaluation, exports, mobile and desktop widths, and no uncaught JavaScript or benchmark network errors.
- The final main branch static build and Node unit checks also passed: [CI run](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085856539).
- This establishes a functioning deployment, not empirically calibrated costs, validated real lost demand, or global optimization guarantees. Phase 4 remains unstarted.
