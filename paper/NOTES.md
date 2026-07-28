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

**Internal, unpublished** (colleague's models, in Materials/Models/, verified
2026-07-09 — docs/research/reference-comparison.md): `cnn_multi` (441k params)
= 91.5% test acc (the "92%"); `transformer_lcr` (333k) RMSE 0.42;
`transformer_lcl` (49k) RMSE 0.44 (Transformers couldn't be re-run — custom
TransformerEncoder not in the public repo; RMSE as reported).

⚠ Honest head-to-head: classification is a clear WIN (ours 92.1% @ 84k vs
441k @ 91.5%; 8k model matches at 55× smaller). Regression is NOT a clean win
vs the internal Transformers on RMSE — esp. LCL: their 49k Transformer
(RMSE 0.44) beats our 85k (RMSE 0.50). We beat the *published* SOTA (0.51) on
LCR. Lead with classification + deployment; add RMSE objective before claiming
regression wins over the internal reference.

RMSE re-run done (2026-07-10): LCL improved 0.50→0.466 (RMSE objective), LCR
stayed 0.447. Still behind internal-ref transformers (0.42/0.44). Final stance:
DO NOT claim regression RMSE win over the internal reference; claim beating the
published SOTA (0.51) at 2-3x fewer params + deployability. Headlines =
classification win + deployment.

Our first untuned DSCNN (logged 2026-07-07): 91.5% / 0.439 / 0.459.

**NAS results (2026-07-09, completed searches, verified — docs/research/nas-results.md):**
searched 1D CNNs beat the published SOTA MAE (LCR 0.287 vs 0.298) at 115 KB and
still (0.290) at 64 KB; LCL best MAE 0.325 / RMSE 0.501 at 83 KB; classification
**92.1%** (82 KB) — matches internal ref 92% at ~1/3 the Transformer's size —
and 91.3% at just 7.8 KB. **Ablation headline:** without the turn-signal
channels, classification is still 91.1% (down ~1 point), 90.2% at 11 KB — the
model anticipates, it does not just read the blinker (blinker-alone = 81.5%).
Caveats: internal-ref RMSE 0.42/0.44 not beaten (search optimizes MAE); chunked
resume + pareto-save may prune a few models (re-run with save_criteria=all for a
guaranteed-optimal front); on-device numbers pending ST Edge AI.

✅ Comparability verified (2026-07-07): the pickles follow the official
driver-wise split (val users {5,8,10,12,16,19,27}, test {2,7,13,18,25,31,36})
— proven by window-matching raw per-user H5 sessions against the pickles
(`scripts/analysis/verify_split.py`). Our numbers ARE comparable to the
published 0.5102, and the setup earns a "no window leakage" claim in §Data.

## Contribution sketch (revised 2026-07-07 after the indicator-leak finding)

Lead with the tasks that are NOT trivially leaky and with deployment:

1. Constrained (µNAS-style) architecture search on 1D driving time series —
   accuracy/footprint Pareto front instead of a single model.
2. **Time-to-lane-change regression** as the primary result (no trivial leak):
   beat the published Transformer (RMSE 0.5102 s) at a fraction of the
   footprint. This aligns with the baseline paper, which itself uses TTLC
   regression, not 3-class accuracy.
3. Deployment on **STM32H7B3I-DK** with measured flash/RAM/latency (ST Edge AI
   toolchain) after int8 quantization — vs the baseline's FP32-only models.
4. Classification handled honestly: report it, but with a with/without-turn-
   indicator ablation and a no-signal-subset accuracy.

### ⚠ Turn-indicator label leak (must address, do not hide)

