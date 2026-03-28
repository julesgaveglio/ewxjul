export interface NafEntry {
  label: string
  priority: number
  avg_ticket: number | null
  seasonal: boolean
  tags: string[]
}

export const NAF_MATRIX: Record<string, NafEntry> = {
  // 🥇 BTP & artisans — MEILLEURE NICHE (48% sans site, gros panier 1500–5000€)
  '43': {
    label: 'Travaux de construction spécialisés',
    priority: 95,
    avg_ticket: 5000,
    seasonal: true,
    tags: ['artisan', 'B2C', 'urgent', 'top-niche'],
  },
  '41': {
    label: 'Construction de bâtiments',
    priority: 90,
    avg_ticket: 8000,
    seasonal: true,
    tags: ['BTP', 'B2C', 'urgent'],
  },
  '42': {
    label: 'Génie civil',
    priority: 82,
    avg_ticket: 6000,
    seasonal: true,
    tags: ['BTP', 'B2B'],
  },
  // 🥈 Agriculture / producteurs locaux — BLUE OCEAN (65% sans site, peu de concurrence)
  '01': {
    label: 'Agriculture, maraîchage, élevage',
    priority: 92,
    avg_ticket: 2000,
    seasonal: true,
    tags: ['agriculture', 'B2C', 'blue-ocean', 'circuits-courts'],
  },
  '02': {
    label: 'Sylviculture, exploitation forestière',
    priority: 70,
    avg_ticket: 3000,
    seasonal: true,
    tags: ['agriculture', 'B2B'],
  },
  '10': {
    label: 'Industrie alimentaire / transformation',
    priority: 78,
    avg_ticket: 2500,
    seasonal: true,
    tags: ['agro-alimentaire', 'B2C'],
  },
  // 🥉 Restaurants / hôtels — ARGENT RAPIDE (dépendance Booking, sites souvent nuls)
  '56': {
    label: 'Restauration',
    priority: 88,
    avg_ticket: 3500,
    seasonal: true,
    tags: ['restauration', 'B2C', 'urgent', 'booking-dependance'],
  },
  '55': {
    label: 'Hébergement touristique (hôtels, gîtes…)',
    priority: 85,
    avg_ticket: 4500,
    seasonal: true,
    tags: ['tourisme', 'B2C', 'urgent', 'booking-dependance'],
  },
  // 4. Services à la personne (55% sans site, forte demande Google locale)
  '88': {
    label: 'Action sociale / services à la personne',
    priority: 87,
    avg_ticket: 1800,
    seasonal: false,
    tags: ['service', 'B2C', 'local', 'haute-demande-google'],
  },
  // 5. Artisans d'art (très peu digitalisés, Instagram ≠ SEO)
  '90': {
    label: 'Activités créatives et artistiques',
    priority: 78,
    avg_ticket: 2000,
    seasonal: false,
    tags: ['artisanat-art', 'B2C', 'storytelling'],
  },
  // 6. Professions santé (crédibilité + Doctolib insuffisant)
  '86': {
    label: 'Activités pour la santé humaine',
    priority: 75,
    avg_ticket: 2000,
    seasonal: false,
    tags: ['santé', 'B2C', 'crédibilité'],
  },
  '87': {
    label: 'Hébergement médico-social',
    priority: 60,
    avg_ticket: 3000,
    seasonal: false,
    tags: ['santé', 'B2B/B2C'],
  },
  // 7. Services personnels (coiffure, beauté…)
  '96': {
    label: 'Services personnels (coiffure, beauté…)',
    priority: 80,
    avg_ticket: 2000,
    seasonal: false,
    tags: ['service', 'B2C', 'local'],
  },
  // 8. Commerce de détail (40% sans site, click & collect sous-exploité)
  '47': {
    label: 'Commerce de détail',
    priority: 72,
    avg_ticket: 2500,
    seasonal: true,
    tags: ['commerce', 'B2C', 'click-collect'],
  },
  // 9. Automobile
  '45': {
    label: 'Commerce et réparation automobile',
    priority: 68,
    avg_ticket: 4000,
    seasonal: false,
    tags: ['auto', 'B2C'],
  },
  // 10. Immobilier
  '68': {
    label: 'Activités immobilières',
    priority: 62,
    avg_ticket: 8000,
    seasonal: false,
    tags: ['immobilier', 'B2B/B2C'],
  },
  // 11. Conseil / juridique
  '69': {
    label: 'Activités juridiques et comptables',
    priority: 55,
    avg_ticket: 6000,
    seasonal: false,
    tags: ['conseil', 'B2B'],
  },
  // ❌ Transport / logistique — moins intéressant (peu digitalisés, décision lente)
  '49': {
    label: 'Transport terrestre / taxi',
    priority: 45,
    avg_ticket: 3000,
    seasonal: false,
    tags: ['transport', 'B2C', 'decision-lente'],
  },
}

