# µNAS integration — decision and plan

Investigated 2026-07-08 (repo: https://github.com/Elios-Lab/uNAS).

## Decision: reuse the ELIOS µNAS fork (do not reimplement)

The lab maintains its own fork of µNAS that already adds everything we need on
top of upstream (upstream was 2D-only, TF 2.3, classification-only):

- **1D multi-channel CNN search space** (`Cnn1DSearchSpace`) taking
  `(timesteps, channels)` — our `(50, 31)` windows plug in directly
  (channels-last, no transpose).
- **regression** support (`num_classes=1`, MAE loss) — our LCL/LCR tasks.
- **QAT during search** and INT8 **TFLite** output, explicitly targeted at the
  ST developer tools → clean path to the STM32H7B3I-DK.
- CLI-overridable **BoundConfig** thresholds (error / peak-mem / model-size /
  MACs) — the µNAS random-scalarization fitness.
- DPF structured pruning, aging evolution + Bayesian optimisation, model saver
  with Pareto criterion.

Our contribution shifts from "reimplement µNAS in PyTorch" to: **adapt the fork
to DMIR, run the search under STM32 budgets, and deliver measured on-device
numbers vs the published FP32 baseline** — plus the honest classification
treatment (indicator ablation). This matches the colleague's guidance
("take µNAS code", "efficiency", "setting threshold").

Adapter files live in `unas/` (ours, MIT); the fork stays an external checkout
(no license file, so not vendored). PyTorch pipeline stays for the baseline,
EDA, and the data analyses.

## The three keywords, decoded

- **"take µNAS code"** → use https://github.com/Elios-Lab/uNAS.
- **"efficiency"** → the resource objectives: peak SRAM, INT8 model size, MACs
  (`to_resource_graph`).
- **"setting threshold"** → the four `BoundConfig` bounds. Fitness =
  `-max_i( normalise(feature_i, bound_i)/lambda_i )`; exceeding a threshold is
  penalised first. We set them to the STM32H7B3I-DK budget.

## Environment — the open decision (needs a choice)

The fork is TensorFlow. Three ways to run it here; they trade off setup effort
vs search speed:

1. **Windows, CPU-only** (`tensorflow<2.11`, `numpy==1.23.5`, Python 3.10 venv).
   Simplest to stand up; the old TF cannot use the RTX 5070 (Blackwell needs
   CUDA 12.8). Candidates are tiny 1D CNNs, but 2000 rounds on CPU is ~days.
   Fine for a first end-to-end validation with reduced `rounds` (e.g. 100-300).
2. **WSL2 / Linux, GPU** (`tensorflow[and-cuda]`, TF 2.18). Uses the RTX 5070
   *if* TF 2.18 has Blackwell (sm_120) kernels — unverified; may need TF 2.19+.
   Most setup risk, best speed if it works.
3. **Lab / SYNERGIES compute** (Linux GPU cluster). Likely the real venue for
   the full-budget search; run first validation locally, scale there.

Recommendation: (1) now for a correctness pass on real DMIR data with small
`rounds`, then (3) for the full search. Confirm compute access before investing
in (2).

## Next steps

1. Choose the compute path (above).
2. Stand up the fork env; register the `unas/` adapters; set `DATA_ROOT`.
3. Smoke run `dmir_lcr` with `rounds=20` to validate the whole chain on real
   data (search → best `.h5` → QAT → INT8 TFLite).
4. Full search per task under the H7B3I-DK thresholds; collect the Pareto front.
5. Feed the front to ST Edge AI for flash/RAM/latency; build the paper tables.
6. Classification: run `dmir_cls` and `dmir_cls_noind` for the ablation.
