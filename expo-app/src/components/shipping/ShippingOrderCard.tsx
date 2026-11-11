import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { ShowcaseOrder } from '@/data/showcaseOrders';
import { renewxColors, renewxTextStyle } from '@/design-system';

interface ShippingOrderCardProps {
  order: ShowcaseOrder;
  isAdmin?: boolean;
  onTrack?: (order: ShowcaseOrder) => void;
  onDetails?: (order: ShowcaseOrder) => void;
  onStatusChange?: (orderId: string, nextStatus: string) => void;
}

export default function ShippingOrderCard({
  order,
  isAdmin = false,
  onTrack,
  onDetails,
  onStatusChange,
}: ShippingOrderCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(order.trackingId || order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status Ribbon & Stepper Config
  const getRibbonColor = () => {
    switch (order.status) {
      case 'transit':
        return '#EA580C';
      case 'process':
        return '#1E293B';
      case 'delivered':
        return renewxColors.emerald;
      case 'cancelled':
      default:
        return renewxColors.error;
    }
  };

  const ribbonBg = getRibbonColor();
  const isDelivered = order.status === 'delivered';
  const activeAccent = isDelivered ? renewxColors.emerald : '#EA580C';
  const activeStep = order.activeStepIndex; // 0: Placed, 1: Process, 2: Transit (Truck), 3: Delivered

  return (
    <View style={styles.cardContainer}>
      {/* 1. Diagonal Corner Ribbon (The Signature UI) */}
      <View style={styles.ribbonWrapper} pointerEvents="none">
        <View style={[styles.ribbonBar, { backgroundColor: ribbonBg }]}>
          <Text style={styles.ribbonText}>{order.statusLabel}</Text>
        </View>
      </View>

      {/* 2. Top Header: Product Thumbnail + Name First + Tracking ID Pill */}
      <View style={styles.headerRow}>
        <View style={styles.thumbnailBox}>
          <Image
            source={
              typeof order.productImage === 'string'
                ? { uri: order.productImage }
                : order.productImage
            }
            style={styles.thumbnailImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.productNameText} numberOfLines={1}>
            {order.productName}
          </Text>
          <View style={styles.idRow}>
            <View style={styles.idPill}>
              <Text style={styles.orderIdText}>ID: {order.trackingId}</Text>
              <TouchableOpacity
                onPress={handleCopyId}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.copyBtn}
              >
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={13}
                  color={copied ? renewxColors.emerald : '#64748B'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Middle Section: Visual Delivery Progress Bar with Active Truck */}
      <View style={styles.stepperContainer}>
        {/* Floating ETA Label above current step */}
        {order.etaText ? (
          <View style={styles.etaRow}>
            <View style={[styles.etaPill, isDelivered && styles.etaPillDelivered]}>
              <Ionicons
                name={isDelivered ? 'checkmark-circle-outline' : 'time-outline'}
                size={12}
                color={isDelivered ? renewxColors.emerald : '#B45309'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.etaText, isDelivered && styles.etaTextDelivered]}>
                {order.etaText}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Milestone Stepper Row */}
        <View style={styles.milestoneRow}>
          {/* Node 0: Placed */}
          <View style={[styles.nodeCircle, activeStep >= 0 ? { backgroundColor: activeAccent } : styles.nodePending]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>

          {/* Dotted Line 0 -> 1 */}
          <View style={[styles.dottedLine, activeStep >= 1 ? { borderColor: activeAccent } : styles.linePending]} />

          {/* Node 1: Packed */}
          <View style={[styles.nodeCircle, activeStep >= 1 ? { backgroundColor: activeAccent } : styles.nodePending]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>

          {/* Dotted Line 1 -> 2 */}
          <View style={[styles.dottedLine, activeStep >= 2 ? { borderColor: activeAccent } : styles.linePending]} />

          {/* Node 2: In Transit (Truck Icon) */}
          {activeStep === 2 ? (
            <View style={styles.truckActiveNode}>
              <Ionicons name="car-outline" size={16} color="#FFFFFF" />
            </View>
          ) : activeStep > 2 ? (
            <View style={[styles.nodeCircle, { backgroundColor: activeAccent }]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          ) : (
            <View style={[styles.nodeCircle, styles.nodePending]}>
              <Ionicons name="car-outline" size={12} color="#94A3B8" />
            </View>
          )}

          {/* Dotted Line 2 -> 3 */}
          <View style={[styles.dottedLine, activeStep >= 3 ? styles.lineDelivered : styles.linePending]} />

          {/* Node 3: Delivered */}
          <View
            style={[
              styles.nodeCircle,
              activeStep >= 3 ? styles.nodeDelivered : styles.nodePendingCircle,
            ]}
          >
            <Ionicons name="checkmark" size={12} color={activeStep >= 3 ? '#FFFFFF' : '#CBD5E1'} />
          </View>
        </View>
      </View>

      {/* 4. Bottom Section: Route Info + 3D Parcel Box */}
      <View style={styles.bottomSection}>
        <View style={styles.routeColumns}>
          {/* FROM Column */}
          <View style={styles.routeCol}>
            <Text style={styles.routeLabel}>FROM</Text>
            <Text style={styles.hubTitle} numberOfLines={1} ellipsizeMode="tail">
              {order.fromHub.title}
            </Text>
            <Text style={styles.dateText} numberOfLines={1} ellipsizeMode="tail">
              {order.fromHub.date}
            </Text>
          </View>

          {/* TO Column */}
          <View style={styles.routeCol}>
            <Text style={styles.routeLabel}>TO</Text>
            <Text style={styles.hubTitle} numberOfLines={1} ellipsizeMode="tail">
              {order.toDestination.recipientOrCity}
            </Text>
            <Text
              style={[
                styles.dateText,
                isDelivered && styles.dateTextDelivered,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {order.toDestination.dateText}
            </Text>
          </View>
        </View>

        {/* 3D Delivery Box Asset */}
        <Image
          source={require('@/assets/delivery-box-3d-transparent.png')}
          style={styles.parcelBox3d}
          resizeMode="contain"
        />
      </View>

      {/* 5. Action Buttons Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => onTrack?.(order)}
          activeOpacity={0.85}
        >
          <Ionicons name="location-outline" size={15} color={renewxColors.black} style={{ marginRight: 5 }} />
          <Text style={styles.primaryActionText}>Track Waybill</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={() => onDetails?.(order)}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text-outline" size={14} color={renewxColors.textSecondary} style={{ marginRight: 5 }} />
          <Text style={styles.secondaryActionText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      },
    }),
  },
  ribbonWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    overflow: 'hidden',
    zIndex: 10,
  },
  ribbonBar: {
    position: 'absolute',
    top: 18,
    right: -32,
    width: 125,
    paddingVertical: 3.5,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ribbonText: {
    fontSize: 9,
    ...renewxTextStyle('black'),
    color: '#FFFFFF',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 64,
  },
  thumbnailBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginRight: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  productNameText: {
    fontSize: 15.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderIdText: {
    fontSize: 11.5,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
    letterSpacing: 0.1,
  },
  copyBtn: {
    marginLeft: 6,
    padding: 1,
  },
  stepperContainer: {
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  etaRow: {
    alignItems: 'center',
    marginBottom: 6,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  etaPillDelivered: {
    backgroundColor: renewxColors.mintLight,
    borderColor: renewxColors.mintBorder,
  },
  etaText: {
    fontSize: 11,
    ...renewxTextStyle('bold'),
    color: '#92400E',
  },
  etaTextDelivered: {
    color: renewxColors.emerald,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#EA580C',
  },
  nodePending: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  nodeDelivered: {
    backgroundColor: renewxColors.emerald,
  },
  nodePendingCircle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  truckActiveNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.32)',
      },
    }),
  },
  dottedLine: {
    flex: 1,
    height: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  lineCompleted: {
    borderColor: '#EA580C',
  },
  lineDelivered: {
    borderColor: renewxColors.emerald,
  },
  linePending: {
    borderColor: '#E2E8F0',
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  routeColumns: {
    flexDirection: 'row',
    flex: 1,
    paddingRight: 10,
  },
  routeCol: {
    flex: 1,
    paddingRight: 8,
  },
  routeLabel: {
    fontSize: 9.5,
    ...renewxTextStyle('bold'),
    color: '#64748B',
    letterSpacing: 0.8,
  },
  hubTitle: {
    fontSize: 12.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
    marginTop: 1,
  },
  dateTextDelivered: {
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
  },
  parcelBox3d: {
    width: 72,
    height: 72,
    marginBottom: -8,
    marginRight: -4,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryActionText: {
    fontSize: 12.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  secondaryActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 12,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
  },
});

