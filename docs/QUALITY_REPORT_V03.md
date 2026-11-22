# FreshTwin v0.3 — verification and release notes

## Source data audit: verified 2026-11-22

- Publisher: Dingdong-Inc/FreshRetailNet-50K, CC BY 4.0, 4,500,000 training records.
- Automated GitHub data import: success. Source parquet SHA-256: `6706832db892bbae4969c19d87e07975d2543d2ba7d7d4756360654785de5a3d`.
- Browser catalog: **865 distinct anonymized product IDs**, each with exactly **90 actual daily store records** (77,850 observations total).
- Dataset extract: 16 deterministic static JSON shards; no repeated products, missing series, or misaligned store mappings.
- Recorded stockout-hour counts fall within [0,16], and normalized daily sales are nonnegative.
- Hourly source sales sum to daily normalized sales with maximum discrepancy `7.105427357601002e-15` across all 77,850 selected days.
- Source metadata and checks independently inspected from the GitHub branch, not inferred from a synthetic test fixture.

## Application correctness

- Unit test suite: **16 passing** on the updated local prototype.
- Static production build: `npm run build` completed.
- Offline Chromium integration QA: executed against a **clearly identified in-memory browser fixture** only; product search, filtering, selection, 90-bar history view, disclosure opening, experimental navigation, and policy output passed with **zero JavaScript errors**. Tested desktop width 1512 and mobile width 390; no document horizontal overflow observed.
- A direct local URL navigation test was blocked by the container's browser policy. This is distinct from the successful `set_content` + in-memory integration test; **do not misrepresent it as Cloudflare browser acceptance testing**.

## Scientific limitations

Normalized sales are not physical units and the benchmark does not provide product names, cost, price, shelf life, purchase orders, actual inventory state, expiration or observed true lost demand. The inventory scenario uses a disclosed 10× normalization transform, assumed five-day shelf life and illustrative cost coefficients. The pseudo-stockout test is based on artificially hiding observations from otherwise uncensored days. No field savings or model optimality claims are made.

## Final outstanding release checks

1. Merge through GitHub PR after application CI passes and confirm final main-branch workflow success.
2. Confirm Cloudflare Git deploy succeeds on protected `main` and Workers serves `catalog.json` and a history shard.
3. Perform external live-browser functional testing: select two IDs, change category and sort order, adjust parameters, run experiments, and verify exported results.
4. For a publication-grade analysis, perform calibrated demand estimation with truly independent out-of-sample evaluation and document product-specific shelf lives, costs, and real business constraints if obtained.