import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

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

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart } = useCart();
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);
        const data = await api.products.getAll({ limit: 100 });
        setAllProducts((data as any[]).map(mapRow));
      } catch (err: any) {
        setAllProducts([]);
        setLoadError(err?.message || 'Unable to load products');
      }
    })();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [query, allProducts]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search renewed tech..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim() === '' ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Search for products</Text>
          <Text style={styles.emptySubtitle}>Find laptops, phones, audio, and more</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try searching with a different term</Text>
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>
            {results.length} results for "{query}"
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => String(item._uuid || item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.image }} style={styles.resultImage} />
                <View style={styles.resultContent}>
                  <Text style={styles.resultBrand}>{item.brand}</Text>
                  <Text style={styles.resultName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.resultBottom}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.resultPrice}>${item.price}</Text>
                      <Text style={styles.resultOriginal}>${item.originalPrice}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addToCart(item)}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f7f2',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#ece8dc',
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resultCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  list: {
    padding: spacing.md,
    gap: 10,
  },
  resultItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultImage: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    resizeMode: 'cover',
    backgroundColor: '#f7f5ec',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  resultBrand: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  resultName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 16,
  },
  resultBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  resultPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  resultOriginal: {
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