The feature set includes the driver's turn-signal state (verified: channels
28/29 for classification, 3/4 for regression — see docs/research/feature-map.md).
`scripts/analysis/indicator_leak.py`: those two channels ALONE give 81.5%
test accuracy (full model 91.5%, internal reference 92%); blinker-on rate is
92%/71% for LCR/LCL vs 6.5% for no-intent. A reviewer will notice that an
"intention" classifier fed the blinker is largely reading a declared intent.
Mitigations baked into the plan above. Regression checked
(`indicator_leak_regression.py`): indicator-only test RMSE is 0.72 (LCR) /
0.90 (LCL) — well above our DSCNN (0.439 / 0.459) and the SOTA (0.42 / 0.44),
and only modestly better than predict-mean (~1.17). So the blinker does NOT
trivialize the timing task; the regression win is meaningful. The leak is
specific to 3-class classification.

## Writing style guard

Blocklist and prose guidelines: `paper/STYLE.md` (generated from the two
articles the team shared). Run every draft section against it.

## Open TO-DOs (blocking items marked ⛔)

- [x] Dataset citation: Zenodo DOI 10.5281/zenodo.16686054 (MIT). "DMIR" is
      an internal name; published acronym DMIR (ApplePies 2024 precursor).
- [x] Baseline paper details: docs/research/sota-baseline.md.
- [x] Column order: no fileTime channel anywhere (fingerprint analysis);
      spike pair = curvatureDx; layouts differ between classification and LCR
      (docs/DATA.md). Only the exact name list still to confirm (cosmetic).
- [x] Split is driver-wise — verified empirically (verify_split.py).
- [ ] Provenance of internal 92% / 0.42 / 0.44 results (model, protocol) —
      needed only to caption the "internal reference" table row.
- [ ] Baseline Table III exact H7B3 values (rasterized image — needs
      institutional access to the PDF).
- [ ] SYNERGIES project acknowledgment text + grant number (baseline paper
      acknowledges Hi-Drive 101006664 — ours differs).
