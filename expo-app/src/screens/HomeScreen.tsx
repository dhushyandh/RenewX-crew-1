import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { products, categories } from '@/data/products';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import HomeHeader from '@/components/HomeHeader';
import HeroBanner from '@/components/HeroBanner';
import CategoryPills from '@/components/CategoryPills';
import ProductCard from '@/components/ProductCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
  }, [addToCart]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('MainTabs', { screen: 'Cart' } as any)}
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
    </View>
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
    gap: spacing.md,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  itemCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
