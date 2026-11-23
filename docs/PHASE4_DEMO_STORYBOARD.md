# FreshTwin v0.5 — narrated demonstration storyboard

**Audience:** INEN-5350 Production & Inventory Control, Quick AI Assignment. Target 3–4 minutes, no unsupported claim of measured business benefits. This outline is for a reproducible browser walkthrough; actual spoken narration and screen capture must be verified before submission.

| Scene | Screen | Demonstrate | Evidence / narration point |
| --- | --- | --- | --- |
| 00:00–00:25 | Overview → Vegetable Demo | Named produce catalog, then briefly Research Benchmark toggle | Anonymous benchmark IDs are **not** given invented vegetable names; the demo uses a coherent illustrative store |
| 00:25–00:50 | Joint Store Lab | Ten vegetables compete for one budget and one refrigerated volume ceiling | Coupled purchasing decisions; SKU-specific life, cost, demand, stock footprint and supplier lead time |
| 00:50–01:20 | Joint experiment controls | Show budget, capacity, demand multiplier, seed and paired trials. Run the default scenario. | Shared capital applies to the entire horizon; conservative reservation prevents capacity breaches |
| 01:20–01:50 | KPI and policy comparison | Read the actual lowest-cost and highest-service policies | Avoid declaring advanced method the winner without checking output; show potential service-vs-cost tradeoff |
| 01:50–02:15 | Constraint plots | Show cumulative purchasing vs global budget and reserved capacity vs hard limit | Feasibility verified per simulated day; pending deliveries consume reservation |
| 02:15–02:40 | FEFO replay and ledger | Advance daily state, show one vegetable's expired stock or shortage | `opening + receipts = sales + expired + closing` holds by SKU and day |
| 02:40–03:05 | Stress test | Reduce the budget or capacity and run again | Results depend on transparent assumptions and change under binding constraints |
| 03:05–03:30 | Model disclosure | Explain scenario data, heuristic optimization and paired Monte Carlo interval | The public Dingdong data are normalized and anonymized; no real retailer savings, global optimum or observed lost demand is claimed |
| 03:30–03:50 | GitHub & exports | Show research JSON, CSV, documentation and passing CI | Demonstrate reproducibility and validation. AI-assisted implementation plus independent deterministic tests |

**Before submitting:** review final screen recording, confirm version v0.5 appears on public Cloudflare, demonstrate the exact values currently computed, and ensure citations in the Word discussion correspond to research papers actually consulted. If no actual captured video exists, do not say a screen recording was completed.