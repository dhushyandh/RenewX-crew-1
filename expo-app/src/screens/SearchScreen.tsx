import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
import { mapProductRow } from '@/lib/productMapper';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SEARCH_DEBOUNCE_MS = 250;
const PRODUCT_LIMIT = 100;

const formatPrice = (value: unknown): string => {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return '₹0';
  }

  return `₹${Math.round(price).toLocaleString('en-IN')}`;
};

const getProductKey = (product: Product): string =>
  String(product._uuid || product.id);

const getProductImage = (product: Product): string | null => {
  const image = product.image;

  if (!image || typeof image !== 'string') {
    return null;
  }

  return image.trim() || null;
};

const normalize = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export default function SearchScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const { addToCart } = useCart();

  const inputRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /*
   * Debounce search input.
   *
   * This keeps the UI responsive when users type quickly and prevents
   * unnecessary filtering work on every single keystroke.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const loadProducts = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setLoadError(null);

    try {
      const response = await api.products.getAll({
        limit: PRODUCT_LIMIT,
      });

      if (!isMountedRef.current) {
        return;
      }

      const rows = Array.isArray(response) ? response : [];

      const products = rows
        .map((row) => {
          try {
            return mapProductRow(row);
          } catch {
            return null;
          }
        })
        .filter((product): product is Product => product !== null);

      setAllProducts(products);
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to load products. Please try again.';

      setLoadError(message);

      if (!refresh) {
        setAllProducts([]);
      }
    } finally {
      if (!isMountedRef.current) {
        return;
      }

      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  /*
   * Search locally against the already-loaded product catalogue.
   *
   * Supports:
   * - product name
   * - brand
   * - category
   * - model
   * - SKU
   */
  const results = useMemo(() => {
    const search = normalize(debouncedQuery);

    if (!search) {
      return [];
    }

    return allProducts.filter((product) => {
      const searchableText = [
        product.name,
        product.brand,
        (product as Product & { category?: string }).category,
        (product as Product & { model?: string }).model,
        (product as Product & { sku?: string }).sku,
      ]
        .map(normalize)
        .filter(Boolean)
        .join(' ');

      return searchableText.includes(search);
    });
  }, [allProducts, debouncedQuery]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('MainTabs', {
      screen: 'Home',
    });
  }, [navigation]);

  const handleImageError = useCallback((productKey: string) => {
    setImageErrors((current) => {
      if (current[productKey]) {
        return current;
      }

      return {
        ...current,
        [productKey]: true,
      };
    });
  }, []);

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCart(product);
      navigation.navigate('Cart');
    },
    [addToCart, navigation]
  );

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => {
      const productKey = getProductKey(item);
      const imageUri = getProductImage(item);
      const hasImageError = imageErrors[productKey];

      return (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.85}
          accessibilityLabel={`View ${item.name}`}
          onPress={() =>
            navigation.navigate('ProductDetail', {
              id: String(item.id),
            })
          }
        >
          <View style={styles.imageWrapper}>
            {imageUri && !hasImageError ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.resultImage}
                resizeMode="cover"
                onError={() => handleImageError(productKey)}
              />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons
                  name="image-outline"
                  size={24}
                  color="#cbd5e1"
                />
              </View>
            )}
          </View>

          <View style={styles.resultContent}>
            <Text style={styles.resultBrand} numberOfLines={1}>
              {item.brand || 'RenewX'}
            </Text>

            <Text style={styles.resultName} numberOfLines={2}>
              {item.name || 'Unnamed product'}
            </Text>

            <View style={styles.resultBottom}>
              <View style={styles.priceContainer}>
                <Text style={styles.resultPrice}>
                  {formatPrice(item.price)}
                </Text>

                {Number(item.originalPrice) > Number(item.price) && (
                  <Text style={styles.resultOriginal}>
                    {formatPrice(item.originalPrice)}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.addButton}
                activeOpacity={0.8}
                accessibilityLabel={`Add ${item.name} to cart`}
                hitSlop={{
                  top: 8,
                  bottom: 8,
                  left: 8,
                  right: 8,
                }}
                onPress={() => {
                  handleAddToCart(item);
                }}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      handleAddToCart,
      handleImageError,
      imageErrors,
      navigation,
    ]
  );

  const keyExtractor = useCallback(
    (item: Product) => getProductKey(item),
    []
  );

  const renderSkeleton = useCallback(() => {
    return (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View
            key={`search-skeleton-${index}`}
            style={styles.skeletonItem}
          >
            <View style={styles.skeletonImage} />

            <View style={styles.skeletonContent}>
              <View style={styles.skeletonBrand} />
              <View style={styles.skeletonName} />
              <View style={styles.skeletonPrice} />
            </View>
          </View>
        ))}
      </View>
    );
  }, []);

  const renderEmptyState = () => {
    if (loadError) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color="#94a3b8"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Couldn't load products
          </Text>

          <Text style={styles.emptySubtitle}>
            Check your connection and try again.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={() => void loadProducts()}
          >
            <Ionicons
              name="refresh"
              size={16}
              color={colors.primary}
            />

            <Text style={styles.retryButtonText}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!debouncedQuery) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="search-outline"
              size={30}
              color="#94a3b8"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Search for products
          </Text>

          <Text style={styles.emptySubtitle}>
            Find renewed phones, laptops, audio devices and more.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="search-outline"
            size={30}
            color="#94a3b8"
          />
        </View>

        <Text style={styles.emptyTitle}>
          No products found
        </Text>

        <Text style={styles.emptySubtitle}>
          We couldn't find anything matching "{debouncedQuery}".
        </Text>

        <TouchableOpacity
          style={styles.clearSearchButton}
          activeOpacity={0.8}
          onPress={handleClearSearch}
        >
          <Text style={styles.clearSearchText}>
            Clear search
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { paddingTop: safeTop }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#94a3b8"
          />

          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search renewed tech..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            accessibilityLabel="Search products"
          />

          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#94a3b8"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <>
          {debouncedQuery && results.length > 0 && (
            <View style={styles.resultHeader}>
              <Text style={styles.resultCount}>
                {results.length}{' '}
                {results.length === 1 ? 'result' : 'results'}
              </Text>

              <TouchableOpacity
                onPress={() => void loadProducts(true)}
                disabled={isRefreshing}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Refresh products"
              >
                {isRefreshing ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.text}
                  />
                ) : (
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={results}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={
              results.length === 0
                ? styles.emptyList
                : styles.list
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            removeClippedSubviews
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void loadProducts(true)}
                tintColor={colors.text}
              />
            }
            ListEmptyComponent={renderEmptyState()}
          />
        </>
      )}
    </View>
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
    backgroundColor: '#ffffff',
  },

  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    backgroundColor: '#f8f7f2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#ece8dc',
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontSize: fontSize.sm,
    color: colors.text,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },

  resultCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },

  list: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    gap: 10,
    paddingBottom: 32,
  },

  emptyList: {
    flexGrow: 1,
  },

  resultItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  imageWrapper: {
    width: 68,
    height: 68,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: '#f7f5ec',
  },

  resultImage: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f5ec',
  },

  resultContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },

  resultBrand: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },

  resultName: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },

  resultBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flexShrink: 1,
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
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    marginLeft: 8,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },

  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginBottom: spacing.md,
  },

  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },

  emptySubtitle: {
    maxWidth: 280,
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 16,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#000000',
  },

  retryButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  clearSearchButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },

  clearSearchText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  skeletonContainer: {
    padding: spacing.md,
    gap: 10,
  },

  skeletonItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  skeletonImage: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: '#e5e7eb',
  },

  skeletonContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  skeletonBrand: {
    width: '30%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },

  skeletonName: {
    width: '75%',
    height: 12,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
  },

  skeletonPrice: {
    width: '40%',
    height: 12,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
  },
});