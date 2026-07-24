# Deployment — ST Edge AI benchmark plan and artifacts

Updated 2026-07-14.

## Why this board

**STM32H7B3I-DK**, for two reasons (user decision, recorded 2026-07-24):
(a) the published baseline deployed on STM32H7B3/F401, so measuring on the
same board makes the on-device comparison like-for-like; (b) the unit is
physically available in the ELIOS lab.

## ✔ SETTLED EMPIRICALLY: int16x8 is NOT deployable on ST Edge AI 4.0.1

**Measured 2026-07-14 on ST Edge AI Developer Cloud, Core 4.0.1-20581 — the
latest version.** `cls_best_int16x8.tflite` (a 117.9 KB file) was uploaded and
optimized for STM32 MCU. The result is identical to the float32 model to within
4 bytes:

| | cls_best_**int16x8** | cls_best_float32 | cls_best_**int8** (control) |
|---|--:|--:|--:|
| **weights** | **326.15 KiB** | **326.15 KiB** | **83.28 KiB** |
| flash total | 343,258 B | 343,254 B | 106,738 B |
| RAM | 9,456 B | 9,456 B | 8,096 B |
| MACC | 158,094 | 158,094 | 158,336 |
| latency | 3.605 ms | 3.628 ms | 1.885 ms |

The prediction was: **~118 KB = real int16x8 support; ~338 KB = silently
dequantized**. The measurement landed on 335 KiB. A 117.9 KB int8-weight file
came back as a **326.15 KiB weight blob — byte-identical to float32** — while the
genuinely-int8 control compressed to 83.28 KiB as expected. ST expanded the int8
weights back to float32 and discarded the int16 activation scheme, exactly as
`quantization.html` warns ("if an operator is not supported in integer, floating
point version is used").

⚠ **Do not cite the `STAI_FORMAT_FLOAT` badge as evidence.** An earlier draft did.
It is wrong: the int8 model shows `STAI_FORMAT_FLOAT` *too*, yet is genuinely
quantized. The badge describes the **I/O interface** (all three of our files have
float32 input/output with quantize/dequantize wrappers — verified in the
flatbuffer), not the internal arithmetic. **The weights figure is the only sound
discriminator**, which is precisely why the test was specified on flash.

The uploaded file was verified genuine int16x8 first, so the converter is not
the confound: its graph carries int8 weights, int64 biases, and int16 activation
tensors (`input_layer:0_int16`, `StatefulPartitionedCall_1:0_int16`) with
float32 boundary wrappers.

**Consequence: int16x8 is an offline accuracy bound only. Never quote it as a
deployed configuration.** Benchmarking it naively would have yielded a
"91.9% at 3.6 ms in int16x8" line that is a float32 model wearing a costume —
the exact fabrication this check existed to prevent.

This also closes the "is the Sept-2025 evidence stale?" question: it was a fair
challenge (4.0.1 ships no release note, so docs alone could not disprove it),
but the empirical answer agrees with the docs.

### Prior documentary evidence (now corroborated by measurement)

Re-checked against the **currently served** docs on 2026-07-14 (not just the old
forum post):

- The hosted docs under `stedgeai-dc.st.com/assets/embedded-docs/` return
  `Last-Modified: Thu, 04 Jun 2026` — i.e. refreshed ~5 weeks ago — and still
  self-identify as *"ST Edge AI Core Technology 4.0.0"* (`quantization.html`
  rev r1.5).
- `quantization.html`: *"ST Edge AI Core supports 8-bit integer-based (int8 or
  uint8 data type) arithmetic for quantized tensors"*; TFLite table: activation
  type `int8` (ss/sa), weight type `int8` (ss/sa); float16 "not supported".
- `supported_ops_tflite.html`, Common constraints: *"data type for the
  weights/activations tensors must be: float32, int8, uint8"* (bias int32 only).
  The 12 `int16` hits are **only** on `SELECT`/`SELECT_V2` (element-wise
  pass-through) — a red herring, not quantized CONV/FC kernels.
