/**
 * Drug database for in silico screening.
 * 
 * Sources:
 *   - Russian veterinary drug registry (vetvoice-rag/assets/data/drugs_registry.json)
 *   - FDA-approved drugs with known antiviral/antibacterial activity
 *   - DrugBank open data (CC BY-NC 4.0)
 * 
 * Each drug has simplified molecular properties for docking:
 *   - Molecular weight (Da)
 *   - LogP (lipophilicity)
 *   - H-bond donors/acceptors
 *   - Rotatable bonds
 *   - Electrostatic charge
 *   - Hydrophobicity score (0-1)
 *   - Known targets (if any)
 *   - Pharmacological group
 */

export interface Drug {
  id: string;
  name: string;
  inn: string; // International Nonproprietary Name
  form: string;
  pharm_group: string;
  /** Molecular weight (Da) */
  mw: number;
  /** LogP (octanol-water partition) */
  logp: number;
  /** H-bond donors */
  hbd: number;
  /** H-bond acceptors */
  hba: number;
  /** Rotatable bonds */
  rotatable_bonds: number;
  /** Net charge at pH 7.4: -1, 0, +1 */
  charge: number;
  /** Hydrophobicity (0-1, normalized LogP) */
  hydrophobicity: number;
  /** Molecular "radius" (approx, Å) — derived from MW */
  radius: number;
  /** Known antiviral/antibacterial activity */
  activity: "antiviral" | "antibacterial" | "antiparasitic" | "antiinflammatory" | "unknown";
  /** Known mechanism of action (if any) */
  mechanism?: string;
  /** Is this drug registered in Russia? */
  ru_registered: boolean;
}

/**
 * Compute molecular radius from MW (approximate).
 * V = MW / (density * N_A), r = (3V/4π)^(1/3)
 * For drug-like molecules: r ≈ 0.066 * MW^(1/3) nm = 0.66 * MW^(1/3) Å
 */
function mwToRadius(mw: number): number {
  return Math.round(0.66 * Math.cbrt(mw) * 10) / 10;
}

/**
 * Normalize LogP to 0-1 hydrophobicity score.
 * LogP range for drug-like molecules: -1 (very hydrophilic) to 5 (very hydrophobic)
 */
function logpToHydrophobicity(logp: number): number {
  return Math.round(Math.max(0, Math.min(1, (logp + 1) / 6)) * 100) / 100;
}

/**
 * Curated drug database — 60 key drugs for veterinary screening.
 * Selected for structural diversity and known/putative antiviral/antibacterial activity.
 */
