# Paper listening demo

This directory contains the dependency-free static listening demo for:

> Sparse in Time, Rich in Guidance: Higher-Order Temporal Modeling for Balanced Training-Free Music Editing

## Build or refresh the selected samples

From the repository root, run:

```bash
python scripts/build_paper_demo.py
```

The script uses the fixed per-transition sample indices declared in
`scripts/build_paper_demo.py`, copies the 48 source/edited WAV files into
`demo/assets/audio/`, and writes `demo/data/samples.json`.

Validate the current package without changing it:

```bash
python scripts/build_paper_demo.py --check
```

## Preview locally

From the repository root, run:

```bash
python -m http.server 8000 --directory demo
```

Then open <http://localhost:8000/>. A local HTTP server is required because the
page loads its sample manifest with `fetch()`.
