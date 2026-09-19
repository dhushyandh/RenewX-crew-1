import { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { products, categories } from '@/data/products';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.catGrid}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.name;
              const count = cat.name === 'All' ? products.length : products.filter((p) => p.category === cat.name).length;
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.catCard, isActive && styles.catCardActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={(cat.icon as any) || 'grid'}
                    size={26}
                    color={isActive ? colors.white : colors.primary}
                  />
                  <Text style={[styles.catName, isActive && styles.catNameActive]}>{cat.name}</Text>
                  <Text style={[styles.catCount, isActive && styles.catCountActive]}>{count} items</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.miniCard}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.miniImage}
              />
              <View style={styles.miniContent}>
                <Text style={styles.miniBrand}>{item.brand}</Text>
                <Text style={styles.miniName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.miniPrice}>${item.price}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

import { Image } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 10,
  },
  catCard: {
    flexBasis: '31.5%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  catCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  catNameActive: {
    color: colors.white,
  },
  catCount: {
    fontSize: 10,
    color: colors.textMuted,
  },
  catCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  miniCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  miniContent: {
    padding: 12,
  },
  miniBrand: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  miniName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 16,
    marginBottom: 6,
  },
  miniPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
