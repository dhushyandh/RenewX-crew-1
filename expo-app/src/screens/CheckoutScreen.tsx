import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CheckoutStepper from '@/components/CheckoutStepper';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const { items, subtotal, hydrated } = useCart();
  const { user } = useAuth();

  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  const itemCount = useMemo(() => items.reduce((n, item) => n + item.quantity, 0), [items]);

  const handleProceedToConfirm = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPincode = pincode.trim();

    if (
      name.trim().length < 2 ||
      address.trim().length < 8 ||
      !/^\d{10}$/.test(cleanPhone) ||
      !/^\d{6}$/.test(cleanPincode)
    ) {
      Alert.alert(
        'Complete delivery details',
        'Please enter your full name, valid 10-digit mobile, full delivery address, and 6-digit pincode.',
      );
      return;
    }

    if (!items.length) {
      Alert.alert('Cart is empty', 'Add a product before checking out.');
      return;
    }

    // Move to Step 2: Confirm Order
    navigation.navigate('OrderConfirm', {
      customerInfo: {
        name: name.trim(),
        phone: cleanPhone,
        address: address.trim(),
        pincode: cleanPincode,
      },
    });
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Delivery Address</Text>
            <Text style={styles.subtitle}>Where should we ship your order?</Text>
          </View>
        </View>

        {/* Progress Stepper: Step 1 Active */}
        <CheckoutStepper currentStep={1} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Address Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Information</Text>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Mobile Number (for delivery updates)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Complete Delivery Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="House/Flat No., Street, Landmark, Area"
              placeholderTextColor="#94a3b8"
              multiline
              style={[styles.input, styles.address]}
            />

            <Text style={styles.fieldLabel}>Pincode</Text>
            <TextInput
              value={pincode}
              onChangeText={setPincode}
              placeholder="6-digit pincode"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />
          </View>

          {/* Quick Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{itemCount} items in cart</Text>
              <Text style={styles.value}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Express Delivery</Text>
              <Text style={styles.free}>Free</Text>
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
            <Text style={styles.noticeText}>
              Next step: You can review all items and select between Cash on Delivery and Online Payment.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerTotal}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>

          <TouchableOpacity
            style={styles.place}
            onPress={handleProceedToConfirm}
            activeOpacity={0.88}
          >
            <Text style={styles.placeText}>Confirm Order</Text>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  content: { padding: spacing.md, paddingBottom: 130 },
  section: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: colors.text,
    backgroundColor: '#fff',
    fontSize: fontSize.sm,
  },
  address: { minHeight: 80, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  free: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { fontSize: 10, color: colors.textMuted },
  footerTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  place: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    flexDirection: 'row',
    gap: 8,
  },
  placeText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
