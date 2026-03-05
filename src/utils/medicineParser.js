/**
 * Client-side medicine parser: extracts name, strength, frequency, duration from text
 */
const STRENGTH_REGEX = /\b(\d+(?:\.\d+)?)\s*(mg|ml|g|gm|mcg|µg|iu|units?)\b/gi;
const DURATION_REGEX = /\b(?:x\s*|for\s*)?(\d+)\s*(?:days?|দিন|d|দিনের)\b/gi;
const BENGALI_DAYS = /(?:৫|৬|৭|৮|৯|১০|১১|১২|১৩|১৪)\s*দিন/gu;

const FREQUENCY_MAP = {
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

const FORM_KEYWORDS = {
  tablet: 'tablet', tab: 'tablet', tabs: 'tablet',
  capsule: 'capsule', cap: 'capsule', caps: 'capsule',
  syrup: 'syrup', susp: 'syrup',
  ointment: 'ointment', cream: 'cream', gel: 'ointment',
  injection: 'injection', inj: 'injection', iv: 'IV',
  drop: 'drop', drops: 'drop',
};

function extractStrength(text) {
  const m = text.match(STRENGTH_REGEX);
  return m ? m[0] : null;
}

function extractDuration(text) {
  const m1 = text.match(DURATION_REGEX);
  if (m1) return m1[0];
  const m2 = text.match(BENGALI_DAYS);
  if (m2) return m2[0];
  const m3 = text.match(/(\d+)\s*d\b/i);
  if (m3) return m3[0];
  return null;
}

function extractFrequency(text) {
  const lower = text.toLowerCase();
  for (const [abbr, full] of Object.entries(FREQUENCY_MAP)) {
    if (lower.includes(abbr)) return full;
  }
  const numeric = text.match(/(\d+\+\d+\+\d+)/);
  if (numeric) return FREQUENCY_MAP[numeric[1]] ?? numeric[1];
  if (/\b(twice|thrice)\s*daily\b/i.test(text)) return text.match(/\b(twice|thrice)\s*daily\b/i)[0];
  if (/\b(once|one)\s*(daily|a day)\b/i.test(text)) return 'Once daily';
  return null;
}

function extractForm(text) {
  const lower = text.toLowerCase();
  for (const [kw, form] of Object.entries(FORM_KEYWORDS)) {
    if (lower.includes(kw)) return form;
  }
  return null;
}

function cleanMedicineName(line, strength) {
  return line
    .replace(STRENGTH_REGEX, '')
    .replace(DURATION_REGEX, '')
    .replace(BENGALI_DAYS, '')
    .replace(/(\d+)\s*d\b/gi, '')
    .replace(/\b(od|bd|tds|qid|hs|sos|prn)\b/gi, '')
    .replace(/\b(\d+\+\d+\+\d+)\b/g, '')
    .replace(/[\(\)\[\]\,\;\:\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLine(line) {
  if (line.length < 3) return null;
  if (/^(dr\.|doctor|date|rx|prescription)/i.test(line)) return null;

  const strength = extractStrength(line);
  const form = extractForm(line);
  const frequency = extractFrequency(line);
  const duration = extractDuration(line);
  const medicineName = cleanMedicineName(line, strength);

  if (!medicineName || medicineName.length < 2) return null;

  let confidence = 0.5;
  if (medicineName.length >= 4) confidence += 0.15;
  if (strength) confidence += 0.15;
  if (frequency) confidence += 0.1;
  if (duration) confidence += 0.1;
  if (/[a-zA-Z]{3,}/.test(medicineName)) confidence += 0.05;
  confidence = Math.min(1, confidence);

  return {
    medicine_name: medicineName,
    strength: strength || undefined,
    form: form || undefined,
    frequency: frequency || undefined,
    duration: duration || undefined,
    raw_line: line,
    confidence,
  };
}

export function parseMedicineText(ocrText) {
  const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const medicines = [];
  const seen = new Set();

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed && !seen.has(parsed.medicine_name.toLowerCase() + '|' + parsed.raw_line)) {
      seen.add(parsed.medicine_name.toLowerCase() + '|' + parsed.raw_line);
      medicines.push(parsed);
    }
  }

  return medicines;
}
