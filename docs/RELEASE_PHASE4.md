# FreshTwin v0.5 — Phase 4 verified release

## Implemented scope
- [x] Ten-vegetable coherent hypothetical store (not anonymized multi-store histories).
- [x] Hard all-horizon procurement budget and conservative reserved cold-storage capacity.
- [x] Three paired-demand constrained ordering policies and FEFO day-level reconciliation.
- [x] Age-specific expiry, lead-time pipeline and cost-basis terminal stock/order assets.
- [x] Approximate constrained marginal-value solver and reduced static exhaustive oracle tests.
- [x] Interactive Joint Store Lab, inspectable constraints, policy outputs and reproducible exports.
- [x] 42/42 model/source tests and production build passed.
- [x] 36/36 Chromium checks passed against deployed Cloudflare v0.5.
- [x] Protected-main merge and public production verification.

## Scientific boundaries
The coupled policy is sampled/greedy and does not certify global multi-period optimality. Inputs use illustrative physical units and economics. Source benchmark histories are anonymized and normalized, and do not establish actual costs, stock levels or genuine lost-demand recovery. Full model and assumptions: [PHASE4_JOINT_OPTIMIZATION.md](PHASE4_JOINT_OPTIMIZATION.md).

## Reproducibility
Run `npm run check`, `npm run benchmark`, and `npm run build`. Numerical benchmark protocol and interpretation: [OPTIMIZATION_BENCHMARKS.md](OPTIMIZATION_BENCHMARKS.md).
