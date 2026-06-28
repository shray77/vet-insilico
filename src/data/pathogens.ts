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
];

export function getPathogen(id: string): Pathogen | undefined {
  return PATHOGENS.find((p) => p.id === id);
}
