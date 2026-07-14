# Deployment — ST Edge AI benchmark plan and artifacts

Updated 2026-07-14.

## ⚠ Correction: int16x8 is NOT deployable on ST Edge AI

Our int16x8 quantization (which preserves accuracy — see nas-results.md) **cannot
be deployed** with ST Edge AI Core / X-CUBE-AI / Developer Cloud. Verified from
three independent sources:

- `supported_ops_tflite.html` (ST Edge AI Core 4.0), Common constraints:
  *"data type for the weights/activations tensors must be: float32, int8, uint8"*
  (bias int32 only).
- `quantization.html`: *"ST Edge AI Core supports 8-bit integer-based (int8 or
  uint8 data type) arithmetic"*; the article *"covers only the 8-bit
  integer-based quantized model"*. Float16 quantization: not supported.
- ST moderator (community.st.com, Sept 2025, X-CUBE-AI 10.2.0):
  *"We do not support 16x8... it is not currently supported by the tool chain.
  It is in the roadmap, but I would not expect to see it soon."*

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
