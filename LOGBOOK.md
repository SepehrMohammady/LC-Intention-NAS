# Research logbook — DMIR × µNAS

Dated journal of decisions, findings, and results. Machine-readable run
records live in `logs/experiments.jsonl`; this file records the *why*.

## 2026-07-07 — Project kickoff: environment, data audit, first baseline

**Environment.** Windows 11, Python 3.13 (Microsoft Store), RTX 5070 Laptop
(8 GB, Blackwell) → PyTorch 2.11.0+cu128. Windows Smart App Control blocked
several compiled wheels inside the venv (numpy.random, pandas, scikit-learn);
resolved by enabling `include-system-site-packages` and installing the blocked
packages into the system Python. Full details in CLAUDE.md.

**Data audit (before any modelling).** Extracted the three prepared archives
(classification, regression-LCL, regression-LCR); shapes and split sizes match
the provider's description (50×31 windows; balanced 3-class splits;
regression targets 0.0–4.0 s, step 0.1). Two findings:

1. Test-only extreme spikes (up to ~5×10⁶) on feature pairs (12,13) for
   classification/LCL and (14,15) for LCR — 56/37/21 affected samples,
   train/val stay within ≈[−431, 140]. Likely a division-by-near-zero
   preprocessing artefact. Mitigation: clip val/test to per-feature train
   range (`Config.clip_to_train_range`); training data untouched.
   Question sent upstream — see docs/DATA.md.
2. Feature 7 constant zero in classification train split.

**Pipeline.** Built `src/` (config, data, baseline DSCNN, train/eval, EDA,
logging), `scripts/check_pipeline.py` (3-task smoke test on real data —
passing), and the main notebook `notebooks/dmir_pipeline.ipynb` (executes
end-to-end headless, including ONNX export with PyTorch↔ONNX parity check).

**First baseline result (logged run `baseline-dscnn`).** Generic
depthwise-separable 1D CNN, no tuning: **test accuracy 91.51%, macro-F1
0.9153** (SOTA: 92%), best epoch 3, training time 27.5 s. Per-class recall
[0.904, 0.960, 0.881] — LCL intention is the hardest class. Early convergence
suggests the schedule (lr 3e-3, cosine) peaks too fast; not tuning further by
hand — that is the NAS's job.

**Regression baselines (same untuned DSCNN).** LCL: test RMSE 0.459 s / MAE
0.333 s (SOTA 0.44). LCR: test RMSE 0.439 s / MAE 0.318 s (SOTA 0.42). Both
within ~0.02 s of the published numbers with zero tuning — the search has a
realistic shot at passing them while shrinking the model.

**Research sweep (6 parallel agents; notes in docs/research/).** Key
corrections and facts:

1. *The published baseline is not what we assumed.* Forneris et al., IEEE SPL
   vol. 33, 2026 (DOI 10.1109/LSP.2025.3638676) reports a single
   time-to-lane-change regression — Transformer RMSE **0.5102 s** (~54k
   params) — and FP32-only deployment on STM32H7B3/F401. It publishes no
   3-class accuracy and no per-direction RMSE. The 92% / 0.42 / 0.44 numbers
   from the team are internal, unpublished results on our prepared pickles.
   Both now tracked separately in paper/NOTES.md.
2. *DMIR is the project codename.* The data is the "Lane Change Intention
   Recognition Dataset" (Zenodo 10.5281/zenodo.16686054, MIT, CARLA, 50
   drivers, 10 Hz; DMIR = Driver Maneuver Intention Recognition, the acronym
   from the ApplePies 2024 precursor). Official split is driver-wise; whether
   our pickles follow it is an open (blocking) question.
   The 31st channel is probably fileTime (official count: 30 features) —
   must confirm and drop.
3. *µNAS method mapped* (aging evolution, morphisms, 4-objective random
   scalarisation over acc/RAM/flash/MACs; MACs↔latency R²=0.975 on STM32).
   Official repo is TF2.3, 2D-only, unlicensed → we implement a 1D PyTorch
   version. Closest related work to differentiate from: MicroNAS for time
   series (Sci. Reports 2025) and TinyTNAS.
