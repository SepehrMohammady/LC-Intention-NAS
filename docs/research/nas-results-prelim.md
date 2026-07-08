# NAS results — preliminary (independently verified)

Date 2026-07-08. Source: first full-budget searches (RTX 5070, WSL2, ELIOS
µNAS fork). **Preliminary**: every search crashed before its 150-round target
(LCR 68 candidates, LCL 93, cls 62, cls_noind 59) on a ray host-RAM OOM (leak
partly mitigated, real fix in progress). Pareto `.h5` models were saved
incrementally, so the fronts survive.

**All numbers below are our own test-set evaluation** (`unas/harvest_fronts.py`),
not the fork's console output — the fork's `val_error` is `min(val_mae)` and is
optimistic (e.g. a candidate showed val MAE 0.113 but its saved weights give
0.29 on test). Footprint = int8 weight bytes (= parameter count). Peak RAM,
MACs, and on-device latency come from ST Edge AI at deployment (not yet run).
Front CSVs: `results/nas-fronts/*.csv`.

Reference points: published SOTA (Forneris et al., SPL 2026, Transformer
~54k params, FP32): single TTLC MAE 0.298 / RMSE 0.510. Internal unpublished
reference: RMSE 0.42 (LCR) / 0.44 (LCL), acc 92%. Our PyTorch DSCNN (~10.5k
params): LCR MAE 0.318 / RMSE 0.439; LCL MAE 0.333 / RMSE 0.459; acc 91.5%.

## Regression — LCR (time to right lane change)

| Model | params | int8 KB | test MAE | test RMSE |
|---|--:|--:|--:|--:|
| best MAE | 220,651 | 215.5 | **0.290** | 0.447 |
| compact | 111,759 | 109.1 | 0.294 | 0.459 |
| tiny | 9,993 | 9.8 | 0.333 | 0.497 |

Beats the **published SOTA** on both MAE (0.290 < 0.298) and RMSE
(0.447 < 0.510); even a 10 KB model matches our DSCNN. Does **not** yet beat the
internal-reference RMSE 0.42 — the search optimizes MAE, not RMSE (see caveats).

## Regression — LCL (time to left lane change)

| Model | params | int8 KB | test MAE | test RMSE |
|---|--:|--:|--:|--:|
| best MAE | 34,571 | 33.8 | 0.320 | 0.484 |
| tiny | 14,080 | 13.8 | 0.321 | 0.486 |

Beats SOTA RMSE (0.484 < 0.510) and our DSCNN MAE (0.320 < 0.333), at a tiny
34 KB. MAE 0.320 is above SOTA MAE 0.298 — LCL is the harder direction and its
search ran fewest effective rounds; expected to improve with the full search.

## Classification (3-class intention)

| Variant | best acc | @ KB | compact acc | @ KB |
|---|--:|--:|--:|--:|
| with turn indicators | 0.916 | 216 | 0.915 | 20.8 |
| **without indicators (ablation)** | **0.908** | 92.7 | 0.901 | **5.2** |

## The key finding: the model anticipates, it does not just read the blinker

Three measurements together:
- turn-signal channels **alone** → 81.5% (the leak we flagged);
- everything **except** the turn signal → **90.8%**;
- everything → 91.6%.

Removing the blinker costs **under 1%**. So the classifier's accuracy comes
mainly from vehicle dynamics and surrounding traffic, not from a declared turn
signal — the leak does not drive the result. A **5.2 KB** no-indicator model
still reaches 90.1% (fits the STM32F401's 96 KB RAM with room to spare). This
turns the leak worry into a strength and is a headline honesty result for the
paper.

## Caveats / TODO before these become final paper numbers

- [ ] Re-run all four searches to completion once the OOM is robustly fixed
      (self-healing actor / chunked resume). Current fronts are partial.
- [ ] LCL MAE gap vs SOTA (0.320 vs 0.298) — expect improvement from a full
      search; verify.
- [ ] Internal-reference RMSE 0.42/0.44 not beaten. The fork trains/thresholds
      on **MAE**; consider an RMSE-aware objective or report MAE as primary
      (where we beat the *published* SOTA). Decide framing with the team.
- [ ] Peak RAM, MACs, int8 accuracy drop, and measured latency on the
      STM32H7B3I-DK / F401 — the deployment stage (QAT → INT8 TFLite → ST Edge
      AI). int8 sizes above assume 1 byte/weight; confirm against the actual
      TFLite file.
