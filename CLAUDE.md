# Project conventions — LC-Intention-NAS (internal name: DIMIR)

PhD project (ELIOS Lab, UniGe): constrained NAS on the Lane Change Intention
Recognition time-series dataset, target Q1 paper + STM32 deployment on
**STM32H7B3I-DK**. Targets to beat: published SPL 2026 Transformer RMSE
0.5102 s (single TTLC); internal reference 92% acc (3-class), 0.42 s RMSE
(LCR), 0.44 s RMSE (LCL). Remote:
https://github.com/SepehrMohammady/LC-Intention-NAS (git identity:
Sepehr Mohammady <SMohammady@outlook.com>, repo-local config).

## Hard rules

- **Never fabricate data or results.** No mock/demo/synthetic data anywhere.
  Missing information → ask the user or add a TO-DO in `paper/NOTES.md`.
- **Test after every change**: `\.venv\Scripts\python scripts/check_pipeline.py`
  must pass (3-task smoke test on real data) before considering work done.
- **Log everything**: every training run creates a record in
  `logs/experiments.jsonl` via `src.log_utils.ExperimentLogger`; notable
  decisions get a dated entry in `LOGBOOK.md` via `append_logbook`.
- **Keep the paper current**: when results or methods change, update
  `paper/main.tex` and `paper/NOTES.md` in the same session.
- **Rebuild the PDF after every .tex change**:
  `powershell -ExecutionPolicy Bypass -File scripts/build_paper.ps1`
  (MiKTeX pdflatex, two passes; output paper/main.pdf, which is committed).
- **Keep the course current**: `course/` is a static RTL Farsi website
  (HTML pages with SVG diagrams + quizzes; lesson pages follow the structure
  of `course/00-roadmap.html`; shared assets in `course/assets/`). New
  milestones get new lesson pages; update `course/index.html` syllabus.
  Charts follow the dataviz reference palette already encoded in course.css.

## Notebook style (notebooks/dimir_pipeline.ipynb)

- Every code cell is preceded by a markdown cell: title + short description.
- Code cells stay short; anything long lives in `src/` and is called from the
  cell. All user knobs live in the single Config cell (§2) — no hidden
  constants scattered in cells.
- Headless verification: `jupyter nbconvert --to notebook --execute --inplace`.

## Environment quirks (this machine)

- Python 3.13 = Microsoft Store Python; venv at `.venv` with
  `include-system-site-packages = true`.
- **Windows Smart App Control is ON**: some compiled wheels are blocked when
  installed inside the venv (numpy.random, pandas, scikit-learn). Those are
  installed in the *system* Python instead; torch (cu128) lives in the venv
  and works. If a new package fails with "Application Control policy has
  blocked this file", install it into the system Python.
- GPU: RTX 5070 Laptop (Blackwell) → torch cu128 wheels only.

## Paper writing

- Venue: IEEE SPL (candidate), IEEEtran journal class, draft in `paper/main.tex`.
- Every number must trace to `logs/experiments.jsonl` or a citation.
- Check prose against `paper/STYLE.md` (AI-tell word blocklist) before commit.

## Data (see docs/DATA.md)

- `data/` (gitignored) from `Materials/*.zip`; pickles, 50×31 windows.
- Known quirks: test-only spikes on feature pairs (12,13)/(14,15) — handled by
  `clip_to_train_range`; feature 7 constant zero in classification train.
