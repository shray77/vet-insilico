/**
 * Pathogen database — veterinary pathogens relevant to Russia.
 * 
 * Each pathogen has 1-3 key target proteins with simplified structural data.
 * Protein data: binding site coordinates + electrostatic charge distribution.
 * 
 * Sources:
 *   - RCSB PDB (public domain structures)
 *   - UniProt (functional annotations)
 *   - WOAH Terrestrial Manual (disease significance)
 * 
 * Note: For the MVP, we use simplified protein representations
 * (binding pocket centroid + radius + charge profile) instead of full
 * atomic coordinates. This enables fast in-browser docking.
 */

export interface BindingPocket {
  /** Pocket centroid in Angstroms (simplified) */
  cx: number; cy: number; cz: number;
  /** Approximate pocket radius (Å) */
  radius: number;
  /** Electrostatic charge at pocket: -1 (negative), 0 (neutral), +1 (positive) */
  charge: number;
  /** Hydrophobicity: 0 (hydrophilic) to 1 (hydrophobic) */
  hydrophobicity: number;
  /** Known ligand type that binds here (for validation) */
  known_ligand_type: string;
}

export interface TargetProtein {
  id: string;
  name: string;
  name_ru: string;
  /** PDB ID if available */
  pdb_id?: string;
  /** UniProt ID */
  uniprot_id?: string;
  /** Molecular weight (kDa) */
  mw_kda: number;
  /** Function in pathogen lifecycle */
  function_ru: string;
  /** Binding pockets for drug targeting */
  pockets: BindingPocket[];
  /** Is this protein essential for pathogen survival? */
  essential: boolean;
}

export interface Pathogen {
  id: string;
  name_ru: string;
  name_en: string;
  /** Disease key matching vet-heatmap */
  disease_key: string;
  type: "virus" | "bacterium" | "parasite";
  /** Genome type */
  genome: string;
  /** Priority for Russia (1=highest) */
  priority_ru: number;
  /** Russian regulatory status */
  rf_status: string;
  /** Target proteins for drug screening */
  targets: TargetProtein[];
  /** Known drug classes with efficacy */
  known_drug_classes: string[];
}

