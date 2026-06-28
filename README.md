# VetInSilico Hub

**Open-source in silico toolkit for veterinary pathogen research** — 6 browser-based tools, hybrid computation (deterministic algorithms + FOSS ML via HuggingFace), zero backend.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/Live-shray77.github.io%2Fvet--insilico-teal.svg)](https://shray77.github.io/vet-insilico/)
[![ML](https://img.shields.io/badge/ML-HuggingFace%20Inference-purple.svg)](https://huggingface.co)

## Tools

| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 🧬 1 | **Drug Repurposing** | 3-factor docking (shape/charge/hydrophobic) + Lipinski + RDKit.js descriptors | Qwen-Coder-3B LLM analysis per candidate |
| 💊 2 | **ADMET Predictor** | 12-parameter rule-based (Lipinski, Veber, Egan, Dsouza) | — |
| 💉 3 | **Vaccine Epitopes** | Hopp-Woods + Chou-Fasman + Karplus-Schulz + Emini (B-cell); PSSM for HLA-A*02:01 (T-cell) | ESM-2 (8M params) naturalness per residue |
| 🔬 4 | **PCR Primer Designer** | SantaLucia 1998 NN Tm + DP hairpin + self/cross-dimer ΔG + GC-clamp | Qwen-Coder-3B LLM analysis per pair |
| 🔗 5 | **Sequence Alignment** | Needleman-Wunsch (global) + Smith-Waterman (local), BLOSUM62 | — |
| 🌳 6 | **Phylogenetic Tree** | UPGMA + Neighbor-Joining on distance matrix | — |

## Stack

- **Frontend**: Next.js 16 (static export) + React 19 + Tailwind CSS 4 + TypeScript
- **Package manager**: Bun
- **3D viewer**: 3Dmol.js (CDN)
- **ML**: HuggingFace Inference API (Qwen2.5-Coder-3B-Instruct via nscale, ESM-2 via hf-inference)
- **Hosting**: GitHub Pages (static, no backend)

## Pathogens (priority for Russia)

6 veterinary pathogens with target proteins (PDB IDs):
- ASFV (Африканская чума свиней) — p72, DNA polymerase
- FMDV (Ящур) — VP1, 3C protease
- Brucella (Бруцеллёз) — Omp25, Bp26
- HPAI (Грипп птиц) — HA, NA
- Newcastle disease — HN, F
- Rabies (Бешенство) — G protein, N protein

## Drug Database

204 drugs from Russian veterinary registry + FDA-approved + DrugBank Open:
- Antibiotics: beta-lactams, fluoroquinolones, tetracyclines, aminoglycosides, macrolides, sulfonamides, lincosamides, amphenicols, polypeptides
- Antiparasitics: macrocyclic lactones, benzimidazoles, salicylanilides, imidazothiazoles, praziquantel, isoquinolines, ectoparasiticides, coccidiostats
- Antivirals: nucleoside analogues, protease inhibitors, neuraminidase inhibitors, interferons
- Antiinflammatory: NSAIDs (oxicams, coxibs, propionic acids), corticosteroids
- Antifungals: azoles, allylamines, polyenes
- Supportive: cardiovascular, anesthetics, supplements, etc.

## ML setup (optional)

ML features (LLM analysis, ESM-2 naturalness) require a free HuggingFace token:

1. **Get token**: https://huggingface.co/settings/tokens → New token → "Read" scope
2. **Set in app**: click 🤖 in the header → paste token → "Проверить"
3. **Cost**: ~$0.01 per LLM analysis (Qwen-Coder-3B at $0.01/$0.03 per 1K tokens). HF gives ~$0.50 free credits = ~50 analyses. ESM-2 is free.
4. **Privacy**: token stored only in browser `localStorage`. Sent only to `https://router.huggingface.co`.

See [`.env.example`](.env.example) for build-time config.

## Develop

```bash
bun install
bun run dev   # http://localhost:3000
bun run build # → out/ (static export)
```

## Deploy

Auto-deploy via `.github/workflows/deploy.yml` on push to `main`.
Live: https://shray77.github.io/vet-insilico/

## Roadmap (Path B — research-grade)

The current algorithms are educational, not state-of-the-art. To make them research-grade:
- **Docking** → AutoDock Vina WASM or RDKit.js real shape complementarity via voxel overlap
- **ADMET** → ADMETlab 3.0 API or custom GNN trained on Tox21
- **Epitopes** → BepiPred-3.0 (Transformer), MHCflurry (ANN)
- **Primer** → mispriming check via BLAST-like search against host genomes

PRs welcome.

## ⚠️ Disclaimer

Упрощённые модели для генерации гипотез и обучения концепциям. Не являются ветеринарной рекомендацией. Все результаты требуют экспериментальной валидации (in vitro / in vivo).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
