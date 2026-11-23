# FreshTwin — Reproducible optimization sensitivity benchmarks

## Purpose and scope
The production Joint Store Lab implements an approximate coupled FEFO replenishment rule under a common **total procurement budget** and **reserved refrigerated-volume capacity**. This benchmark is a repeatable *numerical stress test*, not empirical validation against actual retailer economic outcomes and not a multistage global-optimality proof.

## Reproduction
```bash
npm run check
npm run benchmark
```

The second command writes `benchmark-results/joint-summary.json` (ignored by Git) and prints comparative policy summaries. The code runs without a network connection, external solver or paid API. CI runs the same script and preserves the JSON output as a downloadable numerical artifact.

## Controlled design

Every scenario includes the same ten separately configured illustrative vegetables and compares recorded-sales ordering, stockout-adjusted ordering and joint marginal-value ordering under **identical simulated demand paths and identical shared resource limits**. Seed list: **19, 42, 211**. Each comparison uses 12 simulated days, five decision-time demand samples and a bounded seven-step integer search.

| Scenario | Procurement limit | Refrigerated-volume limit | Disturbance |
| --- | ---: | ---: | --- |
| Capital-limited | $800 | 310 illustrative volume units | Baseline demand |
| Storage-limited | $5,500 | 260 volume units | Baseline demand |
| Balanced | $2,700 | 310 volume units | Baseline demand |
| Demand shock | $2,700 | 310 volume units | Demand intensity increased by 40% |

For every product/day, the harness asserts `opening + arrivals − sold − expired = closing`, nonnegative commitments, budget feasibility, storage feasibility and cost-component reconciliation. It also tests deterministic replay for each seed and verifies that all three policies face the same latent demand path. It reports mean modeled cost, mean fill rate, expiration, purchases and peak reserved storage by policy. The **winning policy is computed from the actual results** and is not predetermined.

## Small static exactness cross-check

A separate three-product **one-period, separable finite** example independently enumerates all feasible order vectors and checks that `exhaustiveSmallAllocation` selects a minimum-cost vector satisfying two resource constraints. This cross-check verifies a limited static integer allocation oracle. It **does not** measure the optimality gap of the dynamic ten-vegetable heuristic, because those decision problems differ.

## Limits and future improvements

Three seeds per setting are sufficient for a quick deterministic regression but **not** for robust statistical inference. Running the script on different hardware will change wall-clock timings. Better scientific follow-up would add many independent seeds, empirical calibration, confidence intervals, an exact dynamic MILP/stochastic-program benchmark on feasible small instances and matched-budget ablation studies. Do not report modeled savings as actual store results.