export const PATHOGENS: Pathogen[] = [
  {
    id: "asfv",
    name_ru: "Африканская чума свиней",
    name_en: "African Swine Fever Virus",
    disease_key: "asf",
    type: "virus",
    genome: "dsDNA (170-194 kb)",
    priority_ru: 1,
    rf_status: "Особо опасная болезнь, карантин",
    known_drug_classes: ["Нуклеозидные аналоги", "Ингибиторы ДНК-полимеразы"],
    targets: [
      {
        id: "asfv-p72",
        name: "p72 (major capsid protein)",
        name_ru: "Капсидный белок p72",
        pdb_id: "6QU9",
        uniprot_id: "P0C9M1",
        mw_kda: 73,
        function_ru: "Основной структурный белок капсида. Определяет иммуногенность. Мишень для диагностики и потенциальной вакцины.",
        essential: true,
        pockets: [
          {
            cx: 15.2, cy: -8.4, cz: 22.1, radius: 12,
            charge: -1, hydrophobicity: 0.6,
            known_ligand_type: "hydrophobic_aromatic",
          },
        ],
      },
      {
        id: "asfv-polx",
        name: "DNA Polymerase X",
        name_ru: "ДНК-полимераза X",
        pdb_id: "3QZJ",
        uniprot_id: "P0C9M5",
        mw_kda: 45,
        function_ru: "Репарация ДНК. Уникальна для ASFV — отсутствует в клетках свиньи. Идеальная мишень для селективной терапии.",
        essential: true,
        pockets: [
          {
            cx: 8.1, cy: 12.3, cz: -5.2, radius: 8,
            charge: -1, hydrophobicity: 0.3,
            known_ligand_type: "nucleotide_analog",
          },
        ],
      },
    ],
  },
  {
    id: "fmdv",
    name_ru: "Ящур",
    name_en: "Foot-and-Mouth Disease Virus",
    disease_key: "fmd",
    type: "virus",
    genome: "+ssRNA (~8.5 kb)",
    priority_ru: 1,
    rf_status: "Особо опасная болезнь, карантин",
    known_drug_classes: ["Ингибиторы 3C-протеазы", "Рибавирин (экспериментально)"],
    targets: [
      {
        id: "fmdv-3c",
        name: "3C Protease",
        name_ru: "3C-протеаза",
        pdb_id: "6QYL",
        uniprot_id: "P03305",
        mw_kda: 23,
        function_ru: "Расщепляет вирусный полипротеин. Без неё вирус не может собираться. Кошачий цистеин-протеаза.",
        essential: true,
        pockets: [
          {
            cx: 5.4, cy: 3.1, cz: 18.7, radius: 7,
            charge: -1, hydrophobicity: 0.4,
            known_ligand_type: "peptide_mimetic",
          },
        ],
      },
      {
        id: "fmdv-vp1",
        name: "VP1 (capsid)",
        name_ru: "Капсидный белок VP1",
        pdb_id: "1FOD",
        uniprot_id: "P03306",
        mw_kda: 24,
        function_ru: "Содержит RGD-мотив для связывания с клеточным рецептором. Блокировка предотвращает проникновение в клетку.",
        essential: true,
        pockets: [
          {
            cx: 12.0, cy: -4.5, cz: 9.3, radius: 10,
            charge: 0, hydrophobicity: 0.5,
            known_ligand_type: "rgd_mimetic",
          },
        ],
      },
    ],
  },
  {
    id: "brucella",
    name_ru: "Бруцеллёз",
    name_en: "Brucella abortus",
    disease_key: "brucellosis",
    type: "bacterium",
    genome: "dsDNA (circular, ~3.2 Mb)",
    priority_ru: 2,
    rf_status: "Особо опасная болезнь, зооноз",
    known_drug_classes: ["Тетрациклины", "Аминогликозиды", "Рифампицины"],
    targets: [
      {
        id: "brucella-fabI",
        name: "Enoyl-ACP reductase (FabI)",
        name_ru: "Эноил-АЦП-редуктаза FabI",
        pdb_id: "4LSY",
        uniprot_id: "Q2YQF0",
        mw_kda: 28,
        function_ru: "Ключевой фермент синтеза жирных кислот бактерии. Отсутствует у млекопитающих. Мишень для триклозана и аналогов.",
        essential: true,
        pockets: [
          {
            cx: 7.2, cy: 15.6, cz: 3.8, radius: 9,
            charge: -1, hydrophobicity: 0.7,
            known_ligand_type: "hydrophobic_aromatic",
          },
        ],
      },
    ],
  },
  {
    id: "hpai",
    name_ru: "Грипп птиц (ВПГП)",
    name_en: "Highly Pathogenic Avian Influenza",
    disease_key: "hpai",
    type: "virus",
    genome: "-ssRNA (8 сегментов)",
    priority_ru: 1,
    rf_status: "Особо опасная болезнь, зооноз",
    known_drug_classes: ["Ингибиторы нейраминидазы (озельтамивир)", "Ингибиторы M2 (амантадин)"],
    targets: [
      {
        id: "hpai-na",
        name: "Neuraminidase (NA)",
        name_ru: "Нейраминидаза NA",
        pdb_id: "2HTY",
        uniprot_id: "Q8J0V2",
        mw_kda: 50,
        function_ru: "Отщепляет сиаловую кислоту от поверхности клетки. Без этого вирионы прилипают к клетке и не распространяются. Мишень озельтамивира (Тамифлю).",
        essential: true,
        pockets: [
          {
            cx: 20.1, cy: 5.3, cz: -12.4, radius: 11,
            charge: 1, hydrophobicity: 0.2,
            known_ligand_type: "sialic_acid_analog",
          },
        ],
      },
      {
        id: "hpai-m2",
        name: "M2 Ion Channel",
        name_ru: "Ионный канал M2",
        pdb_id: "2LKF",
        uniprot_id: "P0C968",
        mw_kda: 11,
        function_ru: "Протоный канал в вирусной оболочке. Необходим для расплетения капсида в клетке. Мишень амантадина.",
        essential: true,
        pockets: [
          {
            cx: 0, cy: 0, cz: 0, radius: 5,
            charge: 0, hydrophobicity: 0.8,
            known_ligand_type: "amine_channel_blocker",
          },
        ],
      },
    ],
  },
  {
    id: "newcastle",
    name_ru: "Болезнь Ньюкасла",
    name_en: "Newcastle Disease Virus",
    disease_key: "newcastle",
    type: "virus",
    genome: "-ssRNA (~15 kb)",
    priority_ru: 2,
    rf_status: "Особо опасная болезнь птиц",
    known_drug_classes: ["Противовирусные (экспериментально)"],
    targets: [
      {
        id: "ndv-hn",
        name: "Hemagglutinin-Neuraminidase (HN)",
        name_ru: "Гемагглютинин-нейраминидаза HN",
        pdb_id: "3T1E",
        uniprot_id: "P35826",
        mw_kda: 63,
        function_ru: "Связывается с сиаловой кислотой на клетке и расщепляет её. Двойная функция — прикрепление и освобождение вириона.",
        essential: true,
        pockets: [
          {
            cx: 14.5, cy: 8.2, cz: 16.0, radius: 10,
            charge: 1, hydrophobicity: 0.3,
            known_ligand_type: "sialic_acid_analog",
          },
        ],
      },
    ],
  },
  {
    id: "rabies",
    name_ru: "Бешенство",
    name_en: "Rabies Virus",
    disease_key: "rabies",
    type: "virus",
    genome: "-ssRNA (~12 kb)",
    priority_ru: 1,
    rf_status: "Особо опасная болезнь, 100% летальность, зооноз",
    known_drug_classes: ["Иммуноглобулин", "Вакцина (постэкспозиционная)"],
    targets: [
      {
        id: "rv-g",
        name: "Glycoprotein G",
        name_ru: "Гликопротеин G",
        pdb_id: "6LGW",
        uniprot_id: "P03524",
        mw_kda: 67,
        function_ru: "Связывается с nAChR рецептором нейрона. Определяет тропизм к нервной ткани. Мишень для нейтрализующих антител.",
        essential: true,
        pockets: [
          {
            cx: 18.3, cy: -7.1, cz: 14.5, radius: 14,
            charge: 1, hydrophobicity: 0.5,
            known_ligand_type: "receptor_mimetic",
          },
        ],
      },
    ],
  },
  // ─── NEW: Salmonella enterica ─────────────────────────────────
  {
    id: "salmonella",
    name_ru: "Сальмонеллёз",
    name_en: "Salmonella enterica",
    disease_key: "salmonellosis",
    type: "bacterium",
    genome: "dsDNA (~4.8 Mb)",
    priority_ru: 2,
    rf_status: "Карантинная инфекция, зооноз",
    known_drug_classes: ["Фторхинолоны", "Цефалоспорины", "Макролиды"],
    targets: [
      {
        id: "salmonella-gyra",
        name: "ДНК-гираза GyrA",
        name_ru: "ДНК-гираза GyrA",
        pdb_id: "2XCT",
        uniprot_id: "P0CES4",
        mw_kda: 97,
        function_ru: "Катализирует суперскручивание ДНК. Мишень фторхинолонов.",
        essential: true,
        pockets: [
          {
            cx: 25.1, cy: 12.4, cz: 8.7, radius: 12,
            charge: -1, hydrophobicity: 0.4,
            known_ligand_type: "fluoroquinolone",
          },
        ],
      },
      {
        id: "salmonella-flic",
        name: "Флагеллин FliC",
        name_ru: "Флагеллин FliC",
        pdb_id: "1UC1",
        uniprot_id: "P06179",
        mw_kda: 51,
        function_ru: "Структурный белок жгутика, главный антиген.",
        essential: false,
        pockets: [
          {
            cx: 10.5, cy: 5.2, cz: 3.1, radius: 10,
            charge: 0, hydrophobicity: 0.6,
            known_ligand_type: "antibody",
          },
        ],
      },
    ],
  },
  // ─── NEW: BVDV (Bovine Viral Diarrhea Virus) ─────────────────
  {
    id: "bvdv",
    name_ru: "Вирусная диарея КРС",
    name_en: "Bovine Viral Diarrhea Virus",
    disease_key: "bvd",
    type: "virus",
    genome: "(+)ssRNA (~12.5 kb)",
    priority_ru: 2,
    rf_status: "Карантинная болезнь КРС",
    known_drug_classes: ["Нуклеозидные аналоги", "Ингибиторы протеазы"],
    targets: [
      {
        id: "bvdv-ns3",
        name: "NS3 протеаза/хеликаза",
        name_ru: "NS3 протеаза/хеликаза",
        pdb_id: "1S48",
        uniprot_id: "Q01472",
        mw_kda: 80,
        function_ru: "Многофункциональный белок: сериновая протеаза + хеликаза. Ключевая мишень для противовирусных.",
        essential: true,
        pockets: [
          {
            cx: 15.2, cy: -8.4, cz: 11.3, radius: 13,
            charge: 0, hydrophobicity: 0.5,
            known_ligand_type: "protease_inhibitor",
          },
        ],
      },
      {
        id: "bvdv-erns",
        name: "Eᴿⁿˢ гликопротеин",
        name_ru: "Eᴿⁿˢ гликопротеин",
        pdb_id: "2BTT",
        uniprot_id: "Q96662",
        mw_kda: 44,
        function_ru: "Рибонуклеаза на поверхности вириона, участвует в иммунной эвазии.",
        essential: false,
        pockets: [
          {
            cx: 8.7, cy: 4.1, cz: 2.5, radius: 9,
            charge: 1, hydrophobicity: 0.3,
            known_ligand_type: "rnase_inhibitor",
          },
        ],
      },
    ],
  },
  // ─── NEW: Leptospira ─────────────────────────────────────────
  {
    id: "leptospira",
    name_ru: "Лептоспироз",
    name_en: "Leptospira interrogans",
    disease_key: "leptospirosis",
    type: "bacterium",
    genome: "dsDNA (~4.6 Mb, 2 хромосомы)",
    priority_ru: 2,
    rf_status: "Зооноз, особо опасная инфекция",
    known_drug_classes: ["Пенициллины", "Тетрациклины", "Макролиды"],
    targets: [
      {
        id: "leptospira-lip32",
        name: "LipL32",
        name_ru: "Лipoprotein LipL32",
        pdb_id: "5DNG",
        uniprot_id: "Q8R6N5",
        mw_kda: 27,
        function_ru: "Основной поверхностный липопротеин патогенных лептоспир, иммунодоминант.",
        essential: false,
        pockets: [
          {
            cx: 7.4, cy: 3.8, cz: 1.2, radius: 8,
            charge: 0, hydrophobicity: 0.7,
            known_ligand_type: "antibody",
          },
        ],
      },
      {
        id: "leptospira-fab",
        name: "FAB-синтаза",
        name_ru: "β-кетоацил-ACP-синтаза",
        pdb_id: "2Q9B",
        uniprot_id: "Q8F4I3",
        mw_kda: 43,
        function_ru: "Ключевой фермент синтеза жирных кислот. Мишень триклозана.",
        essential: true,
        pockets: [
          {
            cx: 12.1, cy: 6.5, cz: 4.8, radius: 11,
            charge: 0, hydrophobicity: 0.5,
            known_ligand_type: "triclosan",
          },
        ],
      },
    ],
  },
  // ─── NEW: PEDV (Porcine Epidemic Diarrhea Virus) ─────────────
  {
    id: "pedv",
    name_ru: "Эпидемическая диарея свиней",
    name_en: "Porcine Epidemic Diarrhea Virus",
    disease_key: "ped",
    type: "virus",
    genome: "(+)ssRNA (~28 kb)",
    priority_ru: 3,
    rf_status: "Карантинная болезнь свиней",
    known_drug_classes: ["Нуклеозидные аналоги", "Ингибиторы протеазы"],
    targets: [
      {
        id: "pedv-spike",
        name: "S-гликопротеин",
        name_ru: "Спайковый гликопротеин S",
        pdb_id: "7XGX",
        uniprot_id: "Q0Y0E9",
        mw_kda: 180,
        function_ru: "Связывается с рецептором APN энтероцитов. Главный антиген.",
        essential: true,
        pockets: [
          {
            cx: 30.5, cy: 15.2, cz: 10.7, radius: 16,
            charge: 0, hydrophobicity: 0.4,
            known_ligand_type: "receptor_mimetic",
          },
        ],
      },
      {
        id: "pedv-3clpro",
        name: "3CLpro протеаза",
        name_ru: "Основная протеаза 3CLpro",
        pdb_id: "7QEU",
        uniprot_id: "Q0Y0E2",
        mw_kda: 34,
        function_ru: "Цистеиновая протеаза, расщепляет polyprotein. Мишень противовирусных.",
        essential: true,
        pockets: [
          {
            cx: 10.8, cy: -3.4, cz: 7.2, radius: 10,
            charge: 0, hydrophobicity: 0.5,
            known_ligand_type: "protease_inhibitor",
          },
        ],
      },
    ],
  },
  // ─── NEW: E. coli (ветеринарные патогенные штаммы) ──────────
  {
    id: "ecoli-vet",
    name_ru: "Кишечная палочка (E. coli)",
    name_en: "Escherichia coli (pathogenic)",
    disease_key: "colibacillosis",
    type: "bacterium",
    genome: "dsDNA (~5 Mb)",
    priority_ru: 2,
    rf_status: "Массовые вспышки у молодняка",
    known_drug_classes: ["Цефалоспорины", "Фторхинолоны", "Аминогликозиды"],
    targets: [
      {
        id: "ecoli-gyra",
        name: "ДНК-гираза GyrA",
        name_ru: "ДНК-гираза GyrA",
        pdb_id: "6F87",
        uniprot_id: "P0AES4",
        mw_kda: 97,
        function_ru: "Катализирует суперскручивание ДНК. QRDR — мишень фторхинолонов.",
        essential: true,
        pockets: [
          {
            cx: 24.8, cy: 11.9, cz: 8.4, radius: 12,
            charge: -1, hydrophobicity: 0.4,
            known_ligand_type: "fluoroquinolone",
          },
        ],
      },
      {
        id: "ecoli-ltab",
        name: "Лабильный энтеротоксин LT",
        name_ru: "Термолабильный энтеротоксин LT",
        pdb_id: "1LTS",
        uniprot_id: "P0CJ20",
        mw_kda: 86,
        function_ru: "AB₅-токсин, активирует аденилатциклазу → секреторная диарея.",
        essential: false,
        pockets: [
          {
            cx: 14.3, cy: 7.6, cz: 5.2, radius: 11,
            charge: 1, hydrophobicity: 0.3,
            known_ligand_type: "ganglioside",
          },
        ],
      },
    ],
  },
  // ─── NEW: Anaplasma marginale ────────────────────────────────
  {
    id: "anaplasma",
    name_ru: "Анаплазмоз",
    name_en: "Anaplasma marginale",
    disease_key: "anaplasmosis",
    type: "bacterium",
    genome: "dsDNA (~1.2 Mb)",
    priority_ru: 3,
    rf_status: "Трансмиссивная болезнь КРС",
    known_drug_classes: ["Тетрациклины", "Фторхинолоны"],
    targets: [
      {
        id: "anaplasma-msp5",
        name: "MSP5",
        name_ru: "Major Surface Protein 5",
        pdb_id: "2VWM",
        uniprot_id: "Q0PFH6",
        mw_kda: 21,
        function_ru: "Поверхностный белок, иммунодоминант. Маркер для серодиагностики.",
        essential: false,
        pockets: [
          {
            cx: 6.2, cy: 2.8, cz: 1.5, radius: 7,
            charge: 0, hydrophobicity: 0.5,
            known_ligand_type: "antibody",
          },
        ],
      },
    ],
  },
  // ─── NEW: Clostridium perfringens ────────────────────────────
  {
    id: "clostridium",
    name_ru: "Клостридиоз",
    name_en: "Clostridium perfringens",
    disease_key: "clostridiosis",
    type: "bacterium",
    genome: "dsDNA (~3.6 Mb)",
    priority_ru: 2,
    rf_status: "Энтеротоксемия, газовая гангрена",
    known_drug_classes: ["Пенициллины", "Тетрациклины", "Макролиды"],
    targets: [
      {
        id: "clostridium-cpa",
        name: "Alpha-toxin (PLC)",
        name_ru: "Альфа-токсин (фосфолипаза C)",
        pdb_id: "1QMY",
        uniprot_id: "P0C216",
        mw_kda: 45,
        function_ru: "Лецитиназа — разрушает мембраны клеток хозяина. Главный фактор вирулентности.",
        essential: true,
        pockets: [
          { cx: 15.2, cy: 8.4, cz: 6.1, radius: 11, charge: 1, hydrophobicity: 0.5, known_ligand_type: "phospholipid" },
        ],
      },
    ],
  },
  // ─── NEW: Campylobacter jejuni ───────────────────────────────
  {
    id: "campylobacter",
    name_ru: "Кампилобактериоз",
    name_en: "Campylobacter jejuni",
    disease_key: "campylobacteriosis",
    type: "bacterium",
    genome: "dsDNA (~1.6 Mb)",
    priority_ru: 2,
    rf_status: "Зооноз, пищевая инфекция",
    known_drug_classes: ["Макролиды", "Фторхинолоны", "Тетрациклины"],
    targets: [
      {
        id: "campylobacter-gyra",
        name: "DNA gyrase GyrA",
        name_ru: "ДНК-гираза GyrA",
        pdb_id: "5NVL",
        uniprot_id: "P0C9M1",
        mw_kda: 97,
        function_ru: "Катализирует суперскручивание ДНК. Мишень фторхинолонов.",
        essential: true,
        pockets: [
          { cx: 22.1, cy: 10.3, cz: 7.5, radius: 12, charge: -1, hydrophobicity: 0.4, known_ligand_type: "fluoroquinolone" },
        ],
      },
    ],
  },
  // ─── NEW: Mycoplasma hyopneumoniae ───────────────────────────
  {
    id: "mycoplasma",
    name_ru: "Микоплазмоз свиней",
    name_en: "Mycoplasma hyopneumoniae",
    disease_key: "mycoplasmosis",
    type: "bacterium",
    genome: "dsDNA (~0.9 Mb)",
    priority_ru: 3,
    rf_status: "Энзоотическая пневмония свиней",
    known_drug_classes: ["Макролиды", "Тетрациклины", "Фторхинолоны"],
    targets: [
      {
        id: "mycoplasma-p146",
        name: "P146 adhesin",
        name_ru: "Адгезин P146",
        pdb_id: "2MTS",
        uniprot_id: "Q6P0Q5",
        mw_kda: 146,
        function_ru: "Поверхностный белок-адгезин, отвечает за прикрепление к эпителию дыхательных путей.",
        essential: false,
        pockets: [
          { cx: 18.5, cy: 9.2, cz: 5.3, radius: 14, charge: 0, hydrophobicity: 0.6, known_ligand_type: "receptor" },
        ],
      },
    ],
  },
  // ─── NEW: Avian Influenza H5N1 (already have HPAI but add H5N1-specific) ─
  {
    id: "h5n1",
    name_ru: "Грипп H5N1 (высокопатогенный)",
    name_en: "Avian Influenza H5N1",
    disease_key: "h5n1",
    type: "virus",
    genome: "(-)ssRNA (~13.5 kb, 8 сегментов)",
    priority_ru: 1,
    rf_status: "Особо опасная болезнь, карантин",
    known_drug_classes: ["Ингибиторы нейраминидазы", "Ингибиторы M2"],
    targets: [
      {
        id: "h5n1-ha",
        name: "Hemagglutinin H5",
        name_ru: "Гемагглютинин H5",
        pdb_id: "2FK0",
        uniprot_id: "Q2IH04",
        mw_kda: 77,
        function_ru: "Связывается с сиаловой кислотой клеток хозяина. Главный антиген. Мишень для вакцин.",
        essential: true,
        pockets: [
          { cx: 20.1, cy: 12.5, cz: 8.3, radius: 13, charge: 0, hydrophobicity: 0.4, known_ligand_type: "sialic_acid" },
        ],
      },
      {
        id: "h5n1-na",
        name: "Neuraminidase N1",
        name_ru: "Нейраминидаза N1",
        pdb_id: "2HTY",
        uniprot_id: "Q2IH05",
        mw_kda: 50,
        function_ru: "Отщепляет сиаловую кислоту — высвобождение вирионов. Мишень осельтамивира и занамивира.",
        essential: true,
        pockets: [
          { cx: 16.3, cy: 7.8, cz: 4.2, radius: 10, charge: -1, hydrophobicity: 0.3, known_ligand_type: "oseltamivir" },
        ],
      },
    ],
  },
  // ─── NEW: Corynebacterium pseudotuberculosis ─────────────────
  {
    id: "corynebacterium",
    name_ru: "Казеозный лимфаденит",
    name_en: "Corynebacterium pseudotuberculosis",
    disease_key: "cla",
    type: "bacterium",
    genome: "dsDNA (~2.3 Mb)",
    priority_ru: 3,
    rf_status: "Хроническая болезнь овец и коз",
    known_drug_classes: ["Пенициллины", "Тетрациклины", "Макролиды"],
    targets: [
      {
        id: "corynebacterium-pld",
        name: "Phospholipase D",
        name_ru: "Фосфолипаза D",
        pdb_id: "1V0O",
        uniprot_id: "P0C1Z5",
        mw_kda: 31,
        function_ru: "Фактор вирулентности — способствует распространению бактерии в лимфоузлах.",
        essential: false,
        pockets: [
          { cx: 10.2, cy: 5.1, cz: 3.4, radius: 9, charge: 0, hydrophobicity: 0.5, known_ligand_type: "phospholipid" },
        ],
      },
    ],
  },
];

export function getPathogen(id: string): Pathogen | undefined {
  return PATHOGENS.find((p) => p.id === id);
}
