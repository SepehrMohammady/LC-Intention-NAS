# Discovered architectures (what the NAS actually found)

Decoded from the ST Edge AI model graphs in `results/deploy/*.svg`. TFLite
expresses Conv1D as Conv2D with a dummy dimension, so the `ExpandDims`/`Reshape`
pairs are plumbing, not layers; below they are collapsed into 1D terms.

## Reference CNN (`cnn_multi`, 441 k params, 91.69%)

```
Input 50×31
  → Conv1D(64, k=3) + ReLU + BatchNorm      → 50×64
  → Conv1D(128, k=3) + ReLU + BatchNorm     → 50×128
  → Flatten                                 → 6400
  → Dense(64) + ReLU
  → Dense(3) → Softmax
```

Temporal resolution is held at the full 50 steps all the way to the flatten.

## Ours (`cls_best`, 84 k params, 92.08%)

```
Input 50×31
  → MaxPool1D                               → 25×31
  → DWConv1D (stride 2)                     → 13×31
  → Conv1D 1×1 (31→77) + ReLU               → 13×77
  → DWConv1D + ReLU
  → DWConv1D (stride 2) + ReLU              → 7×77
  → Conv1D 1×1 + ReLU
  → Add                ← residual connection
  → AvgPool1D                               → 4×77
  → Flatten                                 → 308
  → FC(223) + ReLU → FC(23) + ReLU → FC(3)
```

The search independently arrived at three MCU-friendly choices:
1. **depthwise-separable convolutions** (DWConv1D followed by 1×1 Conv1D) — the
   canonical efficient-CNN pattern, not hand-specified;
2. a **residual connection** (`Add`);
3. **aggressive early downsampling** — 50 → 25 → 13 → 7 → 4.

## Why ours is 5.2× smaller and 9.2× faster (quantified)

Both models spend most of their flash in the fully-connected head. The
difference is what enters that head:

| | Reference | Ours | ratio |
|---|--:|--:|--:|
| feature map into the head | 50×128 = **6400** | 4×77 = **308** | 20.8× |
| first FC shape | 64×6400 = 409,600 | 223×308 = 68,684 | 6.0× |
| that layer's flash | ~1.64 MB (~95% of model) | ~280 KB (~82% of model) | 5.9× |

So the honest framing is **not** "we avoid a large FC" — ours is dense-dominated
too. It is that pooling *before* the head shrinks the FC input 20.8×, which buys
a **wider** head (223 units vs 64) at ~6× less flash. Downsampling also cuts the
conv work, giving the 12.4× MACC reduction and the 9.2× measured speed-up.

Runtime profile differs as well: the reference's time is concentrated in the
`eltwise` BatchNorm ops over its 50×128 tensors, while ours is spread across
convs/pools — its big FC costs almost no time. Flash-bound and time-bound layers
are decoupled in both models.
