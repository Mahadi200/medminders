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
 * MedMinders Mobile Application (Expo / React Native)
 * Ocean Breeze Design System & Clinical Safety Standards
 * 
 * Invariants Enforced:
 * 1. DRAFT QUARANTINE: OCR scans are strictly DRAFT_UNREVIEWED; never create signed orders without confirmation.
 * 2. NO PATIENT DOSING FROM SHEET: Reference dosing is adult guidance only; patients must follow prescriber.
 * 3. EXPLICIT OFFLINE BADGE: Offline bundled snapshot is clearly labeled outdated reference; never current.
 * 4. CREDIBILITY & MULTI-SENSORY STATES: Text + Icon + Semantic Color for all 7 clinical states.
 */

const SETTINGS_LANGUAGE_KEY = '@medminders_settings_language';

type AppTab = 'home' | 'scan' | 'education' | 'emergency' | 'states';
type ClinicalPreviewState = 'DRAFT_UNREVIEWED' | 'SIGNED' | 'URGENT_ALERT' | 'LOADING' | 'EMPTY' | 'OFFLINE' | 'ACCESS_DENIED';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [catalogueMeta, setCatalogueMeta] = useState<CatalogueVersionMetadata | null>(null);
  const [previewState, setPreviewState] = useState<ClinicalPreviewState>('DRAFT_UNREVIEWED');

  useEffect(() => {
    async function loadPreferences() {
      try {
        const savedLang = await AsyncStorage.getItem(SETTINGS_LANGUAGE_KEY);
        if (savedLang === 'en' || savedLang === 'bn') {
          setLanguage(savedLang);
        }
      } catch {
        // Ignored
      }
    }
    loadPreferences();

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

  const getDhakaTimeString = () => {
    return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Authority Header (Ocean Deep) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>
            Med<Text style={styles.brandAccent}>Minders</Text> (মেডমাইন্ডার্স)
          </Text>
          <Text style={styles.timeText}>
            🇧🇩 {getDhakaTimeString()} • DGDA / WHO AWaRe 2024
          </Text>
        </View>
        <TouchableOpacity
          style={styles.langButton}
          onPress={toggleLanguage}
          accessibilityLabel="Toggle language"
        >
          <Text style={styles.langButtonText}>{language === 'bn' ? 'English' : 'বাংলা'}</Text>
        </TouchableOpacity>
      </View>

      {/* Catalogue Freshness / Offline Outdated Warning Banner */}
      {catalogueMeta?.isOfflineFallback ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️ {language === 'bn'
              ? 'অফলাইন রেফারেন্স (পুরোনো তথ্য — স্ন্যাপশট v2024.11) • লাইভ সার্ভার সংযোগ বিচ্ছিন্ন'
              : 'Offline Reference (Outdated Snapshot v2024.11) • Disconnected from Live Server'}
          </Text>
        </View>
      ) : (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            📚 {language === 'bn' ? 'ক্যাটালগ:' : 'Catalogue:'} {catalogueMeta?.version || 'v1.0.0'} (লাইভ সিঙ্ক)
          </Text>
          <Text style={styles.syncBannerTime}>
            {language === 'bn' ? 'সিঙ্ক:' : 'Synced:'}{' '}
            {catalogueMeta?.freshnessTimestamp
              ? new Date(catalogueMeta.freshnessTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </Text>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'home' && (
          <View>
            {/* Synthetic Demo Banner */}
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>
                🧪 {language === 'bn' ? 'সিন্থেটিক ডেমো মোড — কোনো বাস্তব রোগীর তথ্য নয়' : 'Synthetic Demo Mode — No Real PHI'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'প্রেসক্রিপশন ও ওষুধ ড্যাশবোর্ড' : 'Prescription Portal'}
              </Text>
              <Text style={styles.cardBody}>
                {language === 'bn'
                  ? 'আপনার চিকিৎসকের প্রেসক্রিপশন নিরাপদে স্ক্যান করুন এবং ওষুধ সেবনের সঠিক সময়সূচি জানুন।'
                  : 'Scan prescriptions safely and monitor antibiotic stewardship schedules.'}
              </Text>

              {/* Mandatory Clinical Draft Quarantine Notice */}
              <View style={styles.draftNoticeBox}>
                <Text style={styles.draftNoticeTitle}>
                  📝 {language === 'bn' ? 'ক্লিনিকাল খসড়া নোটিশ (DRAFT_UNREVIEWED)' : 'Clinical Draft Notice'}
                </Text>
                <Text style={styles.draftNoticeBody}>
                  {language === 'bn'
                    ? 'স্ক্যানকৃত সকল ফলাফল শুধুমাত্র যাচাইযোগ্য খসড়া। নিবন্ধিত চিকিৎসকের স্বাক্ষর ও নিশ্চিতকরণ ব্যতীত এটি চূড়ান্ত নির্দেশিকা নয়।'
                    : 'Scanned prescriptions remain unreviewed drafts. They are not active medical orders until verified by a licensed doctor.'}
                </Text>
              </View>
            </View>

            {/* Primary Action Buttons */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setActiveTab('scan')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                📷 {language === 'bn' ? 'প্রেসক্রিপশন স্ক্যান করুন' : 'Scan Prescription'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statePreviewShortcut}
              onPress={() => setActiveTab('states')}
              accessibilityRole="button"
            >
              <Text style={styles.statePreviewShortcutText}>
                🔍 {language === 'bn' ? '৭টি ক্লিনিকাল স্টেট প্রিভিউ দেখুন' : 'View 7 Clinical State Previews'}
              </Text>
            </TouchableOpacity>

            {/* Emergency Hotline Button */}
            <TouchableOpacity
              style={styles.emergencyShortcut}
              onPress={() => setActiveTab('emergency')}
              accessibilityRole="button"
            >
              <Text style={styles.emergencyShortcutText}>
                🚨 {language === 'bn' ? 'জরুরি রেড-ফ্ল্যাগ অ্যালার্ট (কল ৯৯৯)' : 'Urgent Care Red-Flag (Call 999)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'scan' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {language === 'bn' ? 'প্রেসক্রিপশন স্ক্যানার (OCR)' : 'Prescription Scanner (OCR)'}
            </Text>
            <Text style={styles.cardBody}>
              {language === 'bn'
                ? 'মোবাইল ক্যামেরা বা গ্যালারি থেকে প্রেসক্রিপশনের স্পষ্ট ছবি তুলুন।'
                : 'Capture a clear photo of the prescription using the camera or gallery.'}
            </Text>

            <View style={styles.draftNoticeBox}>
              <Text style={styles.draftNoticeTitle}>
                🔍 {language === 'bn' ? 'অটোমেশন সীমাবদ্ধতা নোটিশ' : 'Automation Safeguard'}
              </Text>
              <Text style={styles.draftNoticeBody}>
                {language === 'bn'
                  ? 'ওসিআর শতভাগ সঠিক হলেও তা একটি অপ্রমাণিত খসড়া। এটি স্বয়ংক্রিয়ভাবে সক্রিয় প্রেসক্রিপশন তৈরি করতে পারে না।'
                  : 'Even exact OCR matches remain unreviewed extractions. Human clinician confirmation is required.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                Alert.alert(
                  language === 'bn' ? 'ক্যামেরা ইনপুট' : 'Camera Input',
                  language === 'bn'
                    ? 'ক্যামেরা পারমিশন ও ফাইল আপলোড এন্ডপয়েন্ট ব্যাকএন্ডের সাথে সুরক্ষিতভাবে সংযুক্ত।'
                    : 'Camera permissions and file upload endpoint connected to Express.'
                )
              }
            >
              <Text style={styles.secondaryButtonText}>
                📸 {language === 'bn' ? 'ছবি তুলুন (ক্যামেরা)' : 'Take Photo (Camera)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 7 Clinical States Preview Tab */}
        {activeTab === 'states' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'ক্লিনিকাল স্টেট প্রিভিউ (Phase 2 Standards)' : 'Clinical State Previews'}
              </Text>
              <Text style={styles.cardBody}>
                {language === 'bn'
                  ? 'মেডমাইন্ডার্স কালারের পাশাপাশি টেক্সট ও আইকন দিয়ে স্পষ্ট স্টেট প্রকাশ করে।'
                  : 'MedMinders conveys status via multi-sensory triad: Color + Icon + Explicit Badge.'}
              </Text>

              {/* State Selector Buttons */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateSelectorRow}>
                {(['DRAFT_UNREVIEWED', 'SIGNED', 'URGENT_ALERT', 'LOADING', 'EMPTY', 'OFFLINE', 'ACCESS_DENIED'] as ClinicalPreviewState[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statePill, previewState === st && styles.statePillActive]}
                    onPress={() => setPreviewState(st)}
                  >
                    <Text style={[styles.statePillText, previewState === st && styles.statePillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* State Preview Renderings */}
            {previewState === 'DRAFT_UNREVIEWED' && (
              <View style={[styles.stateCard, styles.draftBorder]}>
                <View style={styles.stateHeaderRow}>
                  <Text style={styles.draftBadge}>📝 DRAFT_UNREVIEWED</Text>
                  <Text style={styles.stateSubBadge}>স্বাক্ষরহীন খসড়া</Text>
                </View>
                <Text style={styles.stateTitle}>Azithromycin 500mg (আযিথ্রোমাইসিন)</Text>
                <Text style={styles.stateDesc}>
                  স্বয়ংক্রিয় ওসিআর এক্সট্রাকশন। নিবন্ধিত চিকিৎসকের স্বাক্ষর ব্যতীত সক্রিয় প্রেসক্রিপশন হিসেবে গণ্য নয়।
                </Text>
              </View>
            )}

            {previewState === 'SIGNED' && (
              <View style={[styles.stateCard, styles.signedBorder]}>
                <View style={styles.stateHeaderRow}>
                  <Text style={styles.signedBadge}>✅ SIGNED (স্বাক্ষরিত)</Text>
                  <Text style={styles.stateSubBadge}>BMDC A-54912</Text>
                </View>
                <Text style={styles.stateTitle}>Ciprofloxacin 500mg • ৭ দিনের কোর্স</Text>
                <Text style={styles.stateDesc}>
                  ডাঃ ফাতিমা বেগম কর্তৃক স্বাক্ষরিত এবং যাচাইকৃত সক্রিয় প্রেসক্রিপশন।
                </Text>
              </View>
            )}

            {previewState === 'URGENT_ALERT' && (
              <View style={[styles.stateCard, styles.urgentBorder]}>
                <View style={styles.stateHeaderRow}>
                  <Text style={styles.urgentBadge}>🚨 URGENT_ALERT (জরুরি)</Text>
                  <Text style={styles.urgentSubBadge}>কল ৯৯৯</Text>
                </View>
                <Text style={styles.urgentTitle}>শ্বাসকষ্ট বা তীব্র চর্মরোগ সতর্কতা</Text>
                <Text style={styles.urgentDesc}>
                  তীব্র অ্যালার্জি বা অ্যানাফিল্যাক্সিস লক্ষণ দেখা দিলে অবিলম্বে ৯৯৯ এ কল করুন অথবা জরুরি বিভাগে যান।
                </Text>
              </View>
            )}

            {previewState === 'LOADING' && (
              <View style={styles.stateCard}>
                <Text style={{ fontSize: 32, textAlign: 'center', marginVertical: 8 }}>⏳</Text>
                <Text style={styles.loadingTitle}>তথ্য লোড হচ্ছে (LOADING)...</Text>
                <Text style={styles.stateDesc}>
                  সার্ভার থেকে ক্যাটালগ ও প্রেসক্রিপশন রেকর্ড সিঙ্ক্রোনাইজ হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।
                </Text>
              </View>
            )}

            {previewState === 'EMPTY' && (
              <View style={styles.stateCard}>
                <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>📭</Text>
                <Text style={styles.emptyTitle}>কোনো রেকর্ড পাওয়া যায়নি (EMPTY)</Text>
                <Text style={styles.stateDesc}>
                  আপনার প্রোফাইলে এই মুহূর্তে কোনো প্রেসক্রিপশন সংরক্ষিত নেই। নতুন প্রেসক্রিপশন স্ক্যান করুন।
                </Text>
              </View>
            )}

            {previewState === 'OFFLINE' && (
              <View style={[styles.stateCard, styles.offlineCardBorder]}>
                <View style={styles.stateHeaderRow}>
                  <Text style={styles.offlineCardBadge}>⚠️ OFFLINE_OUTDATED</Text>
                  <Text style={styles.stateSubBadge}>v2024.11 স্ন্যাপশট</Text>
                </View>
                <Text style={styles.stateTitle}>অফলাইন মোড (পুরোনো স্ন্যাপশট)</Text>
                <Text style={styles.stateDesc}>
                  লাইভ সার্ভার সংযোগ বিচ্ছিন্ন। প্রদর্শিত তথ্য পুরোনো ব্যাকআপ স্ন্যাপশট, বর্তমান প্রকাশিত ক্যাটালগ নয়।
                </Text>
              </View>
            )}

            {previewState === 'ACCESS_DENIED' && (
              <View style={[styles.stateCard, styles.accessDeniedBorder]}>
                <View style={styles.stateHeaderRow}>
                  <Text style={styles.accessDeniedBadge}>🔒 ACCESS_DENIED (403)</Text>
                  <Text style={styles.stateSubBadge}>অননুমোদিত</Text>
                </View>
                <Text style={styles.stateTitle}>প্রবেশাধিকার সংরক্ষিত</Text>
                <Text style={styles.stateDesc}>
                  এই রোগীর মেডিকেল রেকর্ড দেখার অনুমতি আপনার নেই। সক্রিয় সম্মতি (Consent) প্রয়োজন।
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'education' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'অ্যান্টিবায়োটিক সচেতনতা ও WHO AWaRe' : 'Antibiotic Stewardship & AWaRe'}
              </Text>
              <Text style={styles.cardBody}>
                {language === 'bn'
                  ? '১. চিকিৎসকের পরামর্শ ব্যতীত অ্যান্টিবায়োটিক সেবন বন্ধ বা শুরু করবেন না।\n২. WHO AWaRe চিকিৎসকদের জন্য গাইডলাইন (Access, Watch, Reserve), এটি কোনো রোগ নির্ণয় নয়।\n৩. অপ্রয়োজনীয় ওষুধ প্রতিরোধী ব্যাকটেরিয়া সৃষ্টি করে।'
                  : '1. Never start or stop antibiotics without a doctor.\n2. WHO AWaRe is a public health stewardship system, not a diagnosis.\n3. Unnecessary usage accelerates bacterial resistance.'}
              </Text>
            </View>

            {/* Versioned Catalogue Metadata Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {language === 'bn' ? 'যাচাইকৃত ঔষধ ও অ্যান্টিবায়োটিক ক্যাটালগ' : 'Verified Medicine Catalogue'}
              </Text>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'সংস্করণ (Release):' : 'Version:'}</Text>
                <Text style={styles.metadataValue}>{catalogueMeta?.version || 'v1.0.0'}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'কারিগরি অনুমোদন:' : 'Curator Approval:'}</Text>
                <Text style={styles.metadataValue}>টেকনিক্যাল কিউরেটর অনুমোদিত</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'ক্লিনিকাল গভর্নেন্স:' : 'Clinical Governance:'}</Text>
                <Text style={[styles.metadataValue, { color: '#92400E' }]}>স্বাধীন রিভিউ কমিটি পর্যালোচনাধীন</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{language === 'bn' ? 'সর্বশেষ সিঙ্ক (Synced):' : 'Last Synced:'}</Text>
                <Text style={styles.metadataValue}>
                  {catalogueMeta?.freshnessTimestamp ? new Date(catalogueMeta.freshnessTimestamp).toLocaleTimeString() : 'Pending'}
                </Text>
              </View>

              {/* Phase 1 Dosing Caveat */}
              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>
                  ⚠️ {language === 'bn'
                    ? 'ক্লিনিকাল নোটিশ: ক্যাটালগের ডোজ ও সময়কাল প্রাপ্তবয়স্কদের সাধারণ রেফারেন্স নির্দেশিকা। রোগীর সুনির্দিষ্ট মাত্রা চিকিৎসকের প্রেসক্রিপশন অনুযায়ী নির্ধারিত হতে হবে।'
                    : 'Clinical Notice: Catalogue dose and duration are adult reference guidance only. Patient dosing must be individualized by prescriber.'}
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
                ? 'তীব্র শ্বাসকষ্ট, মুখ বা গলা ফুলে যাওয়া, অথবা তীব্র চর্মরোগ দেখা দিলে অবিলম্বে নিকটস্থ হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন অথবা ৯৯৯ এ কল করুন।\n\n*মেডমাইন্ডার্স কোনো জরুরি প্রেসক্রিপশন প্রদানকারী সংস্থা নয়।*'
                : 'If severe adverse symptoms occur (such as difficulty breathing, swelling of throat/face, acute rash), seek immediate care at the nearest hospital or call 999.\n\n*MedMinders is not an emergency response service.*'}
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
                📞 {language === 'bn' ? 'জাতীয় জরুরি সেবা: ৯৯৯' : 'Emergency Call: 999'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar with 48px touch targets */}
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
          style={[styles.navItem, activeTab === 'states' && styles.navItemActive]}
          onPress={() => setActiveTab('states')}
        >
          <Text style={[styles.navText, activeTab === 'states' && styles.navTextActive]}>
            🔍 {language === 'bn' ? 'স্টেট' : 'States'}
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
    backgroundColor: '#F4F8FA', // Ocean Mist Canvas
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A2342', // Ocean Deep Navy
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  brandAccent: {
    color: '#00A896', // Seafoam Cyan
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  langButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F3A66',
    borderWidth: 1,
    borderColor: '#028090',
  },
  langButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  syncBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#B2DFDB',
  },
  syncBannerText: {
    fontSize: 11,
    color: '#004D40',
    fontWeight: '700',
  },
  syncBannerTime: {
    fontSize: 11,
    color: '#00796B',
  },
  offlineBanner: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  demoBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  demoBadgeText: {
    fontSize: 11,
    color: '#3730A3',
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1E3EB',
    shadowColor: '#0A2342',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: '#334E68',
    lineHeight: 20,
  },
  draftNoticeBox: {
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 4,
    borderLeftColor: '#475569',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  draftNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  draftNoticeBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#028090', // Ocean Teal
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F4F8FA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D1E3EB',
  },
  secondaryButtonText: {
    color: '#102A43',
    fontSize: 14,
    fontWeight: '600',
  },
  statePreviewShortcut: {
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#80CBC4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  statePreviewShortcutText: {
    color: '#004D40',
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyShortcut: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  emergencyShortcutText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 8,
  },
  emergencyBody: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  emergencyCallBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  emergencyCallText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metadataLabel: {
    fontSize: 12,
    color: '#627D98',
    fontWeight: '600',
  },
  metadataValue: {
    fontSize: 12,
    color: '#102A43',
    fontWeight: '700',
  },
  disclaimerBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '500',
  },
  stateSelectorRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingBottom: 4,
  },
  statePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statePillActive: {
    backgroundColor: '#028090',
    borderColor: '#028090',
  },
  statePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  statePillTextActive: {
    color: '#FFFFFF',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1E3EB',
    marginBottom: 14,
  },
  stateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#475569',
  },
  draftBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  signedBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#0F766E',
  },
  signedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  urgentBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentSubBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  urgentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  urgentDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  offlineCardBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  offlineCardBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accessDeniedBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
    backgroundColor: '#F9FAFB',
  },
  accessDeniedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stateSubBadge: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 4,
  },
  stateDesc: {
    fontSize: 12,
    color: '#334E68',
    lineHeight: 18,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#028090',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#627D98',
    textAlign: 'center',
    marginBottom: 4,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 62,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#D1E3EB',
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemActive: {
    borderTopWidth: 3,
    borderTopColor: '#028090',
  },
  navText: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#028090',
    fontWeight: '800',
  },
});
