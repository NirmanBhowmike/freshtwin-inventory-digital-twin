# Dataset integration and reproducibility

## Primary research dataset

- **Dataset:** Dingdong-Inc, [FreshRetailNet-50K](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K)
- **Reference:** Wang, Y., Gu, J., Long, L., Li, X., Shen, L., Fu, Z., Zhou, X., and Jiang, X. (2025). *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Latent Demand Recovery and Forecasting in Fresh Retail.* [arXiv:2505.16319](https://arxiv.org/abs/2505.16319).
- **License applying to the underlying dataset:** Creative Commons Attribution 4.0 International (CC BY 4.0). Dataset copyright and license remain with its publisher and do **not** confer a license on FreshTwin source code. No endorsement by Dingdong-Inc is implied.
- **Documented training split:** 4,500,000 rows, 50,000 store-product series, 865 anonymized products, 898 stores, 90 days per series, 2024-03-28 to 2024-06-25. Source train split only; the benchmark's evaluation split is not used as training data.

## What the dataset contains

Anonymized city, store, product, and category identifiers; normalized daily and hourly sales; 6AM–10PM stockout-hour count and hourly stock status; discount; calendar and weather variables. It does **not** contain physical stock on hand, procurement prices, unit selling prices, true raw unit demand, product names, batch age, shelf lives, inventory purchase orders, or replenishment cost.

**Important:** `sale_amount` is globally multiplied by an undisclosed normalization coefficient. One unit of `sale_amount` is **not** equal to one physical item. Sales are censored by stockouts and do not reveal true latent demand on unavailable hours.

## Browser integration

The reproducible importer `scripts/import_freshretail.py` downloads the *actual* publisher's parquet training split. It validates the expected number of rows, hashes the downloaded file, and selects one representative 90-day store history per product ID. The selection algorithm maximizes the number of nonzero, fully in-stock days, breaking ties by mean normalized sales and then smaller store ID. **Selected histories can come from different stores**; they must never be interpreted as a synchronized inventory at one physical store.

The job writes `public/data/catalog.json` plus 16 keyed JSON shards `public/data/part-00.json` … `part-15.json`. Shards include the actual normalized daily sales, daytime stockout count, discount, promotion, holiday, and hourly normalized sales for each selected series. Products use their anonymized IDs and category codes. No grocery product names are fabricated.

A source manifest records dataset URL, CC BY 4.0, raw SHA-256 digest, selected-record count and selection rule. Generated data is re-distributed under the original dataset license with attribution. All browser assets are static; no Hugging Face access token is necessary for visitors.

### Rebuild the verified extracts

```bash
python -m pip install pandas pyarrow
python scripts/import_freshretail.py
npm run check
npm run build
```

The GitHub workflow `.github/workflows/import-freshretail.yml` runs ingestion on the feature branch; the generated assets are code-reviewed before merging to production. If the remote download fails, the workflow fails and **must not** silently substitute synthetic sales for the public benchmark.

## Boundary between observations and modeled decisions

| Element | Provenance |
|---|---|
| Product and store IDs | Real anonymized benchmark identifiers |
| Historical normalized sales and stockout hours | Real observations selected from training split |
| Historical normalized hourly sales | Real source observations |
| Inventory scenario quantities | Constructed by `round(normalized_sales × 10)`; **not** actual physical units |
| Perishable shelf life | Assumed five days, scenario-adjustable |
| Purchase, holding, shortage, disposal costs | Illustrative assumed economic parameters |
| Future demand and replenishment outcomes | Simulated, not observed; seeded stochastic demand |
| Model improvements and waste reduction | Scenario results only; no field causal claim |

The frontend presents the history chart in the original normalized units. The simulation is expressly separate and uses constructed scenario units. Never combine them into a claim of genuine on-hand inventories.

## Model diagnostic

The pseudo-stockout diagnostic uses the **first 70 days** to estimate the fraction of sales occurring before 14:00 on days without reported daytime stockouts. It then hides hours 14:00–23:00 of otherwise fully stocked **later days**, comparing a naive partial-day estimate with a corrected estimate against the original complete daily sales. Its reported MAE is computed on the actual withheld observed normalized sales, but it is a *synthetic masking experiment*. It is **not** direct validation of latent demand on real stockout days, where that demand is unobserved.

## Existing limitations

There is no retailer connection, direct inventory observation, identifiability proof for genuine stockout demand recovery, measured physical waste, cross-SKU substitution, joint store capacity, calibrated scenario-to-stock unit mapping, or validated economic savings. These are acknowledged research and product limitations, not presumed properties of the public benchmark.