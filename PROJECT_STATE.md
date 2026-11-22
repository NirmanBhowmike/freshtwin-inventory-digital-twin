# FreshTwin — authoritative current project status

Updated: 2026-11-22 · target release **v0.4.0** · source branch `feat/phases-1-3-validated-vegetable-modes`.

## Ownership and identifiers
- GitHub: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin
- Cloudflare user-provided URL: https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/
- Public repository, original software source unlicensed (all rights reserved); publisher data CC BY 4.0 with attribution.
- Protected `main` with ruleset ID `27859261`, active. Use feature branch, PR, green checks, squash merge; no forced writes to main.
- Work for INEN-5350-48F (Production & Inventory Control), Dr. James Curry. Formal research title: “Intelligent Fresh-Food Inventory Digital Twin: Stockout-Aware Demand Estimation and Stochastic Replenishment Optimization for Perishable Retail Systems.”
- Submission deadline: 2026-12-01 at 11:59 PM CST. User personally writes two-page Word discussion after product; project recording, screenshots, quality discussion and 1–2 research articles are separate subsequent deliverables.

## Latest verified development release — Phases 1–3
- **PR #6:** https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/pull/6. Work remained on the feature branch while acceptance was evaluated. **Verify PR merge before claiming deployed v0.4.**
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
1. Verify PR #6 is merged into protected `main`, and main GitHub CI remains green.
2. Independently verify the Cloudflare production deployment actually serves v0.4, with source-mode switch, real data fetch and live interactive controls. GitHub's local browser suite is NOT a production URL test.
3. Review visual design/screenshot acceptance as needed. No need to expose an API token; Cloudflare Git build should auto-deploy the protected main branch.
4. **Phase 4 is not started**: future joint multi-vegetable procurement subject to shared cold-storage capacity and purchasing budget, mathematical verification of constraint handling and comparative benchmarks.
5. Only after functional product validation, prepare the assignment recording and student-authored two-page Word discussion.

## Required references for handoff
- `README.md` quick start and data provenance.
- `docs/METHODOLOGY.md` mathematical objective, FEFO, demand modeling and limits.
- `docs/PHASES_1_3_VALIDATION.md` phase-by-phase defects, fixes and acceptance evidence.
- `docs/DATA_SOURCE.md` data source hashes, 865 series, dataset license.
- `.github/workflows/ci.yml` + `.github/workflows/browser-acceptance.yml` for CI.
