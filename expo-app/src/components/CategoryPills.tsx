import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface CategoryPillsProps {
  categories: { name: string; icon: string }[];
  active: string;
  onChange: (category: string) => void;
}

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  grid: 'grid-outline',
  laptop: 'laptop-outline',
  phone: 'phone-portrait-outline',
  headphones: 'headset-outline',
  watch: 'watch-outline',
  camera: 'camera-outline',
  tablet: 'tablet-portrait-outline',
};

export default function CategoryPills({ categories, active, onChange }: CategoryPillsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {categories.map((cat) => {
          const isActive = active === cat.name;
          const iconName = iconMap[cat.icon] || 'grid-outline';
          return (
            <TouchableOpacity
              key={cat.name}
              onPress={() => onChange(cat.name)}
              style={[styles.pill, isActive && styles.pillActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={14}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e1d8',
  },
  pillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: fontWeight.bold,
  },
});
