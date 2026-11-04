/**
 * Antibiotic Stewardship warnings - patient-friendly guidance
 */

export interface StewardshipWarning {
  id: string;
  message: string;
}

export function getStewardshipWarnings(hasAntibiotic: boolean, durationUnclear: boolean): StewardshipWarning[] {
  const warnings: StewardshipWarning[] = [];

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