- Full-text sweep of the **entire release-note history (v1.0.0 → v4.0.0)**:
  `16x8` = **0 hits**, `int16` = **0 hits**. The only 16-bit entries are QKeras
  fixed-point for the **ISPU** (sensor) target — unrelated to TFLite 16x8.
- ST moderator (community.st.com): *"We do not support 16x8... not currently
  supported by the tool chain"* (Sept 2025, X-CUBE-AI 10.2.0) and *"The support
  for 16bits is in the roadmap but is not planned for at least next year"*
  (2025-06-24). No 2026 post contradicts this.

**Documented gap (now moot):** `versions.json` lists **4.0.1** as latest but no
4.0.1-specific release note is published (served docs are 4.0.0-era; 4.0.1 looks
like a patch, stm32 platform 12.0.0→12.0.1). So 4.0.1 adding int16x8 could not be
*disproven* from docs alone — which is why the empirical check above was run. It
was worth running: the docs were right, but only measurement could establish it.

Accepted: float32 (Keras/.tflite/.onnx), full-integer **int8** TFLite
(per-channel ss/sa, representative dataset), ONNX QDQ int8, and mixed
int8-with-float-fallback.

## Artifacts (results/deploy/, ST-compatible)

Sizes are the actual `.tflite` bytes; accuracy is our own test-set evaluation.

| Model | params | fp32 KB | int8 KB | float | int8 |
|---|--:|--:|--:|---|---|
| REF_cnn_multi (their reference) | 441,347 | 1728.6 | 444.8 | 91.69% | 88.27% |
| cls_best (ours) | 83,803 | 337.8 | 110.3 | **92.08%** | 86.86% |
| cls_tiny (ours) | 7,953 | 37.0 | 17.4 | 91.30% | 85.46% |
| cls_noind (ablation) | 21,038 | 93.3 | 40.8 | 91.08% | 76.06% |
| lcr_best | 117,404 | 472.0 | 151.6 | MAE 0.2865 | MAE 0.4485 |
| lcl_best | 105,769 | 429.3 | 151.1 | MAE 0.3165 | MAE 0.3440 |

**The fair comparison is float32**: the published baseline deployed FP32 too. On
that footing our classifier is **5.1× smaller and more accurate** than their
reference CNN (337.8 KB @ 92.08% vs 1728.6 KB @ 91.69%), and the tiny model is
**46.7× smaller** at 91.30%.

int8 halves-to-thirds the flash again but costs real accuracy on these
wide-dynamic-range inputs (cls 92.1→86.9, cls_noind 91.1→76.1, LCR MAE
0.287→0.449). Honest framing: int8 is the *size/speed* operating point, float32
the *accuracy* one; int16x8 would give both but ST cannot deploy it (cite the
limitation).

## QAT recovers most of the int8 drop (cls_best, 2026-07-24)

`unas/qat_finetune.py`. Quantization-aware fine-tuning of `cls_best`, INT8:

| operating point | test acc | vs float32 |
|---|--:|--:|
| float32 | 92.08% | — |
| int8 **PTQ** | 86.86% | −5.22 |
| int8 **QAT** | **89.82%** | −2.27 |

QAT recovers **+2.96 points** over PTQ (57% of the gap closed) at the same int8
footprint (`cls_best_qat_int8.tflite` = 101,616 B; 22 int8 tensors, float32 I/O
— identical interface to the measured int8 PTQ). Fake-quant float acc 89.99% →
int8 89.82% (−0.17), so the INT8 conversion faithfully captured the QAT ranges.

**Honesty scope / how it was done.** tfmot's 8-bit scheme only registers 2D
layers, so the searched **1D** graph was re-expressed with width-1 kernels
(Conv1D→Conv2D(k,1), Pool1D→Pool2D(p,1); depthwise strides (s,1)→(s,s), a no-op
at width 1). The re-expression is **proven numerically exact**: float-2D test
acc = 0.9208 (= 1D original) and PTQ-2D = 0.8686 (= measured 1D int8), so the
PTQ-vs-QAT comparison is single-variable. Accuracy is deployment-real (measured
through the actual TFLite int8 interpreter). Fine-tune: Adam 2e-4, batch 256,
val-early-stop patience 8 restore-best, 22/40 epochs. Ran in the WSL `dmir_nas`
env (TF 2.21 / tf_keras / tfmot 0.8.1), which required a Keras-3→tf_keras port
of the saved model (`unas/qat_finetune.py`: rebuild from exported adjacency +
per-layer weight transfer).

