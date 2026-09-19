import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useCart } from '@/context/CartContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import CheckoutStepper from '@/components/CheckoutStepper';

type RouteParams = {
  OrderConfirm: {
    customerInfo: {
      name: string;
      phone: string;
      address: string;
      pincode: string;
    };
  };
};

export default function OrderConfirmScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OrderConfirm'>>();
  const { items, subtotal } = useCart();

  const customerInfo = route.params?.customerInfo || {
    name: 'Customer',
    phone: '',
    address: '',
    pincode: '',
  };

  const itemCount = items.reduce((n, item) => n + item.quantity, 0);

  const handleProceedToPayment = () => {
    navigation.navigate('Payment', {
      customerInfo,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.title}>Confirm Order</Text>
          <Text style={styles.subtitle}>Review your order & address</Text>
        </View>
      </View>

      {/* Progress Stepper */}
      <CheckoutStepper currentStep={2} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Shipping Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Checkout')}
              style={styles.editButton}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addressInfo}>
            <Text style={styles.personName}>{customerInfo.name}</Text>
            <Text style={styles.personPhone}>+91 {customerInfo.phone}</Text>
            <Text style={styles.fullAddress}>{customerInfo.address}</Text>
            <View style={styles.pincodeBadge}>
              <Text style={styles.pincodeText}>PIN: {customerInfo.pincode}</Text>
            </View>
          </View>
        </View>

        {/* Items In Order Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Order Items ({itemCount})</Text>
            </View>
          </View>

          <View style={styles.itemsList}>
            {items.map((item, idx) => (
              <View
                key={String(item.id || idx)}
                style={[
                  styles.itemRow,
                  idx < items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Details</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Items Subtotal ({itemCount})</Text>
            <Text style={styles.breakdownValue}>
              ₹{subtotal.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Delivery Charges</Text>
            <View style={styles.freePill}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>
              ₹{subtotal.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustBox}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={18} color="#10b981" />
            <Text style={styles.trustText}>100% Quality Inspected</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="repeat" size={18} color="#10b981" />
            <Text style={styles.trustText}>7-Day Return & Replacement</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="flash" size={18} color="#10b981" />
            <Text style={styles.trustText}>Fast Express Delivery</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total Amount</Text>
          <Text style={styles.footerTotal}>₹{subtotal.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToPayment}
          activeOpacity={0.88}
        >
          <Text style={styles.proceedButtonText}>Select Payment Method</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    padding: 4,
  },
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
  content: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    fontSize: fontSize.xs,
    color: '#2563eb',
    fontWeight: fontWeight.bold,
  },
  addressInfo: {
    gap: 4,
  },
  personName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  personPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  fullAddress: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },
  pincodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 6,
  },
  pincodeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#475569',
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemDetails: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 4,
  },
  qtyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  qtyText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  freePill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  freeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#15803d',
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  trustBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: fontWeight.medium,
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
  footerLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  footerTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  proceedButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proceedButtonText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
