# FreshTwin — authoritative cross-chat project handoff

Updated: 2026-11-22 (initial research prototype)

## Identifiers
- Repository: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin
- Public repo; owner controls changes. Protected `main` ruleset ID: `27859261`, enforcement `active` verified from GitHub API.
- Development branch: `feat/freshtwin-functional-prototype`.
- Preferred host: Cloudflare Pages with Git integration; **Cloudflare connection and deployment NOT yet verified**.
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

## Next checkpoints
- Commit/update and validate the feature branch; open review PR; resolve CI before merging.
- Connect Cloudflare Pages project to GitHub `main` and verify actual public deployment URL.
- Run browser UI test and tune charts/mobile screens.
- Research improvement: obtain licensed historical retail data and document real versus assumed variables, if feasible.
- Later: capture verified screenshots, recording, and write the two-page submission in user's own voice.

## New chat instructions
Read this file first. Check GitHub latest branch/PR/CI status and public Cloudflare URL before modifying source. Preserve approved requirements; report what is verified vs pending. Work on a feature branch; do not overwrite `main` or remove repository protections. Continue technical implementation without re-asking already answered choices.