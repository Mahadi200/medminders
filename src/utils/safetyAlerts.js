/**
 * Client-side safety alerts: stewardship, red flags, interactions
 */

const ALLERGY_KEYWORDS = ['penicillin', 'penicillin allergy', 'allergic to', 'allergy', 'পেনিসিলিন অ্যালার্জি', 'অ্যালার্জি'];
const PREGNANCY_KEYWORDS = ['pregnant', 'pregnancy', 'গর্ভাবস্থা', 'ল্যাকটেটিং'];
const PEDIATRIC_KEYWORDS = ['child', 'infant', 'pediatric', 'শিশু', 'বাচ্চা', 'ছোট'];

const PLACEHOLDER_INTERACTIONS = [
  { drugs: ['ciprofloxacin', 'calcium'], message: 'Calcium may reduce absorption of ciprofloxacin. Take 2 hours apart.', severity: 'medium' },
  { drugs: ['azithromycin', 'antacid'], message: 'Antacids may reduce azithromycin absorption.', severity: 'low' },
  { drugs: ['metronidazole', 'alcohol'], message: 'Avoid alcohol with metronidazole - can cause severe reaction.', severity: 'high' },
  { drugs: ['amoxicillin', 'methotrexate'], message: 'Amoxicillin may increase methotrexate toxicity.', severity: 'medium' },
];

export function getStewardshipWarnings(hasAntibiotic, durationUnclear) {
  const warnings = [];
  if (hasAntibiotic) {
    warnings.push(
      { id: 'stew-1', message: 'Antibiotics should be taken only as prescribed.' },
      { id: 'stew-2', message: 'Do not stop early unless your doctor says so.' },
      { id: 'stew-3', message: 'Do not share antibiotics with others.' }
    );
  }
  if (durationUnclear && hasAntibiotic) {
    warnings.push({ id: 'stew-4', message: 'Duration unclear. Confirm with your doctor.' });
  }
  return warnings;
}

export function detectRedFlags(ocrText, medicines, antibioticMatches) {
  const flags = [];
  const text = (ocrText || '').toLowerCase();

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

  const antibioticCount = antibioticMatches.filter((a) => a.match?.match).length;
  if (antibioticCount > 1) {
    flags.push({
      type: 'multiple_antibiotics',
      severity: 'medium',
      message: 'Multiple antibiotics detected. Confirm with your doctor that this combination is correct.',
    });
  }

  for (const m of medicines) {
    const isAntibiotic = antibioticMatches.some((a) => {
      const medName = a.medicine?.medicine_name || a.medicine?.medicine;
      return medName === m.medicine_name && a.match?.match;
    });
    if (!m.duration && isAntibiotic) {
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

export function checkInteractions(medicines) {
  const alerts = [];
  const names = medicines.map((m) => (m.name || '').toLowerCase().replace(/\s*\d+.*$/, '').trim());

  for (const rule of PLACEHOLDER_INTERACTIONS) {
    const matches = rule.drugs.filter((d) => names.some((n) => n.includes(d) || d.includes(n)));
    if (matches.length >= 2 || (rule.drugs.length === 1 && matches.length === 1 && names.some((n) => n.includes(rule.drugs[0])))) {
      alerts.push({
        severity: rule.severity,
        message: rule.message,
        involved_medicines: rule.drugs,
      });
    }
  }

  return alerts;
}
