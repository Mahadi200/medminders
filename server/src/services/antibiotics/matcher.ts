import { PrismaClient } from '@prisma/client';
import Levenshtein from 'fast-levenshtein';

const prisma = new PrismaClient();

export interface MatchResult {
  match: Awaited<ReturnType<typeof findAntibioticById>> | null;
  confidence: number;
  matched_on: 'generic' | 'brand' | 'fuzzy' | null;
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, '')
    .replace(/\b\d+(?:\.\d+)?\s*(mg|ml|g|gm|mcg)\b/gi, '')
    .replace(/\b(od|bd|tds|qid|hs|sos|prn)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigramSimilarity(a: string, b: string): number {
  const triA = new Set<string>();
  const triB = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) triA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) triB.add(b.slice(i, i + 3));
  const intersect = [...triA].filter(t => triB.has(t)).length;
  const union = new Set([...triA, ...triB]).size;
  return union > 0 ? intersect / union : 0;
}

function levenshteinSimilarity(a: string, b: string): number {
  const d = Levenshtein.get(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - d / maxLen;
}

export async function matchAntibiotic(medicineName: string): Promise<MatchResult> {
  const norm = normalize(medicineName);
  if (!norm || norm.length < 2) return { match: null, confidence: 0, matched_on: null };

  const antibiotics = await prisma.antibiotic.findMany();
  if (antibiotics.length === 0) return { match: null, confidence: 0, matched_on: null };

  for (const ab of antibiotics) {
    const genNorm = normalize(ab.genericName);
    if (genNorm === norm) {
      return { match: ab, confidence: 1, matched_on: 'generic' };
    }
  }

  for (const ab of antibiotics) {
    for (const brand of ab.brandNames) {
      if (normalize(brand) === norm) {
        return { match: ab, confidence: 0.98, matched_on: 'brand' };
      }
    }
  }

  let best: { ab: typeof antibiotics[0]; score: number } | null = null;
  for (const ab of antibiotics) {
    const genSim = Math.max(
      trigramSimilarity(norm, normalize(ab.genericName)),
      levenshteinSimilarity(norm, normalize(ab.genericName))
    );
    if (genSim > 0.7 && (!best || genSim > best.score)) {
      best = { ab, score: genSim };
    }
    for (const brand of ab.brandNames) {
      const brandSim = Math.max(
        trigramSimilarity(norm, normalize(brand)),
        levenshteinSimilarity(norm, normalize(brand))
      );
      if (brandSim > 0.7 && (!best || brandSim > best.score)) {
        best = { ab, score: brandSim };
      }
    }
  }

  if (best && best.score >= 0.75) {
    return { match: best.ab, confidence: best.score, matched_on: 'fuzzy' };
  }
  return { match: null, confidence: 0, matched_on: null };
}

export async function findAntibioticById(id: string) {
  return prisma.antibiotic.findUnique({ where: { id } });
}
