# FreshTwin — authoritative cross-chat project handoff

Updated: 2026-11-22 (v0.2 visual/scientific transparency upgrade; release gate pending)

## Identifiers
- Repository: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin
- Public repo; owner controls changes. Protected `main` ruleset ID: `27859261`, enforcement `active` verified from GitHub API.
- Release approach: all changes via feature branch, GitHub CI and review PR into protected `main`.
- Hosting: Cloudflare Workers (Git integration and static assets); user provided `https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/`. Remote HTTP/browser fetch remains blocked in this execution environment; **live UI behavior not verified here**.
- Project: INEN-5350-48F Production & Inventory Control, Dr. James Curry.
- Formal title: Intelligent Fresh-Food Inventory Digital Twin: Stockout-Aware Demand Estimation and Stochastic Replenishment Optimization for Perishable Retail Systems.
- Submission: 2-page personally written Word report, screenshots, brief result quality discussion, 1–2 articles, and a recorded working demonstration; deadline 2026-12-01 at 11:59 PM CST.

## Standing requirements
1. Functional working public app before recording/write-up.
2. High visual polish, meaningful graphics and responsive design.
3. Document assumptions, data provenance, tests, reproducibility, project decisions and future work.
4. Public GitHub repository polished as a research software deliverable; **no open source license** granted.
5. Complete continuity across new chat windows through this file, README, documentation and commit history.
6. Automate executable tests/deployment where supported; never assert Cloudflare deployment succeeded without verification.

## Implemented in prototype
- Dependency-free static web app with native SVG charts, research/operations/decision lab tabs, mobile layouts and export functionality.
- Five illustrative SKUs, seeded synthetic 90-day observations.
- Stockout-adjusted demand heuristic, FEFO perishable inventory balance and 3 policy simulation.
- Seeded paired Monte Carlo benchmark, CVaR90 reporting, risk and service metrics.
- Browser-local CSV import/export.
- Node built-in unit tests and GitHub Actions CI.

## Scientific disclosure
Synthetic data, cost, initial inventory and product life are assumptions. No validated live store digital twin or measured retail cost savings. Do not claim FreshRetailNet-50K has been imported, or actual product demand reconstructed; not implemented. Methods are heuristic/approximate, not optimality-certified. See `docs/METHODOLOGY.md` and `docs/VALIDATION.md`.

## Verified v0.2 development checkpoint (2026-11-22)
- Added interactive simulated store board, visual day-level product flow, exact inventory age-cohort view, service-versus-waste chart, and paired-cost confidence intervals.
- Local `npm run check`: **11/11 tests pass** (including age-cohort reconciliation and interval sanity); `npm run build`: succeeds.
- Browser automation/browser screenshots are blocked by the execution environment administrative policy; visual QA remains unverified and must be completed after deployment.
- The visual store models five SKUs independently; no shared physical shelf capacity, product substitution or real retail integration is claimed.
- New release requires merging only after CI passes.

## Verified release checkpoint (2026-11-22)
- PR #1 was merged into `main` by squash commit `a7589180553609f9cde0aac64b4799dae27ccdee`.
- The GitHub Actions run on `main` completed successfully: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45074388948
- Local `npm run check`: 9/9 tests passed; `npm run build`: passed.
- Browser screenshot/interaction check was blocked by the execution environment; **live UI QA remains outstanding**.
- Cloudflare is not connected through this conversation and a deployed URL has **not** been verified.

## Next checkpoints
- Repository source is merged to main; keep working in a new feature branch for further changes and checking CI before merging.
- Confirm Cloudflare Workers Git deployment updates the given workers.dev URL following changes to `main`, and verify public page controls.
- Run browser UI test and tune charts/mobile screens; blocked in current tool environment.
- Deepen scientific rigor: replace heuristic stockout correction with calibrated, held-out evaluated censored-demand model; implement documented lead-time/expiry constrained optimization and compare with transparent baseline.
- Evaluate a legally usable real dataset (FreshRetailNet-50K is a candidate, not integrated), preserving normalized-data and absent-inventory caveats.
- Research improvement: obtain licensed historical retail data and document real versus assumed variables, if feasible.
- Later: capture verified screenshots, recording, and write the two-page submission in user's own voice.

## New chat instructions
Read this file first. Check GitHub latest branch/PR/CI status and public Cloudflare URL before modifying source. Preserve approved requirements; report what is verified vs pending. Work on a feature branch; do not overwrite `main` or remove repository protections. Continue technical implementation without re-asking already answered choices.

## v0.3 real-dataset implementation (2026-11-22)
- User confirmed the **FreshTwin** name. User requested a professional, self-explanatory product, removal of the full-width synthetic demonstration banner, real FreshRetailNet-50K integration, and a much larger product catalog.
- Proposed branch: `feat/freshtwin-real-data-catalog`. New `src/empirical.js` uses real normalized observation histories and explicitly distinct modeled inventory scenario units. The catalog will expose **865 anonymized product IDs**, not fake fruit or vegetable names. Source is Dingdong-Inc, CC BY 4.0.
- Reproducible importer `scripts/import_freshretail.py` reads the 4.5M-row benchmark training split, selects a representative 90-day store series for each product, emits 16 static JSON shards and a manifest with hash/license. GitHub workflow `.github/workflows/import-freshretail.yml` is designed to generate and commit the actual assets on the development branch. Source rows must be validated before merge.
- New UI searches, filters and sorts products, displays observed normalized daily sales with stockout indications, and shows a pseudo-stockout backtest on artificially withheld late-day observations. Full-width demo disclaimer replaced by a compact collapsible explanation. Simulation costs and shelf lives remain assumed.
- Local tests at the time of implementation: 16/16 pass; `npm run build` passes. **Data ingestion and public Cloudflare browser verification remain PENDING until explicitly verified.** Do not assert real source records are deployed before the workflow succeeds and the resulting catalog is inspected.
- Live URL supplied by user: https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/ . This link has not been verified with a live browser in the current tool environment.
- Next: run dataset import workflow on the feature branch; verify 865 products and 16 shards, inspect correctness/size; run GitHub CI; merge reviewed PR; confirm Workers deployment and browser. Then calibrate model and develop stronger empirical experiments.