4. *STM32 toolchain*: ST Edge AI Core 2.2 (`stedgeai`) accepts int8 QDQ ONNX
   (quantize via onnxruntime `quantize_static`); `analyze` gives flash/RAM/
   MACC offline → usable inside the NAS constraint evaluator; real latency
   free via ST Edge AI Developer Cloud board farm. Plan: mirror the baseline
   boards (H7B3 + F401).
5. *Venue*: SPL is Q1 but caps at 4 pages + references; IEEE IoT Journal
   (IF 8.7, 8 pages, ~7-week first decision) recommended as primary
   alternative. Decision deferred to supervisor discussion.

**Next.** Colleague answers on split/column order → drop fileTime if
confirmed → design 1D search space + aging-evolution loop with stedgeai-based
constraint evaluation → NAS smoke run.

## 2026-07-07 (later) — GitHub, hardware target, course website, PDF pipeline

- Repository live: github.com/SepehrMohammady/LC-Intention-NAS (author
  identity rewritten to Sepehr Mohammady on all commits before first push).
- Deployment target confirmed by the team: **STM32H7B3I-DK** (Cortex-M7 @
  280 MHz, 1.4 MB SRAM, 2 MB flash) — same H7B3 family as the baseline
  paper's high-end board, so deployment tables stay directly comparable.
  NAS budgets updated in docs/research/stm32-toolchain.md; F401 kept as an
  optional low-end stretch target.
- The Farsi course became a static website (course/index.html + lessons
  00–04): RTL layout, light/dark themes, SVG diagrams, CSS bar charts on the
  dataviz reference palette, and an interactive quiz per lesson. Markdown
  lessons removed; HTML is canonical. Serving: enable GitHub Pages (main,
  root) — the root index.html redirects into the course.
- Paper now builds to PDF after every .tex change (MiKTeX pdflatex via
  scripts/build_paper.ps1; main.pdf committed). Author set to Sepehr
  Mohammady; H7B3I-DK written into the deployment section.

## 2026-07-07 (evening) — Blocking data questions answered from raw materials

New materials supplied by the team: `user46(04.12.24).zip` (raw CARLA logs),
`Overtaking2.zip` (the data-prep repo: 73 per-user H5 sessions in L3Pilot CDF,
windowing notebook, schema), and the ApplePies 2024 precursor paper PDF
(DMIR = Driver Maneuver Intention Recognition; CARLA 0.9.15; Logitech G920;
60 km 2-lane 11.5 m highway, mean curve radius 500 m; Hi-Drive grant
101006664). Two analyses (`scripts/analysis/`) resolved everything that was
blocking without waiting for colleagues:

1. **Channel fingerprinting** (`fingerprint_channels.py`): no fileTime /
   timestamp channel exists in any pickle (no monotonic near-unique channel);
   classification feature 7 = egoLaneWidth (constant 3.75 m → 0 after
   scaling); the test-split spike pairs are exactly-equal right/left pairs at
   the curvatureDx positions — (12,13) cls/LCL, (14,15) LCR — confirming the
   derivative-artefact hypothesis. Classification normalization ≈
   StandardScaler on train; LCR uses a different scaler fit and a shifted
   channel layout (egoLaneWidth at 9, indicators mid-block).
2. **Split verification** (`verify_split.py`): matched raw per-user H5
   sessions to pickle windows via per-window Pearson correlation (invariant
   to the normalization). Official test users 13 & 2 hit ONLY the test split,
   val users 10 & 5 ONLY val, train user 22 ONLY train (YawRate /
   LatAcceleration, r > 0.9999; SteeringAngle cross-hits are quantization
   false-positives). **The pickles follow the official driver-wise protocol —
   our results are directly comparable to the published RMSE 0.5102, with no
   window leakage.** This claim went into the paper's Data section.

Remaining for the team (non-blocking): provenance of the internal 92%/0.42/0.44
reference numbers (colleague: 92% is a CNN; others are Transformers — asking).

## 2026-07-07 (night) — Feature identities confirmed + turn-indicator leak

