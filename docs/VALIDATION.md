# FreshTwin verification protocol

Automated tests (see `tests/engine.test.js`) cover deterministic pseudorandom streams, sales never exceeding synthetic latent demand, nonnegative demand estimates, Poisson sampling invariants, exact accounting of unmet demand and expired units, common random demand scenarios across policies, valid CVaR sample summaries, and rejection of malformed CSV inputs.

## Reproducible manual checks

1. Launch `npm run dev` and verify the dashboard displays calculated values from the simulation engine.
2. Change the SKU and confirm updated forecasts, inventory trajectories and cost figures.
3. Change the seed; verify synthetic observations and trajectories update. Restore the prior seed and verify exact repeatability.
4. Open Inventory Twin; step day by day, checking `sales + unmet = demand` and that no displayed inventory goes negative.
5. In Decision Lab change lead time or shelf life, run the paired experiment, and inspect mean cost, fill rate, waste and CVaR.
6. Export results JSON and ledger CSV. Cross-check metrics against the displayed numbers.
7. Download example CSV and import it under the matching SKU; verify the status changes to user-imported CSV. Restore synthetic mode.
8. Resize to mobile width and check navigation, charts and scrollable ledgers remain functional.

## Quality interpretation

A working application is not empirical proof. The demand recovery method is heuristic; the optimization method is approximate; simulated costs depend on artificial price/penalty assumptions. Policy improvement is contingent and should not be stated as a factual reduction in real waste or lost sales.