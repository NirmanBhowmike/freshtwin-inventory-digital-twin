# FreshTwin — authoritative cross-chat project handoff

Updated: 2026-11-22 (v0.1 released to protected main; Cloudflare deployment pending)

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

## Verified release checkpoint (2026-11-22)
- PR #1 was merged into `main` by squash commit `a7589180553609f9cde0aac64b4799dae27ccdee`.
- The GitHub Actions run on `main` completed successfully: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45074388948
- Local `npm run check`: 9/9 tests passed; `npm run build`: passed.
- Browser screenshot/interaction check was blocked by the execution environment; **live UI QA remains outstanding**.
- Cloudflare is not connected through this conversation and a deployed URL has **not** been verified.

## Next checkpoints
- Repository source is merged to main; keep working in a new feature branch for further changes and checking CI before merging.
- Connect Cloudflare Pages project to GitHub `main` and verify actual public deployment URL.
- Run browser UI test and tune charts/mobile screens.
- Research improvement: obtain licensed historical retail data and document real versus assumed variables, if feasible.
- Later: capture verified screenshots, recording, and write the two-page submission in user's own voice.

## New chat instructions
Read this file first. Check GitHub latest branch/PR/CI status and public Cloudflare URL before modifying source. Preserve approved requirements; report what is verified vs pending. Work on a feature branch; do not overwrite `main` or remove repository protections. Continue technical implementation without re-asking already answered choices.
## Cloudflare Workers deployment configuration (2026-11-22)
- Cloudflare dashboard showed **Workers** Git import, not Pages. `wrangler.jsonc` now specifies static assets from `./dist`.
- Production commands: `npm run build`, then `npx wrangler deploy`. Production branch: `main`.
- User must create a dedicated FreshTwin Cloudflare API token (not reuse the token named for the evacuation simulator), authorize GitHub, and deploy. No Cloudflare account access is exposed in this conversation.
- Verify the `*.workers.dev` public URL and browser interactions after deployment; these are not yet complete.
