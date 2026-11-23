# FreshTwin v0.5 — Final course submission guidance

## What has been produced
- Public functioning FreshTwin v0.5 (joint ten-vegetable constrained FEFO simulator): https://freshtwin-inventory-digital-twin.nirman-bhowmike.workers.dev/
- 144.16-second genuine public-browser screen recording with on-screen explanatory captions and no spoken audio. Eight original screenshots.
- A precisely two-page Word **review worksheet**, supported by calculated results and two scholarly sources. Review/rewrite in the student's own words before submitting.
- GitHub Actions downloadable evidence: https://github.com/NirmanBhowmike/freshtwin-inventory-digital-twin/actions/runs/45088531892/artifacts/14780725120

## Verified numerical comparison (default illustrative 21-day store)
| Policy | Mean scenario cost | Fill rate | Mean expired units |
| --- | ---: | ---: | ---: |
| Recorded-sales baseline | $9,025.51 | 87.1% | 2.4 |
| Stockout-adjusted baseline | $8,935.25 | 88.4% | 2.4 |
| Joint coupled heuristic | $9,161.28 | 89.6% | 9.8 |

Mean over 12 paired Monte Carlo runs, seed 42, horizon 21 days, horizon-wide shared purchasing budget $5,500 and conservative refrigerated capacity 310 volume units. All figures arise from illustrative economics and synthetic demand; **not realized retailer profit or field-tested performance**.

## Remaining before handing in
1. Open the Word worksheet, review figures and calculations, rewrite/personalize the explanations, and verify the two citations. This is explicitly a review draft, not a claim of personally authored submission.
2. Preview the captioned MP4. Add the student's own spoken explanation or a fresh personal screen recording if the instructor expects oral presentation rather than captions.
3. Upload the final Word file and video using the course's submission instructions by the deadline. Nothing has been posted to the course LMS on the user's behalf.

## Model integrity
- Real FreshRetailNet records are anonymized normalized sales plus stockout context, NOT true vegetable names or observed inventory costs.
- Named vegetables are a separate synthetic single-store exercise, and SKU costs/lives/lead times are illustrative.
- The coupled algorithm is a bounded sampled heuristic under shared procurement/storage constraints, not globally certified optimal.
- Browser verification establishes functional consistency, not external calibration or operational economic benefit.
