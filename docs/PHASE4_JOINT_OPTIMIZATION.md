# FreshTwin v0.5 — Phase 4: Constrained multi-vegetable replenishment

**Research scope:** synthetic single-store, multi-SKU, stochastic perishable inventory simulator for a doctoral production and inventory control demonstration. This is a prototype, **not** a connected store and **not** empirical validation of real replenishment savings.

## 1. Problem addressed

The original v0.4 model optimizes one product at a time. An actual grocery operation has limited purchasing capital, cold storage and competing service requirements. Phase 4 uses **ten distinct named vegetables from one coherent hypothetical store**, rather than pretending that independently chosen histories from Dingdong's anonymized FreshRetailNet-50K benchmark belong to one physical establishment.

Each vegetable has independently declared **illustrative** unit demand, demand variability, procurement cost, selling price (display-only economics), shortage penalty, holding cost, disposal charge, shelf life, supplier lead time, opening on-hand stock, older-cohort proportion and capacity footprint.

## 2. Model and state

The daily planning horizon is `T` days (14/21/28 in the interface). For SKU `i`, `I_{i,t,a}` is usable physical on-hand inventory at age/remaining shelf-life cohort `a` after day `t`; `P_{i,t,τ}` represents orders committed but due at future date `τ`. We choose integer purchase quantities `q_{i,t}` **at the close** of each day, after demand fulfillment, expiry and the new remaining-life state have been observed.

Arrival convention: an order placed at the end of day `t` with SKU-specific integer lead-time parameter `L_i` arrives **before demand** on `t + L_i + 1`. Thus lead time zero means next-day delivery. This same definition is applied to all policies.

Each day follows: (1) receive due orders, (2) fulfill sampled demand with FEFO, (3) compute lost demand and holding charges, (4) decrease the remaining shelf-life of surviving cohorts and discard expired units, and (5) choose constrained replenishment orders. Inventory is conserved per SKU per day:

`I_open + received = sold + expired + I_close`.

If any balance differs, simulation throws an error; negative inventory and shipment quantities are not permitted.

## 3. Coupled resource constraints

For the entire decision horizon, procurement commitments may not exceed a **single global purchasing budget** `B`:

`Σ_{t=0}^{T−1} Σ_i c_i q_{i,t} ≤ B`.

This is a total-horizon budget, **not** a daily replenishment budget. It does not include initial inventory procurement already committed before the horizon. Prices are assumed, not verified invoices.

Conservative refrigerated capacity is based on `v_i`, the explicit illustrative storage footprint per SKU unit. At each end-of-day replenishment decision:

`Σ_i v_i (I_{i,t}^{close} + P_{i,t}^{outstanding} + q_{i,t}) ≤ C`.

Because all outstanding orders are reserved as though they could simultaneously occupy storage, this is intentionally more restrictive than an expected-arrival-time capacity policy. It guarantees that realized physical on-hand inventory cannot exceed capacity even when future demand is lower than anticipated. Modeling the exact stochastic maximum occupation with expirations and lead-time forecasts is future work.

The opening inventory footprint must not exceed capacity. If it does, the simulator **rejects the configuration** rather than silently allowing an infeasible state.

## 4. Economic comparison

For each policy and each paired future-demand scenario, the reported total modeled cost is

`C = Opening inventory at cost + Committed purchases − Closing usable inventory at cost − Outstanding paid orders at cost + Holding charges + Spoilage/disposal charges + Unmet-demand penalties`.

The terminal credit ensures that an order placed near the horizon's end is not incorrectly counted as a sunk expense when the paid units have not yet arrived or remain usable. An order placed too late to arrive is suppressed for every policy.

The two baselines, observed-sales reorder point and stockout-adjusted reorder point, compute **independent** order requests for each SKU and project those requests onto the **same** two-resource feasibility region using deterministic proportional scaling and feasible integer top-ups. The joint policy solves a **bounded, sampled multi-SKU allocation heuristic**:

