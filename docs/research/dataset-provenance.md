# Dataset provenance — "DIMIR" is a local name

Researched 2026-07-07.

## Identity

No public dataset named "DIMIR" exists. Our data is, with high confidence, the
ELIOS lab **"Lane Change Intention Recognition Dataset"**:

- Zenodo DOI **10.5281/zenodo.16686054**, v1.0.0, published 2025-08-01,
  **MIT license**, 486.7 MB (50 CSV + 50 H5, one per driver).
- The published acronym in the precursor paper is **DMIR** (Driver Maneuver
  Intention Recognition): Forneris et al., "Setting Up a Lightweight
  Simulation Environment for Automated Driving Dataset Collection,"
  ApplePies 2024, Springer LNEE, DOI 10.1007/978-3-031-84100-2_19.
- Project page: https://elios-lab.github.io/LC-Intention-Framework/

## Collection

Human drivers (50 user files, >3,400 annotated lane changes) drove in the
**CARLA 0.9.15 simulator** (synchronous mode, fixed_delta_seconds=0.051,
Logitech G29 wheel + pedals, wide screen) on a custom 60 km two-lane highway
loop with variable curvature; features logged at 10 Hz; 5 s windows → 50
timesteps.

## The 31 columns (from the repo's labeling script)

- 10 ego: fileTime, latAcceleration, longAcceleration, brakePedalPos,
  leftDirectionIndicator, rightDirectionIndicator, steeringAngle,
  throttlePedalPos, vehicleSpeed, yawRate
- 9 lane geometry: egoLaneWidth, yawAngleRight/LeftLine,
  curvatureRight/LeftLine, curvatureDxRight/LeftLine, right/leftLaneLine
- 12 surrounding traffic: {car1, car2} × {LatPosition, LatVelocity,
  LongPosition, LongVelocity, YawAngle, YawRate}

The official README counts **30 features** (excludes fileTime); our windows
have **31** channels — the 31st is most likely fileTime. **If fileTime is in
the input features, it must be dropped** (no physical meaning, possible split
leakage). Our test-split spikes on feature pairs (12,13)/(14,15) plausibly
correspond to `curvatureDx*` (a numerical derivative → division-by-near-zero
spikes) — pending column-order confirmation.

## Labeling

Lane change detected when the right lane-line lateral position shifts by more
than half the ego-lane width; the 4 s (40 timesteps) before the LC are labeled
with time-to-LC (0.0–4.0 s, 0.1 steps); 4.1 = free ride; 1.5 s after each LC
excluded.

## Official split (driver-wise)

validation users {5,8,10,12,16,19,27}; test users {2,7,13,18,25,31,36};
train = remaining 36 users.

## Open questions (for colleague)

- [ ] ⛔ Exact column order of the prepared pickles + whether fileTime is
      channel 31 (and which indices are curvatureDx*).
- [ ] ⛔ Do the pickles follow the official driver-wise split?
- [ ] How the balanced 3-class sets and per-direction regression sets were
      derived (which notebook / undersampling), and the class-index mapping
      {0,1,2} ↔ {free-ride, LCR, LCL} (colleague said 0=none, 1=LCR, 2=LCL).
- [ ] What normalization was applied (StandardScaler on train only?).
