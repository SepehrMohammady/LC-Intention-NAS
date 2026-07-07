# µNAS and constrained-NAS landscape

Researched 2026-07-07. Primary source: Liberis, Dudziak, Lane, "µNAS:
Constrained Neural Architecture Search for Microcontrollers," EuroMLSys 2021,
arXiv:2010.14246, DOI 10.1145/3437984.3458836.

## µNAS in one page

- **Search space**: CNNs of serially/parallel-connected conv blocks (DAGs
  allowed); each block 1–3 conv layers (full / depthwise / 1×1; kernel
  {3,5,7}; channels 1–128; optional stride 2, 2×2 max-pool, BN, ReLU); final
  pooling P∈{2,4,6}; 1–3 FC layers (10–256 units). ~10^152 candidates.
  Mutations via network morphisms.
- **Constraints as objectives**: four objectives — (1−val acc), peak RAM,
  model size (int8 quantized), MACs — combined by *random scalarisation*:
  L = max_i(λ_i · obj_i) with 1/λ_i ~ U[0, b_i] resampled per round, so
  exceeding a user budget b_i is heavily penalised.
  - Peak RAM = minimum-over-execution-orders peak working set.
  - Flash = int8 full-integer quantized weights.
  - Latency proxy = MACs — validated R² = 0.975 vs measured latency on
    STM32H743ZI (1000 random models). Good news: MAC-based constraints are
    defensible in the paper.
- **Search**: aging evolution (sample S from population, mutate winner,
  replace oldest) beat the Bayesian-optimisation variant; best config =
  AE + structured pruning (DPF: gradual L2 channel pruning during candidate
  training; target sparsity is an inherited, perturbed gene).
- **Results**: e.g. Speech Commands 95.58% @ 37 KB flash / 21.1 KB RAM /
  1.1M MACs. Search cost 0.5–3 GPU-days (small tasks) up to ~40 GPU-days.

## Why we implement our own (PyTorch)

The official repo (github.com/eliberis/uNAS) is TF 2.3 / Python 3.7,
unmaintained since Jan 2021, **has no license file** (reuse legally blocked),
and supports only 2D conv — audio is fed as 2D MFCC images. A 1D-native
PyTorch implementation on our data is both necessary and a contribution.

## Directly related work (for Related Work section + baselines)

| Work | Idea | Relevance |
|---|---|---|
| MCUNet/TinyNAS (NeurIPS'20) | search-space scaling + one-shot evolution, TinyEngine | canonical TinyML NAS |
| MicroNets (MLSys'21) | DNAS, MACs as linear latency/energy proxy on Cortex-M | supports MAC-proxy choice |
| SpArSe (NeurIPS'19) | BO + pruning for <2 KB models | precursor |
| **MicroNAS for time series** (King et al., Sci. Reports 2025, arXiv:2310.18384) | DNAS + latency lookup + peak-memory for MCU time-series classification (UCI-HAR 94.6–99.6%) | closest to us — must cite and differentiate |
| **TinyTNAS** (arXiv:2408.16535) | GPU-free time-bound HW-aware NAS for time series | closest to us (2) |
| MicroNAS-zero-shot (arXiv:2401.08996), MONAS (arXiv:2408.15034) | training-free proxies | cheap-search alternative to mention |

Differentiation from MicroNAS/TinyTNAS: automotive intention-prediction task,
regression + classification heads, comparison against a published
deployment-oriented SPL baseline on identical hardware, int8 quantization
with measured (not proxied) on-device numbers.

## Design decisions for our search (draft)

1. Search space: 1D adaptation of µNAS blocks (Conv1d full/depthwise/1×1,
   kernel {3,5,7,9}, width ≤128, stride 2, optional pooling), ops restricted
   to what ST Edge AI maps well.
2. Objectives: val metric + peak RAM + int8 flash + MACs, µNAS-style random
   scalarisation; budgets set per target board (H7B3 high-end, F401 low-end —
   same boards as the baseline paper).
3. Aging evolution + morphism mutations; short-budget candidate training with
   early stopping (our full baseline trains in ~30 s → search is affordable:
   ~1000 candidates ≈ 8–10 GPU-hours).
4. Optional: weight-sharing/zero-cost proxy screening to cut cost further.

Open: population size / sample size (µNAS appendix values not extracted —
use common AE defaults P=100, S=25 and tune).
