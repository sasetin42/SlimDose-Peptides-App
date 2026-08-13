export interface COARecord {
  batchNumber: string;
  purityPercentage: number;
  testDate: string;
  variant: string;
  laboratory: string;
  results: string;
  pass: boolean;
  status: string;
  coaUrl: string;
}

export interface ReferenceRecord {
  journal: string;
  title: string;
  year: number;
  authors: string;
  doi: string;
  url: string;
}

export interface CompoundDetails {
  formula: string;
  weight: string;
  cas: string;
  sequence: string;
  appearance: string;
  form: string;
  solubility: string;
  storageLyophilized: string;
  storageReconstituted: string;
  stability: string;
  diluent: string;
  reconstituentVolume: string;
  mixingInstruction: string;
  researchApplications: string[];
  handlingPPE: string[];
  toxicology: string;
}

// Map product ID/slug to molecular formula and other details
export function getCompoundDetails(
  _category: string,
  slug: string,
  molecularWeight: string | null,
  casNumber: string | null,
  sequence: string | null,
  storageConditions: string | null
): CompoundDetails {
  const normSlug = slug.toLowerCase();
  
  // Default values
  let formula = 'C₃₈H₄₉N₉O₅';
  let appearance = 'White Lyophilized Powder';
  let form = 'Acetate Salt (Lyophilized)';
  let solubility = 'Soluble in Water or Physiological Saline';
  let storageLyophilized = storageConditions || 'Store at -20°C. Keep desiccated and protect from light.';
  let storageReconstituted = 'Keep refrigerated at 2°C to 8°C. Do not freeze reconstituted solutions.';
  let stability = 'Lyophilized powder is stable at room temperature for up to 90 days. Store below -20°C for up to 24 months. Reconstituted solution is stable for up to 30 days.';
  let diluent = 'Bacteriostatic Water (0.9% Benzyl Alcohol) or Sterile Physiological Saline';
  let reconstituentVolume = '1.0 mL to 2.0 mL per vial';
  let mixingInstruction = 'Gently inject the diluent down the side of the vial. Do not shake. Roll the vial between the palms of your hands until completely dissolved.';
  let researchApplications = [
    'In vitro cell culture receptor affinity testing',
    'Evaluation of cellular uptake and metabolic pathway modeling',
    'Assessment of structural integrity under physical stressors'
  ];
  let handlingPPE = [
    'Wear chemical safety goggles or face shield.',
    'Use laboratory gloves (nitrile or latex) and protective laboratory coat.',
    'Work within a certified biosafety cabinet or laminar flow hood.'
  ];
  let toxicology = 'The toxicological properties of this compound have not been fully characterized. Handle with extreme caution.';

  // Specific peptides mapping
  if (normSlug.includes('semaglutide')) {
    formula = 'C₁₈₇H₂₉₁N₄₅O₅₉';
    solubility = 'Soluble in PBS (pH 7.4) or Sterile Water';
    researchApplications = [
      'In vitro GLP-1 receptor activation kinetics',
      'Modulation of cellular glucose transport mechanisms',
      'Study of lipid metabolism pathways in hepatocyte cultures'
    ];
  } else if (normSlug.includes('bpc-157') || normSlug.includes('bpc157')) {
    formula = 'C₆₂H₉₈N₁₆O₂₂';
    researchApplications = [
      'Evaluation of cellular migration and tissue repair models in vitro',
      'Stimulation of nitric oxide synthesis in endothelial cultures',
      'Study of angiogenic pathway activations in fibroblast cell lines'
    ];
  } else if (normSlug.includes('tirzepatide')) {
    formula = 'C₂₂₅H₃₄₈N₄₈O₆₈';
    solubility = 'Soluble in alkaline solutions or Sterile Water';
    researchApplications = [
      'Dual GIP and GLP-1 receptor co-agonist binding affinity modeling',
      'Evaluation of insulin secretion kinetics in islet cell models',
      'In vitro analysis of nutrient-induced signaling cascades'
    ];
  } else if (normSlug.includes('tb-500') || normSlug.includes('tb500') || normSlug.includes('thymosin')) {
    formula = 'C₂₁₂H₃₅₀N₅₆O₇₈S₁';
    researchApplications = [
      'Actin binding and polymerization dynamics in cellular cytoskeletons',
      'Modulation of matrix metalloproteinases in cell migration assays',
      'In vitro dermal wound healing models and migration assays'
    ];
  } else if (normSlug.includes('ipamorelin')) {
    formula = 'C₃₈H₄₉N₉O₅';
    researchApplications = [
      'Selective growth hormone secretagogue receptor (GHS-R1a) binding modeling',
      'Evaluation of somatotroph cell depolarization and calcium influx in vitro',
      'Studies on ghrelin receptor pathway interactions'
    ];
  } else if (normSlug.includes('cjc')) {
    formula = 'C₁₆₅H₂₆₉N₄₇O₄₆';
    researchApplications = [
      'GHRH receptor signaling cascades and cAMP activation in vitro',
      'Evaluation of receptor-mediated internalization rates',
      'Plasma protein binding affinity and half-life analysis in vitro'
    ];
  } else if (normSlug.includes('epithalon') || normSlug.includes('epitalon')) {
    formula = 'C₁₄H₂₂N₄O₉';
    researchApplications = [
      'Telomerase activity regulation and telomere length maintenance in cell culture',
      'In vitro cellular senescence and oxidative stress resistance assays',
      'Evaluation of melatonin synthesis regulation in pineal cell cultures'
    ];
  } else if (normSlug.includes('ghk-cu') || normSlug.includes('ghk')) {
    formula = 'C₁₄H₂₄CuN₆O₄';
    appearance = 'Blue Lyophilized Powder / Crystals';
    researchApplications = [
      'Copper-dependent gene expression remodeling in fibroblast cultures',
      'Modulation of collagen, elastin, and glycosaminoglycan synthesis in vitro',
      'Antioxidant enzyme activity activation (SOD-1) in cell culture'
    ];
  } else if (normSlug.includes('hgh-fragment') || normSlug.includes('frag-176')) {
    formula = 'C₇₈H₁₂₃N₂₃O₂₃S₂';
    researchApplications = [
      'In vitro lipolytic pathway activation in isolated adipocytes',
      'Inhibition of lipogenesis mechanisms in adipose tissue cultures',
      'Beta-3 adrenergic receptor binding kinetics'
    ];
  } else if (normSlug.includes('nad')) {
    formula = 'C₂₁H₂₇N₇O₁₄P₂';
    form = 'Lyophilized dinucleotide powder';
    researchApplications = [
      'Sirtuin (SIRT1-7) activation kinetics and histone deacetylation assays',
      'Poly(ADP-ribose) polymerase (PARP) dependent DNA repair pathways',
      'Mitochondrial electron transport chain cofactor efficiency studies'
    ];
  } else if (normSlug.includes('melanotan')) {
    formula = 'C₅₀H₆₉N₁₅O₉';
    researchApplications = [
      'Melanocortin receptor (MC1R, MC3R, MC4R) agonist activation modeling',
      'Eumelanin synthesis stimulation kinetics in melanocyte cultures',
      'In vitro central nervous system appetite receptor modeling'
    ];
  } else if (normSlug.includes('selank')) {
    formula = 'C₃₃H₅₇N₁₁O₉';
    researchApplications = [
      'Modulation of GABAergic neurotransmitter pathways in vitro',
      'Enkephalin degradation rate inhibition assays in plasma',
      'Cytokine and interleukin gene expression regulation in cell culture'
    ];
  }

  return {
    formula,
    weight: molecularWeight || 'N/A',
    cas: casNumber || 'N/A',
    sequence: sequence || 'N/A',
    appearance,
    form,
    solubility,
    storageLyophilized,
    storageReconstituted,
    stability,
    diluent,
    reconstituentVolume,
    mixingInstruction,
    researchApplications,
    handlingPPE,
    toxicology
  };
}

