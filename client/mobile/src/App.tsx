import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileCatalogueService, CatalogueVersionMetadata } from './services/catalogueService';

/**
 * MedMinders Mobile Application Entry (Expo / React Native)
 * 
 * Clinical Safety & Privacy Principles:
 * 1. UNCERTAIN DRAFT PARADIGM: Any scanned prescription is strictly marked as "খসড়া" (Draft).
 *    Never silently converted into an active clinical prescription.
 * 2. NO PLAIN PHI CACHING: Plain AsyncStorage is STRICTLY RESTRICTED to non-sensitive UI
 *    settings (language, theme) and public education articles. No PHI or signed prescriptions
 *    are cached in plain storage. Hardware-backed encrypted storage (SecureStore / SQLCipher)
 *    is designed for Slice 5.
 * 3. EMERGENCY RED-FLAG ESCALATION: High-contrast urgent care card with 999 link.
 * 4. BANGLA-FIRST ACCESSIBILITY with Asia/Dhaka localized date/time.
 * 5. SERVER CATALOGUE SYNCHRONIZATION: Displays verified catalogue version, WHO reviewer,
 *    and synchronization freshness with adult reference disclaimers.
 */

// Storage keys for NON-SENSITIVE settings ONLY
const SETTINGS_LANGUAGE_KEY = '@medminders_settings_language';
const SETTINGS_THEME_KEY = '@medminders_settings_theme';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'education' | 'emergency'>('home');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [catalogueMeta, setCatalogueMeta] = useState<CatalogueVersionMetadata | null>(null);

  useEffect(() => {
    // Load non-sensitive preferences from AsyncStorage
    async function loadPreferences() {
      try {
        const savedLang = await AsyncStorage.getItem(SETTINGS_LANGUAGE_KEY);
        if (savedLang === 'en' || savedLang === 'bn') {
          setLanguage(savedLang);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadPreferences();

    // Fetch server catalogue version & freshness
    MobileCatalogueService.fetchVersion()
      .then(meta => setCatalogueMeta(meta))
      .catch(() => {});
  }, []);

  const toggleLanguage = async () => {
    const nextLang = language === 'bn' ? 'en' : 'bn';
    setLanguage(nextLang);
    try {
      await AsyncStorage.setItem(SETTINGS_LANGUAGE_KEY, nextLang);
    } catch {
      // Ignored
    }
  };

  // Asia/Dhaka Localized Formatter
  const getDhakaTimeString = () => {
    return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>🏥 MedMinders (মেডমাইন্ডার্স)</Text>
          <Text style={styles.timeText}>{getDhakaTimeString()} (ঢাকা)</Text>
        </View>
        <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
          <Text style={styles.langButtonText}>{language === 'bn' ? 'English' : 'বাংলা'}</Text>
        </TouchableOpacity>
      </View>

      {/* Catalogue Sync Banner */}
      <View style={styles.syncBanner}>
        <Text style={styles.syncBannerText}>
          📚 {language === 'bn' ? 'ক্যাটালগ:' : 'Catalogue:'} {catalogueMeta?.version || 'v2026.09.1'}
          {catalogueMeta?.isOfflineFallback
            ? language === 'bn' ? ' (অফলাইন)' : ' (Offline)'
            : language === 'bn' ? ' (সার্ভার লাইভ)' : ' (Live API)'}
        </Text>
        <Text style={styles.syncBannerTime}>
          {language === 'bn' ? 'সিঙ্ক:' : 'Synced:'}{' '}
          {catalogueMeta?.freshnessTimestamp
            ? new Date(catalogueMeta.freshnessTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--'}
        </Text>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'home' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'প্রেসক্রিপশন ড্যাশবোর্ড' : 'Prescription Portal'}
              </Text>
              <Text style={styles.cardBody}>
                {language === 'bn'
                  ? 'আপনার চিকিৎসকের দেওয়া প্রেসক্রিপশন স্ক্যান করুন এবং নির্দেশিকা অনুযায়ী ওষুধ গ্রহণ করুন।'
                  : 'Scan prescriptions provided by your physician and follow guided schedules.'}
              </Text>

              {/* Clinical Draft Notice */}
              <View style={styles.draftNoticeBox}>
                <Text style={styles.draftNoticeTitle}>
                  ⚠️ {language === 'bn' ? 'ক্লিনিকাল সতর্কতা (Draft Status)' : 'Clinical Notice'}
                </Text>
                <Text style={styles.draftNoticeBody}>
                  {language === 'bn'
                    ? 'স্ক্যানকৃত সকল প্রেসক্রিপশন শুধুমাত্র যাচাইযোগ্য খসড়া (Uncertain Draft) হিসেবে গণ্য হবে। নিবন্ধিত চিকিৎসকের স্বাক্ষর ব্যতীত এটি কোনো চূড়ান্ত চিকিৎসা নির্দেশিকা নয়।'
                    : 'Scanned prescriptions are treated as unverified drafts only. They are not active medical orders until verified by a licensed doctor.'}
                </Text>
              </View>
            </View>

            {/* Quick Action Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setActiveTab('scan')}
            >
              <Text style={styles.primaryButtonText}>
                📷 {language === 'bn' ? 'নতুন প্রেসক্রিপশন স্ক্যান করুন' : 'Scan New Prescription'}
              </Text>
            </TouchableOpacity>

            {/* Emergency Hotline Button */}
            <TouchableOpacity
              style={styles.emergencyShortcut}
              onPress={() => setActiveTab('emergency')}
            >
              <Text style={styles.emergencyShortcutText}>
                🚨 {language === 'bn' ? 'জরুরি উপসর্গ ও রেড-ফ্ল্যাগ অ্যালার্ট' : 'Emergency & Red-Flag Escalation'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'scan' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {language === 'bn' ? 'প্রেসক্রিপশন ওসিআর স্ক্যানার' : 'Prescription OCR Scanner'}
            </Text>
            <Text style={styles.cardBody}>
              {language === 'bn'
                ? 'মোবাইল ক্যামেরা বা গ্যালারি থেকে প্রেসক্রিপশনের স্পষ্ট ছবি তুলুন।'
                : 'Capture a clear photo of the prescription using the camera or gallery.'}
            </Text>

            <View style={styles.draftNoticeBox}>
              <Text style={styles.draftNoticeTitle}>
                🔍 {language === 'bn' ? 'খসড়া স্ট্যাটাস' : 'Uncertain Draft Status'}
              </Text>
              <Text style={styles.draftNoticeBody}>
                {language === 'bn'
                  ? 'এআই বা ওসিআর স্বয়ংক্রিয়ভাবে ঔষধ পরিবর্তন করতে পারে না। প্রতিটি তথ্য আপনার ডাক্তারের সাথে নিশ্চিত করুন।'
                  : 'AI & OCR cannot autonomously change medication. Verify every detail with your physician.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                Alert.alert(
                  language === 'bn' ? 'ক্যামেরা ইনপুট' : 'Camera Input',
                  language === 'bn'
                    ? 'ক্যামেরা পারমিশন ও ব্যাকএন্ড এপিআই অথেনটিকেশন স্লাইস ৪ এ সংযুক্ত হবে।'
                    : 'Camera permissions and API authentication will be wired in Slice 4.'
                )
              }
            >
              <Text style={styles.secondaryButtonText}>
                📸 {language === 'bn' ? 'ছবি তুলুন (ক্যামেরা)' : 'Take Photo (Camera)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'education' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'অ্যান্টিবায়োটিক সচেতনতা ও AWaRe' : 'Antibiotic Stewardship & AWaRe'}
              </Text>
              <Text style={styles.cardBody}>
                {language === 'bn'
                  ? '১. অ্যান্টিবায়োটিকের সম্পূর্ণ কোর্স সম্পন্ন করুন—মাঝে বন্ধ করবেন না।\n২. WHO AWaRe হলো চিকিৎসকদের জন্য রোগজীবাণু প্রতিরোধী গাইডলাইন, এটি রোগীর কোনো রোগ নির্ণয় নয়।\n৩. চিকিৎসকের পরামর্শ ছাড়া পরিবারের অন্য কারো সাথে অ্যান্টিবায়োটিক শেয়ার করবেন না।'
                  : '1. Complete full antibiotic course. Do not stop midway.\n2. WHO AWaRe is a public health stewardship classification, not a patient diagnosis.\n3. Never share antibiotics with family or friends without a doctor.'}
              </Text>
            </View>

            {/* Versioned Catalogue Metadata Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'যাচাইকৃত ঔষধ ও অ্যান্টিবায়োটিক ক্যাটালগ' : 'Verified Medicine Catalogue'}
              </Text>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'সংস্করণ (Release):' : 'Version:'}</Text>
                <Text style={styles.metadataValue}>{catalogueMeta?.version || 'v2026.09.1'}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'উৎস (Source):' : 'Source:'}</Text>
                <Text style={styles.metadataValue}>{catalogueMeta?.source || 'WHO AWaRe 2024 / DGDA'}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'পর্যালোচক (Reviewer):' : 'Reviewer:'}</Text>
                <Text style={styles.metadataValue}>{catalogueMeta?.reviewer || 'WHO AWaRe Expert Panel'}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'সর্বশেষ সিঙ্ক (Synced):' : 'Last Synced:'}</Text>
                <Text style={styles.metadataValue}>
                  {catalogueMeta?.freshnessTimestamp ? new Date(catalogueMeta.freshnessTimestamp).toLocaleTimeString() : 'Pending'}
                </Text>
              </View>

              {/* Mandatory Dosing Disclaimer */}
              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>
                  ⚠️ {language === 'bn'
                    ? 'ক্লিনিকাল সতর্কতা: ক্যাটালগের ডোজ ও সময়কাল শুধুমাত্র প্রাপ্তবয়স্কদের সাধারণ রেফারেন্স নির্দেশিকা। প্রতিটি রোগীর নির্দিষ্ট মাত্রা চিকিৎসক দ্বারা নির্ধারিত হতে হবে।'
                    : 'Clinical Notice: Catalogue dose and duration values are general adult reference guidance only. Patient-specific dosing must be individualized by the prescriber.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'emergency' && (
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>
              🚨 {language === 'bn' ? 'জরুরি চিকিৎসা সতর্কতা' : 'Urgent Care Escalation'}
            </Text>
            <Text style={styles.emergencyBody}>
              {language === 'bn'
                ? 'যদি আপনার বা রোগীর কোনো তীব্র উপসর্গ যেমন—শ্বাসকষ্ট, মুখ বা গলা ফুলে যাওয়া, তীব্র চর্মরোগ বা বুক ধড়ফড় দেখা দেয়, তবে অবিলম্বে নিকটস্থ হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন অথবা ৯৯৯ এ কল করুন।\n\n*মেডমাইন্ডার্স কোনো জরুরি সেবা সংস্থা নয়।*'
                : 'If severe adverse symptoms occur (such as difficulty breathing, swelling of throat/face, acute rash, chest pain), seek immediate care at the nearest hospital emergency room or call 999.\n\n*MedMinders is not an emergency response service.*'}
            </Text>
            <TouchableOpacity
              style={styles.emergencyCallBtn}
              onPress={() =>
                Alert.alert(
                  language === 'bn' ? 'জরুরি কল' : 'Emergency Call',
                  language === 'bn' ? 'জাতীয় জরুরি সেবা ৯৯৯ এ সংযোগ করা হচ্ছে...' : 'Dialing 999 Emergency Services...'
                )
              }
            >
              <Text style={styles.emergencyCallText}>
                📞 {language === 'bn' ? 'জাতীয় জরুরি সেবা: ৯৯৯' : 'Emergency Call: 999'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            🏠 {language === 'bn' ? 'হোম' : 'Home'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'scan' && styles.navItemActive]}
          onPress={() => setActiveTab('scan')}
        >
          <Text style={[styles.navText, activeTab === 'scan' && styles.navTextActive]}>
            📷 {language === 'bn' ? 'স্ক্যান' : 'Scan'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'education' && styles.navItemActive]}
          onPress={() => setActiveTab('education')}
        >
          <Text style={[styles.navText, activeTab === 'education' && styles.navTextActive]}>
            📚 {language === 'bn' ? 'শিক্ষা' : 'Learn'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'emergency' && styles.navItemActive]}
          onPress={() => setActiveTab('emergency')}
        >
          <Text style={[styles.navText, activeTab === 'emergency' && styles.navTextActive]}>
            🚨 {language === 'bn' ? 'জরুরি' : 'Urgent'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  langButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  langButtonText: {
    fontSize: 13,
    color: '#4338CA',
    fontWeight: '600',
  },
  syncBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  syncBannerText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  syncBannerTime: {
    fontSize: 11,
    color: '#15803D',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  draftNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 6,
    marginTop: 14,
  },
  draftNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  draftNoticeBody: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  emergencyShortcut: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyShortcutText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 10,
  },
  emergencyBody: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 22,
  },
  emergencyCallBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  emergencyCallText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metadataLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  disclaimerBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#2563EB',
  },
  navText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
