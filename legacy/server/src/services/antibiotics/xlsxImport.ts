import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BENGALI_HEADERS: Record<string, string> = {
  'জেনেরিক নাম': 'genericName',
  'গ্রুপ (শ্রেণিবিভাগ)': 'group',
  'কমার্শিয়াল নাম (উদাহরণ)': 'brandNames',
  'কোম্পানি (উদাহরণ)': 'companies',
  'ব্যবহারের ক্ষেত্রে প্রধান বয়সসীমা ও বিবেচনা': 'ageConsiderations',
  'Dose & Duration (ডোজ ও সময়কাল)': 'doseDuration',
  'Side Effects (সাইড ইফেক্ট)': 'sideEffects',
};

const ALTERNATE_HEADERS: Record<string, string> = {
  'generic': 'genericName',
  'group': 'group',
  'brand': 'brandNames',
  'company': 'companies',
  'age': 'ageConsiderations',
  'dose': 'doseDuration',
  'side effects': 'sideEffects',
};

export interface ImportResult {
  rows_read: number;
  unique_generics: number;
  created: number;
  updated: number;
  errors: string[];
}

function parseValue(val: unknown): string {
  if (val == null || val === '') return '';
  return String(val).trim();
}

function parseBrands(val: string): string[] {
  if (!val) return [];
  return val
    .split(/[,;\/\|]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseCompanies(val: string): string[] {
  if (!val) return [];
  return val
    .split(/[,;\/\|]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export async function importAntibioticsFromXlsx(buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const result: ImportResult = { rows_read: 0, unique_generics: 0, created: 0, updated: 0, errors: [] };

  let lastGeneric = '';
  let lastGroup = '';
  let lastAge = '';
  let lastDose = '';
  let lastSide = '';
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const headers = Object.keys(row);
    const map: Record<string, string> = {};

    for (const h of headers) {
      const norm = h.trim().toLowerCase();
      const val = parseValue(row[h]);
      if (BENGALI_HEADERS[h]) map[BENGALI_HEADERS[h]] = val;
      else if (ALTERNATE_HEADERS[norm]) map[ALTERNATE_HEADERS[norm]] = val;
    }

    result.rows_read++;

    let genericName = map.genericName || lastGeneric;
    if (genericName) lastGeneric = genericName;
    if (map.group) lastGroup = map.group;
    else if (lastGroup) map.group = lastGroup;
    if (map.ageConsiderations) lastAge = map.ageConsiderations;
    else if (lastAge) map.ageConsiderations = lastAge;
    if (map.doseDuration) lastDose = map.doseDuration;
    else if (lastDose) map.doseDuration = lastDose;
    if (map.sideEffects) lastSide = map.sideEffects;
    else if (lastSide) map.sideEffects = lastSide;

    if (!genericName) {
      result.errors.push(`Row ${i + 2}: Missing generic name`);
      continue;
    }

    const brands = parseBrands(map.brandNames || '');
    const companies = parseCompanies(map.companies || '');

    try {
      const existing = await prisma.antibiotic.findUnique({ where: { genericName } });
      const data = {
        genericName,
        group: map.group || null,
        brandNames: [...new Set([...(existing?.brandNames ?? []), ...brands])],
        companies: [...new Set([...(existing?.companies ?? []), ...companies])],
        ageConsiderations: map.ageConsiderations || null,
        doseDuration: map.doseDuration || null,
        sideEffects: map.sideEffects || null,
      };

      if (existing) {
        await prisma.antibiotic.update({ where: { id: existing.id }, data });
        result.updated++;
      } else {
        await prisma.antibiotic.create({ data });
        result.created++;
      }
      seen.add(genericName);
    } catch (e) {
      result.errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  result.unique_generics = seen.size;
  return result;
}
