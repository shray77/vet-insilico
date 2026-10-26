# VetInSilico Hub

**Open-source in silico toolkit for veterinary pathogen research** — 23 browser-based tools, hybrid computation (deterministic algorithms + FOSS ML via HuggingFace + RDKit.js WASM), zero backend.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/Live-shray77.github.io%2Fvet--insilico-teal.svg)](https://shray77.github.io/vet-insilico/)
[![Tests](https://img.shields.io/badge/Tests-170%20pass-green.svg)](#)
[![Tools](https://img.shields.io/badge/Tools-23-purple.svg)](#)

## Tools (23)

### 💊 Фармакология (5)
| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 🧬 1 | **Drug Repurposing** | 3-factor docking + Lipinski + RDKit.js descriptors | Qwen-Coder-3B LLM + RDKit WASM |
| 💊 2 | **ADMET Predictor** | 12-parameter rule-based (Lipinski, Veber, Egan, Dsouza) | Qwen LLM on SMILES |
| 📊 3 | **PK/PD Simulator** | 1-compartment PK + Emax PD (AUC24/MIC, Cmax/MIC, T>MIC) | — |
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

### 🧬 ML и пайплайны (6)
| # | Tool | Algorithm | ML layer |
|---|------|-----------|----------|
| 🧬 18 | **Vaccine Designer** | Multi-epitope конструкт: B+T эпитопы → GPGPG-линкеры → His-tag → кодон-оптимизация → GenBank | опц. |
| 🔍 19 | **Sequence ID** | NCBI BLAST идентификация_unknown последовательностей + авто-рекомендация инструмента | — |
| 🦠 20 | **Outbreak Surveillance** | UPGMA + Kimura 2P дерево + молекулярные часы TMRCA + AMR-скан в одном пайплайне | — |
| ☠️ 21 | **ML Toxicity** | ChemBERTa классификаторы: Ames, hERG, DILI, ClinTox, сенсибилизация | ✅ |
| 🧬 22 | **Variant Effect** | ESM-2 650M Δ-log-likelihood аминокислотных замен (антигенный дрейф, вакцинный эскейп) | ✅ |
| 🔬 23 | **Structure Prediction** | ESMFold (Meta AI) 3D-структура из последовательности, pLDDT + 3Dmol.js | ✅ |

## Stack

- **Frontend**: Next.js 16 (static export) + React 19 + Tailwind CSS 4 + TypeScript
- **Design**: [vet-ds](https://github.com/shray77/vet-ds) v2.3.1 «Научная периодика» — голос A (бумага/вечерний номер) + бирюзовый характер поверх ядра; утилиты Tailwind перегружены на токены DS через `@theme inline` (`src/app/globals.css`), ядро — копия `src/app/vet-ds.css` + самохост Prata (`src/app/fonts/`), контраст-гейт `contrast_v2.py` AA
- **Package manager**: Bun
- **3D viewer**: 3Dmol.js (CDN)
- **Molecular toolkit**: RDKit.js WASM (CDN, 4MB)
- **ML**: HuggingFace Inference API (Qwen2.5-Coder-3B-Instruct via nscale, ESM-2 35M via hf-inference)
- **Hosting**: GitHub Pages (static) + **полу-динамика через [vet-api](https://github.com/shray77/vet-api)** (Cloudflare Worker)
- **Tests**: Vitest, 176 tests, 17 test files
- **Boltz-2**: ночной GitHub Actions-ран (CPU) — предсказания аффинности (IC50/ΔG) для пилотных пар «препарат × мишень», статический JSON без внешних зависимостей

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

## Boltz-2 аффинности (ночной CI-ран)

[Drug Repurposing](https://shray77.github.io/vet-insilico/drug-repurposing/) показывает рядом с учебным скорингом
**настоящие предсказания аффинности** моделью [Boltz-2](https://github.com/jwohlwend/boltz)
(MIT, Wohlwend et al. 2025) для пилотного набора пар:

- валидация: римантадин/амантадин × M2 (2RLF), осельтамивир/занамивир × нейраминидаза N1 (2HTY) — сверяются с экспериментом;
- гипотезы репурпозинга: ремдесивир/фавипиравир × ASFV PolX (1JQR), доксициклин × LipL32 (2ZZ8).

Конвейер: `scripts/boltz_pilot/run_pilot.py` — RCSB FASTA → YAML (белковые цепи + лиганд SMILES,
`properties.affinity.binder`) → `boltz predict` (CPU, без MSA) → парсинг `affinity_*.json` →
`public/data/boltz-affinities.json` (коммитится ботом, воркфлоу `boltz-affinity.yml`, 05:30 МСК).
Единицы: предсказание = log10(IC50 мкМ); ΔG = (6 − y) × 1.364 ккал/моль.
Веса (~3.3 ГБ) кэшируются Actions-кэшем; упавшая пара (OOM/таймаут) пишется в JSON со
status=error и не роняет ран.

PDB-мишени в `src/data/pathogens.ts` выверены по RCSB (Task 151): 14 битых ID заменены
(2LKF был лейкоцидином, 6QYL — MBP-фьюжном…), 6 мишеней без публичных структур — честно без ID.

## ChEMBL-срез (ADMET / PK-PD)

ADMET и PK/PD сверяют наши эвристические дескрипторы с реальной базой
[ChEMBL](https://www.ebi.ac.uk/chembl/) (веб-API EBI): молекулярные свойства (RDKit
по каноническим структурам), фазы одобрения (`max_phase` 4 = approved), год первого
одобрения, флаг отзыва и курированные механизмы действия (с переводом типов на русский).

- данные: `public/data/chembl-reference.json` — статический срез (актуальный релиз
  ChEMBL, версия пишется в файл; 188/202 препарата резолвятся), ноль запросов в рантайме;
- обновление: воркфлоу `chembl-weekly.yml` (пн 07:10 МСК) — `scripts/chembl/fetch_chembl.mjs`
  дергает molecule/mechanism/target API с politeness-задержкой, санити-чек, коммит-бот;
- UI: ADMET — блок «ChEMBL <id>» с таблицей сверки (MW/LogP/HBD/HBA/RotB: наши vs ChEMBL,
  колонка Δ с подсветкой больших расхождений) и чипами механизмов; PK/PD — компактный
  статус у выбора профиля (6 препаратов, маппинг имя→INN);
- расхождения ожидаемы: наш LogP — cLogP из открытых источников, ChEMBL считает ALogP;
  MW у солей может отличаться (full_mwt = вся соль).

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
## Дисклеймер

VetInSilico Hub — исследовательские in-silico инструменты, предоставляются «как есть», без гарантий. Результаты расчётов не являются диагнозом, назначением или лабораторным протоколом, не проверены экспериментально и не для официальных решений. Решения о здоровье животных принимайте только с ветеринарным врачом — даже если вы сами ветеринарный врач.

Полные условия: https://shray77.github.io/vet-insilico/terms/ · экосистема: https://shray77.github.io/terms.html
