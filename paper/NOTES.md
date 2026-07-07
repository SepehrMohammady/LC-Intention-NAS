# Paper working notes

Target: Q1 venue, first candidate IEEE Signal Processing Letters (final choice
pending the venue research in `docs/research/`).

## Baseline to beat (published SOTA)

Source: ELIOS lab LC-Intention framework
(https://elios-lab.github.io/LC-Intention-Framework/,
https://ieeexplore.ieee.org/document/11271346).

| Task | Metric | SOTA |
|---|---|---|
| 3-class intention (none / LCR / LCL) | accuracy | 92% |
| Time-to-LC regression, LCR | RMSE | 0.42 s |
| Time-to-LC regression, LCL | RMSE | 0.44 s |

TO-DO: pull the full metric set (F1, per-class, model size, latency, MCU
metrics if any) from the paper once the research notes land — every claim in
our comparison table needs a checked source.

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

- [ ] ⛔ Feature names/meaning for the 31 channels (needed for Section II).
- [ ] ⛔ DIMIR canonical citation.
- [ ] Baseline paper full details (architecture, params, deployment metrics).
- [ ] SYNERGIES project acknowledgment text + grant number.
- [ ] Target MCU part number and budget (flash/RAM) — affects NAS constraints.
- [ ] Split protocol (driver-wise vs random) for the leakage discussion.
