# FreshTwin v0.4 — Model specification and empirical boundaries

**Research question.** How do sales censoring, inventory age, lead time, and demand uncertainty alter perishable-product replenishment decisions? The current scope is a **single selected SKU per simulation**. Shared storage/budget constraints and substitution are reserved for **Phase 4**, which must not start before the Phase 1–3 validation gate.

## Separate data-generating settings

**Vegetable Demonstration** contains ten *named, fictional operating scenarios* (baby spinach, broccoli crowns, cherry tomatoes, cucumbers, carrots, red bell peppers, romaine lettuce, cauliflower, zucchini, green beans). Mean demand, demand variability, unit prices/costs, lead time, storage space, shelf life, initial stock, and age mix are researcher-specified assumptions. No vegetable names are attached to anonymized dataset IDs.

**Research Benchmark** contains the unmodified, anonymized Dingdong FreshRetailNet-50K histories: 865 product identifiers, one representative store-product series per product, 90 days per selected series (77,850 daily rows), including normalized sales, stockout hours, and hourly records. The dataset does **not** provide actual on-hand stock, inventory ages, physical unit quantities, prices or product names. The application converts normalized sales into illustrative model index units using a documented **10× scaling**. This mathematical conversion **is not physical unit recovery**. The selected store histories can be from **different stores** and must not be represented as a single observed store portfolio. The dataset attribution is CC BY 4.0; see `docs/DATA_SOURCE.md`.

**Observed / assumed / simulated:** Observable benchmark quantities are normalized sales and stockout indicators. Assumed quantities are inventory states, costs, demand-process parameters, future availability, and expiration rules. Simulated outcomes are future latent demand, orders, waste, stockouts, and dollar-denominated scenario objective values.

## Historical estimator and evaluation

Let \(S_t\) be recorded sales and \(u_t\in[0,16]\) unavailable operating hours. The baseline \(\hat\mu_N\) is the mean recorded sales over the latest 35 days. The bounded correction uses the mean of fully available days as an anchor, estimates exposure \(e_t=\max(0.4, 1-u_t/16)\), and combines \(S_t/e_t\) and the uncensored anchor with equal weights. The adjustment is truncated to at most 1.85 times that anchor and cannot fall below actual sales. The corrected forecast is the mean of adjusted daily values. **This is a transparent heuristic, not a statistically identified conditional expectation and not a validated recovery of genuine lost sales.**

**Validation pathways are deliberately separate:**

1. *Known-truth synthetic validation:* independently seeded latent demand is generated from an assumed Poisson/lognormal-mixed model, followed by inventory-cap censoring. Because the latent path is known by construction, absolute forecast errors can be computed over several stocking capacities and random seeds. These results apply **only** to synthetic scenarios.
2. *Benchmark pseudo-stockout test:* the first 70 chronological days of a real product series train an hourly sales fraction using fully available days; the last 20 days test estimates after artificially masking late-hour sales on fully available days. This evaluates an artificial cutoff, **not** actual lost demand behind real stockouts.
3. *Genuine benchmark stockout periods:* the true amount of forgone sales is unobserved. We show an estimate and its limitations, never ground-truth recovery accuracy.

No policy is evaluated on a path that purports to be empirically measured latent demand. Future evaluation demand comes from the assumed SKU-level process with an independently seeded random stream. For benchmark scenarios, the SKU-level mean remains informed by recorded-sales scale, so this is **scenario-based simulation, not a causally identified out-of-sample prediction**.

## Time convention and FEFO dynamics

Each day \(t\) follows an explicit sequence:

1. Receive orders whose scheduled day equals \(t\). Orders placed at end of day \(t\) with lead time \(L\) arrive at the **start of day \(t+L+1\)**; \(L=0\) therefore means next-day arrival, not same-day arrival.
2. Serve realized customer demand using **first-expiring-first-out** (FEFO) batches, sorted by remaining usable days.
3. Charge holding for inventory remaining immediately after sales (and before expiration). Decrement batch lives by one day. Remove and charge disposal for batches reaching zero remaining life.
4. Calculate a new order using the selected policy. The decision is placed at end of the day; orders enter an explicit outstanding-order pipeline.

The exact daily inventory conservation identity is

\[I_t^{\mathrm{close}}=I_t^{\mathrm{open}}+A_t-S_t-W_t,\]

where \(A_t\) is arrivals, \(S_t\) fulfilled sales, and \(W_t\) expired unsold stock. Every quantity and order remains nonnegative. The engine checks this equality every simulated day and automated tests verify it for different products and policies. Initial stock is either a configurable vegetable assumption or a documented illustrative rule based on historical sales (not retailer-observed inventory). The vegetable demonstration splits initial stock into a newer and older cohort according to the editable age-mix setting.