Colleague sent the authoritative `feature_description` doc and confirmed:
driver-wise split; `fileTime` is not in the arrays; the 31st channel is
"is the left car present?" (`car2Present`); `egoLaneWidth` is constant and
kept deliberately. The raw `DirectionIndicator` is ternary {0 off, 1 left,
2 right}, split into two binaries in the prepared data.

Verified the full channel map (`scripts/analysis/name_channels.py`: ego
channels 0-7 matched to raw H5 signals at r ≈ 0.98) and wrote it up in
docs/research/feature-map.md + machine-readable src/features.py. The two task
layouts differ: regression keeps indicators inline (ch 3-4); classification
relocates them to the end (ch 28-29), shifting egoLaneWidth to 7 and the
curvatureDx spike pair to 12-13.

**Turn-indicator label leak (paper-shaping).** The feature set includes the
driver's turn signal. `indicator_leak.py`: the two indicator channels ALONE
give 81.5% test accuracy (full DSCNN 91.5%, internal ref 92%); blinker-on
rate 92%/71% for LCR/LCL vs 6.5% for no-intent. So the 3-class headline is
largely "read the blinker." The regression is clean, though
(`indicator_leak_regression.py`: indicator-only RMSE 0.72/0.90, far worse
than our 0.439/0.459). Decision: lead the paper with the time-to-lane-change
regression + STM32 deployment; treat classification with a with/without-
indicator ablation and a no-signal-subset accuracy. Recorded in paper/NOTES.md.

## 2026-07-08 — NAS tool decided: reuse the ELIOS µNAS fork

