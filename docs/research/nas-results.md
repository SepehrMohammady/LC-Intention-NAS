# NAS results (completed searches, independently verified)

Date 2026-07-09. Source: four aging-evolution searches (RTX 5070, WSL2, ELIOS
µNAS fork), each run to its **full 150-round target** via chunked resume
(`unas/run_all_chunked.sh`) after the OOM was defeated.

**All numbers are our own test-set evaluation of the saved models**
(`unas/harvest_fronts.py`), not the fork's console output (its `val_error` is an
optimistic `min(val_mae)`). Footprint = int8 weight bytes (= parameter count);
peak RAM, MACs, and measured latency come from ST Edge AI at deployment.
Front CSVs: `results/nas-fronts/*.csv`.

Reference points: published SOTA (Forneris et al., SPL 2026, Transformer
~54k params, FP32): single TTLC MAE 0.298 / RMSE 0.510. Internal unpublished
reference: RMSE 0.42 (LCR) / 0.44 (LCL), acc 92%. Our PyTorch DSCNN (~10.5k
params): LCR MAE 0.318 / RMSE 0.439; LCL MAE 0.333 / RMSE 0.459; acc 91.5%.

## Regression — LCR (time to right lane change)

| Model | params | int8 KB | test MAE | test RMSE |
|---|--:|--:|--:|--:|
| best MAE | 117,404 | 114.7 | **0.287** | 0.447 |
| compact | 65,863 | 64.3 | 0.290 | 0.454 |

Beats the published SOTA on MAE (0.287 < 0.298) and RMSE (0.447 < 0.510), and
still beats it at 64 KB.

## Regression — LCL (time to left lane change)

| Model | params | int8 KB | test MAE | test RMSE |
|---|--:|--:|--:|--:|
| best MAE | 84,743 | 82.8 | 0.325 | 0.501 |
| compact | 64,255 | 62.7 | 0.331 | 0.503 |

Beats our DSCNN MAE (0.325 < 0.333) and marginally beats SOTA RMSE
(0.501 < 0.510). MAE 0.325 is above SOTA MAE 0.298 — LCL is the harder
direction (see caveats on the MAE-vs-RMSE objective).

## Classification (3-class intention)

| Variant | best acc | @ KB | tiny acc | @ KB |
|---|--:|--:|--:|--:|
| with turn indicators | **0.921** | 81.8 | 0.913 | 7.8 |
| without indicators (ablation) | 0.911 | 20.5 | 0.902 | 11.4 |

The full-budget search reaches **92.1%** with the turn signal (at 82 KB,
vs the published Transformer's ~216 KB FP32) — matching the internal reference
(92%) and beating our DSCNN (91.5%). A **7.8 KB** model still gives 91.3%.

## The key finding: the model anticipates, it does not just read the blinker

- turn-signal channels **alone** → 81.5% (the leak we flagged);
- everything **except** the turn signal → **91.1%**;
- everything → 92.1%.

Removing the blinker costs ~1 point. The classifier's accuracy comes from
vehicle dynamics and surrounding traffic, not a declared turn signal. An 11 KB
no-indicator model reaches 90.2% and a 20 KB one 91.1% — both fit the tiny
STM32F401 (96 KB RAM). This is the honest, defensible headline for the paper.

## Quantization (int16x8 preserves accuracy; full-int8 does not)

`unas/quantize_eval.py` / `quantize_compare.py`. The DMIR inputs have very
different per-channel scales, so **full-int8 PTQ degrades badly** (LCR MAE
0.287→0.449, cls 92.1%→86.9%, cls-noind 91.1%→76.1%). **int16x8**
(int8 weights + int16 activations) essentially preserves — sometimes marginally
improves — accuracy, with no QAT needed:

| Deployment model | int16x8 TFLite | metric (float → int16x8) |
|---|--:|---|
| LCR aaaaan | 160.7 KB | MAE 0.2865 → **0.2860** |
| LCR aaaaav (compact) | 108.8 KB | MAE 0.290 → 0.288 |
| LCL aaaaas | 123.0 KB | MAE 0.3249 → **0.3214** |
| cls aaaabl | 117.9 KB | acc 92.08 → **92.15**% |
| cls aaaaat (tiny) | 19.0 KB | acc 91.30 → 91.16% |
| cls-noind aaaaah | 44.6 KB | acc 91.09 → 91.08% |
| cls-noind aaaaaw (tiny) | 36.3 KB | acc 90.16 → 90.15% |

int8 weights keep the flash small; int16 activations cost ~2× activation RAM
(ST Edge AI will report the exact peak). Deployment `.tflite` files:
`results/tflite/`. This also sidesteps the Keras-3/tfmot QAT incompatibility.

## Caveats / TODO

- [ ] **Save policy**: searches used `save_criteria="pareto"`, and chunked
      resume gives each chunk a fresh model-saver, so a good `.h5` from an
      earlier chunk can be pruned (LCL's best is marginally behind a transient
      earlier model). For the definitive front, re-run with
      `save_criteria="all"` (env `DMIR_SAVE_CRITERIA=all`) so no model is
      dropped, then re-harvest. Current fronts are strong but not guaranteed
      globally optimal.
- [ ] Internal-reference RMSE 0.42/0.44 not beaten. The fork trains/thresholds
      on **MAE**; consider an RMSE-aware objective or report MAE as primary
      (where we beat the *published* SOTA). Decide framing with the team.
- [ ] Peak RAM, MACs, int8 accuracy drop, and measured latency on the
      STM32H7B3I-DK / F401 — the deployment stage (QAT → INT8 TFLite → ST Edge
      AI). int8 sizes above assume 1 byte/weight; confirm against the actual
      TFLite file.