## Economic objective and terminal accounting

Define assumed unit purchase cost \(c\), per-day holding cost \(h\), unit disposal cost \(d\), shortage penalty \(b\), total paid order units \(Q\), physical opening inventory \(I_0\), physical ending usable inventory \(I_T\), and outstanding paid units after day \(T\), \(P_T\). The reported cost is

\[C_T=c I_0+cQ-c(I_T+P_T)+\sum_t hH_t+\sum_t dW_t+\sum_t bU_t,\]

where \(H_t\) is charged holding inventory, \(W_t\) expiration and \(U_t\) unmet demand. The shortage weight multiplies \(b\). All monetary rates are *scenario assumptions*. Revenue from fulfilled sales is tracked separately, but **the three policies are ranked by this cost objective**, not by sales revenue. The reporting includes a component-level reconciliation: opening inventory assets + paid orders − surviving inventory and pending-order assets + holding + disposal + unmet-demand penalty.

**Terminal convention.** Remaining usable inventory and paid-but-undelivered orders are carried forward at **purchase cost**. This avoids falsely treating every late-horizon order as a consumption expense. This is an internally coherent **book-value accounting convention**, not a resale-price forecast, actual salvage value, or proof that near-expiry inventory will retain full economic value. All policies use the same convention. Sensitivity to terminal valuation and longer horizons remains a research limitation.

## Policy comparison and optimization

1. **Observed-sales reorder-point policy:** target inventory position proportional to the historical mean recorded-sales rate and lead-time coverage, minus current stock plus outstanding orders.
2. **Stockout-adjusted reorder-point policy:** the same structure with the bounded sales-censoring adjustment.
3. **Freshness-aware policy:** a bounded integer, scenario-sampled **single-order** decision search. A candidate order arrives at its proper future lead-time date. Each candidate is evaluated using the same age-structured FEFO stock-flow rules and accounting cost components as the reported simulation, over a truncated planning window (up to 12 future days). Candidate quantities are evaluated on common sampled demand paths. For larger search spaces, an integer grid is followed by a local integer refinement. A small-instance exhaustive enumeration test checks the candidate-search implementation on the sampled objective.

The freshness-aware search is a **rolling approximate policy**. It is **not** a globally optimal multi-period solution; future orders beyond the current candidate are not optimized in the candidate rollout. When the order would not arrive within the remaining evaluation period, the chosen candidate is zero. The baseline policies may still order; carried-forward pipeline value prevents artificial terminal expense differences.

## Monte Carlo and inference

Each simulated trial has an independent, deterministic seed and one common demand path across the three policies (common random numbers). Thus a trial-by-trial cost difference \(\Delta_i=C_{i,\mathrm{baseline}}-C_{i,\mathrm{freshness}}\) supports a paired comparison. We report mean cost, sample standard deviation, fill rate, expiration quantity, and an approximate 95% normal-theory interval for mean cost and the paired mean difference. With \(n\) trials, this interval is \(\bar\Delta\pm1.96s_\Delta/\sqrt{n}\). The method assumes independent trial-level seeds; the interval can be unstable for small or heavily skewed samples.

**CVaR90** is the mean of the highest-cost 10% of simulated trials. Its estimates are unstable with few trials; the browser supports up to 128 paired trials and the user can inspect trial-count sensitivity. None of these model-based intervals are valid confidence statements about real financial improvements.

**Interpreting failures:** The freshness-aware heuristic can cost more than a baseline under some assumptions. The software reports lowest-cost and highest-service policies separately. It does not inject spoilage or rewrite outcomes to favor the advanced method. To demonstrate expiration, select an appropriately short shelf life or a demand-collapse setting; waste must arise from the actual batch dynamics.

## Important remaining scientific limitations

- Demand recovery remains heuristic rather than a fully estimated censored likelihood model. Real stockout lost sales remain unidentified.
- The future demand process uses an assumed distribution. No independent real-store demand or receipt ground truth exists in the benchmark.
- Cost-basis terminal valuation is one consistent choice, not necessarily an economic resale value.
- Supplier lead time can be adjusted deterministically; stochastic supplier lead-time distributions are not yet calibrated.
- The scenario search is an approximate single-order optimizer. It has no global optimality certificate for the multi-period inventory problem.
- Products are optimized independently. Joint budget, refrigerated capacity, minimum service constraints, and substitution are deliberately deferred to Phase 4.

**Related documents:** `docs/DATA_SOURCE.md`, `docs/QUALITY_REPORT_V03.md`, `docs/PHASES_1_3_VALIDATION.md`, `PROJECT_STATE.md`.