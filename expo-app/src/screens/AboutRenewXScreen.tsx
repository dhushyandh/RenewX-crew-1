import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import HomeHeader from '@/components/HomeHeader';
import { colors, fontSize, radius, spacing } from '@/theme';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';
import { useToast } from '@/context/ToastContext';

const LOGO_IMG = require('@/assets/logo.png');

type TabKey = 'howItWorks' | 'aboutUs' | 'contact' | 'privacy' | 'terms';

export default function AboutRenewXScreen({ route }: any) {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const initialTab = (route?.params?.tab || route?.params?.initialTab || 'howItWorks') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route?.params?.tab as TabKey);
    }
  }, [route?.params?.tab]);

  const contactPhone = '+91 90801 68778';
  const cleanPhone = '9080168778';
  const contactEmail = 'ganeshsk272@gmail.com';

  const handleCall = () => {
    Linking.openURL(`tel:+91${cleanPhone}`).catch(() => {
      toast.error('Unable to open phone dialer');
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL(
      `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
        'Hello RenewX Crew, I have a query regarding a device / order.'
      )}`
    ).catch(() => {
      toast.error('Unable to launch WhatsApp');
    });
  };

  const handleEmail = () => {
    Linking.openURL(
      `mailto:${contactEmail}?subject=${encodeURIComponent(
        'RenewX Inquiry & Support'
      )}`
    ).catch(() => {
      toast.error('Unable to open email client');
    });
  };

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'howItWorks', label: 'How It Works', icon: 'sync-circle-outline' },
    { key: 'aboutUs', label: 'About Us', icon: 'people-outline' },
    { key: 'contact', label: 'Contact Us', icon: 'call-outline' },
    { key: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
    { key: 'terms', label: 'Terms & Conditions', icon: 'document-text-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <HomeHeader
        mode="standard"
        title="About RenewX"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Branding Banner */}
        <View style={styles.heroCard}>
          <Image source={LOGO_IMG} style={styles.heroLogo} resizeMode="contain" />
          <Text style={styles.heroBadge}>Certified Devices</Text>
          <Text style={styles.heroTitle}>RenewX Crew</Text>
          <Text style={styles.heroTagline}>
            Rigorously Tested • Safe & Secure • Doorstep Inspection
          </Text>

          {/* Quick Contact Chips */}
          <View style={styles.quickContactRow}>
            <TouchableOpacity style={styles.quickChip} onPress={handleCall}>
              <Ionicons name="call" size={13} color={renewxColors.black} />
              <Text style={styles.quickChipText}>Call Us</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChipWhatsApp} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={13} color={renewxColors.white} />
              <Text style={styles.quickChipWhatsAppText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={handleEmail}>
              <Ionicons name="mail" size={13} color={renewxColors.black} />
              <Text style={styles.quickChipText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? renewxColors.black : renewxColors.textMuted}
                />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content Section */}
        <View style={styles.contentCard}>
          {/* ============================================================== */}
          {/* 1. HOW IT WORKS                                                */}
          {/* ============================================================== */}
          {activeTab === 'howItWorks' && (
            <View>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.headingIcon}>
                  <Ionicons name="sync-circle" size={20} color={renewxColors.black} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>How RenewX Works</Text>
                  <Text style={styles.sectionSub}>Buying & selling made simple and reliable</Text>
                </View>
              </View>

              <Text style={styles.partLabel}>BUYING CERTIFIED TECH</Text>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Browse 100% Tested Devices</Text>
                  <Text style={styles.stepDesc}>
                    Explore certified pre-owned iPhones, Android flagships, MacBooks, gaming laptops, and audio gear curated from verified sources.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>45-Point Rigorous Inspection</Text>
                  <Text style={styles.stepDesc}>
                    Every device passes battery health diagnostics, display calibration, motherboard check, camera clarity testing, and genuine parts verification.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Insured Express Doorstep Delivery</Text>
                  <Text style={styles.stepDesc}>
                    Enjoy safe insured doorstep delivery and real-time live map tracking directly to your address.
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.partLabel}>SELLING YOUR DEVICE</Text>

              <View style={styles.stepItem}>
                <View style={styles.stepNumAlt}><Text style={styles.stepNumTextAlt}>A</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Set Your Own Price Quote</Text>
                  <Text style={styles.stepDesc}>
                    Select your device, variant, upload condition photos, and freely quote the price you expect to receive.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumAlt}><Text style={styles.stepNumTextAlt}>B</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Doorstep Pickup & Live Verification</Text>
                  <Text style={styles.stepDesc}>
                    Our certified technician visits your address at your scheduled time slot to conduct a quick 10-minute physical verification.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumAlt}><Text style={styles.stepNumTextAlt}>C</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Instant Direct Payout</Text>
                  <Text style={styles.stepDesc}>
                    Receive funds immediately to your verified UPI ID or Bank account on the spot before handing over the device.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* 2. ABOUT US                                                    */}
          {/* ============================================================== */}
          {activeTab === 'aboutUs' && (
            <View>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.headingIcon}>
                  <Ionicons name="ribbon" size={20} color={renewxColors.black} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>About RenewX Crew</Text>
                  <Text style={styles.sectionSub}>Pioneering honest recommerce in India</Text>
                </View>
              </View>

              <Text style={styles.bodyParagraph}>
                <Text style={styles.boldText}>RenewX Crew</Text> was founded to eliminate the uncertainty, fraud, and friction traditionally associated with buying and selling pre-owned electronics.
              </Text>

              <Text style={styles.bodyParagraph}>
                We believe premium technology should be accessible to everyone without breaking the bank or harming the planet. Every pre-owned device purchased extends hardware life, directly curbing electronic waste.
              </Text>

              <View style={styles.highlightGrid}>
                <View style={styles.highlightCard}>
                  <Ionicons name="shield-checkmark" size={22} color={renewxColors.emerald} />
                  <Text style={styles.highlightTitle}>100% Genuine</Text>
                  <Text style={styles.highlightDesc}>Authentic pre-owned devices checked for quality & functionality.</Text>
                </View>

                <View style={styles.highlightCard}>
                  <Ionicons name="hardware-chip-outline" size={22} color={renewxColors.info} />
                  <Text style={styles.highlightTitle}>45-Point Check</Text>
                  <Text style={styles.highlightDesc}>Hardware, battery health, screens, cameras & sensors.</Text>
                </View>

                <View style={styles.highlightCard}>
                  <Ionicons name="leaf-outline" size={22} color={renewxColors.emerald} />
                  <Text style={styles.highlightTitle}>Eco-Conscious</Text>
                  <Text style={styles.highlightDesc}>Over 10,000+ kg of electronic waste saved from landfills.</Text>
                </View>

                <View style={styles.highlightCard}>
                  <Ionicons name="flash-outline" size={22} color={renewxColors.warning} />
                  <Text style={styles.highlightTitle}>Instant Payouts</Text>
                  <Text style={styles.highlightDesc}>Guaranteed prompt bank and UPI settlement upon pickup.</Text>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* 3. CONTACT US                                                  */}
          {/* ============================================================== */}
          {activeTab === 'contact' && (
            <View>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.headingIcon}>
                  <Ionicons name="chatbubbles" size={20} color={renewxColors.black} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Get In Touch</Text>
                  <Text style={styles.sectionSub}>We are here to assist you anytime</Text>
                </View>
              </View>

              <Text style={styles.bodyParagraph}>
                Have a question about an order, selling a device, or wholesale trade-in? Reach out to our dedicated support team directly.
              </Text>

              {/* Direct Phone Box */}
              <View style={styles.contactItemBox}>
                <View style={styles.contactIconCircle}>
                  <Ionicons name="call" size={18} color={renewxColors.black} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.contactBoxLabel}>Official Support Phone</Text>
                  <Text style={styles.contactBoxValue}>{contactPhone}</Text>
                  <Text style={styles.contactBoxSub}>Available Mon – Sat: 9:00 AM – 8:00 PM</Text>
                </View>
                <View style={styles.contactActionsCol}>
                  <TouchableOpacity style={styles.contactBtnPill} onPress={handleCall}>
                    <Ionicons name="call-outline" size={14} color={renewxColors.black} />
                    <Text style={styles.contactBtnPillText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactBtnPillAlt}
                    onPress={() => handleCopy(contactPhone, 'Phone number')}
                  >
                    <Ionicons name="copy-outline" size={13} color={renewxColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* WhatsApp Quick Chat */}
              <View style={styles.contactItemBox}>
                <View style={[styles.contactIconCircle, styles.contactIconMint]}>
                  <Ionicons name="logo-whatsapp" size={18} color={renewxColors.emerald} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.contactBoxLabel}>WhatsApp Support</Text>
                  <Text style={styles.contactBoxValue}>{contactPhone}</Text>
                  <Text style={styles.contactBoxSub}>Fastest response for tracking & queries</Text>
                </View>
                <TouchableOpacity style={styles.whatsAppActionBtn} onPress={handleWhatsApp}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={renewxColors.white} />
                  <Text style={styles.whatsAppActionText}>Chat</Text>
                </TouchableOpacity>
              </View>

              {/* Direct Email Box */}
              <View style={styles.contactItemBox}>
                <View style={[styles.contactIconCircle, styles.contactIconYellowSoft]}>
                  <Ionicons name="mail" size={18} color={renewxColors.warning} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.contactBoxLabel}>Official Support Email</Text>
                  <Text style={styles.contactBoxValue}>{contactEmail}</Text>
                  <Text style={styles.contactBoxSub}>Replies typically within 2–4 hours</Text>
                </View>
                <View style={styles.contactActionsCol}>
                  <TouchableOpacity style={styles.contactBtnPill} onPress={handleEmail}>
                    <Ionicons name="mail-outline" size={14} color={renewxColors.black} />
                    <Text style={styles.contactBtnPillText}>Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactBtnPillAlt}
                    onPress={() => handleCopy(contactEmail, 'Email address')}
                  >
                    <Ionicons name="copy-outline" size={13} color={renewxColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Location & Coverage */}
              <View style={styles.supportMetaBox}>
                <Ionicons name="location-outline" size={18} color={renewxColors.black} />
                <View style={styles.flexOne}>
                  <Text style={styles.supportMetaTitle}>Coverage & Facilities</Text>
                  <Text style={styles.supportMetaSub}>
                    Pan-India express courier delivery across all 28 states. Doorstep pickup currently active in major metros.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* 4. PRIVACY POLICY                                              */}
          {/* ============================================================== */}
          {activeTab === 'privacy' && (
            <View>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.headingIcon}>
                  <Ionicons name="shield-checkmark" size={20} color={renewxColors.black} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Privacy Policy</Text>
                  <Text style={styles.sectionSub}>How we handle and protect your personal data</Text>
                </View>
              </View>

              <Text style={styles.policySubHeader}>1. Information We Collect</Text>
              <Text style={styles.policyBody}>
                When creating an account, placing an order, or submitting a sell request, we collect your name, email address, phone number, shipping/pickup address, and device diagnostic photos. Payment card details are never stored on RenewX servers; they are processed securely through PCI-DSS Level 1 certified gateway Razorpay.
              </Text>

              <Text style={styles.policySubHeader}>2. Purpose of Processing</Text>
              <Text style={styles.policyBody}>
                Your data is exclusively utilized to fulfill orders, issue downloadable PDF tax invoices, arrange doorstep technician pickups, send live delivery tracking updates via WebSockets/push notifications, and prevent fraudulent claims.
              </Text>

              <Text style={styles.policySubHeader}>3. Data Security & Storage</Text>
              <Text style={styles.policyBody}>
                All communication is encrypted via 256-bit SSL/TLS protocol. Uploaded device condition photos and invoice records are stored in encrypted cloud storage buckets with strict time-limited access tokens.
              </Text>

              <Text style={styles.policySubHeader}>4. Third-Party Sharing</Text>
              <Text style={styles.policyBody}>
                We do not sell, rent, or trade your personal information to advertisers. Information is shared strictly with operational fulfillment partners (e.g. courier delivery drivers and SMS/email notification gateways) solely to complete transactions.
              </Text>

              <Text style={styles.policySubHeader}>5. Your Rights</Text>
              <Text style={styles.policyBody}>
                You have the full right to review, update, or request deletion of your account and personal history at any time by contacting our privacy compliance officer at {contactEmail}.
              </Text>
            </View>
          )}

          {/* ============================================================== */}
          {/* 5. TERMS & CONDITIONS                                          */}
          {/* ============================================================== */}
          {activeTab === 'terms' && (
            <View>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.headingIcon}>
                  <Ionicons name="document-text" size={20} color={renewxColors.black} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                  <Text style={styles.sectionSub}>Rules & guidelines governing marketplace usage</Text>
                </View>
              </View>

              <Text style={styles.policySubHeader}>1. Pre-Owned Product Condition & Verification</Text>
              <Text style={styles.policyBody}>
                All products listed on RenewX are pre-owned electronics verified for functionality prior to dispatch. We do not sell refurbished products, and no warranty or return is provided in our service. All products are sold strictly as-is with all sales final upon delivery.
              </Text>

              <Text style={styles.policySubHeader}>2. Device Trade-In & Selling Policy</Text>
              <Text style={styles.policyBody}>
                Sellers must be the lawful owners of devices submitted for trade-in. Devices must be free of iCloud / Google FRP activation locks and blacklisted/stolen flags. At least one authentic photo of the device must be provided during quote submission.
              </Text>

              <Text style={styles.policySubHeader}>3. Price Quotes & Payout</Text>
              <Text style={styles.policyBody}>
                Sellers define their expected selling quote. Final payout is executed immediately via UPI or bank transfer upon successful on-site physical verification by an authorized RenewX technician. If physical condition does not match submitted photos, a revised mutual offer may be presented.
              </Text>

              <Text style={styles.policySubHeader}>4. Cancellations & Final Sale Policy</Text>
              <Text style={styles.policyBody}>
                Customers may cancel orders before courier dispatch directly from the order tracking screen. Once dispatched and delivered, all sales are final. RenewX does not provide returns, warranties, or replacements.
              </Text>

              <Text style={styles.policySubHeader}>5. Governing Law</Text>
              <Text style={styles.policyBody}>
                These terms and conditions are governed by and construed in accordance with the laws of India. Any disputes arising in connection with RenewX services are subject to the exclusive jurisdiction of the courts of Chennai, Tamil Nadu.
              </Text>
            </View>
          )}
        </View>

        {/* Footer info */}
        <View style={styles.bottomFooter}>
          <Text style={styles.footerCopyright}>© {new Date().getFullYear()} RenewX Crew Technologies</Text>
          <Text style={styles.footerNote}>All rights reserved. Verified Pre-Owned Electronics.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: renewxColors.surface,
    borderRadius: radius.xl,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  heroLogo: {
    width: 140,
    height: 44,
    marginBottom: 10,
  },
  heroBadge: {
    fontSize: 10.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
    letterSpacing: 0.2,
  },
  heroTagline: {
    fontSize: 12,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: '92%',
  },
  quickContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  quickChipText: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  quickChipWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.emerald,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  quickChipWhatsAppText: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  tabScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    borderRadius: radius.full,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  tabBtnActive: {
    backgroundColor: renewxColors.yellow,
    borderColor: renewxColors.yellowDark,
  },
  tabBtnText: {
    fontSize: 12.5,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
  },
  tabBtnTextActive: {
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  contentCard: {
    backgroundColor: renewxColors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  headingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: renewxColors.yellowLight,
    borderWidth: 1,
    borderColor: renewxColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  sectionSub: {
    fontSize: 12,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginTop: 2,
  },
  partLabel: {
    fontSize: 11.5,
    ...renewxTextStyle('black'),
    color: renewxColors.emerald,
    letterSpacing: 0.7,
    marginBottom: 12,
    marginTop: 6,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: renewxColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 11.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.yellow,
  },
  stepNumAlt: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumTextAlt: {
    fontSize: 11.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  stepDesc: {
    fontSize: 12,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: renewxColors.border,
    marginVertical: 14,
  },
  bodyParagraph: {
    fontSize: 13.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },
  boldText: {
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  highlightCard: {
    width: '48%',
    backgroundColor: renewxColors.background,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  highlightTitle: {
    fontSize: 13,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginTop: 6,
  },
  highlightDesc: {
    fontSize: 11.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  contactItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconMint: {
    backgroundColor: renewxColors.mint,
  },
  contactIconYellowSoft: {
    backgroundColor: renewxColors.yellowLight,
  },
  contactBoxLabel: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  contactBoxValue: {
    fontSize: 13.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginTop: 1,
  },
  contactBoxSub: {
    fontSize: 11,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginTop: 2,
  },
  contactActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  contactBtnPillText: {
    fontSize: 11.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  contactBtnPillAlt: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: renewxColors.surfaceMuted,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsAppActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.emerald,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  whatsAppActionText: {
    fontSize: 11.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  supportMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: renewxColors.yellowSoft,
    borderWidth: 1,
    borderColor: renewxColors.yellow,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
  },
  supportMetaTitle: {
    fontSize: 13,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  supportMetaSub: {
    fontSize: 12,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  policySubHeader: {
    fontSize: 14,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginTop: 14,
    marginBottom: 4,
  },
  policyBody: {
    fontSize: 12.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  bottomFooter: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerCopyright: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.textSecondary,
  },
  footerNote: {
    fontSize: 11,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginTop: 2,
  },
});
