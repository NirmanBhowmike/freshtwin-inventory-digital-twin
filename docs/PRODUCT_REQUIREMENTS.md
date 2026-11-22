# FreshTwin — Product and Research Requirements (living specification)

## Goal
A defensible, interactive demonstration of age-aware perishable inventory decisions under censored sales observations and stochastic demand. The user should see the *system state*, change a decision-relevant parameter, inspect policy trade-offs and audit the computations.

## Course reference
Dr. Curry's AI for PIC lecture includes a Candy Shelf Substitution Lab with a visible shelf allocation, constrained space slider, several SKUs, expected profit, and a substitution-aware search. The comparison standard is **visible response to operational decisions**, not copying a candy-shelf model. This platform uses a different extension: censored demand and expiring inventory.

## Functional acceptance
- [x] Deterministic, reproducible default scenario with explicit synthetic-data disclosure.
- [x] Three distinct inventory policies on a shared scenario demand path.
- [x] Interactive SKU selection and visual store status for the five independent example SKUs.
- [x] Replay daily sales, lost demand, orders, receipts and expiration using an auditable ledger.
- [x] See FEFO inventory age cohorts; tests verify the cohort total equals closing inventory.
- [x] Show comparative simulated cost, fill rate, waste, CVaR90.
- [x] Show paired model-based cost-difference interval and service/waste trade-offs.
- [x] Browser-local input CSV, reproducibility seed and data export.
- [x] GitHub CI and static Cloudflare Workers deployment configuration.
- [ ] Live public-browser UI and responsive visual QA after deployment.
- [ ] Real, independently verified public retail observations as default example (currently synthetic).
- [ ] Calibrated, held-out censored-demand recovery with forecasting benchmark and error analysis.
- [ ] Multi-period stochastic replenishment objective with validated constraints and optimality benchmark for small instances.
- [ ] Documented uncertainty calibration, sensitivity analysis and statistically valid comparison.
- [ ] Optional evidence-based AI model integration if useful; no paid API key required for present engine.
- [ ] Video demonstration and two-page student-authored assignment write-up (after app acceptance).

## Limitations and prohibitions
- Do not describe the current application as a live-connected retailer digital twin.
- Do not equate recorded sales with latent demand under stockouts.
- Do not present simulated percentage improvements as measured business savings.
- Do not claim a heuristic is statistically identified or globally optimal.
- Do not claim shared shelf-space capacity or cross-SKU substitution exists in the current model.
- Never commit API tokens or user-supplied proprietary data.

## Current visual mapping
- Overview: clickable product shelf/status board → selected SKU → demand estimator → policy comparison.
- Inventory twin: day slider → material flow (receipts, sales, lost, expired, ordered) → cohort ages and pending purchase orders → ledger.
- Decision lab: parameters → paired simulated cost comparison → approximate confidence interval → waste/service decision plane.

## Next scientific phase
Prioritize licensed real observations and a clearly defined data dictionary. For FreshRetailNet-50K, evaluate the original redistribution terms and normalization. The data does not supply physical shelf lives, costs or full inventory records, so those quantities must remain labeled assumptions. Then implement and benchmark a defensible censored-demand likelihood or other calibrated recovery method with an out-of-sample split and ablation against unadjusted sales.