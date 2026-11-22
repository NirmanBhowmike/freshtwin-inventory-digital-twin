# FreshTwin

**Stockout-aware demand estimation and stochastic replenishment optimization for perishable retail systems**

FreshTwin is an interactive, browser-based *digital-twin research prototype* developed for **INEN-5350 Production & Inventory Control**. It models a small fresh-food operation, compares three replenishment policies, and makes its calculations and assumptions visible.

> **Scientific scope.** The starter scenario uses **synthetic historical observations, inventory state, SKU prices, product shelf lives and costs**. It is not a live-connected retail system. Simulated policy results must not be represented as verified field savings. A real-world digital twin would require a continuously synchronized physical data source.

## v0.2 interface and evidence improvements

- Interactive visual store board: click one of five modeled SKUs to change the audited simulation.
- Day-by-day material-flow dashboard and actual age-cohort inventory display reconciled to the mathematical ledger.
- Service-versus-waste decision plot and paired approximate 95% confidence intervals for differences in simulation cost.
- No fictitious shelf-capacity constraints or statistically identified demand claims are introduced by these visual changes.

## What works

- Deterministic 90-day simulated demand/sales/stockout history for five illustrative SKUs
- Explicit **recorded sales vs. stockout-adjusted demand** estimator; the adjustment is a bounded heuristic, **not a validated statistical recovery model**
- 28-day, FEFO (first-expiring-first-out) age-structured inventory simulation with arrivals, orders, lost sales and spoilage
- Three policy benchmarks: observed-sales reorder point, stockout-corrected reorder point, bounded scenario-based freshness-aware order search
- Paired seeded Monte Carlo policy comparison with mean simulated cost, fill rate, expired inventory and estimated cost CVaR (90%)
- Interactive daily inventory ledger, scenario controls and exportable research results
- Browser-local CSV import to replace generated historical sales observations for a selected SKU

## Quick start

Requires Node.js 20+. **No npm install is required.**

```bash
npm run dev
```

Open <http://localhost:4173>.

```bash
npm run check  # syntax and scientific invariants/tests
npm run build  # creates deployable static assets in dist/
```

## Cloudflare deployment

Deploy as **Cloudflare Pages** using Git integration:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

This prototype is fully static, does not request a Cloudflare API key, does not require backend infrastructure, and can be published on a `*.pages.dev` address. The `feat/freshtwin-functional-prototype` branch is intended for review prior to merging to `main`. Cloudflare deployment still requires repository authorization in the Cloudflare account.

## CSV schema

```csv
date,sales,stockout_hours,sku
2026-08-01,28,0,SPN-014
2026-08-02,19,4,SPN-014
```

Provide at least eight daily records with **physical-unit (non-normalized) sales**, `stockout_hours` in `[0,16]`, and optional `sku`. The data is processed locally in the browser and is not uploaded or persisted. CSV parsing is deliberately small and does not support embedded quoted commas. The import is for *observations only*: inventory, costs, and product life are still modeled assumptions. **Do not input normalized FreshRetailNet-50K values as physical unit quantities.**

## Model specification

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and [docs/VALIDATION.md](docs/VALIDATION.md). Source is under `src/engine.js` (deterministic core), `public/app.js` (views) and `public/styles.css` (responsive UI).

## Research reproducibility

All built-in stochastic scenarios use a user-visible seed. Policy comparisons share the same demand path in each trial; no policy is hardcoded to outperform another. The selected replenishment strategy can incur higher costs, and the interpretation should acknowledge this. `npm run check` verifies model invariants and key comparison properties.

## Provenance and credits

FreshTwin is an original educational prototype built with zero third-party runtime dependencies. Retail demand reconstruction and perishable inventory decision-making are established research areas; this prototype **does not claim original empirical discovery**. The [FreshRetailNet-50K project](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K) is a possible future historical data source after reviewing the terms of access, scale, and data dictionary. It is **not bundled** and **not used** in the default synthetic demonstration. All figures are generated from modeled outputs; graphical styling uses native SVG/CSS and standard emoji. Google Fonts may be requested by the browser and gracefully fall back to local fonts.

## Research and deployment status

See [PROJECT_STATE.md](PROJECT_STATE.md) for confirmed build state, checkpoints, next tasks, and cross-chat continuity. Treat the file as authoritative rather than relying on older conversations.

## License

**No open-source license is granted.** The public repository may be viewed subject to GitHub's terms; the author's original code is otherwise reserved. This does not change the licenses applicable to any third-party assets or libraries used separately.