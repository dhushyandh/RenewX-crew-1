import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

export default function HeroBanner() {
  return (
    <View style={styles.container}>
      {/* Yellow accent background circle */}
      <View style={styles.decorCircle} />

      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>RenewX Crew</Text>
      </View>

      <Text style={styles.title}>
        Buy. Sell.{'\n'}Upgrade.{'\n'}
        <Text style={styles.titleAccent}>The Smart Way.</Text>
      </Text>

      <Text style={styles.subtitle}>
        Quality checked devices, fair value, and a smarter way to upgrade your tech.
      </Text>

      <View style={styles.featuresRow}>
        <View style={styles.feature}>
          <Ionicons name="shield-checkmark" size={15} color={colors.text} />
          <Text style={styles.featureText}>Trusted & Secure</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="ribbon-outline" size={15} color={colors.text} />
          <Text style={styles.featureText}>Certified Quality</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="flash-outline" size={15} color={colors.text} />
          <Text style={styles.featureText}>Fast Delivery</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e2d6',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  decorCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff2a8',
    opacity: 0.7,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.black,
    color: colors.text,
    lineHeight: 28,
    marginBottom: 8,
  },
  titleAccent: {
    color: '#000000',
    backgroundColor: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: '#4f4b42',
    lineHeight: 18,
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0ede6',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
