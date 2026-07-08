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

## Environment — WSL2 GPU, verified working (2026-07-08)

Chosen path: **WSL2 / Linux GPU**. It works on this machine with the RTX 5070
(Blackwell). Verified recipe:

- Ubuntu 22.04 under WSL2 (driver 610.62 on the Windows host; GPU passes
  through), Python 3.10.12.
- Fresh venv `~/dmir_nas` with `pip install "tensorflow[and-cuda]"` →
  **TensorFlow 2.21.0 + CUDA 12.9 + cuDNN 9.24 + Keras 3.12**. TF creates the
  device as *"RTX 5070 Laptop GPU, compute capability 12.0a"* (sm_120), and
  matmul + Conv1D on our `(N,50,31)` shape run on GPU. So the earlier "Blackwell
  unverified" worry is resolved — CUDA 12.9 has native sm_120.
- **One gotcha:** the pip TF wheel needs `LD_LIBRARY_PATH` pointed at the pip
  `nvidia/*/lib` dirs (and `ptxas` on `PATH`), else `list_physical_devices('GPU')`
  is empty. Our env setup writes `~/dmir_nas/env.sh` with these; all run scripts
  source it.
- Fork deps: `scikit-learn scipy tqdm matplotlib ray dragonfly-opt` (dragonfly
  needs `--no-build-isolation` since its legacy build imports numpy) and
  `tensorflow-model-optimization tf_keras` (tfmot 0.8.1 imports fine under
  Keras 3; only needed because `model_trainer.py` imports it at module top —
  QAT itself is off during search).

Scripts (in `unas/`): `setup_fork.sh` (clone + register adapters),
`run_smoke.sh` (small-rounds GPU validation). The env-setup steps above are
captured in `unas/setup_wsl_env.sh`.

The lab / SYNERGIES GPU cluster remains the venue for the full-budget search;
this local RTX 5070 handles development, smoke runs, and moderate searches.

## Next steps

1. Choose the compute path (above).
2. Stand up the fork env; register the `unas/` adapters; set `DATA_ROOT`.
3. Smoke run `dmir_lcr` with `rounds=20` to validate the whole chain on real
   data (search → best `.h5` → QAT → INT8 TFLite).
4. Full search per task under the H7B3I-DK thresholds; collect the Pareto front.
5. Feed the front to ST Edge AI for flash/RAM/latency; build the paper tables.
6. Classification: run `dmir_cls` and `dmir_cls_noind` for the ablation.
