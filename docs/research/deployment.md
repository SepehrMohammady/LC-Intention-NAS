# Deployment — ST Edge AI benchmark plan and artifacts

Updated 2026-07-14.

## ⚠ int16x8 is (almost certainly) NOT deployable on ST Edge AI — verify empirically

Our int16x8 quantization (which preserves accuracy — see nas-results.md) appears
**not deployable** with ST Edge AI Core / X-CUBE-AI / Developer Cloud.
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

**Known gap:** `versions.json` lists **4.0.1** as latest but no 4.0.1-specific
release note is published (served docs are 4.0.0-era; 4.0.1 looks like a patch,
stm32 platform 12.0.0→12.0.1). So 4.0.1 adding int16x8 cannot be *disproven*
from docs alone — hence the empirical check below.

**Empirical test (do it — one upload, definitive).** Benchmark
`cls_best_int16x8.tflite` on STM32H7B3I-DK and read the reported flash. ST
silently dequantizes unsupported schemes (*"if an operator is not supported in
integer, floating point version is used"*), so a "success" alone proves nothing:

| int16x8 reported flash | Verdict |
|---|---|
| ≈ **118 KB** (near the int8 file, 110.3 KB) | int16x8 genuinely supported — int8 weights kept |
| ≈ **338 KB** (near the float32 file, 337.8 KB) | silently dequantized → float32; not a real int16x8 deployment |

Until that check says otherwise, int16x8 stays an **offline accuracy bound
only**; never quote it as a deployed configuration.

**Danger:** on Cortex-M targets (our H7B3I-DK) an int16x8 file may be *ingested
but silently dequantized to float32* (*"if an operator is not supported in
integer, floating point version is used"*), producing a float model with **no
int16 benefit**. A benchmark "success" there would be misleading, not a win.
So: int16x8 stays an **offline accuracy result only**; never quote it as a
deployed configuration.

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

## MEASURED — ST Edge AI Developer Cloud (real board)

Core **4.0.1-20581**, platform STM32 MCU (tool 12.0.1), optimization
**balanced**, allocate inputs/outputs true. Board **STM32H7B3I-DK**
(Cortex-M7 @ 280 MHz, 1184 KB internal RAM, 2048 KB internal flash).

| Model | test acc | latency (ms) | MACC | flash (B) | RAM (B) |
|---|--:|--:|--:|--:|--:|
| REF_cnn_multi_float32 (their reference CNN) | 91.69% | **33.52** | 1,965,360 | 1,769,882 (1.69 MiB; weights 1.68 MiB + ~5 KiB lib) | 39,168 (38.25 KiB activations) |
| cls_best_float32 (ours, 84 k params) | **92.08%** | **3.628** | 158,094 | 343,254 (335 KiB; weights 326.15 KiB + ~9 KiB lib) | 9,456 (8.42 KiB activations + 832 B lib) |

### Headline (same board, same Core version, same settings)

| | Reference | Ours | Advantage |
|---|--:|--:|---|
| accuracy | 91.69% | **92.08%** | **higher** |
| latency | 33.52 ms | **3.628 ms** | **9.2× faster** |
| flash | 1,769,882 B | 343,254 B | **5.2× smaller** |
| RAM | 39,168 B | 9,456 B | **4.1× less** |
| MACC | 1,965,360 | 158,094 | **12.4× fewer** |

Higher accuracy at 9× the speed and 5× less flash — measured on real hardware,
not estimated.

### Our offline estimates are validated by these measurements

`unas/compute_footprint.py` predicted the reference CNN at flash 1728.6 KB,
peak RAM 38.4 KB, MACs 1,936,192 — versus ST's measured 1729.4 KB, 38.25 KiB,
1,965,360. Errors: **0.05% (flash), ~0.4% (RAM), 1.5% (MACC)**. The estimation
method is therefore sound, which also lends confidence to the estimates for
models not yet benchmarked.

### Where the reference CNN spends its budget (per-layer, from the DC charts)

- **Flash** is dominated by a single layer: `gemm_14` ≈ 1.64 MB of the 1.73 MB
  total — the `Flatten(6400) → Dense(64)` head (64×6400 = 409.6 k of its 441 k
  parameters). It flattens the whole 50×128 feature map instead of pooling it.
- **Latency**, by contrast, is dominated by the `eltwise` (BatchNorm mul/add
  over 50×128 tensors) and the convs; `gemm_14` costs almost no time despite
  being ~95% of the flash. Flash-bound and time-bound layers are decoupled —
  worth a sentence in the deployment discussion.
- **Ours (cls_best) is also dense-dominated in flash** (`gemm_24` ≈ 280 KB of
  343 KB, ~82%) — so the honest statement is *not* "we avoid a large FC" but:
  the searched model **pools before the head** (`pool_18`), which shrinks the
  FC input and makes its dense layer **~5.9× smaller** than the reference's
  (280 KB vs 1.64 MB). Its runtime is spread across the convs/pools rather than
  concentrated in one op.

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
