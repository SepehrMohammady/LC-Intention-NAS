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
- [ ] **int8 I/O interface re-export.** `prepare_deploy.py` leaves
      `inference_input_type`/`inference_output_type` at float32, so the int8
      model still allocates a 6,200 B float32 input buffer — which is why its
      measured RAM (8,096 B) barely beat float32's (9,456 B) instead of hitting
      the predicted ~3 KB. Re-export cls_best_int8 with `tf.int8` I/O, then one
      ST upload to confirm RAM ≈ 3 KB and the `conversion_0` cast disappears.
- [ ] **QAT int8 on-device measure.** QAT recovers cls_best int8 to 89.82%
      (from 86.86% PTQ, +2.96, 57% of the gap) — DONE and logged
      (`unas/qat_finetune.py`, `results/qat/cls_best_qat_int8.tflite`, deployment.md).
      Accuracy is real (TFLite int8 interpreter); **latency/flash not yet measured**.
      One ST Edge AI upload of the QAT tflite to confirm ≈ int8 PTQ (1.885 ms,
      104 KB). Note it is a width-1 2D re-expression (Conv2D on device); reshape
      proven exact (float-2D=0.9208, PTQ-2D=0.8686 anchors).
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
