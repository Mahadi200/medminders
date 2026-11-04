/**
 * NLP Parser: Extract medicine name, strength, frequency, duration from OCR text
 * Supports Bengali + English mixed text
 */

export interface ParsedMedicine {
  medicine_name: string;
  strength?: string;
  form?: 'tablet' | 'capsule' | 'syrup' | 'ointment' | 'injection' | 'drop' | 'cream' | string;
  frequency?: string;
  duration?: string;
  route?: 'oral' | 'topical' | 'IV' | string;
  raw_line: string;
  confidence: number;
}

const STRENGTH_REGEX = /\b(\d+(?:\.\d+)?)\s*(mg|ml|g|gm|mcg|µg|iu|units?)\b/gi;
const DURATION_REGEX = /\b(?:x\s*|for\s*)?(\d+)\s*(?:days?|দিন|d|দিনের)\b/gi;
const BENGALI_DAYS = /(?:৫|৬|৭|৮|৯|১০|১১|১২|১৩|১৪)\s*দিন/gu;

const FREQUENCY_MAP: Record<string, string> = {
  od: 'Once daily',
  bd: 'Twice daily',
  tds: 'Three times daily',
  qid: 'Four times daily',
  hs: 'At bedtime',
  sos: 'As needed',
  prn: 'As needed',
  '1+0+1': '1+0+1 (Morning + Evening)',
  '0+1+0': '0+1+0 (Noon only)',
  '1+1+1': '1+1+1 (Three times)',
};

const FORM_KEYWORDS: Record<string, string> = {
  tablet: 'tablet', tab: 'tablet', tabs: 'tablet',
  capsule: 'capsule', cap: 'capsule', caps: 'capsule',
  syrup: 'syrup', susp: 'syrup',
  ointment: 'ointment', cream: 'cream', gel: 'ointment',
  injection: 'injection', inj: 'injection', iv: 'IV',
  drop: 'drop', drops: 'drop',
};

const ROUTE_KEYWORDS: Record<string, string> = {
  oral: 'oral', po: 'oral', 'by mouth': 'oral',
  topical: 'topical', apply: 'topical',
  iv: 'IV', intravenous: 'IV',
};

const FREQUENCY_TOKENS = new Set([
  'od', 'bd', 'tds', 'qid', 'hs', 'sos', 'prn',
  '1+0+1', '0+1+0', '1+1+1', '0+0+1',
  'twice', 'daily', 'thrice', 'once',
]);

export function parseMedicineText(ocrText: string): ParsedMedicine[] {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const medicines: ParsedMedicine[] = [];
  const seen = new Set<string>();

  let currentMed: ParsedMedicine | null = null;

  for (const line of lines) {
    if (line.length < 2) continue;
    if (/^(dr\.|doctor|date\b|rx\b|prescription)/i.test(line)) continue;

    const parsed = parseLine(line);
    if (parsed) {
      if (currentMed) {
        medicines.push(currentMed);
      }
      currentMed = parsed;
    } else if (currentMed) {
      // Continuation line for current medicine
      const extraStrength = extractStrength(line);
      const extraForm = extractForm(line);
      const extraFrequency = extractFrequency(line);
      const extraDuration = extractDuration(line);
      const extraRoute = extractRoute(line);

      let updated = false;
      if (extraStrength && !currentMed.strength) { currentMed.strength = extraStrength; updated = true; }
      if (extraForm && !currentMed.form) { currentMed.form = extraForm; updated = true; }
      if (extraFrequency && !currentMed.frequency) { currentMed.frequency = extraFrequency; updated = true; }
      if (extraDuration && !currentMed.duration) { currentMed.duration = extraDuration; updated = true; }
      if (extraRoute && !currentMed.route) { currentMed.route = extraRoute; updated = true; }

      if (updated) {
        currentMed.raw_line += '\n' + line;
        currentMed.confidence = calculateConfidence(
          currentMed.raw_line,
          currentMed.medicine_name,
          currentMed.strength || null,
          currentMed.frequency || null,
          currentMed.duration || null
        );
      }
    }
  }

  if (currentMed) {
    medicines.push(currentMed);
  }

  const result: ParsedMedicine[] = [];
  for (const med of medicines) {
    const key = med.medicine_name.toLowerCase() + '|' + (med.strength || '');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(med);
    }
  }

  return result;
}

function parseLine(line: string): ParsedMedicine | null {
  if (line.length < 3) return null;
  if (/^(dr\.|doctor|date|rx|prescription)/i.test(line)) return null;

  let medicineName = line;
  let strength = extractStrength(line);
  let form = extractForm(line);
  let frequency = extractFrequency(line);
  let duration = extractDuration(line);
  let route = extractRoute(line);

  medicineName = cleanMedicineName(line, strength);

  if (!medicineName || medicineName.length < 2) return null;

  const confidence = calculateConfidence(line, medicineName, strength, frequency, duration);

  return {
    medicine_name: medicineName.trim(),
    strength: strength || undefined,
    form: form || undefined,
    frequency: frequency || undefined,
    duration: duration || undefined,
    route: route || undefined,
    raw_line: line,
    confidence,
  };
}

function extractStrength(text: string): string | null {
  const m = text.match(STRENGTH_REGEX);
  return m ? m[0] : null;
}

function extractDuration(text: string): string | null {
  const m1 = text.match(DURATION_REGEX);
  if (m1) return m1[0];
  const m2 = text.match(BENGALI_DAYS);
  if (m2) return m2[0];
  const m3 = text.match(/(\d+)\s*d\b/i);
  if (m3) return m3[0];
  return null;
}

function extractFrequency(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [abbr, full] of Object.entries(FREQUENCY_MAP)) {
    if (lower.includes(abbr)) return full;
  }
  const numeric = text.match(/(\d+\+\d+\+\d+)/);
  if (numeric) return FREQUENCY_MAP[numeric[1]] ?? numeric[1];
  if (/\b(twice|thrice)\s*daily\b/i.test(text)) return text.match(/\b(twice|thrice)\s*daily\b/i)![0];
  if (/\b(once|one)\s*(daily|a day)\b/i.test(text)) return 'Once daily';
  return null;
}

function extractForm(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [kw, form] of Object.entries(FORM_KEYWORDS)) {
    if (lower.includes(kw)) return form;
  }
  return null;
}

function extractRoute(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [kw, route] of Object.entries(ROUTE_KEYWORDS)) {
    if (lower.includes(kw)) return route;
  }
  return null;
}

function cleanMedicineName(line: string, strength: string | null): string {
  let name = line
    .replace(STRENGTH_REGEX, '')
    .replace(DURATION_REGEX, '')
    .replace(BENGALI_DAYS, '')
    .replace(/(\d+)\s*d\b/gi, '')
    .replace(/\b(od|bd|tds|qid|hs|sos|prn)\b/gi, '')
    .replace(/\b(\d+\+\d+\+\d+)\b/g, '')
    .replace(/[\(\)\[\]\,\;\:\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return name;
}

function calculateConfidence(
  raw: string,
  name: string,
  strength: string | null,
  frequency: string | null,
  duration: string | null
): number {
  let score = 0.5;
  if (name.length >= 4) score += 0.15;
  if (strength) score += 0.15;
  if (frequency) score += 0.1;
  if (duration) score += 0.1;
  if (/[a-zA-Z]{3,}/.test(name)) score += 0.05;
  return Math.min(1, score);
}