1. Generate a common reproducible set of synthetic forward-demand paths per SKU for the daily order decision.
2. Evaluate each candidate quantity using the **same FEFO scenario cost terms** as v0.4. Candidate alternatives for a given SKU use the same sampled demand paths to control comparison variance.
3. Convert consecutive candidate quantities into marginal benefit bundles; greedily select positive marginal gains relative to the budget and volume they consume.
4. Use feasible integer single-unit polishing for residual capacity and capital.
5. Preserve zero-order feasibility and enforce exact budget, integer and volume checks before committing the orders.

This algorithm is **not a mixed-integer global optimum, a true multi-stage stochastic program or a globally optimal dynamic program**. The bounded sampled candidate objective and incremental greed can be sensitive to scenario draws, search granularity and nonconvexity. The independent `exhaustiveSmallAllocation` solver verifies small, bounded static test instances only; it does **not** certify ten-product global optimality.

## 5. Evaluation design and comparability

All three policies are evaluated against **identical synthetic latent future demand** in a paired Monte Carlo trial (common random numbers), from the **same opening inventory and age distributions**. The three policies cannot relax the shared capacity/budget restrictions.

The test records modeled cost, fill rate, unfilled demand, expired units, procurement spending, holding and disposal cost, approximate 95% paired cost-difference interval and sample CVaR90. It also exposes a day-level store ledger and per-vegetable FEFO movements, including capacity reservation and cumulative purchasing commitment.

The interface makes the **lowest-cost** and **highest-service** policies separately visible. The advanced method is allowed to cost more than a baseline. A negative mean advantage or a paired confidence interval spanning zero is not edited, hidden or treated as a software bug.

### Uncertainty limitations

- Monte Carlo intervals use `mean ± 1.96×s/sqrt(n)` for paired cost differences; normal approximation may fail for highly skewed/small samples.
- CVaR90 is the empirical mean of the top 10% of modeled total costs, sampled from only `n=8–48` paired trials. It is **not a calibrated population tail-risk guarantee**.
- Forecast adjustment is a disclosed bounded heuristic. Synthetic known-truth testing is a controlled diagnostic, not evidence of actual lost demand behind retailer stockouts.
- Changing a product's demand/cost settings changes the scenario **assumptions**, not actual historical benchmark records.
- Storage footprints are illustrative capacity units. Do not interpret 310 volume units as a measured refrigerator size.
- A policy's forecast is static within its simulated horizon and does not learn from realized future demand; adaptive receding-horizon Bayesian updating and actual substitution effects are outside scope.

## 6. Data provenance

The ten named vegetables are **synthetic** by construction. The separately retained FreshRetailNet-50K observational catalog contains anonymous product and store identifiers and normalized sales/availability; real product labels, actual stock levels, age cohorts, costs, purchasing constraints and expiration times are not disclosed. Therefore the app does **not** merge anonymous data from unrelated stores into a fabricated real shopping basket.

To reproduce algorithmic outputs, use the seed, selected SKU list and their full illustrative parameters, horizon, capacity, budget, demand multiplier and Monte Carlo trial count. Both research JSON and a daily joint store ledger CSV are available in the application. No paid API, backend database or private data is necessary.

## 7. Test plan and acceptance

Automated tests validate opening feasibility, duplicate SKU rejection, budget and storage constraints across many seeded runs and policies, FEFO mass balance for each SKU/day, same demand path across competing policies, deterministic outputs, budget-zero behavior, full-capacity behavior, cost-component identities, paired Monte Carlo statistics, terminal over-order prevention and a small-instance exhaustive allocation oracle. Browser acceptance should additionally verify editable shared constraints, mode navigation, real source separation, no horizontal document overflow on mobile, exported evidence and run-to-run determinism.

GitHub Actions deployment checks must exercise **the real public Cloudflare Workers URL** before claiming the release is verified in production.

## 8. Further research

A stronger subsequent contribution would compare the greedy allocator against (i) a global mixed-integer solver on reduced instances, (ii) a genuine multi-stage stochastic program with scenarios and nonanticipativity, (iii) rolling-horizon adaptive demand learning and (iv) distributionally robust costs with simultaneous service level constraints. It would also require permissioned perishable SKU observations with physical units, receipts and age data, or an independently calibrated simulated-data generating process.