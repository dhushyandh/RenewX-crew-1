import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import HomeHeader from '@/components/HomeHeader';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { detectCurrentLocationAddress } from '@/services/locationService';

export interface AddressItem {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  isDefault?: boolean;
  name: string;
  phone: string;
  address: string;
  cityStatePincode: string;
  pincode: string;
  city?: string;
  state?: string;
  landmark?: string;
}

const STORAGE_KEY = '@renewx_saved_addresses';

export default function ManageAddressesScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [type, setType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      // 1. Attempt to fetch addresses directly from backend MongoDB database
      const res = await api.users.getAddresses();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAddresses(res.data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data)).catch(() => {});
        setLoading(false);
        return;
      }
    } catch {
      // Server request failed or offline, fall back to storage/profile
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAddresses(parsed);
          setLoading(false);
          return;
        }
      }

      // If no stored addresses, fallback to user's profile address if available
      if (user?.address) {
        const defaultCity = user.city || 'Bangalore';
        const defaultState = user.state || 'Karnataka';
        const defaultPincode = user.pincode || '';
        const initialAddr: AddressItem = {
          id: 'addr_profile',
          type: 'Home',
          isDefault: true,
          name: user.full_name || 'My Delivery Address',
          phone: user.phone || '',
          address: user.address,
          city: defaultCity,
          state: defaultState,
          pincode: defaultPincode,
          landmark: '',
          cityStatePincode: `${defaultCity}${defaultState ? ', ' + defaultState : ''}${
            defaultPincode ? ' - ' + defaultPincode : ''
          }`,
        };
        const initialList = [initialAddr];
        setAddresses(initialList);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialList)).catch(() => {});
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const persistAddresses = async (newList: AddressItem[]) => {
    setAddresses(newList);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      toast.error('Failed to save to local storage');
    }
  };

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setName(user?.full_name || '');
    setPhone(user?.phone || '');
    setPincode(user?.pincode || '560001');
    setAddress('');
    setLandmark('');
    setCity(user?.city || 'Bangalore');
    setState(user?.state || 'Karnataka');
    setType('Home');
    setIsDefault(addresses.length === 0);
    setModalVisible(true);
  };

  const handleDetectAndApplyLocation = async (openModalIfClosed = true) => {
    setDetectingLocation(true);
    try {
      const geo = await detectCurrentLocationAddress();
      if (!geo) {
        toast.error('Could not detect location. Please check GPS permissions or enter manually.');
        setDetectingLocation(false);
        if (openModalIfClosed && !modalVisible) {
          handleOpenAdd();
        }
        return;
      }

      // Pre-populate fields from detected reverse-geocoded coordinates
      if (geo.pincode) setPincode(geo.pincode);
      if (geo.city) setCity(geo.city);
      if (geo.state) setState(geo.state);
      if (geo.address) setAddress(geo.address);
      if (geo.district) setLandmark(geo.district);

      if (!name) setName(user?.full_name || '');
      if (!phone) setPhone(user?.phone || '');

      if (openModalIfClosed && !modalVisible) {
        setEditingAddress(null);
        setType('Home');
        setIsDefault(addresses.length === 0);
        setModalVisible(true);
      }

      toast.success('Location detected! Please review and save.');
    } catch (err) {
      console.warn('Location detection failed:', err);
      toast.error('Failed to detect location. Please enter manually.');
      if (openModalIfClosed && !modalVisible) {
        handleOpenAdd();
      }
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleOpenEdit = (item: AddressItem) => {
    setEditingAddress(item);
    setName(item.name || '');
    setPhone(item.phone || '');
    setPincode(item.pincode || '');
    setAddress(item.address || '');
    setLandmark(item.landmark || '');
    setCity(item.city || 'Bangalore');
    setState(item.state || 'Karnataka');
    setType(item.type || 'Home');
    setIsDefault(!!item.isDefault);
    setModalVisible(true);
  };

  const handleSetDefault = async (item: AddressItem) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === item.id,
    }));
    await persistAddresses(updated);

    // Sync to user profile in AuthContext
    try {
      await updateUser({
        address: item.address,
        city: item.city || 'Bangalore',
        state: item.state || 'Karnataka',
        pincode: item.pincode,
      });
    } catch {}

    // Persist default change to database
    try {
      await api.users.updateAddress(item.id, { isDefault: true });
    } catch {
      // Local copy already saved
    }

    toast.success(`Set ${item.type} as your default delivery address`);
  };

  const handleDelete = (item: AddressItem) => {
    const performDelete = async () => {
      let updated = addresses.filter((a) => a.id !== item.id);
      // If we deleted the default and there are other addresses left, make the first one default
      if (item.isDefault && updated.length > 0) {
        updated = updated.map((a, idx) => ({
          ...a,
          isDefault: idx === 0,
        }));
        try {
          await updateUser({
            address: updated[0].address,
            city: updated[0].city || 'Bangalore',
            state: updated[0].state || 'Karnataka',
            pincode: updated[0].pincode,
          });
        } catch {}
      }
      await persistAddresses(updated);

      // Delete from backend database
      try {
        await api.users.deleteAddress(item.id);
      } catch {
        // Fallback local delete
      }

      toast.success('Address removed');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this delivery address?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Address',
        'Are you sure you want to remove this delivery address?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter the recipient full name');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter house/flat number and street name');
      return;
    }
    if (!pincode.trim() || pincode.length < 6) {
      toast.error('Please enter a valid 6-digit postal pincode');
      return;
    }

    setSaving(true);
    const resolvedCity = city.trim() || 'Bangalore';
    const resolvedState = state.trim() || 'Karnataka';
    const formattedCityStatePincode = `${resolvedCity}, ${resolvedState} - ${pincode.trim()}`;

    try {
      if (editingAddress) {
        // 1. Edit existing address in database
        let updatedDbList: AddressItem[] | null = null;
        try {
          const res = await api.users.updateAddress(editingAddress.id, {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            landmark: landmark.trim(),
            city: resolvedCity,
            state: resolvedState,
            pincode: pincode.trim(),
            type,
            isDefault,
          });
          if (res && res.success && Array.isArray(res.addresses)) {
            updatedDbList = res.addresses;
          }
        } catch {
          // If offline, continue with optimistic local update
        }

        if (updatedDbList) {
          await persistAddresses(updatedDbList);
        } else {
          const updated = addresses.map((a) => {
            if (a.id === editingAddress.id) {
              return {
                ...a,
                name: name.trim(),
                phone: phone.trim(),
                address: address.trim(),
                landmark: landmark.trim(),
                city: resolvedCity,
                state: resolvedState,
                pincode: pincode.trim(),
                type,
                isDefault: isDefault || a.isDefault,
                cityStatePincode: formattedCityStatePincode,
              };
            }
            if (isDefault) {
              return { ...a, isDefault: false };
            }
            return a;
          });
          await persistAddresses(updated);
        }

        if (isDefault) {
          try {
            await updateUser({
              address: address.trim(),
              city: resolvedCity,
              state: resolvedState,
              pincode: pincode.trim(),
            });
          } catch {}
        }

        toast.success('Address updated successfully');
      } else {
        // 2. Add new address to database
        const willBeDefault = isDefault || addresses.length === 0;
        let updatedDbList: AddressItem[] | null = null;

        try {
          const res = await api.users.addAddress({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            landmark: landmark.trim(),
            city: resolvedCity,
            state: resolvedState,
            pincode: pincode.trim(),
            type,
            isDefault: willBeDefault,
          });
          if (res && res.success && Array.isArray(res.addresses)) {
            updatedDbList = res.addresses;
          }
        } catch {
          // If offline, continue with optimistic local add
        }

        if (updatedDbList) {
          await persistAddresses(updatedDbList);
        } else {
          const newId = `addr_${Date.now()}`;
          const newAddr: AddressItem = {
            id: newId,
            type,
            isDefault: willBeDefault,
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            landmark: landmark.trim(),
            city: resolvedCity,
            state: resolvedState,
            pincode: pincode.trim(),
            cityStatePincode: formattedCityStatePincode,
          };

          let updated: AddressItem[];
          if (willBeDefault) {
            updated = [
              newAddr,
              ...addresses.map((a) => ({ ...a, isDefault: false })),
            ];
          } else {
            updated = [...addresses, newAddr];
          }

          await persistAddresses(updated);
        }

        if (willBeDefault) {
          try {
            await updateUser({
              address: address.trim(),
              city: resolvedCity,
              state: resolvedState,
              pincode: pincode.trim(),
            });
          } catch {}
        }

        toast.success('New address added successfully');
      }

      setModalVisible(false);
    } catch {
      toast.error('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (t: string): keyof typeof Ionicons.glyphMap => {
    switch (t) {
      case 'Home':
        return 'home';
      case 'Work':
        return 'briefcase';
      default:
        return 'location';
    }
  };

  return (
    <View style={styles.container}>
      <HomeHeader
        mode="standard"
        title="Manage Addresses"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
          </View>
          <View style={styles.infoBannerTextCol}>
            <Text style={styles.infoBannerTitle}>Express Delivery Network</Text>
            <Text style={styles.infoBannerSub}>
              Direct doorstep delivery across Bangalore & major pincodes in Karnataka.
            </Text>
          </View>
        </View>

        {/* Action Buttons: Detect Location & Manual Add */}
        <View style={styles.actionSectionContainer}>
          {/* 1. Detect Current Location */}
          <TouchableOpacity
            style={styles.detectLocationMainBtn}
            onPress={() => handleDetectAndApplyLocation(true)}
            disabled={detectingLocation}
            activeOpacity={0.85}
          >
            <View style={styles.detectLocationIconCircle}>
              {detectingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate" size={20} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.detectLocationTextCol}>
              <View style={styles.detectLocationTitleRow}>
                <Text style={styles.detectLocationBtnTitle}>
                  {detectingLocation ? 'Detecting Location...' : 'Use My Current Location'}
                </Text>
                <View style={styles.gpsPill}>
                  <Ionicons name="flash" size={10} color="#065F46" />
                  <Text style={styles.gpsPillText}>Auto GPS</Text>
                </View>
              </View>
              <Text style={styles.detectLocationBtnSub}>
                Auto-fill pincode, city, state & address from GPS
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#059669" />
          </TouchableOpacity>

          {/* 2. Add New Address Manually */}
          <TouchableOpacity
            style={styles.addAddressBtn}
            onPress={handleOpenAdd}
            activeOpacity={0.85}
          >
            <View style={styles.addAddressIconCircle}>
              <Ionicons name="add" size={22} color="#059669" />
            </View>
            <View style={styles.addAddressBtnTextCol}>
              <Text style={styles.addAddressBtnTitle}>Add Address Manually</Text>
              <Text style={styles.addAddressBtnSub}>Deliver to home, office or custom location</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Saved Delivery Addresses ({addresses.length})
          </Text>
        </View>

        {/* Address Cards List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Loading saved addresses...</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="location-outline" size={42} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Saved Addresses Yet</Text>
            <Text style={styles.emptySub}>
              Add your delivery address to enjoy fast, seamless checkout on RenewX.
            </Text>
            <View style={styles.emptyActionsRow}>
              <TouchableOpacity
                style={styles.emptyDetectBtn}
                onPress={() => handleDetectAndApplyLocation(true)}
                disabled={detectingLocation}
                activeOpacity={0.85}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Ionicons name="navigate" size={16} color="#059669" />
                )}
                <Text style={styles.emptyDetectBtnText}>
                  {detectingLocation ? 'Detecting...' : 'Use My Location'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={handleOpenAdd}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Add Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          addresses.map((item) => (
            <View
              key={item.id}
              style={[
                styles.addressCard,
                item.isDefault && styles.addressCardDefault,
              ]}
            >
              {/* Header: Type and Default Badge */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.typeBadge}>
                  <Ionicons
                    name={getTypeIcon(item.type)}
                    size={14}
                    color="#0F172A"
                  />
                  <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
                </View>

                {item.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.setDefaultBtn}
                    onPress={() => handleSetDefault(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.setDefaultBtnText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Recipient Details */}
              <View style={styles.cardRecipientRow}>
                <Text style={styles.recipientName}>{item.name}</Text>
                {item.phone ? (
                  <View style={styles.phoneBadge}>
                    <Ionicons name="call-outline" size={12} color="#64748B" />
                    <Text style={styles.phoneText}>{item.phone}</Text>
                  </View>
                ) : null}
              </View>

              {/* Address details */}
              <Text style={styles.addressLine}>{item.address}</Text>
              {item.landmark ? (
                <Text style={styles.landmarkLine}>
                  Landmark: {item.landmark}
                </Text>
              ) : null}
              <Text style={styles.cityStateLine}>{item.cityStatePincode}</Text>

              {/* Card Actions: Edit & Delete */}
              <View style={styles.cardDivider} />
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.cardActionBtn}
                  onPress={() => handleOpenEdit(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color="#0F172A" />
                  <Text style={styles.cardActionBtnText}>Edit Address</Text>
                </TouchableOpacity>

                <View style={styles.actionDivider} />

                <TouchableOpacity
                  style={[styles.cardActionBtn, styles.deleteActionBtn]}
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteActionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add / Edit Address Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </Text>
                <Text style={styles.modalSub}>
                  {editingAddress
                    ? 'Update delivery location details'
                    : 'Enter complete shipping coordinates'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Body Scroll */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
            >
              {/* GPS Auto-detect Button */}
              <TouchableOpacity
                style={styles.modalDetectBtn}
                onPress={() => handleDetectAndApplyLocation(false)}
                disabled={detectingLocation}
                activeOpacity={0.8}
              >
                <View style={styles.modalDetectIconCircle}>
                  {detectingLocation ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Ionicons name="navigate" size={18} color="#059669" />
                  )}
                </View>
                <View style={styles.modalDetectTextCol}>
                  <Text style={styles.modalDetectTitle}>
                    {detectingLocation ? 'Detecting GPS location...' : 'Use My Current Location'}
                  </Text>
                  <Text style={styles.modalDetectSub}>
                    Auto-fills pincode, city, state & street from GPS
                  </Text>
                </View>
                <View style={styles.modalDetectBadge}>
                  <Ionicons name="locate" size={12} color="#059669" />
                  <Text style={styles.modalDetectBadgeText}>Auto-fill</Text>
                </View>
              </TouchableOpacity>

              {/* Address Type Selector */}
              <Text style={styles.inputLabel}>Address Type</Text>
              <View style={styles.typeSelectorRow}>
                {(['Home', 'Work', 'Other'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      type === t && styles.typeChipActive,
                    ]}
                    onPress={() => setType(t)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={getTypeIcon(t)}
                      size={16}
                      color={type === t ? '#FFFFFF' : '#475569'}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        type === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Recipient name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(val) => setPhone(val.replace(/\D/g, ''))}
                  />
                </View>
              </View>

              {/* Pincode & City Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>
                    Pincode <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="6 digits"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={pincode}
                      onChangeText={(val) => setPincode(val.replace(/\D/g, ''))}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1.2, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Bangalore"
                      placeholderTextColor="#94A3B8"
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                </View>
              </View>

              {/* State */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>State</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="map-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Karnataka"
                    placeholderTextColor="#94A3B8"
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              {/* House / Flat / Street Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Flat / House / Building / Street{' '}
                  <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color="#94A3B8"
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                    placeholder="e.g. #402, Green Glen Layout, Bellandur"
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
              </View>

              {/* Landmark */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Landmark / Locality (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="compass-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Near Central Mall or Metro Station"
                    placeholderTextColor="#94A3B8"
                    value={landmark}
                    onChangeText={setLandmark}
                  />
                </View>
              </View>

              {/* Make Default Toggle */}
              <TouchableOpacity
                style={styles.defaultToggleRow}
                onPress={() => setIsDefault(!isDefault)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isDefault ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isDefault ? '#059669' : '#94A3B8'}
                />
                <View style={styles.defaultToggleTextCol}>
                  <Text style={styles.defaultToggleTitle}>Make this my default address</Text>
                  <Text style={styles.defaultToggleSub}>
                    Used automatically for 1-click orders and shipping calculations
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {editingAddress ? 'Update Address' : 'Save Address'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  infoBannerTextCol: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#065F46',
    marginBottom: 2,
  },
  infoBannerSub: {
    fontSize: fontSize.xs,
    color: '#047857',
    lineHeight: 16,
  },

  // Action Buttons Section
  actionSectionContainer: {
    marginBottom: spacing.lg,
    gap: 10,
  },
  detectLocationMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: radius.xl,
    padding: spacing.md,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  detectLocationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  detectLocationTextCol: {
    flex: 1,
  },
  detectLocationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detectLocationBtnTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#065F46',
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#065F46',
    letterSpacing: 0.3,
  },
  detectLocationBtnSub: {
    fontSize: fontSize.xs,
    color: '#047857',
    marginTop: 2,
  },

  // Add Address Action Card Button
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: radius.xl,
    padding: spacing.md,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addAddressIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addAddressBtnTextCol: {
    flex: 1,
  },
  addAddressBtnTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#0F172A',
  },
  addAddressBtnSub: {
    fontSize: fontSize.xs,
    color: '#64748B',
    marginTop: 2,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Loading & Empty States
  loaderContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: fontSize.sm,
    color: '#64748B',
    marginTop: spacing.sm,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: spacing.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    gap: 8,
  },
  emptyDetectBtnText: {
    color: '#059669',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    gap: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  // Modal Detect Location Button
  modalDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: spacing.md,
  },
  modalDetectIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalDetectTextCol: {
    flex: 1,
  },
  modalDetectTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#065F46',
  },
  modalDetectSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  modalDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  modalDetectBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#059669',
  },

  // Address Cards
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addressCardDefault: {
    borderColor: '#10B981',
    borderWidth: 1.5,
    backgroundColor: '#FCFDFD',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#0F172A',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#059669',
    letterSpacing: 0.5,
  },
  setDefaultBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  setDefaultBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#2563EB',
  },

  cardRecipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recipientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#0F172A',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: fontSize.xs,
    color: '#475569',
    fontWeight: fontWeight.medium,
  },

  addressLine: {
    fontSize: fontSize.sm,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 2,
  },
  landmarkLine: {
    fontSize: fontSize.xs,
    color: '#64748B',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  cityStateLine: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#475569',
    marginTop: 2,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  cardActionBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#0F172A',
  },
  deleteActionBtn: {
    marginLeft: 4,
  },
  deleteActionBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#EF4444',
  },
  actionDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#0F172A',
  },
  modalSub: {
    fontSize: fontSize.xs,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalScrollView: {
    maxHeight: 460,
  },
  modalScrollBody: {
    padding: spacing.lg,
  },

  // Form Elements
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  typeChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#475569',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },

  inputGroup: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#475569',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#0F172A',
    paddingVertical: 0,
  },

  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 4,
    gap: 12,
  },
  defaultToggleTextCol: {
    flex: 1,
  },
  defaultToggleTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#0F172A',
  },
  defaultToggleSub: {
    fontSize: fontSize.xs,
    color: '#64748B',
    marginTop: 2,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
  },
  cancelBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: radius.md,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
});
