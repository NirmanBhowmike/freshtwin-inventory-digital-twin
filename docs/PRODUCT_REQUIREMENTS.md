# FreshTwin — product and research requirements

## Goal
Provide a transparent and interactive perishable inventory decision-support application that separates observed anonymized data, assumed scenarios, and simulated outcomes.

## Released v0.5 acceptance
- [x] Live public Cloudflare Worker, protected GitHub release branch and verified static build.
- [x] Searchable, source-attributed 865-product FreshRetailNet catalog and real 90-day histories.
- [x] Separate ten-vegetable synthetic demonstration with editable costs, shelf lives, inventory, lead times and demand.
- [x] Deterministic seeded, FEFO age-aware inventories with day-by-day mass conservation, receipts and lost demand.
- [x] Cost-consistent policies, terminal asset accounting, paired Monte Carlo cost/fill/waste/CVaR and sensitivity interpretation.
- [x] Joint multi-vegetable purchasing budget and conservative shared refrigerated-storage constraint.
- [x] Three fair policies run on identical scenario demand paths and within the same hard resource constraints.
- [x] Exportable daily store ledger and reproducible model configuration.
- [x] Unit and browser QA for full model, benchmark asset access and desktop/mobile layouts.

## Research extensions — not implemented or field-validated
- [ ] Train and externally calibrate censored-demand recovery against truly observed latent demand.
- [ ] Collect credible same-store supplier lead, shelf life, receipt and financial reference data.
- [ ] Globally optimize a small multi-period, multi-product stochastic instance to measure practical heuristic optimality gaps.
- [ ] Model cross-product substitution and minimum service-level constraints.
- [ ] Examine robust/ distributionally-robust policies and broader sample-size convergence.

## Model integrity
- Do not imply one synthetic portfolio is an observed collection of 865 benchmark products from one physical store.
- Do not infer original product names or physical unit costs from normalized benchmark sales.
- Do not report simulated savings, estimated latent lost demand, or illustrative costs as validated real operational outcomes.
- State explicitly that the coupled joint policy is an approximate search, not a guaranteed global optimizer.

## User experience
- Overview: intuitive source mode selection and real/assumed provenance.
- Inventory twin: FEFO aging, material flow, daily stock accounting and order pipeline.
- Decision lab: single-item uncertainty/risk and policy trade-offs.
- Joint store lab: common budget/capacity, portfolio selection, policy frontier, capacity/capital trajectories and ledger replay.
- Methodology: inspect assumptions, definitions and numerical limits.