const DEFAULT_ENTRY: NafEntry = {
  label: 'Autre',
  priority: 40,
  avg_ticket: null,
  seasonal: false,
  tags: [],
}

/**
 * Looks up a NAF entry by the first 2 characters of the NAF code (division level).
 * Falls back to the default entry if no match is found.
 */
export function getNafEntry(nafCode: string): NafEntry {
  // NAF codes are like "5610A", "4711B" — match on first 2 digits (division)
  const prefix2 = nafCode.slice(0, 2)
  if (NAF_MATRIX[prefix2]) {
    return NAF_MATRIX[prefix2]
  }

  // Also try 4-char prefix in case the matrix is extended later
  const prefix4 = nafCode.slice(0, 4)
  for (const key of Object.keys(NAF_MATRIX)) {
    if (prefix4.startsWith(key)) {
      return NAF_MATRIX[key]
    }
  }

  return DEFAULT_ENTRY
}

/**
 * Returns a priority score (0–100) for a lead based on sector name or NAF code.
 * NAF code takes precedence over sector string when both are provided.
 */
export function getSectorPriority(sector: string | null, naf: string | null): number {
  if (naf) {
    return getNafEntry(naf).priority
  }

  if (sector) {
    const normalized = sector.toLowerCase()

    // 🥇 BTP & artisans — meilleure niche (95)
    if (/plombier|plomberie|électricien|electricien|maçon|maçonnerie|maconnerie|charpente|couvreur|carrelage|peintre en bât|menuiserie|chauffagiste|climatisation|serrurier|vitrier/.test(normalized)) return 95
    // 🥈 Agriculture / producteurs locaux — blue ocean (92)
    if (/maraîcher|maraicher|agriculteur|agriculture|producteur|ferme\b|fermier|éleveur|eleveur|viticulteur|arboriculteur|apiculteur|circuit.?court|bio\b/.test(normalized)) return 92
    // Services à la personne (87)
    if (/aide.?à.?domicile|garde.?d.?enfant|auxiliaire.?de.?vie|femme.?de.?ménage|jardinage|garde.?animal/.test(normalized)) return 87
    // 🥉 Restaurants (88)
    if (/restaurant|brasserie|pizz|traiteur|café|bar\b|snack|kebab|sushi|crêperie|creperie|fast.?food/.test(normalized)) return 88
    // Hébergement (85)
    if (/hôtel|hotel|gîte|gite|chambre.?d.?hôte|auberge|camping/.test(normalized)) return 85
    // Services personnels (80)
    if (/coiffeur|coiffure|esthétique|estheti|beauté|beaute|nail\s*bar|spa\b|massage|institut/.test(normalized)) return 80
    // Artisans d'art (78)
    if (/artisan.?d.?art|potier|sculpteur|céramiste|ceramiste|luthier|ébéniste|ebeniste|joaillier/.test(normalized)) return 78
    // Santé (75)
    if (/médecin|medecin|dentiste|kiné|kinesithérapeute|pharmacie|infirmier|orthophoniste/.test(normalized)) return 75
    // Commerce de détail (72)
    if (/commerce|boutique|magasin|librairie|épicerie|epicerie|fleuriste|bijouterie/.test(normalized)) return 72
    // Automobile (68)
    if (/garage|mécanique|mecanique|carrosserie|auto/.test(normalized)) return 68
    // Immobilier (62)
    if (/immobilier|agence immobilière|promoteur/.test(normalized)) return 62
    // Conseil / juridique (55)
    if (/comptable|expertise comptable|avocat|notaire|juridique/.test(normalized)) return 55
    // Transport (45) — moins intéressant
    if (/taxi|vtc|transport|livraison/.test(normalized)) return 45
  }

  return DEFAULT_ENTRY.priority
}

