/**
 * Mobile Catalogue Synchronization Service (TypeScript)
 * 
 * Clinical Invariants:
 * 1. Synchronizes medicine and antibiotic catalogue metadata from MedMinders Express API (/api/v1/catalogue).
 * 2. Displays catalogue release version, reviewer, and synchronization freshness timestamp.
 * 3. Enforces adult reference guidance disclaimer: general adult reference only,
 *    never patient-specific prescribing instructions.
 */

export interface CatalogueVersionMetadata {
  version: string;
  source: string;
  reviewer: string;
  publishedAt: string | null;
  freshnessTimestamp: string;
  isOfflineFallback: boolean;
  totalGenerics?: number;
  totalBrands?: number;
  disclaimer: string;
}

export interface CatalogueGenericItem {
  id: string;
  genericName: string;
  antibioticClass: string | null;
  awareGroup: 'ACCESS' | 'WATCH' | 'RESERVE' | 'UNCLASSIFIED';
  whoListingUrl: string | null;
  adultReferenceDose: string | null;
  referenceDuration: string | null;
  referenceDosingGuidance: string | null;
  brands: Array<{
    id: string;
    brandName: string;
    manufacturer: string | null;
    strength: string | null;
    dosageForm: string | null;
  }>;
}

export const DEFAULT_SERVER_URL = 'http://10.0.2.2:5000'; // Standard Android emulator localhost

export class MobileCatalogueService {
  private static cachedMetadata: CatalogueVersionMetadata | null = null;
  private static cachedItems: CatalogueGenericItem[] | null = null;

  /**
   * Fetches version and freshness metadata from Express API
   */
  public static async fetchVersion(apiBase: string = DEFAULT_SERVER_URL): Promise<CatalogueVersionMetadata> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${apiBase}/api/v1/catalogue/version`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const metadata: CatalogueVersionMetadata = {
        version: data.version || 'v2026.09.1',
        source: data.source || 'WHO AWaRe 2024 / DGDA Bangladesh',
        reviewer: data.reviewer || 'WHO AWaRe Expert Panel',
        publishedAt: data.publishedAt || null,
        freshnessTimestamp: new Date().toISOString(),
        isOfflineFallback: false,
        totalGenerics: data.totalGenerics,
        totalBrands: data.totalBrands,
        disclaimer: 'General adult reference guidance only; patient dosing must be individualized by prescriber.',
      };

      this.cachedMetadata = metadata;
      return metadata;
    } catch {
      // Offline fallback metadata: strictly marked as outdated snapshot
      const fallbackMeta: CatalogueVersionMetadata = {
        version: 'v2024.11-bundled-offline-snapshot',
        source: 'Client Bundled Fallback (DGDA 2024 Snapshot)',
        reviewer: 'Local Bundled Snapshot (Pending Live Sync)',
        publishedAt: null,
        freshnessTimestamp: new Date().toISOString(),
        isOfflineFallback: true,
        disclaimer: '⚠️ অফলাইন রেফারেন্স (পুরোনো স্ন্যাপশট)। বর্তমান ক্যাটালগের জন্য সার্ভার সংযোগ আবশ্যক। প্রাপ্তবয়স্কদের সাধারণ রেফারেন্স নির্দেশিকা, রোগীর প্রেসক্রিপশন নয়।',
      };
      this.cachedMetadata = fallbackMeta;
      return fallbackMeta;
    }
  }

  /**
   * Fetches normalized antibiotic items from Express API
   */
  public static async fetchAntibiotics(apiBase: string = DEFAULT_SERVER_URL): Promise<{
    metadata: CatalogueVersionMetadata;
    items: CatalogueGenericItem[];
  }> {
    const meta = await this.fetchVersion(apiBase);
    if (meta.isOfflineFallback && this.cachedItems) {
      return { metadata: meta, items: this.cachedItems };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${apiBase}/api/v1/catalogue/antibiotics`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.cachedItems = data.items || [];
      return {
        metadata: {
          ...meta,
          totalGenerics: data.totalGenerics,
          totalBrands: data.totalBrands,
          disclaimer: data.disclaimer || meta.disclaimer,
        },
        items: this.cachedItems || [],
      };
    } catch {
      return {
        metadata: meta,
        items: this.cachedItems || [],
      };
    }
  }
}
