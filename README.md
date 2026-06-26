# VetInSilico Hub

In silico tools for veterinary pathogens — zero-cost, browser-only, GitHub Pages.

## Tools

| Tool | What it does |
|------|--------------|
| 🧬 **Drug Repurposing** | Docking-based screening of 200+ drugs against 6 veterinary pathogens. Score = shape (35%) + electrostatic (30%) + hydrophobic (35%). 3D viewer via 3Dmol.js. |
| 💊 **ADMET Predictor** | 12 ADMET parameters from molecular descriptors (Lipinski, Veber, Egan, Dsouza, etc.) + alerts + drug-likeness score. |
| 💉 **Vaccine Epitopes** | B-cell (linear, 4 algorithms) + T-cell (MHC-I, HLA-A*02:01) epitope prediction from protein sequences. |
| 🔬 **PCR Primer Designer** | Pair design with Tm (SantaLucia NN), GC%, hairpin ΔG, GC-clamp, amplicon size. |

## Stack

- Next.js 16 (static export) + React 19 + Tailwind CSS 4 + TypeScript
- Bun as package manager
- 3Dmol.js (CDN) for 3D protein visualization
- All computation in browser — no backend, no API
- Hosted on GitHub Pages

## Pathogens (priority for Russia)

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

## Develop

```bash
bun install
bun run dev   # http://localhost:3000
bun run build # → out/ (static export)
```

## Deploy

Auto-deploy via `.github/workflows/deploy.yml` on push to `main`.
Site: https://shray77.github.io/vet-insilico/

## ⚠️ Disclaimer

Упрощённые модели для генерации гипотез. Не являются ветеринарной рекомендацией.
Все результаты требуют экспериментальной валидации (in vitro / in vivo).
