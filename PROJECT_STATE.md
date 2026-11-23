# FreshTwin — authoritative current project status

## Verified v0.5 production and demonstration release — November 22, 2026 (US/Central)

- **Live Cloudflare Workers:** https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/ — v0.5 deployed and independently checked.
- **Source:** merged [PR #9](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/pull/9); later recording/evidence [PR #10](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/pull/10).
- **Technical tests:** 42/42 unit tests, build success; 36/36 browser acceptance checks on live site ([GitHub production QA](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45088531951)).
- **Genuine screen recording:** 15 captioned scene segments, ~2 minutes 24 seconds, eight screenshots, [downloadable recorded evidence from GitHub Actions](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45088531892/artifacts/14780725120). Video is silent/captioned, not a synthesized voiceover.
- **Course evidence:** an exactly two-page DOCX review worksheet generated from **actual public-site screenshots and calculated model outputs** and included in the same artifact. The user must review, personalize and independently submit their own discussion.
- **Scientific scope:** this is a functional assumption-driven digital-twin simulation with real anonymized benchmark context, not a field-calibrated retail operational twin or guaranteed globally optimal solver. The named vegetables never represent decoded benchmark identities.


Updated: 2026-11-22 · target release **v0.4.0** · source branch `feat/phases-1-3-validated-vegetable-modes`.

## Ownership and identifiers
- GitHub: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin
- Cloudflare user-provided URL: https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/
- Public repository, original software source unlicensed (all rights reserved); publisher data CC BY 4.0 with attribution.
- Protected `main` with ruleset ID `27859261`, active. Use feature branch, PR, green checks, squash merge; no forced writes to main.
- Work for INEN-5350-48F (Production & Inventory Control), Dr. James Curry. Formal research title: “Intelligent Fresh-Food Inventory Digital Twin: Stockout-Aware Demand Estimation and Stochastic Replenishment Optimization for Perishable Retail Systems.”
- Submission deadline: 2026-12-01 at 11:59 PM CST. User personally writes two-page Word discussion after product; project recording, screenshots, quality discussion and 1–2 research articles are separate subsequent deliverables.

## Latest verified development release — Phases 1–3
- **PR #6:** https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/pull/6. PR #6 was **merged into protected main** at commit `8943be00ce2e5d29ecc8312a89b0ee7de6fffc1a` on 2026-11-22. **Cloudflare v0.4 production deployment VERIFIED** by GitHub Actions on 2026-11-22: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085856763. Actual public URL, dataset endpoint, and 24/24 live Chromium interactions passed.
- GitHub Actions quality run: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085398163 — **28/28 Node tests passed and static production build passed**.
- GitHub Actions Chromium browser acceptance: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085398138 — **24/24 checks passed**. Used actual benchmark shards and the local preview server. Tests include ten vegetable products, editable assumptions, product selection races, deterministic seed replay, conservation ledger, Monte Carlo maximum 128 trials, reset/stale markers, CSV import, exports, responsive widths 390/768/1512px and zero uncaught browser JavaScript / benchmark network errors.
- A genuine event-binding bug `document.querySelector` vs `querySelectorAll` originally broke rendering. Fixed in commit `6a4867fc1eeb16b9d33d2da5a0c934eca04c4301` and verified in source + browser acceptance.
- Existing 865-product attributed benchmark preserved: 77,850 genuine daily normalized observations (90 each) in 16 history shards. Different products can originate from different stores. NO invented physical counts, product names, prices, shelf lives or observed lost demand.

## Functional v0.4 features
- Vegetable Demonstration: 10 named vegetables with separate illustrative demand, variability, purchase/selling costs, holding, shortage/disposal cost, shelf life, supplier lead, storage per unit, initial stock and old cohort share, editable in the app.
- Research Benchmark: 865 anonymized product IDs with original normalized sales and stockout observations, chronological pseudo-stockout validation with artificial withholding and attribution. No false product-name mapping.
- Corrected deterministic perishable-inventory engine: FEFO batch ages, daily conservation, lead-time pipeline, usable-stock terminal accounting, bounded scenario-sampled order search and baseline policy comparisons. Search is approximate, no global-optimality claim.
- Honest research outputs: mean modeled cost, service and expirations, paired CIs, cost CVaR90, cost decomposition, trial-count convergence, controlled known-latent synthetic demand diagnostic, reproducible JSON and CSV exports.
- Self-explanatory interface and mathematical Methodology section, loading/race safeguards, scenario reset, stale results, responsive decision lab.

## Scientific boundaries
- Real benchmark data contains anonymized normalized observations, NOT known product identities, on-hand counts, lifetime values or cost inputs.
- Explicitly assumed scenario parameters and future latent-demand simulation are NOT measured retail economics, real recovered lost demand, observed food waste or a continuously synchronized physical digital twin.
- Terminal credit treats remaining usable stock and outstanding paid purchase orders as assets at cost. May require reevaluation under alternative accounting assumptions.
- Some sophisticated policies cost more than the simple baseline in certain simulations; preserve and explain, never manipulate results to favor one method.
- The 95% intervals and sample CVaR90 describe simulated uncertainty only; real-world performance validation remains open.

## Remaining and next actions
1. **Verified:** PR #6 merged into protected `main` at `8943be00ce2e5d29ecc8312a89b0ee7de6fffc1a`; subsequent main GitHub CI passed: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085708246
2. **VERIFIED:** Cloudflare production serves v0.4 and the attributed dataset; the main-branch `.github/workflows/production-acceptance.yml` run #45085856763 passed all **24/24 interactive live-browser checks**, including 390px mobile, and 128-trial Monte Carlo. The latest main build run #45085856539 also passed.
3. Production visual screenshots are captured as GitHub Actions artifacts in run #45085856763; review UX polish and contrast/accessibility as appropriate. No need to expose an API token; Cloudflare Git build should auto-deploy the protected main branch.
4. **Phase 4 is not started**: future joint multi-vegetable procurement subject to shared cold-storage capacity and purchasing budget, mathematical verification of constraint handling and comparative benchmarks.
5. Only after functional product validation, prepare the assignment recording and student-authored two-page Word discussion.

## Required references for handoff
- `README.md` quick start and data provenance.
- `docs/METHODOLOGY.md` mathematical objective, FEFO, demand modeling and limits.
- `docs/PHASES_1_3_VALIDATION.md` phase-by-phase defects, fixes and acceptance evidence.
- `docs/DATA_SOURCE.md` data source hashes, 865 series, dataset license.
- `.github/workflows/ci.yml` + `.github/workflows/browser-acceptance.yml` for CI.

## Final v0.4 release verification — 2026-11-22
- Protected main release commit `8943be00ce2e5d29ecc8312a89b0ee7de6fffc1a` merged via PR #6. Latest documentation/production-QA workflow commit `87dfadcdcd53775c5f0108a52a96c825688ee1ed` merged via PR #7.
- CI run on the final production-workflow merge: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085856539 — PASS.
- **Real public Cloudflare browser** verification: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085856763 — PASS, 24/24 checks; real catalog and all workflows functional on publicly deployed application, zero uncaught JavaScript/network data errors.
- Source project, math engine and data verification: 28/28 Node tests and build PASS, https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45085398163.
- **Phases 1, 2, 3: implemented and verified. Phase 4: intentionally NOT started.** Course recording and student-authored Word discussion intentionally deferred.

## v0.5 Phase 4 implementation — 2026-11-22 / 2026-11-23 UTC
- Source branch: `feat/v05-joint-inventory-optimization`; PR #9; **MERGED AND DEPLOYED** through protected main, PR #9 squash commit `0bb4d4bbfb23f722bf9f6c8053b4451275e522c0`.
- Code: `src/joint.js` and `public/joint-ui.js`, `public/joint.css`, dedicated `#joint` UI section of `public/index.html`. New Phase 4 docs `docs/PHASE4_JOINT_OPTIMIZATION.md` and `docs/PHASE4_DEMO_STORYBOARD.md`.
- Coherent synthetic single-store SKU set; shared total-horizon procurement budget and conservative refrigerated-volume reservation (on hand + all pending orders); FEFO stock conservation and terminal asset accounting; three policies under the same constraints and paired demand paths.
- Joint allocation is a sampled, bounded, greedy incremental-cost heuristic, not a globally optimal MILP/stochastic control solver.
- UI: budget, storage, demand, horizon, seed, trials, included products, capital/capacity plots, per-SKU daily replay, JSON/CSV research exports, interactive reassessment. Edits to named vegetable source assumptions propagate.
- Deterministic and exact small-instance oracle tests added (`tests/joint.test.js`); 42/42 Node regression tests and feature-branch static build passed https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45087305531.
- Chromium acceptance: new `scripts/joint_browser_acceptance.mjs` (12 checks) runs after original 24, for preview and on actual Cloudflare URL. Do not merge until all 36 pass.
- Phase4 recording storyboard exists, but do not claim a recorded or narrated video exists until actual artifacts are produced and reviewed.
- User's end-of-semester two-page Word report and oral narration must not claim measured cost savings or calibrated real demand.

## Feature-branch browser acceptance confirmed
- [GitHub Playwright Chromium run #45087586964](https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45087586964) **PASSED 24/24 original browser checks plus 12/12 new joint-store browser checks**. Entire branch: 36/36. Version v0.5 joint lab, ten named SKUs, fair constraints, ledger, stress tests, exports and 390/768/1512px non-overflow confirmed.
- Source JS validated with 42/42 Node tests and production build. Authored a captioned live production screen recording workflow; it must run after actual Cloudflare deployment, and successful artifact production must be checked before claiming a video exists.

## Final v0.5 deliverables and handoff
- GitHub Actions actual live-production QA #45088531951: SUCCESS, 36/36 checks; main unit/build #45088531944: SUCCESS (42 tests).
- Recorded actual public site in 1440×900 viewport; video duration 144.16 s. GitHub video/screenshots/Word evidence artifact ID 14780725120 from run #45088531892. Artifact upload explicitly includes hidden output directory.
- 8 screenshots, 15 captioned walkthrough scenes, full WebM source. An MP4 conversion and a curated ZIP with DOCX and screenshots were produced for the conversation user; these **sandbox files are not committed into GitHub**.
- Exactly two-page research worksheet rendered and inspected from real public screenshots: includes 12-trial Monte Carlo mean costs, service and expiration comparison; instructor requires student to review and write in own words before submission.
- References and methods: Wang et al. (2025) FreshRetailNet-50K arXiv:2505.16319 and Sharma et al. (2020) Production and Operations Management DOI 10.1111/poms.13097. Actual live store economics are unknown.
- **Phases 1–4 finished, production and demo verified.** Remaining action is student review/optional spoken narration and submission to course LMS. Do not claim work submitted without confirmation.