Colleague pointed to github.com/Elios-Lab/uNAS (their keywords: "take µNAS
code", "efficiency", "setting threshold"). Inspected it: the fork adds, over
upstream, a **1D multi-channel CNN search space** (takes our (50,31) directly),
**regression** (num_classes=1, MAE loss), **QAT + INT8 TFLite** output for the
ST tools, and CLI-overridable **BoundConfig** thresholds. Aging-evolution
fitness = -max_i( normalise(feature_i, bound_i)/lambda_i ) over
[val_error, peak_mem, model_size, MACs] — so "efficiency" = the resource
objectives and "setting threshold" = the BoundConfig bounds (our STM32 budget).

Decision: **reuse the fork** (matches the colleague's directive; gives a direct
TFLite→ST deployment path) instead of reimplementing µNAS in PyTorch. Wrote our
adapters in `unas/` (DMIR dataset serving the real pickles for all 3 tasks with
train-range clipping + optional indicator-drop ablation; configs with
STM32H7B3I-DK thresholds) — MIT, kept separate from the unlicensed fork.
Decision + plan in docs/research/unas-integration.md.

Compute path chosen (user): WSL2/Linux GPU.

## 2026-07-08 — WSL2 GPU env stood up; RTX 5070 (Blackwell) runs the search

Built the NAS environment under WSL2 Ubuntu 22.04 (driver 610.62, GPU
passthrough, Python 3.10.12). Fresh venv `~/dmir_nas` with
`tensorflow[and-cuda]` → **TF 2.21.0 + CUDA 12.9 + cuDNN 9.24 + Keras 3.12**;
TF registers the GPU as "compute capability 12.0a" (sm_120) and runs matmul +
Conv1D on our (N,50,31) shape. The Blackwell question is settled: it works.
Gotcha captured — the pip TF wheel needs `LD_LIBRARY_PATH` at the pip
`nvidia/*/lib` dirs (written to `~/dmir_nas/env.sh`).

Fork deps installed (ray 2.56, dragonfly-opt via --no-build-isolation, sklearn,
scipy, tqdm, matplotlib, tfmot 0.8.1 + tf_keras). Cloned the fork to `~/uNAS`,
registered our adapters (setup_fork.sh). Reproducible setup scripts committed
in `unas/` (setup_wsl_env.sh, setup_fork.sh, run_smoke.sh).

Smoke-run debugging on real DMIR data (dmir_lcr):
1. adapter import fused onto the last line of dataset/__init__.py → fixed
   setup_fork.sh to prepend a newline.
2. `model_trainer.py` imports tfmot at module top even though QAT is off →
   installed tfmot (0.8.1 imports cleanly under Keras 3).
3. Keras-version mix: models are built with bare `keras` (Keras 3) but tfmot
   flips `tf.keras` to legacy Keras 2, so `tf.keras.callbacks.ReduceLROnPlateau`
   (Keras 2, reads optimizer.lr) crashed against the Keras-3 Adam
   (learning_rate). Fixed by building our callbacks from `keras` (Keras 3) in
   dmir_config.py — same Keras as the models. The chain already trained a real
   128 k-param 1D CNN on GPU before this callback fired, so everything upstream
   (ray actor, data, model build, GPU training) is confirmed working.
4. Keras 3 EarlyStopping needs explicit `mode=` for `val_mae` → added mode to
   all callbacks (max for accuracy, min for mae/loss).

**Smoke SUCCESS (dmir_lcr, 4 rounds, 3 epochs each).** The full NAS chain runs
end-to-end on the RTX 5070: aging evolution builds real 1D CNNs from the DMIR
(50,31) windows, trains them on GPU (~3 ms/step after the first-epoch compile),
computes resource features [peak_mem, model_size, MACs] via to_resource_graph,
and completes. Threshold mechanism behaves correctly — with `error_bound`=0.30
MAE and only 3 epochs, candidates land at val_mae ≈ 0.41 (above the bound) so
"pareto" saves 0 models. Encouraging signal: a 72,729-param (284 KB) candidate
reached **val_mae 0.41 / test 0.405 in just 3 epochs** (resource features
peak_mem 9 KB, MACs 0.84 M) — with the full 120-epoch schedule this class of
tiny model should reach the SOTA MAE (0.298) region while staying MCU-sized.
Env + adapters + run scripts are reproducible in `unas/`.

Model saving confirmed separately (loosened bound so candidates pass): 3
Pareto `.h5` models written to `artifacts/dmir_lcr/models/` (Keras warns that
`.h5` is legacy, but the fork's `test.py` expects `.h5` for TFLite conversion,
so we keep it). So the complete pipeline is validated end-to-end on the RTX
5070: search → GPU training → resource_features → Pareto `.h5` save.

Next: full-budget searches per task (regression first — the un-leaky, primary
result), then QAT → INT8 TFLite → ST Edge AI for the H7B3I-DK numbers.

## 2026-07-08 — First real LCR search: OOM fixed, results beat SOTA

First full LCR run (100 rounds, 60 epochs) trained ~40 candidates and found
models with reported test MAE down to 0.143, then **crashed on a ray host-RAM
OOM**: the persistent GPUTrainer actor leaked ~200 MB per candidate (TF not
freeing graphs between fits) and hit the ~15 GB WSL cap. Fix: patch the actor
to `keras.backend.clear_session()` + `gc.collect()` after each candidate is
saved (in setup_fork.sh, idempotent; also TF_FORCE_GPU_ALLOW_GROWTH). Validated
with a 25-round run: **50 candidates, zero OOM, 16 Pareto models saved** —
memory now bounded.

**Independent verification (unas/verify_models.py).** Do not take the fork's
reported numbers on faith — I re-evaluated the saved `.h5` models on the test
set with our own metrics. Reading model_trainer.py confirms the fork's
`test_error` (regression) is `model.evaluate(test)` MAE on the
restore_best_weights model — i.e. honest — so it matches our eval for the same
model. On the short (20-epoch) run the best saved model is **test MAE 0.287,
RMSE 0.443** (predict-mean MAE ~1.01). That already beats the published SOTA
(MAE 0.298, RMSE 0.510) and matches our DSCNN baseline (RMSE 0.439), from a
tiny search; the 0.143 seen mid-run came from a longer-trained (60-epoch)
candidate lost in the OOM. Full searches should land ~0.14–0.20 test MAE.
Policy: always re-verify final best models with verify_models.py before
quoting a number in the paper.

## 2026-07-08 — Full-search queue finished (all 4 crashed on OOM but harvested)

The overnight queue ran all four searches; each stopped before its 150-round
target on a **ray host-RAM OOM** (LCR 68 candidates / graph-error, LCL 93,
cls 62, cls_noind 59). The session-clear patch slowed the leak (40 -> 60-90
candidates) but did not stop it, and ray's OOM-kill is a SIGKILL the
safe-evaluate try/except cannot catch. **Every task saved its Pareto models
incrementally**, so the fronts survive (28/32/25/27 models).

Harvested and INDEPENDENTLY VERIFIED all four fronts (unas/harvest_fronts.py,
our own test-set eval; CSVs in results/nas-fronts/). Verification again proved
necessary: the fork's optimistic val_error (a candidate showed val MAE 0.113)
does not hold on test (0.29). Real, verified results:
- **LCR** best test MAE 0.290 / RMSE 0.447 @ 216 KB (int8) — beats published
  SOTA (0.298 / 0.510); still 0.294 @ 109 KB; 0.333 @ 10 KB.
- **LCL** best MAE 0.320 / RMSE 0.484 @ 34 KB — beats SOTA RMSE and our DSCNN.
- **Classification** 91.6% @ 216 KB, 91.5% @ 21 KB (with turn signal).
- **Ablation (no turn signal): 90.8% @ 93 KB, 90.1% @ 5.2 KB.** Removing the
  blinker costs <1% — with the everything-except-blinker measurement (90.8%)
  vs blinker-alone (81.5%), this shows the model genuinely anticipates. Big
  honesty win for the paper.

Recorded in docs/research/nas-results-prelim.md, paper/NOTES.md, and the
results table in paper/main.tex (marked preliminary). Next: robustly fix the
OOM (self-healing actor / chunked resume) and re-run all four to completion;
then QAT -> INT8 TFLite -> ST Edge AI for on-device numbers.

## 2026-07-09 — OOM defeated by chunked resume; all searches completed

Traced the leak: model_saver pops the model before storing (not it); the
accumulation is TF/XLA internal state clear_session() can't release in a
long-lived process, and ray's OOM-kill is a SIGKILL the safe-evaluate can't
catch. Fix that works: **chunked resume** — each search runs in fresh-process
chunks resuming from the aging-evolution checkpoint (the loop counts
len(history), which load_state restores, so --rounds TARGET continues toward
TARGET). Validated on LCR (Loaded 60 → +30 → Search done, no OOM), then
completed all four to 150 rounds (2 chunks for the classification runs).

Final verified fronts (docs/research/nas-results.md; results doc renamed from
-prelim; CSVs in results/nas-fronts/): LCR MAE 0.287/RMSE 0.447 @ 115 KB
(0.290 @ 64 KB) — beats SOTA; LCL 0.325/0.501 @ 83 KB; **classification 92.1%
@ 82 KB (91.3% @ 7.8 KB) — matches internal ref 92%**; no-indicator 91.1% @
20 KB (90.2% @ 11 KB). All better than the partial run. Paper table + NOTES +
PDF updated.

Known caveat: pareto-save + chunked resume can prune a good .h5 from an earlier
chunk (LCL slightly behind a transient earlier model). For a guaranteed-optimal
front, re-run with DMIR_SAVE_CRITERIA=all. Next: QAT -> INT8 TFLite -> ST Edge
AI on the STM32H7B3I-DK for real flash/RAM/latency.

## 2026-07-09 — Quantization + deployment footprints (int16x8; no QAT needed)

Quantized the best models to TFLite. **Full int8 PTQ degrades badly** on the
DMIR inputs (wide per-channel dynamic range): LCR MAE 0.287->0.449, cls
92.1%->86.9%, cls-noind 91.1%->76.1%. **int16x8** (int8 weights, int16
activations) preserves or slightly improves accuracy (cls 92.15%, LCR MAE
0.286, cls-noind 91.08%) — so no QAT, avoiding the Keras-3/tfmot incompat.
Deployment .tflite in results/tflite/; quantize_eval.py / quantize_compare.py.

Footprints (compute_footprint.py; flash = tflite size, MACs + peak RAM from the
arch): classification 92.15% @ 118 KB flash / 4.5 KB RAM / 152 k MACs (91.2% @
19 KB / 4.4 KB / 30 k); LCR MAE 0.286 @ 161 KB / 11.3 KB / 852 k; cls-noind
91.1% @ 45 KB / 4.2 KB / 36 k. **Every model fits even the STM32F401 (96 KB
RAM), where the baseline Transformer did not fit** — SOTA-beating accuracy at a
fraction of the size. docs/research/deployment.md; paper deployment section +
course lessons 09/10 updated.

Blocked on user: measured on-device latency needs a myST account (ST Edge AI
Developer Cloud) — X-CUBE-AI 10.2 pack is installed but the stedgeai CLI
binaries are not extracted locally. Handoff steps in deployment.md. Everything
else (accuracy, flash, RAM, MACs) is done and verified.

## 2026-07-10 — Reference models verified; RMSE re-run; honest regression stance

Colleague sent the reference models (Materials/Models/, legacy HDF5).
Evaluated (unas/eval_reference.py): cnn_multi 441k params = 91.5% test acc (the
"92%"); transformer_lcr 333k / transformer_lcl 49k (RMSE 0.42/0.44 as reported;
couldn't re-run — custom TransformerEncoder not in the public repo). Head-to-
head (docs/research/reference-comparison.md): **classification is a clean win**
(ours 92.1% @ 84k vs 441k @ 91.5%; 8k matches at 55x smaller); regression NOT a
win vs the internal transformers on RMSE.

Ran RMSE-objective regression searches (patched model_trainer to MSE loss +
val_rmse; DMIR_REG_METRIC=rmse, save_criteria=all, 150 rounds each). Result:
**LCL improved 0.50→0.466** (and MAE 0.325→0.317); **LCR stayed 0.447** (RMSE
run found smaller 62k @ 0.464 but not lower). Still behind the internal
transformers (0.42/0.44). Final paper stance: claim beating the PUBLISHED SOTA
(0.51) at 2-3x fewer params + deployability; do NOT claim regression RMSE win
over the internal reference. Headlines: classification + deployment + the
turn-signal ablation. Paper table/NOTES updated honestly; PDF rebuilt.

## 2026-07-14 23:07 — Course overhaul: figures, quizzes, measured results

User flagged: text overlap/crop in 5 SVG figures; quizzes trivially easy (longest option always correct); missing depth on correlation/ablation; aging-evolution oldest-member ambiguity; no k-fold CV justification; lesson-8 formula unverified; new spike-provenance intel (crash-heavy drivers).

Root cause of ALL 5 figure bugs: dir=rtl flips SVG text-anchor semantics (end extends RIGHT for Farsi) -> labels ran into boxes / off-canvas. Fix: text-anchor=middle for Farsi labels; verified geometrically (0 crops/overlaps).

Facts verified from fork source before writing: fitness = -max_i(min(f_i/bound_i, 10)/lambda_i), lambdas U(0,1) fresh per parent selection; population is a FIFO queue (pop(0), fitness-blind) -> oldest well-defined from round 1 (initial population appended one-by-one). Fixed lesson-07 step-numbering bug (said step 5, is step 6).

Spike provenance: DMIR Test Reports.xlsx corroborates User34 (4 collisions+2 accidents) and User1 (5+1); User43 shows 0/0. Crash -> pose reset -> curvatureDx derivative explosion = plausible, unproven. Recorded in DATA.md + dataset-provenance.md; paper keeps neutral wording.

Lesson 06 expanded (Pearson r explainer, ablation definition, blinker-detection methodology, why-no-k-fold). Lessons 07-11 refreshed with measured results: int16x8 silent-dequantize story, PTQ not QAT as actual path, float32 headline, H7B3 measured table, F401 categorical result, int8 point, 7-11.6 cycles/MAC.

All 49 quiz questions rewritten. First rewrite FAILED its own audit (49/49 still longest-option-correct); second pass -> 33% (chance 25%), gaps within a few chars, indices spread. Agent sweep died on session limit; replaced with deterministic checks (JSON parse, geometric SVG audit, staleness grep).

## 2026-07-24 15:52 — Course trilingual; notebook covers full arc; results narrative unified

Three deliverables in one session (all workflow-verified):
1) Results narrative sync: lesson 07 gets the honest 2x2 comparison (LCR/LCL x
   published-SOTA/internal-ref, both caveats), NAS-algorithm families card,
   Pareto-is-N-dimensional note, cls_tiny provenance (same 33-model front as
   cls_best, not a pruned copy), and search-cost card (~1 GPU-night for all
   four 150-round searches on the RTX 5070 vs literature GPU-days, context
   only). README results table finally replaced the first-DSCNN numbers with
   final verified results + measured on-device section. Paper: search setup
   sentence (150 rounds, pop 50, sample 15 per launch-script defaults) +
   Zoph/Real citations; board-choice rationale recorded (same platform as the
   published baseline = like-for-like; unit available in ELIOS lab).
2) Notebook dmir_pipeline.ipynb now covers the whole research arc: new §8-§11
   (verified Pareto fronts from results/nas-fronts, quantization artifact
   sizes read from disk, measured ST Edge AI deployment, scoreboard) via new
   src/results_viz.py; executed headlessly end-to-end, 0 errors.
