/**
 * Drug Interaction Engine - Pluggable interface
 * Use placeholder implementation; inject real dataset (e.g. RxNorm, DrugBank) later
 */

export interface MedicineRef {
  name: string;
  strength?: string;
}

export interface InteractionAlert {
  severity: 'low' | 'medium' | 'high';
  message: string;
  involved_medicines: string[];
}

// Placeholder: known interactions for common antibiotics (expand via dataset later)
const PLACEHOLDER_INTERACTIONS: Array<{ drugs: string[]; message: string; severity: 'low' | 'medium' | 'high' }> = [
  { drugs: ['ciprofloxacin', 'calcium'], message: 'Calcium may reduce absorption of ciprofloxacin. Take 2 hours apart.', severity: 'medium' },
  { drugs: ['azithromycin', 'antacid'], message: 'Antacids may reduce azithromycin absorption.', severity: 'low' },
  { drugs: ['metronidazole', 'alcohol'], message: 'Avoid alcohol with metronidazole - can cause severe reaction.', severity: 'high' },
  { drugs: ['amoxicillin', 'methotrexate'], message: 'Amoxicillin may increase methotrexate toxicity.', severity: 'medium' },
];

export function checkInteractions(medicines: MedicineRef[]): InteractionAlert[] {
  const alerts: InteractionAlert[] = [];
  const names = medicines.map(m => m.name.toLowerCase().replace(/\s*\d+.*$/, '').trim());

  for (const rule of PLACEHOLDER_INTERACTIONS) {
    const matches = rule.drugs.filter(d => names.some(n => n.includes(d) || d.includes(n)));
    if (matches.length >= 2 || (rule.drugs.length === 1 && matches.length === 1 && names.some(n => n.includes(rule.drugs[0])))) {
      alerts.push({
        severity: rule.severity,
        message: rule.message,
        involved_medicines: rule.drugs,
      });
    }
  }

  return alerts;
}