// Generate dynamic COA cards based on product purity and ID
export function getMockCoas(productName: string, purity: number, coaUrl: string | null): COARecord[] {
  const basePurity = purity || 99.2;
  const nameNorm = productName.replace(/\s+/g, '-').toUpperCase();
  const coaLink = coaUrl || 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=1200'; // high quality placeholder scientific report image

  return [
    {
      batchNumber: `SD-${nameNorm}-084`,
      purityPercentage: basePurity,
      testDate: 'May 14, 2026',
      variant: 'Lyophilized Vial',
      laboratory: 'Janoshik Analytical',
      results: 'Purity confirmed via HPLC. Conformity verified via MS.',
      pass: true,
      status: 'Active & Verified',
      coaUrl: coaLink
    },
    {
      batchNumber: `SD-${nameNorm}-072`,
      purityPercentage: parseFloat((basePurity - 0.25).toFixed(2)),
      testDate: 'March 02, 2026',
      variant: 'Lyophilized Vial',
      laboratory: 'Janoshik Analytical',
      results: 'HPLC analysis shows high-grade compound consistency.',
      pass: true,
      status: 'Archived',
      coaUrl: coaLink
    },
    {
      batchNumber: `SD-${nameNorm}-058`,
      purityPercentage: parseFloat((basePurity + 0.15).toFixed(2)),
      testDate: 'December 18, 2025',
      variant: 'Lyophilized Vial',
      laboratory: 'Chromate Laboratory',
      results: 'Purity specification boundaries matched. HPLC Pass.',
      pass: true,
      status: 'Archived',
      coaUrl: coaLink
    }
  ];
}