- [x] Target MCU confirmed by user: **STM32H7B3I-DK** (same H7B3 family as the
      baseline paper's high-end board → directly comparable). F401 optional
      stretch target.
- [ ] Venue decision: SPL (4 pages, head-to-head story) vs IoT-J (8 pages,
      IF 8.7) — discuss with supervisor.
- [x] int16x8 deployability: **settled empirically 2026-07-14**. ST Edge AI
      4.0.1 silently dequantizes it to float32 (weights 326.15 KiB = identical
      to float32; the int8 control compresses to 83.28 KiB). Offline accuracy
      bound only — never quote as deployed. See docs/research/deployment.md.
- [x] **int8 I/O interface — MEASURED (2026-07-27).** RAM **8,096 → 5,444 B**
      (1.49×; activations 6.05 → 3.46 KiB), both cast ops gone, MACC 158,336 →
      155,230, flash unchanged, badge now `STAI_FORMAT_S8`. int8 is now clearly
      the RAM-efficient point (1.74× under float32, was 1.17×). My predicted
      3,446 B was 2 KB optimistic — I subtracted the buffer saving instead of
      applying max-over-live-tensors; once the input stopped being the binding
      constraint the internal peak set the floor. Recorded in deployment.md.
      Side finding: `STAI_FORMAT_*` tracks the **I/O dtype**, not weight
      precision — resolves the earlier badge puzzle.
- [x] **QAT + int8 I/O — MEASURED (2026-07-28).** 89.90% @ **1.435 ms**,
      131,562 B flash, **6,204 B RAM**, 2.53 cycles/MAC — the fastest and most
      efficient configuration measured. vs the float32-I/O QAT build: 7.9%
      faster, 1.35× less RAM, flash unchanged. Deployment now has three
      Pareto-optimal points (float32 accuracy / QAT-int8 speed / PTQ-int8 size),
      all in deployment.md and the paper.
- [x] **QAT int8 measured on-device** (2026-07-24, H7B3I-DK): 89.82% @
      **1.558 ms** / 128 KiB flash / 8.4 KB RAM. Recovers +2.96 over PTQ int8 and
      is the *fastest* operating point (< float32 3.628 ms and PTQ int8 1.885 ms).
      Flash is +24 KiB vs PTQ int8 (weights identical 83.28 KiB; the delta is ST
      library code for the width-1 2D re-expression).
- [x] **F401 flash-headroom limit — bracketed.** `lcl_best` (423,494 B, 80.8%,
      100,794 B headroom) **runs at 162.5 ms**; `lcr_best` (474,522 B, 90.5%,
      49,766 B headroom) returns **no measured time**. So the practical ceiling
      is between **80.8% and 90.5% flash occupancy** (~100 KB vs ~50 KB free):
      the validation app + runtime need flash on top of the weights. Caveat kept
      in deployment.md: the Cloud gave no reason for the dash, so "insufficient
      headroom" is the supported explanation, not a reported error.
- [x] **Headroom cause isolated** (2026-07-27): `lcr_best_int8` (150,504 B,
      28.7% of flash) **runs at 28.10 ms** on the F401 — same architecture,
      operators and board as the fp32 build that returned nothing. So the
      failure is the flash footprint, not the model or an unsupported op.
      Paper now states that on this board quantization is what makes the widest
      model deployable at all. Accuracy caveat: that int8 build is PTQ and
      costs the regressor a lot (MAE 0.287 → 0.4485).
- [x] **QAT for the regression heads — DONE, and it does not work** (2026-07-27).
      LCR: 0.4485 → 0.4313 MAE (recovers only 11% of the gap vs the classifier's
      57%). LCL: 0.3440 → 0.3620, i.e. **worse than plain PTQ**. Robust to the
      fine-tune rate (repeated at 2e-5: LCR +0.0115, LCL −0.0321). Anchors exact
      in both cases, so the comparison is sound. Interpretation in
      deployment.md: classification only needs an argmax and tolerates coarse
      activations; regression needs the continuous value, and int8 costs the
      classifier 5.7% relative accuracy against a 57% relative error increase
      for LCR. Paper states float32 as the only accurate regression config.
- [ ] **Optional: native-1D QAT** to drop the +24 KiB library overhead. Custom
      tfmot QuantizeConfigs for Conv1D/DepthwiseConv1D/pool would keep the exact
      1D graph (~104 KiB) instead of the 2D workaround, and would also isolate the
      QAT-vs-PTQ latency (currently confounded with 1D→2D). Only if the flash
      point matters; the accuracy result already stands.
- [ ] **Fusion/kernel-path ablation** — DOWNGRADED, do not publish the mechanism.
      The "unfused ReLU is the correlate" story (4/4 across lcl_best + cls_best)
      is weakened by cls_tiny, which has **zero** unfused convs yet shows the same
      MAC/time inversions (pool_7: 0 MACs, large bar). So unfused ReLU is not
      necessary for the effect. Different board, so not a clean refutation either
      — but two models on one board is thin support for a mechanism. The paper
      now states only the robust claim (MACs do not predict per-layer time on the
      float32 path; 7.0–11.6 cycles/MAC ⇒ overhead-bound). To recover the
      mechanism: (a) confirm whether ST's per-layer chart is board-measured or
      cost-model estimated; (b) re-export one no-ReLU conv with a ReLU appended,
      shapes held constant, check whether its bar collapses.
- [x] `cls_tiny_float32` on **NUCLEO-F401RE**: 4.376 ms @ 84 MHz, 7.2% of flash.
      **Reference CNN does not fit the F401 at all** (1729 KB vs 512 KB, 3.38×
      over) — categorical result, now in the paper.
- [ ] Spike provenance: colleague says crash-heavy drivers were kept
      (users 34/43); DMIR Test Reports.xlsx corroborates User34 (4 collisions +
      2 accidents) and User1 (5+1), NOT User43 (0/0). Ask whether User1/34 are
      in the official test split — would settle the test-only-spike hypothesis.
      Paper keeps neutral "division-by-near-zero" wording until then.
- [ ] Optional robustness add-on: driver-wise k-fold CV of the **final** models
      (not the search) to show insensitivity to the specific 7-driver test
      choice. Cheap (~7 retrainings per task); would preempt a likely reviewer
      question about the small driver count.
- [ ] Log per-search wall-clock on any future NAS re-run (current evidence:
      one overnight queue for all four searches, LOGBOOK 2026-07-08/09).
