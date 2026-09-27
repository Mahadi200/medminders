import { PrismaClient, AwareCategory } from '@prisma/client';
import Levenshtein from 'fast-levenshtein';

const prisma = new PrismaClient();

export interface MedicineMatchCandidate {
  genericId: string;
  genericName: string;
  brandName?: string;
  manufacturer?: string;
  antibioticClass?: string;
  awareGroup: AwareCategory | 'UNCLASSIFIED' | 'UNKNOWN';
  confidence: number;
  matchedOn: 'exact_generic' | 'exact_brand' | 'fuzzy_generic' | 'fuzzy_brand';
  matchedQuery: string;
}

export interface CatalogueMatchResult {
  query: string;
  normalizedQuery: string;
  selectedCandidate: MedicineMatchCandidate | null;
  candidates: MedicineMatchCandidate[];
  confidence: number;
  isAmbiguous: boolean;
  ambiguityReason?: string;
  requiresClinicianConfirmation: boolean;
  catalogueVersion?: string;
}

export function normalizeMedicineQuery(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(mg|ml|g|gm|mcg|iu|miu)\b/gi, '')
    .replace(/\b(tab|capsule|tablet|cap|syrup|syr|inj|injection|suspension|susp)\b/gi, '')
    .replace(/\b\d+\s*-\s*\d+\s*-\s*\d+\b/g, '') // e.g. 1-0-1
    .replace(/\b(od|bd|tds|qid|hs|sos|prn|stat|daily|weekly)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const triA = new Set<string>();
  const triB = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) triA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) triB.add(b.slice(i, i + 3));
  const intersect = [...triA].filter(t => triB.has(t)).length;
  const union = new Set([...triA, ...triB]).size;
  return union > 0 ? intersect / union : 0;
}

function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const d = Levenshtein.get(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : Math.max(0, 1 - d / maxLen);
}

function computeSimilarity(query: string, target: string): number {
  if (!query || !target) return 0;
  if (query === target) return 1.0;

  let bestSim = Math.max(
    trigramSimilarity(query, target),
    levenshteinSimilarity(query, target)
  );

  // Substring match on target (e.g. target contains query)
  if (target.includes(query) && query.length >= 3) {
    const subSim = Math.max(0.70, Math.min(0.84, query.length / target.length));
    bestSim = Math.max(bestSim, subSim);
  }

  // Token-level comparisons (split by spaces, underscores, hyphens)
  const tokens = target.split(/[\s_\-]+/).filter(t => t.length > 0);
  for (const token of tokens) {
    if (token === query) {
      bestSim = Math.max(bestSim, 0.95);
      continue;
    }
    if (token.startsWith(query) && query.length >= 3) {
      // Partial prefix on a token: e.g. 'amox' on 'amoxicillin'
      const prefixSim = 0.70 + 0.14 * (query.length / token.length);
      bestSim = Math.max(bestSim, Math.min(0.84, prefixSim));
    } else if (query.startsWith(token) && token.length >= 3) {
      const prefixSim = 0.70 + 0.12 * (token.length / query.length);
      bestSim = Math.max(bestSim, Math.min(0.84, prefixSim));
    }
    const tokenSim = Math.max(
      trigramSimilarity(query, token),
      levenshteinSimilarity(query, token)
    );
    bestSim = Math.max(bestSim, tokenSim);
  }

  return Math.round(bestSim * 100) / 100;
}

