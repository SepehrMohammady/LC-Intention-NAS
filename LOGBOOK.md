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
