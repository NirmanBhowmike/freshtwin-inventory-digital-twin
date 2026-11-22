# FreshTwin v0.3 product requirements and acceptance criteria

Purpose: build a clear, responsive decision-support application around genuine stockout-annotated fresh-retail observations. The interface must allow users to understand the problem, choose an observed product, inspect its history, modify decisions, and audit simulation results without reading source code.

## Acceptance criteria

1. A searchable, sortable catalog contains at least 800 distinct actual anonymized product IDs from the publisher's training split. Product names must not be invented.
2. Catalog must show historical normalized sales index and stockout-day count; product selection retrieves a validated 85–90-day actual history from static JSON assets and highlights which store it represents.
3. Product detail must visualize real daily sales and stockout event status; values must never be represented as physical sales quantities or an actual on-hand inventory.
4. Replenishment decision laboratory provides a reproducible inventory scenario using separately identified assumptions (scenario units, five-day shelf life, illustrative costs), not false retailer economics.
5. A compact, accessible data provenance disclosure is available, but the previous full-width research demonstration warning banner is removed. The user must still be able to distinguish observed history from simulation.
6. Three replenishment policies and FEFO aging remain operable with model-based comparisons, audit ledger and Monte Carlo uncertainty estimates.
7. Pseudo-stockout experiment uses earlier fully-stocked days for calibration and tests against later fully-stocked days with artificially withheld hourly sales, with honest scope limitations.
8. Source attribution, dataset license, source file hash and build instructions must be preserved for audit and republishing.
9. If the real catalog cannot be loaded, show an explicit error and a clearly named five-product example mode; do not claim hundreds of fake products.
10. GitHub Actions automated tests must pass, Cloudflare configuration must remain valid, and the public site must be inspected after deployment. Passing CI alone is insufficient evidence of live correctness.

## Not yet implemented as of this prototype

No SKU substitution matrix, store-wide shelf-capacity optimization, procurement integration, D1 persistence, real-time inventory, physical-unit calibration, validated product prices, or commercial forecast model. These are future enhancements, not implied by the application design.