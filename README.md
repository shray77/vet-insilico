# VetInSilico Hub

**Open-source in silico toolkit for veterinary pathogen research** — 17 browser-based tools, hybrid computation (deterministic algorithms + FOSS ML via HuggingFace + RDKit.js WASM), zero backend.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/Live-shray77.github.io%2Fvet--insilico-teal.svg)](https://shray77.github.io/vet-insilico/)
[![Tests](https://img.shields.io/badge/Tests-148%20pass-green.svg)](#)
[![Tools](https://img.shields.io/badge/Tools-17-purple.svg)](#)

## Tools (17)

### 💊 Фармакология (5)
| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 🧬 1 | **Drug Repurposing** | 3-factor docking + Lipinski + RDKit.js descriptors | Qwen-Coder-3B LLM + RDKit WASM |
| 💊 2 | **ADMET Predictor** | 12-parameter rule-based (Lipinski, Veber, Egan, Dsouza) | Qwen LLM on SMILES |
| 📊 3 | **PK/PD Simulator** | 1-compartment PK + Emax PD (AUC/MIC, Cmax/MIC, T>MIC) | — |
| 🧪 4 | **Dose Calculator** | 36 dose schemes, 6 species, weight/age adjustment | — |
| 🔬 5 | **Protein Structure Viewer** | 3Dmol.js, 5 styles, PDB search | — |

### 💉 Вакцины и диагностика (5)
| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 💉 6 | **Vaccine Epitopes** | Hopp-Woods + Chou-Fasman + Karplus-Schulz + Emini (B); BIMAS PSSM (T) | ESM-2 35M (BepiPred-3 + NetMHCpan) |
| 🧬 7 | **PCR Primer Designer** | SantaLucia 1998 NN + DP hairpin + self/cross-dimer | Qwen LLM + mispriming check |
| ✂️ 8 | **CRISPR gRNA Designer** | NGG PAM, Doench 2016 on-target, off-target seed match | — |
| 🔤 9 | **Codon Optimization** | Kazusa tables, CAI, restriction site avoidance | — |
| 🩺 10 | **AI Veterinarian** | Differential diagnosis from symptoms | Qwen LLM |

### 🧬 Геномика (5)
| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 🔗 11 | **Sequence Alignment** | Needleman-Wunsch + Smith-Waterman, BLOSUM62 | — |
| 🌳 12 | **Phylogenetic Tree** | UPGMA + Neighbor-Joining, Kimura 2-parameter | — |
| ✂️ 13 | **Restriction Map** | 30+ enzymes, IUPAC codes, virtual gel | — |
| 🧫 14 | **Plasmid Map Designer** | ORF detection (both strands), circular SVG map | — |
| ⏱️ 15 | **Molecular Clock** | T = d / (2r), 12 published clock rates | — |

### 📊 Диагностика (1)
| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 📊 16 | **ELISA Cut-off Calculator** | Mean + 2SD/3SD, ROC curve, AUC | — |
| 🦠 17 | **AMR Predictor** | CARD/ResFinder context-based mutation detection | — |

## Stack

- **Frontend**: Next.js 16 (static export) + React 19 + Tailwind CSS 4 + TypeScript
- **Package manager**: Bun
- **3D viewer**: 3Dmol.js (CDN)
- **Molecular toolkit**: RDKit.js WASM (CDN, 4MB)
- **ML**: HuggingFace Inference API (Qwen2.5-Coder-3B-Instruct via nscale, ESM-2 35M via hf-inference)
- **Hosting**: GitHub Pages (static) + **полу-динамика через [vet-api](https://github.com/shray77/vet-api)** (Cloudflare Worker)
- **Tests**: Vitest, 158 tests, 16 test files

## Полу-динамика (static + vet-api)

Сайт остаётся статикой (GitHub Pages), но три слоя данных подтягиваются из CF Worker `vet-api`,
всё с graceful fallback (РФ-блокировка workers.dev / оффлайн не ломают страницы):

| Слой | Что даёт | Fallback |
|---|---|---|
| 🦠 **Live-сводка вспышек** | главная страница + `/v1/insilico/outbreaks` — зеркало heatmap-датасета (FAO/WOAH/ФСВПС, ~2.6k записей, мост обновляет каждые 6 ч) | панель просто не рендерится |
| 🔗 **Share-ссылки сценариев** | «Поделиться сценарием» в PK/PD: payload в KV (TTL 90 дней, id в `#s=`) | автономная ссылка `#j=` — сценарий зашит в URL (base64url) |
| ☁️ **Облачный AI без токена** | LLM (Qwen2.5-Coder-3B) и ESM-2 через прокси воркера — юзеру не нужен HF-токен | свой HF-токен → детерминированные алгоритмы |

Маршрутизация AI настраивается в «⚙️ Настройки вычислений» (шапка): **Авто** (облако → токен) / **Только облако** / **Свой токен**.

## Data

- **17 pathogens** (ASFV, FMDV, Brucella, HPAI, Newcastle, Rabies, Salmonella, BVDV, Leptospira, PEDV, E. coli, Anaplasma, Clostridium, Campylobacter, Mycoplasma, H5N1, Corynebacterium)
- **202 drugs** with molecular properties
- **196 drugs with SMILES** (from PubChem)
- **28 restriction enzymes**
- **12 molecular clock rates** (published)
- **36 antibiotic dose schemes** (Plumb's + РФ реестр)

## ML setup (optional)

ML features (LLM analysis, ESM-2 naturalness, RDKit descriptors) require a free HuggingFace token:

1. **Get token**: https://huggingface.co/settings/tokens → New token → "Read" scope
2. **Set in app**: click 🤖 in the header → paste token → "Проверить"
3. **Cost**: ~$0.01 per LLM analysis. HF gives ~$0.50 free credits = ~50 analyses. ESM-2 is free.
4. **Privacy**: token stored only in browser `localStorage`.

## Develop

```bash
bun install
bun run dev          # http://localhost:3000
bun run build        # → out/ (static export)
bun run test         # 158 tests
bun run test:coverage # with coverage report
```

## Deploy

Auto-deploy via `.github/workflows/deploy.yml` on push to `main`.
Live: https://shray77.github.io/vet-insilico/

## License

Apache License 2.0 — see [LICENSE](LICENSE).

## ⚠️ Disclaimer

Упрощённые модели для генерации гипотез и обучения концепциям. Не являются ветеринарной рекомендацией. Все результаты требуют экспериментальной валидации (in vitro / in vivo).