**✔ MEASURED on-device** (STM32H7B3I-DK, Core 4.0.1-20581, balanced,
2026-07-24): **1.558 ms**, MACC 161,570, flash 131,008 B (128 KiB; weights
**83.28 KiB** — byte-identical to the PTQ int8 — + ~43 KiB library), RAM 8,404 B
(6.05 KiB act). The ST graph confirms a genuine int8 model (int8 filters/weights,
int32 bias throughout; float32 I/O with a Quantize/Dequantize wrapper).

Two things stand out vs the int8 PTQ point (1.885 ms, 104 KiB):
- **Faster: 1.558 vs 1.885 ms** (−17%). Both are int8 with identical weights; the
  difference is the op path — the width-1 **Conv2D** kernels ST emits appear
  better-optimized than the 1D convs of the PTQ model. Reported as an observation,
  not a proven mechanism: the QAT-vs-PTQ latency also carries the 1D→2D change, so
  the speed-up cannot be attributed to QAT alone (a PTQ-2D on-device run would
  isolate it — not done).
- **Bigger flash: 128 vs 104 KiB.** Weights are identical (83.28 KiB); the +24 KiB
  is ST **library** overhead (~43 vs ~21 KiB) — the 2D re-expression pulls in more
  kernel code (Conv2D + Reshape + extra conversions). This is the honest cost of
  the tfmot-2D workaround; a native-1D QAT (custom QuantizeConfigs) would keep the
  ~104 KiB footprint. Still 2.6× smaller than the float32 build (335 KiB).

Net: the QAT int8 point is **89.82% @ 1.558 ms @ 128 KiB** — the fastest of the
three operating points, at −2.3 accuracy vs float32 and +3.0 vs PTQ int8.

## MEASURED — ST Edge AI Developer Cloud (real board)

Core **4.0.1-20581**, platform STM32 MCU (tool 12.0.1), optimization
**balanced**, allocate inputs/outputs true. Board **STM32H7B3I-DK**
(Cortex-M7 @ 280 MHz, 1184 KB internal RAM, 2048 KB internal flash).

| Model | test acc | latency (ms) | MACC | flash (B) | RAM (B) |
|---|--:|--:|--:|--:|--:|
| REF_cnn_multi_float32 (their reference CNN, 441 k) | 91.69% | 33.52 | 1,965,360 | 1,769,882 (1.69 MiB; weights 1.68 MiB + ~5 KiB lib) | 39,168 (38.25 KiB activations) |
| cls_best_float32 (ours, 84 k) | **92.08%** | **3.628** | 158,094 | 343,254 (335 KiB; weights 326.15 KiB + ~9 KiB lib) | 9,456 (8.42 KiB act + 832 B lib) |
| cls_tiny_float32 (ours, 8 k) | 91.30% | **0.7931** | 31,742 | 37,954 (37 KiB; weights 31.07 KiB + ~6 KiB lib) | 9,412 (8.91 KiB act + 288 B lib) |
| lcr_best_float32 (ours, 117 k; regression) | MAE 0.2865 / RMSE 0.4466 | 14.06 | 860,407 | 474,522 (463 KiB; weights 453.83 KiB + ~10 KiB lib) | 20,772 (18.91 KiB act + ~1 KiB lib) |
| lcl_best_float32 (ours, 106 k; regression) | MAE 0.3165 | 28.77 | 1,658,927 | 423,494 (414 KiB; weights 403.61 KiB + ~10 KiB lib) | 28,264 (26.46 KiB act + ~1 KiB lib) |
| cls_best_**int8** (PTQ, 1D, 84 k) | 86.86% | **1.885** | 158,336 | 106,738 (104 KiB; weights 83.28 KiB + ~21 KiB lib) | 8,096 (6.05 KiB act + ~2 KiB lib) |
| cls_best_**int8 QAT** (2D re-expr, 84 k) | **89.82%** | **1.558** | 161,570 | 131,008 (128 KiB; weights 83.28 KiB + ~43 KiB lib) | 8,404 (6.05 KiB act + ~2 KiB lib) |
| cls_best_**int16x8** (ours, 84 k) | — | 3.605 | 158,094 | 343,258 (335 KiB; weights 326.15 KiB + ~9 KiB lib) | 9,456 (8.42 KiB act + 832 B lib) |