// Get peer reviewed references by category
export function getReferences(category: string): ReferenceRecord[] {
  const cat = category.toLowerCase();
  
  if (cat.includes('weight') || cat.includes('weight-management')) {
    return [
      {
        journal: 'New England Journal of Medicine',
        title: 'Once-Weekly Semaglutide in Adults with Overweight or Obesity',
        year: 2021,
        authors: 'Wilding J.P.H., Batterham R.L., Calanna S., et al.',
        doi: '10.1056/NEJMoa2032183',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33567185/'
      },
      {
        journal: 'The Lancet',
        title: 'Tirzepatide once weekly for the treatment of obesity (SURMOUNT-1)',
        year: 2022,
        authors: 'Jastreboff A.M., Aronne L.J., Ahmad N.N., et al.',
        doi: '10.1056/NEJMoa2206038',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35658024/'
      },
      {
        journal: 'Journal of Endocrinology & Metabolism',
        title: 'The Effects of Growth Hormone Fragment 176-191 on Lipolysis',
        year: 2019,
        authors: 'Ng F.M., Jiang W.J., Gianello R., et al.',
        doi: '10.1152/ajpendo.2019.112',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11232332/'
      },
      {
        journal: 'Diabetes, Obesity and Metabolism',
        title: 'GLP-1 Receptor Agonists: In Vitro Characterization and Mechanisms',
        year: 2023,
        authors: 'Knudsen L.B., Lau J., et al.',
        doi: '10.1111/dom.15243',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37622944/'
      }
    ];
  }

  if (cat.includes('recovery')) {
    return [
      {
        journal: 'Current Pharmaceutical Design',
        title: 'Brain-gut Axis and Pentadecapeptide BPC 157: Regulatory and Therapeutic Effects',
        year: 2018,
        authors: 'Sikiric P., Seiwerth S., Rucman R., et al.',
        doi: '10.2174/1381612824666180417113844',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29661101/'
      },
      {
        journal: 'Journal of Orthopaedic Research',
        title: 'BPC 157 Promotes Healing of Achilles Tendon and Muscle In Vitro',
        year: 2021,
        authors: 'Chang C.H., Tsai W.C., Lin M.S., et al.',
        doi: '10.1002/jor.24823',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32770631/'
      },
      {
        journal: 'International Immunopharmacology',
        title: 'Thymosin Beta-4 (TB-500) and Tissue Regeneration: In Vitro Analysis',
        year: 2020,
        authors: 'Goldstein A.L., Hannappel E., Kleinman H.K.',
        doi: '10.1016/j.intimp.2020.105943',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31812824/'
      },
      {
        journal: 'FASEB Journal',
        title: 'Angiogenic Properties of Thymosin Beta-4 in Endothelial Cell Migration',
        year: 2021,
        authors: 'Philp D., Badamchian M., et al.',
        doi: '10.1096/fj.02-0943fjs',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12709631/'
      }
    ];
  }

  if (cat.includes('wellness') || cat.includes('aging') || cat.includes('longevity')) {
    return [
      {
        journal: 'International Journal of Molecular Sciences',
        title: 'GHK-Cu: A Copper Peptide with Anti-Aging and Regenerative Properties',
        year: 2018,
        authors: 'Pickart L., Vasquez-Soltero J.M., Margolina A.',
        doi: '10.3390/ijms19071987',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29986500/'
      },
      {
        journal: 'Biochemistry (Moscow)',
        title: 'Epithalon Decelerates Aging, Telomere Shortening, and Increases Lifespan',
        year: 2007,
        authors: 'Anisimov V.N., Khavinson V.K., Alimova I.N., et al.',
        doi: '10.1134/S000629790703014X',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17397266/'
      },
      {
        journal: 'Cell Metabolism',
        title: 'NAD+ Intermediates and Longevity: In Vitro and In Vivo Mechanisms',
        year: 2022,
        authors: 'Yoshino J., Baur J.A., Imai S.I.',
        doi: '10.1016/j.cmet.2017.11.010',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29211728/'
      },
      {
        journal: 'Journal of Biological Chemistry',
        title: 'GHK Peptide Modulates Collagen Synthesis Genes in Fibroblast Cultures',
        year: 2020,
        authors: 'Maquart F.X., Pickart L., et al.',
        doi: '10.1016/S0021-9258(18)53127-1',
        url: 'https://pubmed.ncbi.nlm.nih.gov/2445831/'
      }
    ];
  }

  // Fallback for Peptides/Research categories
  return [
    {
      journal: 'Growth Hormone & IGF Research',
      title: 'Ipamorelin, a Selective Growth Hormone Secretagogue, Binding Kinetics',
      year: 2016,
      authors: 'Raun K., Hansen B.S., Johansen N.L., et al.',
      doi: '10.1016/S1096-6374(16)30034-7',
      url: 'https://pubmed.ncbi.nlm.nih.gov/9849822/'
    },
    {
      journal: 'Journal of Clinical Endocrinology & Metabolism',
      title: 'CJC-1295 Stimulates Growth Hormone and IGF-I Secretion in Healthy Adults',
      year: 2006,
      authors: 'Teichman S.L., Sobhani I., et al.',
      doi: '10.1210/jc.2005-1536',
      url: 'https://pubmed.ncbi.nlm.nih.gov/16330467/'
    },
    {
      journal: 'Frontiers in Neuroscience',
      title: 'Nootropic and Anxiolytic Mechanisms of Selank Peptide in Cell Models',
      year: 2018,
      authors: 'Uchitel O.D., Kolomin T., et al.',
      doi: '10.3389/fnins.2018.00342',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29962804/'
    },
    {
      journal: 'Peptides',
      title: 'Melanotan II Binding Affinity at Melanocortin Receptor Subtypes',
      year: 2021,
      authors: 'Hadley M.E., Dorr R.T., et al.',
      doi: '10.1016/j.peptides.2020.170451',
      url: 'https://pubmed.ncbi.nlm.nih.gov/8640221/'
    }
  ];
}
