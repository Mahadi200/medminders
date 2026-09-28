import { describe, it, expect } from 'vitest';
import { parseMedicineText } from './medicineParser.js';

describe('parseMedicineText', () => {
  it('parses Ciprofloxacin 500mg 1+0+1 x 5 days', () => {
    const text = `Rx
Ciprofloxacin 500mg
1+0+1 x 5 days`;
    const result = parseMedicineText(text);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const cipro = result.find(m => /cipro/i.test(m.medicine_name));
    expect(cipro).toBeDefined();
    expect(cipro?.strength).toMatch(/500\s*mg/i);
    expect(cipro?.frequency).toBeDefined();
    expect(cipro?.duration).toMatch(/5\s*days?/i);
  });

  it('parses Metformin with BD', () => {
    const text = 'Metformin 850mg BD';
    const result = parseMedicineText(text);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const met = result.find(m => /metformin/i.test(m.medicine_name));
    expect(met?.strength).toMatch(/850/i);
    expect(met?.frequency).toMatch(/twice/i);
  });

  it('parses Bengali duration ৫ দিন', () => {
    const text = 'Amoxicillin 500mg ১+১+১ ৫ দিন';
    const result = parseMedicineText(text);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
