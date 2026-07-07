# STM32 deployment toolchain (2025–2026)

Researched 2026-07-07.

## Tooling

- **ST Edge AI Core v2.2.0** — free desktop CLI (`stedgeai`), compiles models
  to optimized C for STM32. Embedded in **X-CUBE-AI 10.2.0** (CubeMX pack;
  ships ONNX Runtime 1.18.1, TF 2.18.0). **STM32Cube AI Studio v1.0**
  (March 2026) is the new standalone GUI replacing X-CUBE-AI.
- Inputs: Keras, TFLite, **ONNX (float or int8 QDQ)**. PyTorch only via ONNX.
- `stedgeai` does **not** quantize (old `--quantize` flag removed) — the model
  must arrive already quantized.

## Our pipeline (PyTorch → STM32)

1. `torch.onnx.export` — batch=1, static shapes, opset 13–18.
2. Int8 PTQ with ONNX Runtime:
   `python -m onnxruntime.quantization.preprocess` then `quantize_static`
   (QuantFormat.QDQ, S8S8, `per_channel=True`, ~100–500 calibration windows
   from the train split). ST reference notebook:
   `stm32ai-modelzoo-services/tutorials/notebooks/stm32ai_quantize_onnx_benchmark.ipynb`.
3. `stedgeai analyze -m model_int8.onnx --target stm32h7` → MACC, flash bytes
   (weights ro), RAM bytes (activations rw), per-layer table. **Fully offline,
   no hardware needed** → this feeds the NAS constraint evaluator.
4. `stedgeai validate` (host mode) → numerical fidelity (COS/L2) vs original.
5. Real latency: **ST Edge AI Developer Cloud** (stedgeai-dc.st.com, free myST
   account) benchmarks on a remote board farm (H7/F7/L4/U5/N6…) returning
   inference ms + flash + RAM — no hardware purchase needed; has a Python/REST
   API. Alternatively on-target `stedgeai validate --mode target -d serial:COMx`.
6. Deploy: CubeMX + X-CUBE-AI or `stedgeai generate` + ai_runner.

## Target boards

**Confirmed primary target (user, 2026-07-07): STM32H7B3I-DK** — Discovery kit
with STM32H7B3LIH6Q: Cortex-M7 @ 280 MHz, 1.4 MB SRAM, 2 MB internal flash
(+ external OSPI flash, 4.3" LCD on board). Same MCU family as the baseline
paper's high-end target → direct comparability of Table III numbers.

| Board | Core | Clock | RAM | Flash | Note |
|---|---|---|---|---|---|
| **STM32H7B3I-DK** | M7 | 280 MHz | 1.4 MB | 2 MB | our target; matches baseline paper's high-end |
| STM32F401 | M4 | 84 MHz | 96 KiB | 512 KiB | baseline paper's low-end (their Transformer didn't fit; their 1DCNN: 40.8 ms) — optional stretch target |

NAS constraint budgets derive from the H7B3I-DK: flash ≤ 2 MB minus runtime
(practically target ≤ a few hundred KB), RAM ≤ 1.4 MB minus buffers; a model
that also fits the F401 (≤ 96 KiB RAM, ≤ 512 KiB flash) makes a stronger
low-end story.

## Metrics to report (TinyML convention)

flash KB (weights + runtime), peak RAM KB, latency ms @ stated clock, MACs,
int8 accuracy delta vs FP32, optionally energy (needs power shield —
Developer Cloud does not report energy).

## Open questions

- [ ] Verify installed `stedgeai --version` after install on this machine.
- [ ] Confirm Developer Cloud farm has H7B3/F401 (or nearest equivalents).
- [ ] Decide: buy a NUCLEO board for the paper's measured numbers, or rely on
      Developer Cloud (ask supervisor — measured-on-our-desk is stronger).
