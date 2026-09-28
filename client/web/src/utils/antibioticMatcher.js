/**
 * Client-side antibiotic matching against JSON data
 */

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, '')
    .replace(/\b\d+(?:\.\d+)?\s*(mg|ml|g|gm|mcg)\b/gi, '')
    .replace(/\b(od|bd|tds|qid|hs|sos|prn)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigramSimilarity(a, b) {
  const triA = new Set();
  const triB = new Set();
  for (let i = 0; i <= a.length - 3; i++) triA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) triB.add(b.slice(i, i + 3));
  const intersect = [...triA].filter((t) => triB.has(t)).length;
  const union = new Set([...triA, ...triB]).size;
  return union > 0 ? intersect / union : 0;
}

function levenshteinSimilarity(a, b) {
  const d = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - d / maxLen;
}

export function matchAntibiotic(medicineName, antibiotics) {
  const norm = normalize(medicineName);
  if (!norm || norm.length < 2) return { match: null, confidence: 0, matched_on: null };
  if (!antibiotics?.length) return { match: null, confidence: 0, matched_on: null };

  for (const ab of antibiotics) {
    const genName = ab.generic_name || ab.genericName;
    const genNorm = normalize(genName);
    if (genNorm === norm) return { match: ab, confidence: 1, matched_on: 'generic' };
  }

  for (const ab of antibiotics) {
    const brands = ab.brand_names || ab.brandNames || [];
    for (const brand of brands) {
      if (normalize(brand) === norm) return { match: ab, confidence: 0.98, matched_on: 'brand' };
    }
  }

  let best = null;
  for (const ab of antibiotics) {
    const genName = ab.generic_name || ab.genericName;
    const genSim = Math.max(
      trigramSimilarity(norm, normalize(genName)),
      levenshteinSimilarity(norm, normalize(genName))
    );
    if (genSim > 0.7 && (!best || genSim > best.score)) best = { ab, score: genSim };
    for (const brand of ab.brand_names || ab.brandNames || []) {
      const brandSim = Math.max(
        trigramSimilarity(norm, normalize(brand)),
        levenshteinSimilarity(norm, normalize(brand))
      );
      if (brandSim > 0.7 && (!best || brandSim > best.score)) best = { ab, score: brandSim };
    }
  }

  if (best && best.score >= 0.75) {
    return { match: best.ab, confidence: best.score, matched_on: 'fuzzy' };
  }
  return { match: null, confidence: 0, matched_on: null };
}