The last row is **not a real int16x8 deployment** — ST dequantized it to float32
(see the section above). It is listed only as the evidence for that finding.

### Headline (same board, same Core version, same settings)

| vs reference | cls_best | cls_tiny |
|---|--:|--:|
| accuracy | **+0.4 pts** (92.08 vs 91.69) | −0.4 pts (91.30) |
| latency | **9.2× faster** (3.63 vs 33.52 ms) | **42.3× faster** (0.79 ms) |
| flash | **5.2× smaller** | **46.6× smaller** (37 KB) |
| RAM | 4.1× less | 4.2× less |
| MACC | 12.4× fewer | **61.9× fewer** |

Two operating points, both measured on real hardware: *more accurate and 9×
faster*, or *0.4 points lower and 42× faster in 37 KB with sub-millisecond
inference*.

### MEASURED — NUCLEO-F401RE (Cortex-M4 @ 84 MHz, 512 KB flash, 96 KB RAM)

`cls_tiny_float32`: **4.376 ms @ 84 MHz** (measured 2026-07-14, Core 4.0.1,
balanced). Flash/RAM are the platform-level optimize output and unchanged from
the H7B3 run: 37,954 B flash (**7.2%** of the F401's 512 KB), 9,412 B RAM
(9.8% of its 96 KB).

`cls_best_qat_int8` also measured on the F401 (2026-07-24): **7.381 ms @ 84 MHz**.
Flash/RAM unchanged from its H7B3 run (128 KiB flash = **25.6%** of 512 KB;
8,404 B RAM = 8.8% of 96 KB) — so the *full* classifier, quantized, runs on the
Cortex-M4 at **89.82%** accuracy. Cross-board it is 7.381 / 1.558 = 4.7× slower
than the M7 (≈ 3.3× clock × ~1.4× M4-vs-M7 IPC — consistent with the cls_tiny
scaling below).

**The headline here is categorical, not a ratio: the reference CNN cannot run on
this board at all.** Its 1,769,882 B of flash is **3.38× the F401's entire
512 KB**. No optimization setting fixes that. Every searched model fits:

| model | flash | % of F401 flash | fits? |
|---|--:|--:|---|
| REF_cnn_multi | 1,769,882 B | 337.6% | **no — 3.38× over** |
| lcr_best | 474,522 B | 90.5% | yes |
| lcl_best | 423,494 B | 80.8% | yes |
| cls_best | 343,254 B | 65.5% | yes |
| cls_best int8 QAT | 131,008 B | 25.6% | yes (89.82% @ 7.381 ms) |
| cls_tiny | 37,954 B | **7.2%** | yes, easily |

So the searched models open a board class the reference is locked out of — 91.3%
accuracy at 4.4 ms on a Cortex-M4 that costs a fraction of the H7B3. This matches
the baseline paper's own report that their Transformer did not fit the F401.

**Cross-board scaling (same model, same file):**

| board | latency | clock | cycles | cycles/MAC |
|---|--:|--:|--:|--:|
| STM32H7B3I-DK (M7) | 0.7931 ms | 280 MHz | 222,068 | 7.0 |
| NUCLEO-F401RE (M4) | 4.376 ms | 84 MHz | 367,584 | 11.6 |

Wall-clock ratio 5.52× against a clock ratio of only 3.33×, so the M4 is 1.66×
slower **per clock** — consistent with the M7's dual-issue pipeline and cache.
Note both figures: **7–11.6 cycles per MAC** on cores with single-cycle MAC
instructions. Arithmetic is not the bottleneck on either board at this model
size; per-op overhead and memory traffic are.

### The int8 operating point, measured (cls_best)

| cls_best | float32 | int8 | ratio |
|---|--:|--:|--:|
| test accuracy | **92.08%** | 86.86% | **−5.2 pts** |
| latency | 3.628 ms | **1.885 ms** | 1.9× faster |
| flash | 343,254 B | **106,738 B** | 3.2× smaller |
| RAM | 9,456 B | 8,096 B | 1.2× (see below) |

int8 buys 1.9× speed and 3.2× flash for **5.2 accuracy points** — a poor trade on
this task's wide-dynamic-range inputs, which is why float32 remains our headline
configuration (and matches the baseline's own FP32 methodology). Note the flash
ratio is only 3.2×, not the naive 4×, because the int8 runtime library is larger
(~21 KiB vs ~9 KiB) — a fixed cost that matters at this model size. RAM barely
moves, for the interface reason explained below.

### RAM: input floor, then layer width, then branch liveness

Three regimes, each demonstrated by a different model.

**1. Input-bound (the classifiers).** cls_best (84 k params) and cls_tiny (8 k)
both land at ~9.2 KB RAM despite a 9× parameter gap. The 50×31 float32 input is
**6.2 KB** by itself and no architecture can go below it in FP32; activations add
only ~2–3 KB. The lever here is the input data type, not the model.

**Tested, and the prediction failed — instructively.** We predicted int8
quantization would cut the floor to 1.55 KB and drop RAM to ~3 KB. Measured:
cls_best_int8 activations are **6.05 KiB (6,195 B)** — barely below float32's
8.42 KiB, and suspiciously close to the 6,200 B float32 input buffer. That is the
explanation: **our converter emits a float32 I/O interface** (`inference_input_type`
left at default, verified in the flatbuffer — all three files take FLOAT32 in and
out), so ST must still allocate a 6,200 B float32 input buffer and quantize
internally. The int8 activations themselves are tiny; the arena is essentially
just that one float32 buffer. The `conversion_0` op doing the float32→int8 input
cast is visible in the per-layer time chart and is not cheap.

So the input-floor rule is **confirmed, not refuted** — the floor simply never
moved, because quantizing the *weights* does not quantize the *interface*.
**Actionable:** setting `inference_input_type=tf.int8` /
`inference_output_type=tf.int8` in `prepare_deploy.py` should cut the floor to
1.55 KB and take int8 RAM to ~3 KB, and drop the `conversion_0` cast. Worth one
re-export and one upload. → TODO in `paper/NOTES.md`.

**2. Width-bound (`lcr_best`, 20.8 KB).** Its wide 116-channel conv emits
25×116×4 B = 11.6 KB; peak ≈ input 6.2 + 11.6 ≈ 17.8 KB against 18.91 KiB
reported. Width — not depth or parameter count — moves RAM.

**3. Liveness-bound (`lcl_best`, 26.46 KiB).** Here the chain rule
`max(input, widest layer in+out)` **fails**, and the reason is not the one that
first suggests itself. The widest single activation is conv2d_1's 50×65×4 =
13,000 B, giving a chain bound of 6,200 + 13,000 = 19,200 B — well under the
measurement. But the obvious explanation ("the big branch tensors are all live
at once") is **false**: live-range analysis of the TFLite graph shows conv2d_1's
13,000 B output is live over ops [1,4] and conv2d_5's 12,000 B output over ops
[5,8] — **disjoint**. conv2d_4 frees the first before conv2d_5 allocates the
second. They are never co-resident.

The real peak is 24,800 B at op 8, and it is made of *small* tensors pinned for
a long time by the merge topology:

```
input        6,200 B  — live across all three branches (conv2d_1, conv2d_5, pool_10 all read it)
conv2d_5 out 12,000 B — the branch currently executing
conv2d_4 out  3,300 B — branch A's result, pinned until the Add at op 14
conv2d_8 out  3,300 B — branch B's result, pinned until the Add at op 15
             ------
             24,800 B
```

So a DAG does cost more RAM than a chain (+5.6 KB here), but through **long-lived
small tensors awaiting their merge**, not through wide tensors racing. The
remaining ~1–2 KB up to the reported 26.46 KiB is allocator behaviour
(offset-assignment fragmentation, alignment); it is **not derivable from the
graph** and is recorded here as unexplained rather than assigned a mechanism.
BatchNorm scratch is excluded — BN is folded into the convs.

Revised rule: **peak RAM = max over the schedule of all simultaneously-live
tensors.** For a chain that collapses to `max(input, widest in+out)`; for a DAG
it does not.

*Precision note:* do not quote "27,095 B". That is 26.46 × 1024 rounded back, and
27,095 is not even a multiple of 4 — impossible for a float32 arena. ST's
4-significant-digit display only constrains the true value to ≈27,090–27,100 B.

This is why our RAM advantage (~4×) is far smaller than our flash advantage
(5–47×).

### Our offline estimates are validated by these measurements

`unas/compute_footprint.py` predicted the reference CNN at flash 1728.6 KB,
peak RAM 38.4 KB, MACs 1,936,192 — versus ST's measured 1729.4 KB, 38.25 KiB,
1,965,360. Errors: **0.05% (flash), ~0.4% (RAM), 1.5% (MACC)**. Flash has since
reproduced to the byte on `lcl_best`: predicted 403.6 KiB vs measured 403.61 KiB
(**0.00%**), across five models.

**ST's MACC convention (resolves the residual ~1% MAC gap).** Our plain
`out_elems × taps` count is consistently ~1% low. That gap is *not* BatchNorm or
eltwise ops, as first assumed — **ST counts the bias accumulate as a MAC**.
Using `out_elems × (taps + 1)` on lcl_best gives 1,658,985 against ST's measured
1,658,927: **0.0035% (58 ops)**, versus −0.967% for the plain count. The
estimator is therefore near-exact once the convention is matched.

### Per-layer time does not track MACs on ST's float32 path

**The robust claim (well supported, safe to publish).** On ST's float32 kernels,
MAC count does not rank per-layer cost — not approximately, not even ordinally in
the tail. Evidence across three models and both boards:

- *cls_best (M7)*: `conv2d_5`, a depthwise conv carrying **1,209 MACs — 0.8% of
  the model — is the largest execution-time bar**. `conv2d_15`, with 41,503 MACs
  (26%), is a small bar. **34× fewer MACs, slowest layer.**
- *cls_tiny (M4)*: `pool_7` is an average-pool with **zero MACs** and is one of
  the largest bars; `gemm_13` has 24% of the model's MACs and is a small bar.
- *Both boards*: **7.0 cycles/MAC (M7) and 11.6 cycles/MAC (M4)** on cores with
  single-cycle MAC instructions — an order of magnitude of pure overhead.

The unifying explanation is that at these tensor sizes nothing is
arithmetic-bound; per-op overhead and memory traffic dominate, so zero-MAC ops
(pooling) and low-intensity ops (depthwise) cost real time while a dense GEMM
with most of the MACs is cheap.

**Scope: float32 only.** The int8 build of cls_best inverts the picture —
`gemm_25` (43.4% of MACs) becomes the largest bar and time tracks MACs well. The
anomaly belongs to ST's float32 kernels, not to the board or the architecture;
plausibly the int8 path uses the optimised CMSIS-NN kernels and the float32 path
does not.

### ⚠ Downgraded: the "unfused ReLU" explanation is NOT established

An earlier draft here claimed the correlate was **absence of a fused ReLU**, at
4/4 across lcl_best (3/3, p ≈ 0.6%) and cls_best (1/1), with shape-matched
controls. **`cls_tiny` weakens this and it is recorded as a hypothesis only.**

cls_tiny has **zero** unfused convs (both its convs carry a fused ReLU; only the
final 219-MAC output FC is linear) — yet it shows the same strong MAC/time
inversions anyway (`pool_7`: 0 MACs, large bar; `gemm_13`: 24% of MACs, small
bar). **So an unfused ReLU is not necessary for the inversion to appear**, which
is what the earlier framing implied.

What survives, stated carefully:
- The observation that lcl_best's three no-ReLU convs are exactly its three top
  bars is real, and the shape-matched controls are real (lcl_best `conv2d_1` vs
  `conv2d_5`: same input tensor, both 1×1, conv2d_1 has 8.3% **more** MACs yet is
  a sliver).
- But cls_tiny shows the effect does not require unfused convs, and it ran on a
  **different board**, so it is not a clean refutation either. Two models on one
  board is thin support for a mechanism.
- Honest position: **the fusion correlation is one candidate explanation among
  several (op overhead, memory traffic, kernel selection), not an established
  one.** Do not put a mechanism in the paper without the ablation.

**Open items before any of this is publishable:**
1. Confirm whether the per-layer chart is board-measured or ST cost-model
   estimated. If estimated, the whole per-layer analysis weakens to a statement
   about ST's cost model.
2. Run the ablation: re-export one no-ReLU conv with a ReLU appended, shapes held
   constant; see whether its bar collapses. Cheap and decisive.

The paper currently states only the robust claim (MACs do not predict per-layer
time on the float32 path), not the mechanism.

### Where the reference CNN spends its budget (per-layer, from the DC charts)

- **Flash** is dominated by a single layer: `gemm_14` = 1,638,656 B of the
  1,762,316 B of weights — **93.0%**, the `Flatten(6400) → Dense(64)` head
  (64×6400 = 409.6 k of its 441 k parameters). It flattens the whole 50×128
  feature map instead of pooling it.
- **Latency**, by contrast, is dominated by the `eltwise` (BatchNorm mul/add
  over 50×128 tensors) and the convs; `gemm_14` costs almost no time despite
  being 93% of the flash. Flash-bound and time-bound layers are decoupled.
- **Ours (cls_best) is also dense-dominated in flash** (`gemm_24` = 82.5% of
  weights) — so the honest statement is *not* "we avoid a large FC" but: the
  searched model **pools before the head** (`pool_18`), which shrinks the FC
  input and makes its dense layer **~5.9× smaller** than the reference's
  (280 KB vs 1.64 MB).

**FC dominance falls as the search space is exploited** (share of weights held by
the largest FC, all computed from the deployed `.tflite` files):

| model | biggest-FC share | largest layer overall |
|---|--:|---|
| REF_cnn_multi | **93.0%** | that FC |
| cls_tiny | 90.9% | that FC |
| cls_noind | 90.3% | that FC |
| cls_best | 82.5% | that FC |
| lcr_best | 39.6% | that FC |
| lcl_best | **11.4%** | `conv2d_30`, a **conv** (24.3%) |

lcl_best is the only model whose flash is not FC-dominated at all. (Earlier drafts
quoted "82–95%" for the classifiers and "~95%" for the reference; both were
inflated — the true figures are 82.5–90.9% and 93.0%.)

## Benchmark plan (ST Edge AI Developer Cloud)

Both target boards are in the farm: **STM32H7B3I-DK** and **NUCLEO-F401RE**.
Keep settings constant across all runs or the comparison is meaningless:
**pin one ST Edge AI Core version** (e.g. 4.0.1), optimization **balanced**,
compression **none**. Archive each `report.json`.

Priority 1 — main deployment table, board **STM32H7B3I-DK**, float32:
1. `REF_cnn_multi_float32.tflite` ← the baseline anchor
2. `cls_best_float32.tflite`
3. `cls_tiny_float32.tflite`
4. `lcr_best_float32.tflite`
5. `lcl_best_float32.tflite`

Priority 2 — the low-end story, board **NUCLEO-F401RE**, float32:
6. `cls_tiny_float32.tflite` (the baseline's Transformer did not fit the F401)

Priority 3 — quantify the int8 operating point, **STM32H7B3I-DK**:
7. `cls_best_int8.tflite`

Record per run: **inference time (ms)**, **flash / rom_size**, **RAM /
ram_size + activations_size**, **MACC**, board, Core version.

Scriptable alternative (avoids UI clicking): the `stm32ai_dc` Python client
(`stm32ai-modelzoo-services/common/stm32ai_dc`) — `Stm32Ai(CloudBackend(user,
pwd, version))`, `get_benchmark_boards()`, `upload_model()`, `benchmark(
CliParameters(model=...), 'STM32H7B3I-DK')`. Also local: X-CUBE-AI "Validate on
target" in CubeMX with the board you own (highest fidelity, no queue).
