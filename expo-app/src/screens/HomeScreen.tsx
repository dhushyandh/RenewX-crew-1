import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '@/App';
import { categories } from '@/data/products';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import HomeHeader from '@/components/HomeHeader';
import HeroBanner from '@/components/HeroBanner';
import CategoryPills from '@/components/CategoryPills';
import ProductCard from '@/components/ProductCard';
import { mapProductRow } from '@/lib/productMapper';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const PRODUCTS_CACHE_KEY = '@renewx_products_cache';

function ProductSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLineSmall} />
      <View style={styles.skeletonLinePrice} />
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, totalItems } = useCart();
  const { isAdmin, signOut } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const readCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!cached) return false;
      const rows = JSON.parse(cached);
      if (!Array.isArray(rows)) return false;
      const mapped = rows.map(mapProductRow);
      if (mapped.length) {
        setProductList(mapped);
        setUsingCache(true);
        return true;
      }
    } catch (error) {
      console.warn('[Home] Product cache read failed:', error);
    }
    return false;
  }, []);

  const fetchLiveProducts = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);
      setProductList(mapped);
      setUsingCache(false);
      await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(rows));
    } catch (err: any) {
      const cached = await readCache();
      setLoadError(err?.message || 'Unable to load products. Check your connection.');
      if (!cached) setProductList([]);
    } finally {
      setLoading(false);
    }
  }, [readCache]);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return productList;
    return productList.filter((p) => p.category === activeCategory);
  }, [activeCategory, productList]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveProducts();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        isAdmin={isAdmin}
        onAdmin={() => navigation.navigate('Admin', { screen: 'dashboard' })}
        onLogout={signOut}
      />

      <FlatList
        data={loading ? [] : filteredProducts}
        keyExtractor={(item) => String(item._uuid || item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <HeroBanner />
            {loadError && (
              <View style={styles.connectionNotice}>
                <Ionicons name={usingCache ? 'cloud-offline-outline' : 'warning-outline'} size={18} color="#92400e" />
                <View style={styles.connectionCopy}>
                  <Text style={styles.connectionTitle}>
                    {usingCache ? 'Showing saved products' : 'Could not load products'}
                  </Text>
                  <Text style={styles.connectionText}>
                    {usingCache ? 'The latest inventory will appear when the connection returns.' : loadError}
                  </Text>
                </View>
                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'All' ? 'All Products' : activeCategory}
              </Text>
              {!loading && <Text style={styles.itemCount}>{filteredProducts.length} items</Text>}
            </View>
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonGrid}>
              <ProductSkeleton />
              <ProductSkeleton />
              <ProductSkeleton />
              <ProductSkeleton />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name={loadError ? 'cloud-offline-outline' : 'cube-outline'} size={30} color="#64748b" />
              </View>
              <Text style={styles.emptyTitle}>
                {loadError ? 'Inventory unavailable' : 'No products available'}
              </Text>
              <Text style={styles.emptyText}>
                {loadError
                  ? 'We could not reach the product service. Please try again.'
                  : activeCategory === 'All'
                    ? 'New certified devices will appear here when they are published.'
                    : 'No products are currently available in this category.'}
              </Text>
              {loadError && (
                <TouchableOpacity style={styles.emptyRetry} onPress={onRefresh}>
                  <Ionicons name="refresh" size={16} color="#ffffff" />
                  <Text style={styles.emptyRetryText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { id: String(item.id) })}
              onAddToCart={() => addToCart(item)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xl },
  row: { paddingHorizontal: spacing.md, gap: spacing.sm },
  cardWrapper: { flex: 1, maxWidth: '50%' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  itemCount: { fontSize: fontSize.xs, color: colors.textMuted },
  connectionNotice: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectionCopy: { flex: 1 },
  connectionTitle: { fontSize: 12, fontWeight: '800', color: '#78350f' },
  connectionText: { fontSize: 10, color: '#92400e', marginTop: 2 },
  retryButton: { paddingHorizontal: 8, paddingVertical: 6 },
  retryText: { fontSize: 11, fontWeight: '800', color: '#92400e' },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skeletonCard: {
    width: '48%',
    padding: 10,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  skeletonImage: { height: 145, borderRadius: radius.sm, backgroundColor: '#e5e7eb', marginBottom: 10 },
  skeletonLineLarge: { height: 12, width: '82%', borderRadius: 6, backgroundColor: '#e5e7eb', marginBottom: 7 },
  skeletonLineSmall: { height: 9, width: '55%', borderRadius: 6, backgroundColor: '#e5e7eb', marginBottom: 10 },
  skeletonLinePrice: { height: 14, width: '45%', borderRadius: 6, backgroundColor: '#d1d5db' },
  emptyState: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 55 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyRetry: {
    marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.md,
  },
  emptyRetryText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
});
