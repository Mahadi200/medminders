/**
 * Red-flag detection: allergy, pregnancy, pediatric, high dose, multiple antibiotics
 */

import type { ParsedMedicine } from '../parser/medicineParser.js';
import type { MatchResult } from '../antibiotics/matcher.js';

export interface RedFlag {
  type: 'allergy' | 'pregnancy' | 'pediatric' | 'high_dose' | 'multiple_antibiotics' | 'duration_unclear';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

const ALLERGY_KEYWORDS = ['penicillin', 'penicillin allergy', 'allergic to', 'allergy', 'পেনিসিলিন অ্যালার্জি', 'অ্যালার্জি'];
const PREGNANCY_KEYWORDS = ['pregnant', 'pregnancy', 'গর্ভাবস্থা', 'ল্যাকটেটিং'];
const PEDIATRIC_KEYWORDS = ['child', 'infant', 'pediatric', 'শিশু', 'বাচ্চা', 'ছোট'];

export function detectRedFlags(
  ocrText: string,
  medicines: ParsedMedicine[],
  antibioticMatches: Array<{ medicine: ParsedMedicine; match: MatchResult | null }>
): RedFlag[] {
  const flags: RedFlag[] = [];
  const text = ocrText.toLowerCase();

  for (const kw of ALLERGY_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      flags.push({
        type: 'allergy',
        severity: 'high',
        message: 'Allergy mentioned in prescription. Confirm with your doctor before taking any new medicine.',
      });
      break;
    }
  }

  for (const kw of PREGNANCY_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      flags.push({
        type: 'pregnancy',
        severity: 'medium',
        message: 'Pregnancy/lactation considerations may apply. Discuss with your doctor.',
      });
      break;
    }
  }

  for (const kw of PEDIATRIC_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      flags.push({
        type: 'pediatric',
        severity: 'medium',
        message: 'Pediatric dosing may require special consideration. Verify with your doctor.',
      });
      break;
    }
  }

  const antibioticCount = antibioticMatches.filter(a => a.match?.match).length;
  if (antibioticCount > 1) {
    flags.push({
      type: 'multiple_antibiotics',
      severity: 'medium',
      message: 'Multiple antibiotics detected. Confirm with your doctor that this combination is correct.',
    });
  }

  for (const m of medicines) {
    if (!m.duration && antibioticMatches.some(a => a.medicine === m && a.match?.match)) {
      flags.push({
        type: 'duration_unclear',
        severity: 'medium',
        message: `Duration unclear for ${m.medicine_name}. Confirm with your doctor how long to take it.`,
      });
      break;
    }
  }

  return flags;
}
