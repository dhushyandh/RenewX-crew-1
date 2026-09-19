import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface CategoryPillsProps {
  categories: { name: string; icon: string }[];
  active: string;
  onChange: (category: string) => void;
}

const iconMap: Record<string, string> = {
  grid: 'grid',
  laptop: 'laptop',
  phone: 'phone',
  headphones: 'headphones',
  watch: 'watch',
  camera: 'camera',
  tablet: 'tablet',
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
          const iconName = iconMap[cat.icon] || 'grid';
          return (
            <TouchableOpacity
              key={cat.name}
              onPress={() => onChange(cat.name)}
              style={[
                styles.pill,
                isActive && styles.pillActive,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName as any}
                size={15}
                color={isActive ? colors.white : colors.textSecondary}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.white,
  },
});
