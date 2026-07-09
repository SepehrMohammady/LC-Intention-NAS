# Deployment — footprint and the ST Edge AI handoff

Date 2026-07-09. Deployment models are int16x8 TFLite (`results/tflite/`,
accuracy preserved — see nas-results.md). Flash is the actual `.tflite` size;
MACs and peak RAM are computed from the architecture
(`unas/compute_footprint.py`) as provisional numbers. ST Edge AI confirms flash
and peak SRAM exactly and adds measured latency (see handoff below).

## Footprint of the candidate models

Board budgets: **STM32H7B3I-DK** 1.4 MB SRAM / 2 MB flash;
**STM32F401** (low-end stretch) 96 KB SRAM / 512 KB flash.

| Model | Task | Quality | MACs | peak RAM* | flash (tflite) | fits F401? |
|---|---|---|--:|--:|--:|:--:|
| aaaaan | LCR | MAE 0.286 | 852 k | 11.3 KB | 160.7 KB | yes |
| aaaaav | LCR (compact) | MAE 0.288 | 135 k | 4.5 KB | 108.8 KB | yes |
| aaaaas | LCL | MAE 0.321 | 426 k | 6.6 KB | 123.0 KB | yes |
| aaaabl | classification | 92.15% | 152 k | 4.5 KB | 117.9 KB | yes |
| aaaaat | classification (tiny) | 91.16% | 30 k | 4.4 KB | 19.0 KB | yes |
| aaaaah | cls no-indicator | 91.08% | 36 k | 4.2 KB | 44.6 KB | yes |
| aaaaaw | cls no-indicator (tiny) | 90.15% | 24 k | 4.2 KB | 36.3 KB | yes |

*peak RAM = max over layers of (in+out) activation bytes at int16
(one-operator-at-a-time working set); ST Edge AI reports the exact figure.

**Headline:** every model fits even the STM32F401, where the published baseline's
Transformer did not fit in RAM at all, and does so with SOTA-beating accuracy
(LCR MAE 0.286 vs 0.298) or 92% classification at 19 KB flash / <5 KB RAM. On
the H7B3I-DK the margin is enormous (peak RAM ≤ 11 KB of 1.4 MB).

## ST Edge AI handoff (needs a myST account — user action)

Everything up to the ST boundary is done: the int16x8 `.tflite` files are ready.
To get the official flash / peak-SRAM / MACC report and **measured latency**:

Installed here: X-CUBE-AI 10.2.0 pack (CubeMX), but the `stedgeai` CLI binaries
are not extracted locally. Two ways to finish:

1. **ST Edge AI Developer Cloud** (recommended, free, real boards):
   stedgeai-dc.st.com → sign in with a myST account → upload a
   `results/tflite/*.tflite` → benchmark on an STM32H7 (and an F4/F401 if
   listed) → it returns inference time (ms), flash, and RAM. Gives the measured
   latency the paper needs.
2. **stedgeai CLI offline** (flash/RAM/MACC, no latency): install ST Edge AI
   Core (or point at the X-CUBE-AI Utilities if present), then per task, e.g.:
   ```
   stedgeai analyze -m results/tflite/classification_model_aaaabl_int16x8.tflite \
     --target stm32h7 --type tflite
   ```
   Report lands in `st_ai_output/` with MACC, weights (flash) and activations
   (RAM) bytes.

TODO(user): run one of the above and paste the numbers back; I will fill the
deployment table in paper/main.tex and course lesson 10 with the measured
latency and confirmed flash/RAM. Until then the table above is our estimate.