3) Course is trilingual: full English and Italian editions (course/en/,
   course/it/), 13 pages each, language switcher everywhere, i18n quiz
   engine. Deterministic checks: zero Farsi residue, 49 quiz questions per
   language, longest-option-correct 4%/2%, all links resolve; two editorial
   audit agents passed both languages and unified terminology.

## 2026-07-24 16:36 — QAT recovers the int8 drop: cls_best 86.9% -> 89.8% (same footprint)

User asked to try QAT after the ~5-point int8 PTQ drop (92.08->86.86). Did it, honestly. tfmot 8-bit only registers 2D layers, so searched 1D cls_best re-expressed with width-1 kernels (Conv1D->Conv2D(k,1), Pool1D->Pool2D(p,1), depthwise strides (s,1)->(s,s)=no-op at width 1). Re-expression proven exact: float-2D 0.9208 (=1D orig), PTQ-2D 0.8686 (=measured 1D int8), so PTQ-vs-QAT is single-variable. QAT fine-tune (Adam 2e-4, 22/40 epochs, val early-stop restore-best) -> int8 89.82%, +2.96 pts (57% of gap) at same footprint (101,616 B tflite, float32 I/O). Ran in WSL dmir_nas (TF 2.21/tf_keras/tfmot 0.8.1); needed Keras-3->tf_keras port (rebuild from adjacency + per-layer weight transfer). Code unas/qat_finetune.py; artifact results/qat/cls_best_qat_int8.tflite. NOT yet on-device (expected ~int8 PTQ 1.885 ms / 104 KB). deployment.md, paper, course L09 fa/en/it, experiments.jsonl all updated.

## 2026-07-24 16:55 — QAT int8 measured on-device: 89.82% @ 1.558 ms (fastest point)

User uploaded ST Edge AI results for cls_best_qat_int8.tflite (H7B3I-DK, Core 4.0.1, balanced). Measured: 1.558 ms, MACC 161,570, flash 131,008 B (128 KiB; weights 83.28 KiB byte-identical to the PTQ int8 + ~43 KiB library), RAM 8,404 B (6.05 KiB act). Graph confirms genuine int8. Two findings: (1) FASTER than the int8 PTQ point (1.558 vs 1.885 ms) though the 1D->2D change confounds a clean QAT-vs-PTQ latency read; the width-1 Conv2D kernels ST emits look better-optimized than 1D. (2) BIGGER flash (128 vs 104 KiB) - weights identical, the +24 KiB is ST library code for the 2D re-expression (Conv2D+Reshape+extra conversions). Net operating point: 89.82% @ 1.558 ms @ 128 KiB, fastest of the three, 2.6x under float32 flash. deployment.md measured table + QAT section, paper quantization sentence (+PDF), NOTES (QAT measure done; native-1D-QAT optional to reclaim the 24 KiB), course L09 fa/en/it, results_viz MEASURED_H7B3, experiments.jsonl all updated.