/**
 * Attempts to normalize a raw sector name using keyword matching.
 * Returns a canonical sector label or null if no match is found.
 */
export function detectSectorFromName(name: string, sector: string | null): string | null {
  const haystack = `${name} ${sector ?? ''}`.toLowerCase()

  // 🥇 BTP & artisans
  if (/plombier|plomberie|électricien|electricien|maçon|maçonnerie|maconnerie|charpente|couvreur|carrelage|peintre en bât|menuiserie|chauffagiste|climatisation|serrurier|vitrier/.test(haystack)) {
    return 'Construction & artisanat'
  }
  // 🥈 Agriculture / producteurs locaux
  if (/maraîcher|maraicher|agriculteur|agriculture|producteur|ferme\b|fermier|éleveur|eleveur|viticulteur|arboriculteur|apiculteur|circuit.?court/.test(haystack)) {
    return 'Agriculture & circuits courts'
  }
  // Services à la personne
  if (/aide.?à.?domicile|garde.?d.?enfant|auxiliaire.?de.?vie|femme.?de.?ménage|jardinage|garde.?animal/.test(haystack)) {
    return 'Services à la personne'
  }
  // 🥉 Restauration
  if (/restaurant|brasserie|pizz|traiteur|café|bar\b|snack|kebab|sushi|crêperie|creperie|fast.?food/.test(haystack)) {
    return 'Restauration'
  }
  // Hébergement
  if (/hôtel|hotel|gîte|gite|chambre.?d.?hôte|auberge|camping/.test(haystack)) {
    return 'Hébergement touristique'
  }
  // Artisans d'art
  if (/artisan.?d.?art|potier|sculpteur|céramiste|ceramiste|luthier|ébéniste|ebeniste|joaillier/.test(haystack)) {
    return "Artisanat d'art"
  }
  // Services personnels
  if (/coiffeur|coiffure|esthétique|estheti|beauté|beaute|nail\s*bar|spa\b|massage|institut/.test(haystack)) {
    return 'Services personnels'
  }
  // Santé
  if (/médecin|medecin|dentiste|kiné|kinésithérapeute|kinesithérapeute|pharmacie|infirmier|orthophoniste|santé|sante/.test(haystack)) {
    return 'Santé'
  }
  // Commerce de détail
  if (/commerce|boutique|magasin|librairie|épicerie|epicerie|fleuriste|bijouterie|retail/.test(haystack)) {
    return 'Commerce de détail'
  }
  // Automobile
  if (/garage|mécanique|mecanique|carrosserie|auto/.test(haystack)) {
    return 'Automobile'
  }
  // Immobilier
  if (/immobilier|agence immobilière|agence immobiliere|promoteur/.test(haystack)) {
    return 'Immobilier'
  }
  // Conseil / juridique
  if (/comptable|expertise comptable|avocat|notaire|juridique|cabinet/.test(haystack)) {
    return 'Conseil & juridique'
  }
  // Transport
  if (/taxi|vtc|transport|livraison|coursier/.test(haystack)) {
    return 'Transport'
  }

  return sector ?? null
}
