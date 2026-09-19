import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { products as initialFallbackProducts, categories } from '@/data/products';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import HomeHeader from '@/components/HomeHeader';
import HeroBanner from '@/components/HeroBanner';
import CategoryPills from '@/components/CategoryPills';
import ProductCard from '@/components/ProductCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function mapRow(row: any): Product {
  return {
    id: row.id,
    _uuid: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category as Product['category'],
    originalPrice: row.original_price,
    price: row.price,
    condition: row.condition as Product['condition'],
    warrantyMonths: row.warranty_months,
    image: row.image_url,
    rating: row.rating ?? 0,
    reviews: row.reviews ?? 0,
    stock: row.stock,
    description: row.description ?? '',
    specs: Array.isArray(row.specs) ? row.specs : [],
  };
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, totalItems } = useCart();
  const { isAdmin, signOut } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLiveProducts = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await api.products.getAll({ limit: 100 });
      setProductList((data as any[]).map(mapRow));
    } catch (err: any) {
      setProductList([]);
      setLoadError(err?.message || 'Unable to load products');
    }
  }, []);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return productList;
    return productList.filter((p) => p.category === activeCategory);
  }, [activeCategory, productList]);

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCart(product);
    },
    [addToCart]
  );

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
        data={filteredProducts}
        keyExtractor={(item) => String(item._uuid || item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <HeroBanner />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'All' ? 'All Products' : activeCategory}
              </Text>
              <Text style={styles.itemCount}>
                {filteredProducts.length} items
              </Text>
            </View>
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ProductCard
              product={item}
              onPress={() => handleProductPress(item)}
              onAddToCart={() => handleAddToCart(item)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  itemCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
