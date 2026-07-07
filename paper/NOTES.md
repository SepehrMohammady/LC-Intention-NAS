# Paper working notes

Target: Q1 venue. SPL vs IEEE IoT Journal analysis in
`docs/research/venue-choice.md` — decision pending with supervisor; drafting
at SPL length discipline until then.

## Baselines to beat (corrected 2026-07-07 — see docs/research/sota-baseline.md)

**Published** (Forneris et al., IEEE SPL vol. 33, pp. 136–140, 2026,
DOI 10.1109/LSP.2025.3638676): single TTLC regression only —
Transformer **RMSE 0.5102 s** (~54k params), 1DCNN 0.5746 (24.4k params);
FP32 deployment on STM32H7B3 + F401, no quantization. The paper does NOT
publish 3-class accuracy or per-direction RMSE.

**Internal, unpublished** (colleague's results on our prepared pickles):
92% accuracy (3-class), 0.42 s RMSE (LCR), 0.44 s RMSE (LCL). Cite as
internal reference only after confirming provenance (model? split?).

Our first untuned DSCNN (logged 2026-07-07): 91.5% / 0.439 / 0.459.

⛔ Comparability check pending: are the pickles split driver-wise like the
published protocol (val users {5,8,10,12,16,19,27}, test {2,7,13,18,25,31,36})?
If not, our numbers cannot be compared to the published 0.5102.

## Contribution sketch (draft, revise as results arrive)

1. Constrained (µNAS-style) architecture search on 1D driving time series —
   accuracy/footprint Pareto front instead of a single model.
2. Beats the published DIMIR baseline on all three tasks with a fraction of
   the memory/compute.
3. Deployment on STM32 with measured flash/RAM/latency (ST Edge AI toolchain),
   not just estimated MACs.

## Writing style guard

Blocklist and prose guidelines: `paper/STYLE.md` (generated from the two
articles the team shared). Run every draft section against it.

## Open TO-DOs (blocking items marked ⛔)

- [x] Dataset citation: Zenodo DOI 10.5281/zenodo.16686054 (MIT). "DIMIR" is
      an internal name; published acronym DMIR (ApplePies 2024 precursor).
- [x] Baseline paper details: docs/research/sota-baseline.md.
- [ ] ⛔ Confirm pickle column order; drop fileTime if it is channel 31.
- [ ] ⛔ Confirm pickle split is driver-wise (comparability + leakage).
- [ ] ⛔ Provenance of internal 92% / 0.42 / 0.44 results (model, protocol).
- [ ] Baseline Table III exact H7B3 values (rasterized image — needs
      institutional access to the PDF).
- [ ] SYNERGIES project acknowledgment text + grant number (baseline paper
      acknowledges Hi-Drive 101006664 — ours differs).
- [ ] Target MCU confirmation: proposal = same boards as baseline
      (STM32H7B3 high-end, STM32F401 low-end).
- [ ] Venue decision: SPL (4 pages, head-to-head story) vs IoT-J (8 pages,
      IF 8.7) — discuss with supervisor.
