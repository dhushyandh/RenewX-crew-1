import { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { categories } from '@/data/products';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import type { Product } from '@/types';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  grid: 'grid-outline',
  laptop: 'laptop-outline',
  phone: 'phone-portrait-outline',
  headphones: 'headset-outline',
  watch: 'watch-outline',
  camera: 'camera-outline',
  tablet: 'tablet-portrait-outline',
};

export default function CategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.products.getAll({ limit: 100 });
        setProductList((data as any[]).map(mapProductRow));
      } catch (err) {
        console.warn('Categories API unavailable:', err);
        setProductList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return productList;
    return productList.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, productList]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerState}>
          <Ionicons name="sync-outline" size={34} color={colors.primary} />
          <Text style={styles.stateTitle}>Loading live inventory</Text>
          <Text style={styles.stateSub}>Fetching the latest RenewX products…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item._uuid || item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.catGrid}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.name;
              const count =
                cat.name === 'All'
                  ? productList.length
                  : productList.filter((p) => p.category === cat.name).length;
              const iconName = iconMap[cat.icon] || 'grid-outline';

              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.catCard, isActive && styles.catCardActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={iconName}
                    size={24}
                    color={isActive ? colors.primary : '#111827'}
                  />
                  <Text style={[styles.catName, isActive && styles.catNameActive]}>
                    {cat.name}
                  </Text>
                  <Text style={[styles.catCount, isActive && styles.catCountActive]}>
                    {count} items
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.miniCard}
              onPress={() => navigation.navigate('ProductDetail', { id: String(item.id) })}
              activeOpacity={0.85}
            >
              <Image source={item.image ? { uri: item.image } : null} style={styles.miniImage} resizeMode="cover" />
              <View style={styles.miniContent}>
                <Text style={styles.miniBrand}>{item.brand}</Text>
                <Text style={styles.miniName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.miniPrice}>₹{Number(item.price || 0).toLocaleString('en-IN')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stateTitle: { marginTop: 12, fontSize: 16, fontWeight: '800', color: colors.text },
  stateSub: { marginTop: 5, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  catCard: {
    flexBasis: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e1d8',
    gap: 4,
  },
  catCardActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  catName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  catNameActive: {
    color: '#ffffff',
    fontWeight: fontWeight.bold,
  },
  catCount: {
    fontSize: 10,
    color: colors.textMuted,
  },
  catCountActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  miniCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#ece8dc',
  },
  miniImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f7f5ec',
  },
  miniContent: {
    padding: 10,
  },
  miniBrand: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  miniName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 16,
    marginBottom: 4,
  },
  miniPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
});