const DRUG_DATA: Omit<Drug, "radius" | "hydrophobicity">[] = [
  // ─── Антивирусные ─────────────────────────────────────────────────
  { id: "d1", name: "Рибавирин", inn: "рибавирин", form: "таблетки", pharm_group: "Противовирусное", mw: 244, logp: -1.8, hbd: 4, hba: 6, rotatable_bonds: 3, charge: 0, activity: "antiviral", mechanism: "Ингибитор IMP-дегидрогеназы, блокирует синтез ГТФ", ru_registered: true },
  { id: "d2", name: "Тамифлю (Озельтамивир)", inn: "озельтамивир", form: "капсулы", pharm_group: "Противовирусное", mw: 312, logp: 1.0, hbd: 2, hba: 5, rotatable_bonds: 6, charge: 0, activity: "antiviral", mechanism: "Ингибитор нейраминидазы", ru_registered: true },
  { id: "d3", name: "Ремдесивир", inn: "ремдесивир", form: "раствор для инфузий", pharm_group: "Противовирусное", mw: 602, logp: 1.9, hbd: 4, hba: 12, rotatable_bonds: 15, charge: 0, activity: "antiviral", mechanism: "Аналог нуклеотида, ингибирует РНК-зависимую РНК-полимеразу", ru_registered: true },
  { id: "d4", name: "Фавипиравир (Авифавир)", inn: "фавипиравир", form: "таблетки", pharm_group: "Противовирусное", mw: 157, logp: -0.4, hbd: 2, hba: 4, rotatable_bonds: 1, charge: 0, activity: "antiviral", mechanism: "Ингибитор РНК-полимеразы", ru_registered: true },
  { id: "d5", name: "Ацикловир", inn: "ацикловир", form: "таблетки", pharm_group: "Противовирусное", mw: 225, logp: -1.5, hbd: 3, hba: 7, rotatable_bonds: 4, charge: 0, activity: "antiviral", mechanism: "Аналог нуклеозида, ингибирует ДНК-полимеразу", ru_registered: true },
  { id: "d6", name: "Ганцикловир", inn: "ганцикловир", form: "раствор для инфузий", pharm_group: "Противовирусное", mw: 255, logp: -1.6, hbd: 4, hba: 8, rotatable_bonds: 5, charge: 0, activity: "antiviral", mechanism: "Аналог нуклеозида", ru_registered: true },
  { id: "d7", name: "Зидовудин", inn: "зидовудин", form: "раствор для инфузий", pharm_group: "Противовирусное", mw: 267, logp: 0.05, hbd: 3, hba: 6, rotatable_bonds: 3, charge: 0, activity: "antiviral", mechanism: "Ингибитор обратной транскриптазы", ru_registered: true },
  { id: "d8", name: "Амантадин", inn: "амантадин", form: "таблетки", pharm_group: "Противовирусное", mw: 151, logp: 1.2, hbd: 1, hba: 1, rotatable_bonds: 0, charge: 1, activity: "antiviral", mechanism: "Блокатор M2 ионного канала", ru_registered: true },
  { id: "d9", name: "Римантадин", inn: "римантадин", form: "таблетки", pharm_group: "Противовирусное", mw: 179, logp: 2.5, hbd: 1, hba: 1, rotatable_bonds: 1, charge: 1, activity: "antiviral", mechanism: "Блокатор M2 ионного канала", ru_registered: true },
  { id: "d10", name: "Интерферон альфа-2b", inn: "интерферон альфа-2b", form: "раствор для инъекций", pharm_group: "Иммуномодулятор", mw: 19200, logp: -3, hbd: 20, hba: 30, rotatable_bonds: 50, charge: 1, activity: "antiviral", mechanism: "Индукция противовирусного состояния клетки", ru_registered: true },

  // ─── Антибактериальные ────────────────────────────────────────────
  { id: "d11", name: "Энрофлоксацин", inn: "энрофлоксацин", form: "раствор для инъекций", pharm_group: "Фторхинолон", mw: 359, logp: 3.6, hbd: 1, hba: 6, rotatable_bonds: 3, charge: 0, activity: "antibacterial", mechanism: "Ингибитор ДНК-гиразы", ru_registered: true },
  { id: "d12", name: "Ципрофлоксацин", inn: "ципрофлоксацин", form: "таблетки", pharm_group: "Фторхинолон", mw: 331, logp: 2.3, hbd: 1, hba: 6, rotatable_bonds: 3, charge: 0, activity: "antibacterial", mechanism: "Ингибитор ДНК-гиразы", ru_registered: true },
  { id: "d13", name: "Доксициклин", inn: "доксициклин", form: "таблетки", pharm_group: "Тетрациклин", mw: 444, logp: 0.6, hbd: 6, hba: 10, rotatable_bonds: 3, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 30S рибосомальной субъединицы", ru_registered: true },
  { id: "d14", name: "Тетрациклин", inn: "тетрациклин", form: "таблетки", pharm_group: "Тетрациклин", mw: 444, logp: -1.3, hbd: 6, hba: 10, rotatable_bonds: 3, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 30S рибосомы", ru_registered: true },
  { id: "d15", name: "Гентамицин", inn: "гентамицин", form: "раствор для инъекций", pharm_group: "Аминогликозид", mw: 477, logp: -1.9, hbd: 8, hba: 12, rotatable_bonds: 6, charge: 2, activity: "antibacterial", mechanism: "Ингибитор 30S рибосомы", ru_registered: true },
  { id: "d16", name: "Стрептомицин", inn: "стрептомицин", form: "порошок для инъекций", pharm_group: "Аминогликозид", mw: 581, logp: -2.5, hbd: 13, hba: 14, rotatable_bonds: 7, charge: 2, activity: "antibacterial", mechanism: "Ингибитор 30S рибосомы", ru_registered: true },
  { id: "d17", name: "Амоксициллин", inn: "амоксициллин", form: "таблетки", pharm_group: "Бета-лактам", mw: 365, logp: 0.3, hbd: 3, hba: 5, rotatable_bonds: 4, charge: 0, activity: "antibacterial", mechanism: "Ингибитор синтеза пептидогликана", ru_registered: true },
  { id: "d18", name: "Цефтиофур", inn: "цефтиофур", form: "раствор для инъекций", pharm_group: "Цефалоспорин", mw: 524, logp: -0.2, hbd: 2, hba: 8, rotatable_bonds: 8, charge: 0, activity: "antibacterial", mechanism: "Ингибитор синтеза клеточной стенки", ru_registered: true },
  { id: "d19", name: "Флорфеникол", inn: "флорфеникол", form: "премикс", pharm_group: "Амфеникол", mw: 358, logp: 1.2, hbd: 2, hba: 4, rotatable_bonds: 3, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d20", name: "Тилозин", inn: "тилозин", form: "премикс", pharm_group: "Макролид", mw: 916, logp: 1.5, hbd: 4, hba: 13, rotatable_bonds: 7, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d21", name: "Эритромицин", inn: "эритромицин", form: "таблетки", pharm_group: "Макролид", mw: 734, logp: 3.0, hbd: 4, hba: 12, rotatable_bonds: 6, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d22", name: "Рифампицин", inn: "рифампицин", form: "капсулы", pharm_group: "Ансамицин", mw: 823, logp: 2.7, hbd: 4, hba: 10, rotatable_bonds: 4, charge: 0, activity: "antibacterial", mechanism: "Ингибитор ДНК-зависимой РНК-полимеразы", ru_registered: true },
  { id: "d23", name: "Хлорамфеникол", inn: "хлорамфеникол", form: "таблетки", pharm_group: "Амфеникол", mw: 323, logp: 1.0, hbd: 2, hba: 4, rotatable_bonds: 3, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d24", name: "Сульфаметоксазол", inn: "сульфаметоксазол", form: "таблетки", pharm_group: "Сульфаниламид", mw: 253, logp: 0.9, hbd: 2, hba: 4, rotatable_bonds: 2, charge: 0, activity: "antibacterial", mechanism: "Ингибитор дигидроптероатсинтетазы", ru_registered: true },
  { id: "d25", name: "Триметоприм", inn: "триметоприм", form: "таблетки", pharm_group: "Диаминопиримидин", mw: 290, logp: 0.9, hbd: 2, hba: 4, rotatable_bonds: 2, charge: 1, activity: "antibacterial", mechanism: "Ингибитор дигидрофолатредуктазы", ru_registered: true },
  { id: "d26", name: "Метронидазол", inn: "метронидазол", form: "таблетки", pharm_group: "Нитроимидазол", mw: 171, logp: -0.02, hbd: 1, hba: 4, rotatable_bonds: 2, charge: 0, activity: "antibacterial", mechanism: "Разрушение ДНК", ru_registered: true },
  { id: "d27", name: "Триклозан", inn: "триклозан", form: "антисептик", pharm_group: "Дихлорфенол", mw: 289, logp: 4.8, hbd: 1, hba: 2, rotatable_bonds: 2, charge: 0, activity: "antibacterial", mechanism: "Ингибитор FabI (еноил-редуктазы)", ru_registered: false },
  { id: "d28", name: "Изониазид", inn: "изониазид", form: "таблетки", pharm_group: "Противотуберкулёзное", mw: 137, logp: -0.7, hbd: 2, hba: 2, rotatable_bonds: 0, charge: 0, activity: "antibacterial", mechanism: "Ингибитор синтеза миколовой кислоты", ru_registered: true },
  { id: "d29", name: "Этамбутол", inn: "этамбутол", form: "таблетки", pharm_group: "Противотуберкулёзное", mw: 204, logp: -0.1, hbd: 2, hba: 4, rotatable_bonds: 5, charge: 2, activity: "antibacterial", mechanism: "Ингибитор арабинозилтрансферазы", ru_registered: true },
  { id: "d30", name: "Пиразинамид", inn: "пиразинамид", form: "таблетки", pharm_group: "Противотуберкулёзное", mw: 123, logp: -0.3, hbd: 1, hba: 3, rotatable_bonds: 0, charge: 0, activity: "antibacterial", mechanism: "Накопление в макрофагах", ru_registered: true },

  // ─── Противопаразитарные ──────────────────────────────────────────
  { id: "d31", name: "Ивермектин", inn: "ивермектин", form: "раствор для инъекций", pharm_group: "Авермектин", mw: 875, logp: 5.0, hbd: 1, hba: 7, rotatable_bonds: 5, charge: 0, activity: "antiparasitic", mechanism: "Агонист глутамат-управляемых Cl- каналов", ru_registered: true },
  { id: "d32", name: "Дорамектин", inn: "дорамектин", form: "раствор для инъекций", pharm_group: "Авермектин", mw: 899, logp: 5.0, hbd: 1, hba: 8, rotatable_bonds: 5, charge: 0, activity: "antiparasitic", mechanism: "Cl- канал паралич", ru_registered: true },
  { id: "d33", name: "Празиквантел", inn: "празиквантел", form: "таблетки", pharm_group: "Празинизохинолин", mw: 312, logp: 2.5, hbd: 0, hba: 2, rotatable_bonds: 1, charge: 0, activity: "antiparasitic", mechanism: "Изменение проницаемости Ca2+ мембран", ru_registered: true },
  { id: "d34", name: "Альбендазол", inn: "альбендазол", form: "таблетки", pharm_group: "Бензимидазол", mw: 265, logp: 3.0, hbd: 1, hba: 3, rotatable_bonds: 1, charge: 0, activity: "antiparasitic", mechanism: "Связывание с β-тубулином", ru_registered: true },
  { id: "d35", name: "Фенбендазол", inn: "фенбендазол", form: "премикс", pharm_group: "Бензимидазол", mw: 299, logp: 3.3, hbd: 1, hba: 3, rotatable_bonds: 1, charge: 0, activity: "antiparasitic", mechanism: "Связывание с β-тубулином", ru_registered: true },

  // ─── Противовоспалительные / иммуномодуляторы ─────────────────────
  { id: "d36", name: "Дексаметазон", inn: "дексаметазон", form: "раствор для инъекций", pharm_group: "Глюкокортикоид", mw: 392, logp: 1.8, hbd: 3, hba: 5, rotatable_bonds: 1, charge: 0, activity: "antiinflammatory", mechanism: "Агонист глюкокортикоидного рецептора", ru_registered: true },
  { id: "d37", name: "Преднизолон", inn: "преднизолон", form: "таблетки", pharm_group: "Глюкокортикоид", mw: 358, logp: 1.5, hbd: 3, hba: 5, rotatable_bonds: 2, charge: 0, activity: "antiinflammatory", mechanism: "Агонист ГР", ru_registered: true },
  { id: "d38", name: "Мелоксикам", inn: "мелоксикам", form: "таблетки", pharm_group: "НПВС", mw: 351, logp: 1.9, hbd: 2, hba: 6, rotatable_bonds: 3, charge: 0, activity: "antiinflammatory", mechanism: "Ингибитор ЦОГ-2", ru_registered: true },
  { id: "d39", name: "Карпрофен", inn: "карпрофен", form: "таблетки", pharm_group: "НПВС", mw: 273, logp: 3.0, hbd: 1, hba: 3, rotatable_bonds: 2, charge: 0, activity: "antiinflammatory", mechanism: "Ингибитор ЦОГ-2", ru_registered: true },

  // ─── Дополнительные кандидаты для репозиционирования ──────────────
  { id: "d40", name: "Хлорохин", inn: "хлорохин", form: "таблетки", pharm_group: "Аминохинолин", mw: 319, logp: 4.0, hbd: 1, hba: 3, rotatable_bonds: 4, charge: 1, activity: "antiparasitic", mechanism: "Изменение pH лизосом, ингибитор автофагии", ru_registered: true },
  { id: "d41", name: "Гидроксихлорохин", inn: "гидроксихлорохин", form: "таблетки", pharm_group: "Аминохинолин", mw: 335, logp: 3.5, hbd: 2, hba: 4, rotatable_bonds: 4, charge: 1, activity: "antiparasitic", mechanism: "Изменение pH лизосом", ru_registered: true },
  { id: "d42", name: "Лопинавир", inn: "лопинавир", form: "таблетки", pharm_group: "Ингибитор протеазы", mw: 629, logp: 4.0, hbd: 3, hba: 5, rotatable_bonds: 14, charge: 0, activity: "antiviral", mechanism: "Ингибитор аспартат-протеазы ВИЧ", ru_registered: true },
  { id: "d43", name: "Ритонавир", inn: "ритонавир", form: "таблетки", pharm_group: "Ингибитор протеазы", mw: 721, logp: 4.0, hbd: 4, hba: 6, rotatable_bonds: 17, charge: 0, activity: "antiviral", mechanism: "Ингибитор аспартат-протеазы + бустер", ru_registered: true },
  { id: "d44", name: "Дарунавир", inn: "дарунавир", form: "таблетки", pharm_group: "Ингибитор протеазы", mw: 547, logp: 2.5, hbd: 2, hba: 6, rotatable_bonds: 10, charge: 0, activity: "antiviral", mechanism: "Ингибитор аспартат-протеазы", ru_registered: true },
  { id: "d45", name: "Молнупиравир", inn: "молнупиравир", form: "капсулы", pharm_group: "Противовирусное", mw: 329, logp: -1.0, hbd: 2, hba: 7, rotatable_bonds: 4, charge: 0, activity: "antiviral", mechanism: "Аналог нуклеозида, индуцирует мутации РНК", ru_registered: true },
  { id: "d46", name: "Нирматрелвир", inn: "нирматрелвир", form: "таблетки", pharm_group: "Ингибитор протеазы", mw: 500, logp: 1.2, hbd: 3, hba: 5, rotatable_bonds: 8, charge: 0, activity: "antiviral", mechanism: "Ингибитор 3CL-протеазы", ru_registered: false },
  { id: "d47", name: "Барицитиниб", inn: "барицитиниб", form: "таблетки", pharm_group: "Ингибитор JAK", mw: 371, logp: 1.0, hbd: 1, hba: 6, rotatable_bonds: 4, charge: 0, activity: "antiinflammatory", mechanism: "Ингибитор JAK1/2 киназы", ru_registered: true },
  { id: "d48", name: "Осельтамивир карбоксилат", inn: "осельтамивир карбоксилат", form: "активный метаболит", pharm_group: "Противовирусное", mw: 284, logp: -1.0, hbd: 3, hba: 5, rotatable_bonds: 3, charge: -1, activity: "antiviral", mechanism: "Ингибитор нейраминидазы (активная форма)", ru_registered: true },
  { id: "d49", name: "Занамивир", inn: "занамивир", form: "ингалятор", pharm_group: "Противовирусное", mw: 332, logp: -3.0, hbd: 6, hba: 9, rotatable_bonds: 4, charge: 0, activity: "antiviral", mechanism: "Ингибитор нейраминидазы", ru_registered: true },
  { id: "d50", name: "Перамивир", inn: "перамивир", form: "раствор для инфузий", pharm_group: "Противовирусное", mw: 328, logp: -1.5, hbd: 4, hba: 8, rotatable_bonds: 2, charge: -1, activity: "antiviral", mechanism: "Ингибитор нейраминидазы (в/в)", ru_registered: false },

  // ─── Дополнительные антибактериальные ─────────────────────────────
  { id: "d51", name: "Линезолид", inn: "линезолид", form: "раствор для инфузий", pharm_group: "Оксазолидинон", mw: 337, logp: 0.6, hbd: 2, hba: 5, rotatable_bonds: 4, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 50S (инициация трансляции)", ru_registered: true },
  { id: "d52", name: "Ванкомицин", inn: "ванкомицин", form: "порошок для инфузий", pharm_group: "Гликопептид", mw: 1449, logp: -2.0, hbd: 16, hba: 20, rotatable_bonds: 10, charge: 1, activity: "antibacterial", mechanism: "Связывание с D-Ala-D-Ala", ru_registered: true },
  { id: "d53", name: "Азитромицин", inn: "азитромицин", form: "таблетки", pharm_group: "Азалид/Макролид", mw: 749, logp: 3.0, hbd: 5, hba: 12, rotatable_bonds: 7, charge: 1, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d54", name: "Кларитромицин", inn: "кларитромицин", form: "таблетки", pharm_group: "Макролид", mw: 748, logp: 3.2, hbd: 4, hba: 11, rotatable_bonds: 6, charge: 0, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d55", name: "Клиндамицин", inn: "клиндамицин", form: "раствор для инъекций", pharm_group: "Линкозамид", mw: 425, logp: 1.6, hbd: 2, hba: 5, rotatable_bonds: 5, charge: 1, activity: "antibacterial", mechanism: "Ингибитор 50S рибосомы", ru_registered: true },
  { id: "d56", name: "Полимиксин B", inn: "полимиксин B", form: "порошок для инъекций", pharm_group: "Полипептид", mw: 1203, logp: -2.5, hbd: 8, hba: 12, rotatable_bonds: 8, charge: 5, activity: "antibacterial", mechanism: "Разрушение мембраны", ru_registered: true },
  { id: "d57", name: "Колистин", inn: "колистин", form: "премикс", pharm_group: "Полипептид", mw: 1155, logp: -2.0, hbd: 8, hba: 12, rotatable_bonds: 8, charge: 5, activity: "antibacterial", mechanism: "Разрушение мембраны", ru_registered: true },
  { id: "d58", name: "Фосфомицин", inn: "фосфомицин", form: "порошок для приёма внутрь", pharm_group: "Фосфонат", mw: 138, logp: -1.5, hbd: 1, hba: 4, rotatable_bonds: 1, charge: -1, activity: "antibacterial", mechanism: "Ингибитор энолпирувилтрансферазы", ru_registered: true },
  { id: "d59", name: "Нитрофурантоин", inn: "нитрофурантоин", form: "таблетки", pharm_group: "Нитрофуран", mw: 238, logp: -0.1, hbd: 1, hba: 5, rotatable_bonds: 2, charge: 0, activity: "antibacterial", mechanism: "Повреждение ДНК/белков", ru_registered: true },
  { id: "d60", name: "Фуразолидон", inn: "фуразолидон", form: "таблетки", pharm_group: "Нитрофуран", mw: 225, logp: -0.1, hbd: 1, hba: 5, rotatable_bonds: 2, charge: 0, activity: "antibacterial", mechanism: "Повреждение ДНК", ru_registered: true },
];

export const DRUGS: Drug[] = DRUG_DATA.map((d) => ({
  ...d,
  radius: mwToRadius(d.mw),
  hydrophobicity: logpToHydrophobicity(d.logp),
}));

export function getDrugsByActivity(activity: Drug["activity"]): Drug[] {
  return DRUGS.filter((d) => d.activity === activity);
}
