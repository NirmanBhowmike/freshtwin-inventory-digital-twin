# Modeling approach and assumptions

## Scope
Single-store, five selectable illustrative SKUs, independently simulated. No cross-SKU substitutions or shared capacity constraints are presently modeled. All economic parameters and default inventory observations are synthetic.

## Demand observations
An illustrative latent daily demand path is sampled from a seasonally varying Poisson model and capped by a synthetic daily stocking limit to generate observed sales and stockout hours. The simulated `latentDemand` is retained as a *synthetic truth for tests*, never as a real retailer observation.

The historical baseline is a 35-day mean of observed sales. When an observation has unavailable hours, an adjusted value is computed from a clipped blend of sales/available-time and the mean of uncensored days. This is **heuristic**, may be biased under non-random stockouts, and does not identify the actual lost demand from data. Forecast uncertainty is an uncalibrated dispersion estimate.

## Age-structured inventory simulation
Each day, due purchase orders arrive; customers demand units; the FEFO allocator fulfills as much demand as existing inventory permits; shortages are counted as lost sales; inventory incurs a holding charge; age is decremented and expired batches are disposed; a policy then places a next-period order. Inbound orders arrive after `leadTime + 1` daily steps. All state quantities remain nonnegative.

Inventory accounting holds day-to-day:

`ending = previous_ending + arrivals - sales - expirations`.

The starting batch is initialized from the observed-sales baseline. This initialization is illustrative rather than measured.

## Policy definitions

1. **Observed-sales reorder point:** stock position target based on naive recorded-sales mean and specified lead time.
2. **Corrected-demand reorder point:** same rule with the stockout-adjusted historical mean.
3. **Freshness-aware scenario search:** evaluates a bounded integer grid of quantities using sampled future Poisson demand, projected usable stock, expected modeled shortage costs, holding costs, disposal charges, and purchase costs. This is a **heuristic sample-average approximation** with no global optimality guarantee. It is not a full dynamic program and does not simulate all future expiration decisions inside the order objective.

## Evaluation
The default model runs 28 daily time steps per policy. A common future demand trajectory is used for all three policies within a trial; across trials, random seeds change. Reported *mean cost* is purchase + carrying + disposal + shortage penalty. Net value is recorded for diagnostics but is not the objective. CVaR90 is estimated as the mean of the largest 10% of trial-level total modeled costs (a small-trial sample estimate, not a reliable population tail-risk estimator).

## Important limitations

- Actual field performance has not been validated.
- Product demand is independent across SKUs; price effects, substitutions and promotions are excluded.
- No real receipts, opening on-hand balances, age labels, purchase orders or invoices are available in the starter scenario.
- Model economics and shelf life are explicitly assumed.
- A static replay cannot assert real-time physical-twin synchronization.
- The order optimizer's bounded grid has no exact optimality certificate.
- Input CSV support is deliberately simple; it must be physical-unit sales, not normalized data.

## Recommended next research steps

Integrate documented, permissioned empirical observations; perform proper censored-demand likelihood or survival-based modeling; calibrate uncertainty; assess historical held-out forecasting; introduce cross-SKU capacity constraints and product waste; validate the optimizer against exhaustive search in small instances; and quantify out-of-sample trade-offs with confidence intervals and sensitivity analysis.