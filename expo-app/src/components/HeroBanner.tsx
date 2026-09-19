import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

const { width } = Dimensions.get('window');

export default function HeroBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <View style={styles.badge}>
        <Ionicons name="leaf" size={14} color={colors.primaryLight} />
        <Text style={styles.badgeText}>Certified Refurbished</Text>
      </View>

      <Text style={styles.title}>
        Premium Tech,{'\n'}
        <Text style={styles.titleAccent}>Renewed & Affordable</Text>
      </Text>

      <Text style={styles.subtitle}>
        Rigorously tested, professionally refurbished electronics. Save up to 40% with warranty included.
      </Text>

      <View style={styles.featuresRow}>
        <View style={styles.feature}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primaryLight} />
          <Text style={styles.featureText}>12mo warranty</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="trending-down" size={16} color={colors.primaryLight} />
          <Text style={styles.featureText}>Save 40%</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="leaf" size={16} color={colors.primaryLight} />
          <Text style={styles.featureText}>Eco-friendly</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    position: 'relative',
  },
  glow1: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  glow2: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary,
    opacity: 0.12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  badgeText: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    lineHeight: 34,
    marginBottom: 12,
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: '#9ca3af',
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: fontSize.xs,
    color: '#9ca3af',
  },
});
