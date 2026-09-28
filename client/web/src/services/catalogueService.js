/**
 * Client Catalogue Service
 * Synchronizes medicine and antibiotic catalogue from MedMinders Express API
 * (/api/v1/catalogue) with graceful offline fallback to bundled dataset.
 */
import fallbackAntibiotics from '../data/antibiotics.json';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let cachedCatalogue = null;
let cachedMetadata = null;

export async function fetchCatalogueMetadata() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalogue/version`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      version: data.version || 'unknown',
      publishedAt: data.publishedAt || null,
      reviewer: data.reviewer || 'WHO AWaRe Expert Panel',
      source: data.source || 'WHO AWaRe 2024 / DGDA Bangladesh',
      freshness: new Date().toISOString(),
      isOfflineFallback: false,
      isOutdatedReference: false,
    };
  } catch (err) {
    return {
      version: 'v2024.11-bundled-offline-snapshot',
      snapshotDate: '2024-11-01',
      publishedAt: null,
      reviewer: 'Local Bundled Fallback (DGDA 2024)',
      source: 'Client Bundled Fallback (antibiotics.json)',
      freshness: new Date().toISOString(),
      isOfflineFallback: true,
      isOutdatedReference: true,
      offlineWarning: '⚠️ অফলাইন রেফারেন্স (পুরোনো তথ্য) — লাইভ সার্ভার সংযোগ বিচ্ছিন্ন। বর্তমান তথ্যের জন্য ইন্টারনেট সংযোগ প্রয়োজন।',
      offlineWarningEn: '⚠️ Offline Reference (Outdated Snapshot) — Disconnected from Live Server. Do not treat as current published catalogue.',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function fetchAntibioticsCatalogue(forceRefresh = false) {
  if (cachedCatalogue && !forceRefresh) {
    return {
      items: cachedCatalogue,
      metadata: cachedMetadata,
    };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/catalogue/antibiotics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    
    // Server returns { version, totalGenerics, totalBrands, disclaimer, items }
    cachedCatalogue = json.items || [];
    cachedMetadata = {
      version: json.version || 'v2026.09.1',
      publishedAt: json.publishedAt || new Date().toISOString(),
      freshness: new Date().toISOString(),
      disclaimer: json.disclaimer || 'Adult reference guidance only. Patient dosing must be individualized by prescriber.',
      isOfflineFallback: false,
    };

    return {
      items: cachedCatalogue,
      metadata: cachedMetadata,
    };
  } catch (err) {
    console.warn('[CatalogueService] Using offline bundled dataset fallback:', err);
    cachedCatalogue = fallbackAntibiotics;
    cachedMetadata = {
      version: 'v2024.11-bundled-offline-snapshot',
      snapshotDate: '2024-11-01',
      publishedAt: null,
      freshness: new Date().toISOString(),
      disclaimer: '⚠️ অফলাইন রেফারেন্স স্ন্যাপশট। বর্তমান ক্যাটালগের জন্য সার্ভার সংযোগ আবশ্যক। প্রাপ্তবয়স্কদের সাধারণ রেফারেন্স নির্দেশিকা, রোগীর প্রেসক্রিপশন নয়।',
      isOfflineFallback: true,
      isOutdatedReference: true,
      offlineWarning: '⚠️ অফলাইন রেফারেন্স (পুরোনো তথ্য) — লাইভ সার্ভার সংযোগ বিচ্ছিন্ন।',
      error: err instanceof Error ? err.message : 'Network unavailable',
    };

    return {
      items: cachedCatalogue,
      metadata: cachedMetadata,
    };
  }
}

export async function searchServerCatalogue(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalogue/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('[CatalogueService] Server search failed, falling back to local filter:', err);
    const q = query.toLowerCase();
    return fallbackAntibiotics.filter(a =>
      a.generic_name?.toLowerCase().includes(q) ||
      a.brand_names?.some(b => b.toLowerCase().includes(q))
    );
  }
}
