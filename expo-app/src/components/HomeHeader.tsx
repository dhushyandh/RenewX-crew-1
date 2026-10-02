import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { renewxRadius, renewxFontFamily } from '@/design-system';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/context/ToastContext';

interface HomeHeaderProps {
  onSearch: () => void;
  cartCount?: number;
  onCart?: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
  onLogout?: () => void;
  onAccount?: () => void;
  onSell?: () => void;
  onWishlist?: () => void;
  onNotifications?: () => void;
  userAddress?: string;
  userName?: string;
}

export default function HomeHeader({
  onSearch,
  cartCount = 0,
  onCart,
  isAdmin,
  onAdmin,
  onAccount,
  onSell,
  onWishlist,
  onNotifications,
  userAddress = 'Bangalore - 560004',
}: HomeHeaderProps) {
  const safeTop = useSafeHeaderTop();
  const { location, isDetecting, detectLocation, setLocationManually } = useLocation();
  const toast = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');

  const displayLocation = location || userAddress;

  const handleUseMyLocation = async () => {
    try {
      const res = await detectLocation();
      if (res) {
        toast.success(`📍 Location detected: ${res}`);
        setModalVisible(false);
      } else {
        toast.show('Location permission denied or unavailable. Please choose from popular hubs below.');
      }
    } catch {
      toast.show('Unable to detect location automatically. Please enter your pincode.');
    }
  };

  const handleApplyPincode = () => {
    const pin = pincodeInput.trim();
    if (pin.length !== 6 || isNaN(Number(pin))) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    const newLoc = `Delivery Area - ${pin}`;
    setLocationManually(newLoc);
    toast.success(`Delivery set to pincode ${pin}`);
    setPincodeInput('');
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop + 4 }]}>
      {/* 1. Top Brand + Sell 12 Mins + Notifications + Wishlist + Account */}
      <View style={styles.topRow}>
        <RenewXLogo size="md" />


        <View style={styles.headerRightIcons}>
          {isAdmin && onAdmin && (
            <TouchableOpacity
              onPress={onAdmin}
              style={styles.adminButton}
              accessibilityLabel="Admin panel"
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark" size={16} color="#0C7A43" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onNotifications}
            style={styles.iconCircleBtn}
            accessibilityLabel="Notifications"
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={19} color="#0F172A" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          {onWishlist && (
            <TouchableOpacity
              onPress={onWishlist}
              style={styles.iconCircleBtn}
              accessibilityLabel="Wishlist"
              activeOpacity={0.8}
            >
              <Ionicons name="heart-outline" size={19} color="#0F172A" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onAccount}
            style={styles.iconCircleBtn}
            accessibilityLabel="Your Profile"
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Location Row with Scope "Use my location" button */}
      <View style={styles.locationBarRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setModalVisible(true)}
          style={styles.locationSelector}
        >
          <Ionicons name="location-sharp" size={15} color="#0F172A" />
          <Text style={styles.locationLabel} numberOfLines={1}>
            {displayLocation}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#0F172A" />
        </TouchableOpacity>

        {/* Scope / "Use my location" button right on the top bar */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleUseMyLocation}
          style={styles.scopeLocationBtn}
          accessibilityLabel="Use my current location with scope icon"
          disabled={isDetecting}
        >
          {isDetecting ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <>
              <Ionicons name="locate" size={13} color="#0F172A" style={{ marginRight: 4 }} />
              <Text style={styles.scopeLocationBtnText}>Use my location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. Search Bar with Mic, Clipboard & Wishlist */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onSearch}
        style={styles.searchBar}
        accessibilityLabel="Search phones, laptops, tablets"
      >
        <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />

        <Text style={styles.searchPlaceholderText}>
          Search phones, laptops, tablets...
        </Text>

        <View style={styles.searchBarTrailingIcons}>
          <TouchableOpacity onPress={onSearch} style={styles.trailingIconBtn}>
            <Ionicons name="mic-outline" size={18} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onCart} style={styles.trailingIconBtn}>
            <Ionicons name="clipboard-outline" size={17} color="#475569" />
            {cartCount > 0 && (
              <View style={styles.cartBadgeMini}>
                <Text style={styles.cartBadgeMiniText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* 4. Location Detection & Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Delivery Location</Text>
                <Text style={styles.modalSubtitle}>
                  Detect area & pincode to view certified device availability
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Prominent Scope "Use Current Location" button */}
            <TouchableOpacity
              style={styles.detectLocationCard}
              onPress={handleUseMyLocation}
              activeOpacity={0.85}
              disabled={isDetecting}
            >
              <View style={styles.detectIconBox}>
                {isDetecting ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Ionicons name="locate" size={22} color="#0F172A" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detectTitle}>
                  {isDetecting ? 'Detecting GPS location...' : 'Use Current Location'}
                </Text>
                <Text style={styles.detectSubtitle}>
                  Auto-detect area and 6-digit pincode using device scope
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#0F172A" />
            </TouchableOpacity>

            {/* Pincode Input Row */}
            <View style={styles.pincodeInputRow}>
              <Ionicons name="keypad-outline" size={18} color="#64748B" style={{ marginLeft: 10, marginRight: 6 }} />
              <TextInput
                style={styles.pincodeInput}
                placeholder="Enter 6-digit Pincode"
                placeholderTextColor="#94A3B8"
                value={pincodeInput}
                onChangeText={setPincodeInput}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.applyPincodeBtn}
                onPress={handleApplyPincode}
                activeOpacity={0.8}
              >
                <Text style={styles.applyPincodeBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Popular Hubs */}
            <Text style={styles.popularCitiesTitle}>Popular Service Hubs</Text>
            <View style={styles.citiesGrid}>
              {[
                'Bangalore - 560004',
                'Indiranagar - 560038',
                'Koramangala - 560034',
                'Mumbai - 400001',
                'Delhi NCR - 110001',
                'Hyderabad - 500001',
                'Chennai - 600001',
                'Pune - 411001',
              ].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.cityChip, displayLocation === c && styles.cityChipActive]}
                  onPress={() => {
                    setLocationManually(c);
                    toast.success(`Location set to ${c}`);
                    setModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={displayLocation === c ? '#0F172A' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.cityChipText, displayLocation === c && styles.cityChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sellDevicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4C2',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  sellPillTextCol: {
    justifyContent: 'center',
  },
  sellPillLine1: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 8,
    color: '#334155',
    lineHeight: 10,
  },
  sellPillLine2: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 9,
    color: '#0F172A',
    fontWeight: '800',
    lineHeight: 11,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  adminButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },

  /* Location Row */
  locationBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
    gap: 8,
  },
  locationSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    flexShrink: 1,
  },
  scopeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FACC15',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  scopeLocationBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: renewxRadius.pill,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholderText: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  searchBarTrailingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trailingIconBtn: {
    padding: 3,
    position: 'relative',
  },
  cartBadgeMini: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#FFC400',
    borderRadius: 6,
    paddingHorizontal: 3,
    minWidth: 14,
    alignItems: 'center',
  },
  cartBadgeMiniText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },

  /* Location Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  modalCloseBtn: {
    padding: 4,
  },
  detectLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FACC15',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  detectIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  detectTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  detectSubtitle: {
    fontSize: 11,
    color: '#713F12',
    marginTop: 2,
  },
  pincodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 14,
    height: 44,
  },
  pincodeInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 0,
  },
  applyPincodeBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    height: '100%',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyPincodeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  popularCitiesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cityChipActive: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  cityChipTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