export class CatalogueMatcher {
  /**
   * Matches raw or OCR medicine text against the published catalogue.
   * Invariant: Never automatically forces a selection on unclear or ambiguous OCR.
   */
  static async match(rawQuery: string, customPrisma?: PrismaClient): Promise<CatalogueMatchResult> {
    const db = customPrisma || prisma;
    const normalizedQuery = normalizeMedicineQuery(rawQuery);

    if (!normalizedQuery || normalizedQuery.length < 2) {
      return {
        query: rawQuery,
        normalizedQuery,
        selectedCandidate: null,
        candidates: [],
        confidence: 0,
        isAmbiguous: false,
        ambiguityReason: 'Search query is too short or empty',
        requiresClinicianConfirmation: true,
      };
    }

    // 1. Fetch current active published catalogue release
    const activeRelease = await db.catalogueRelease.findFirst({
      where: { status: 'PUBLISHED' },
      include: {
        generics: {
          include: { brands: true },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    const candidates: MedicineMatchCandidate[] = [];
    let catalogueVersion = activeRelease?.version || 'unversioned_initial';

    if (activeRelease && activeRelease.generics.length > 0) {
      // Search in normalized published catalogue
      for (const gen of activeRelease.generics) {
        const normGen = normalizeMedicineQuery(gen.genericName);

        // Check A: Exact Generic Match
        if (normGen === normalizedQuery) {
          candidates.push({
            genericId: gen.id,
            genericName: gen.genericName,
            antibioticClass: gen.antibioticClass || undefined,
            awareGroup: gen.awareGroup,
            confidence: 1.0,
            matchedOn: 'exact_generic',
            matchedQuery: gen.genericName,
          });
        }

        // Check B: Exact Brand Match
        for (const brand of gen.brands) {
          const normBrand = normalizeMedicineQuery(brand.brandName);
          if (normBrand === normalizedQuery) {
            candidates.push({
              genericId: gen.id,
              genericName: gen.genericName,
              brandName: brand.brandName,
              manufacturer: brand.manufacturer || undefined,
              antibioticClass: gen.antibioticClass || undefined,
              awareGroup: gen.awareGroup,
              confidence: 0.98,
              matchedOn: 'exact_brand',
              matchedQuery: brand.brandName,
            });
          }
        }

        // Check C: Fuzzy Generic & Brand Matching
        const genSim = computeSimilarity(normalizedQuery, normGen);

        if (genSim >= 0.65) {
          candidates.push({
            genericId: gen.id,
            genericName: gen.genericName,
            antibioticClass: gen.antibioticClass || undefined,
            awareGroup: gen.awareGroup,
            confidence: genSim,
            matchedOn: 'fuzzy_generic',
            matchedQuery: gen.genericName,
          });
        }

        for (const brand of gen.brands) {
          const normBrand = normalizeMedicineQuery(brand.brandName);
          const brandSim = computeSimilarity(normalizedQuery, normBrand);

          if (brandSim >= 0.65) {
            candidates.push({
              genericId: gen.id,
              genericName: gen.genericName,
              brandName: brand.brandName,
              manufacturer: brand.manufacturer || undefined,
              antibioticClass: gen.antibioticClass || undefined,
              awareGroup: gen.awareGroup,
              confidence: brandSim,
              matchedOn: 'fuzzy_brand',
              matchedQuery: brand.brandName,
            });
          }
        }
      }
    } else {
      // Fallback: search existing Antibiotic projection table if no catalogue release is published yet
      const fallbackList = await db.antibiotic.findMany();
      for (const ab of fallbackList) {
        const normGen = normalizeMedicineQuery(ab.genericName);
        if (normGen === normalizedQuery) {
          candidates.push({
            genericId: ab.id,
            genericName: ab.genericName,
            antibioticClass: ab.group || undefined,
            awareGroup: ab.awareCategory,
            confidence: 1.0,
            matchedOn: 'exact_generic',
            matchedQuery: ab.genericName,
          });
        }

        const genSim = computeSimilarity(normalizedQuery, normGen);
        if (genSim >= 0.65) {
          candidates.push({
            genericId: ab.id,
            genericName: ab.genericName,
            antibioticClass: ab.group || undefined,
            awareGroup: ab.awareCategory,
            confidence: genSim,
            matchedOn: 'fuzzy_generic',
            matchedQuery: ab.genericName,
          });
        }

        for (const brand of ab.brandNames) {
          const normBrand = normalizeMedicineQuery(brand);
          if (normBrand === normalizedQuery) {
            candidates.push({
              genericId: ab.id,
              genericName: ab.genericName,
              brandName: brand,
              antibioticClass: ab.group || undefined,
              awareGroup: ab.awareCategory,
              confidence: 0.98,
              matchedOn: 'exact_brand',
              matchedQuery: brand,
            });
          }

          const brandSim = computeSimilarity(normalizedQuery, normBrand);
          if (brandSim >= 0.65) {
            candidates.push({
              genericId: ab.id,
              genericName: ab.genericName,
              brandName: brand,
              antibioticClass: ab.group || undefined,
              awareGroup: ab.awareCategory,
              confidence: brandSim,
              matchedOn: 'fuzzy_brand',
              matchedQuery: brand,
            });
          }
        }
      }
    }

    // Deduplicate candidates by generic + brand and sort by confidence descending
    const uniqueMap = new Map<string, MedicineMatchCandidate>();
    for (const c of candidates) {
      const key = `${c.genericName}:${c.brandName || ''}`;
      const existing = uniqueMap.get(key);
      if (!existing || c.confidence > existing.confidence) {
        uniqueMap.set(key, c);
      }
    }

    const sortedCandidates = Array.from(uniqueMap.values()).sort((a, b) => b.confidence - a.confidence);

    if (sortedCandidates.length === 0) {
      return {
        query: rawQuery,
        normalizedQuery,
        selectedCandidate: null,
        candidates: [],
        confidence: 0,
        isAmbiguous: false,
        ambiguityReason: 'No matching medicines found in published catalogue',
        requiresClinicianConfirmation: true,
        catalogueVersion,
      };
    }

    const topCandidate = sortedCandidates[0];
    const runnerUp = sortedCandidates[1];

    // Ambiguity Detection:
    // 1. If multiple candidates have very close scores (score delta < 0.08), it is ambiguous (e.g. Linex vs Linox)
    const isCloseRunnerUp = runnerUp && (topCandidate.confidence - runnerUp.confidence < 0.08);

    // 2. If top score is below high-confidence decisive threshold (< 0.85), it is considered unclear OCR
    const isLowConfidence = topCandidate.confidence < 0.85;

    let isAmbiguous = false;
    let ambiguityReason: string | undefined;
    let selectedCandidate: MedicineMatchCandidate | null = null;

    if (isCloseRunnerUp) {
      isAmbiguous = true;
      ambiguityReason = `Ambiguous matches: Close candidate options found ('${topCandidate.matchedQuery}' and '${runnerUp.matchedQuery}'). Requires human confirmation.`;
    } else if (isLowConfidence) {
      isAmbiguous = true;
      ambiguityReason = `Confidence score (${topCandidate.confidence}) is below decisive threshold for automatic candidate selection.`;
    } else {
      // Clear winner with high confidence
      selectedCandidate = topCandidate;
    }

    return {
      query: rawQuery,
      normalizedQuery,
      selectedCandidate,
      candidates: sortedCandidates.slice(0, 5), // Return top 5 candidates for UI selection
      confidence: topCandidate.confidence,
      isAmbiguous,
      ambiguityReason,
      requiresClinicianConfirmation: true, // Always true for clinical safety on scanned drafts
      catalogueVersion,
    };
  }
}
