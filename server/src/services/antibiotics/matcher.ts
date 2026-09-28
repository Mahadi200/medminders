import { PrismaClient } from '@prisma/client';
import { CatalogueMatcher, CatalogueMatchResult, MedicineMatchCandidate } from '../catalogue/catalogueMatcher.js';
import { prisma } from '../database/prisma.js';

export interface MatchResult {
  match: Awaited<ReturnType<typeof findAntibioticById>> | null;
  confidence: number;
  matched_on: 'generic' | 'brand' | 'fuzzy' | null;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  candidates?: MedicineMatchCandidate[];
  catalogueVersion?: string;
}

/**
 * Enhanced antibiotic matching against reviewed, versioned catalogue.
 * Invariant: Never automatically selects a candidate when OCR scan is ambiguous or below decisive confidence.
 */
export async function matchAntibiotic(medicineName: string, customPrisma?: PrismaClient): Promise<MatchResult> {
  const db = customPrisma || prisma;
  const result: CatalogueMatchResult = await CatalogueMatcher.match(medicineName, db);

  if (!result.candidates.length) {
    return {
      match: null,
      confidence: 0,
      matched_on: null,
      isAmbiguous: false,
      candidates: [],
      catalogueVersion: result.catalogueVersion,
    };
  }

  // If match is ambiguous or unclear, DO NOT auto-select
  if (result.isAmbiguous || !result.selectedCandidate) {
    return {
      match: null,
      confidence: result.confidence,
      matched_on: 'fuzzy',
      isAmbiguous: true,
      ambiguityReason: result.ambiguityReason,
      candidates: result.candidates,
      catalogueVersion: result.catalogueVersion,
    };
  }

  // High-confidence, unambiguous match
  const selected = result.selectedCandidate;
  const antibioticRecord = await db.antibiotic.findFirst({
    where: {
      OR: [
        { genericName: { equals: selected.genericName, mode: 'insensitive' } },
        { brandNames: { has: selected.brandName || '' } },
      ],
    },
  });

  return {
    match: antibioticRecord || {
      id: selected.genericId,
      genericName: selected.genericName,
      group: selected.antibioticClass || null,
      brandNames: selected.brandName ? [selected.brandName] : [],
      companies: selected.manufacturer ? [selected.manufacturer] : [],
      ageConsiderations: null,
      doseDuration: null,
      sideEffects: null,
      awareCategory: (selected.awareGroup as any) || 'UNCLASSIFIED',
      whoListingUrl: null,
      catalogueVersion: result.catalogueVersion || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    confidence: selected.confidence,
    matched_on: selected.matchedOn.includes('generic') ? 'generic' : 'brand',
    isAmbiguous: false,
    candidates: result.candidates,
    catalogueVersion: result.catalogueVersion,
  };
}

export async function findAntibioticById(id: string) {
  return prisma.antibiotic.findUnique({ where: { id } });
}
