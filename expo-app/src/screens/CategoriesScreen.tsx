import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useCart } from '@/context/CartContext';
import RenewXLogo from '@/components/RenewXLogo';
import HomeHeader from '@/components/HomeHeader';
import { api } from '@/services/api';
import { CATEGORY_THIRD_PARTY_IMAGES } from '@/data/categories';
import { ShimmerText } from '@/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 6 Core Categories exactly matching Reference Design
const CATEGORY_ITEMS = [
  {
    id: 'Smartphones',
    query: 'Smartphones',
    title: 'Smartphones',
    subtext: 'iPhone, Samsung,\nOnePlus, Xiaomi, etc.',
    image: CATEGORY_THIRD_PARTY_IMAGES.Smartphones,
    isSelected: true, // First category has subtle yellow highlight per reference
  },
  {
    id: 'Laptops',
    query: 'Laptops',
    title: 'Laptops',
    subtext: 'MacBook, Dell, HP,\nLenovo, ASUS, etc.',
    image: CATEGORY_THIRD_PARTY_IMAGES.Laptops,
    isSelected: false,
  },
  {
    id: 'Tablets',
    query: 'Tablets',
    title: 'Tablets',
    subtext: 'iPad, Samsung Tab,\nLenovo, etc.',
    image: CATEGORY_THIRD_PARTY_IMAGES.Tablets,
    isSelected: false,
  },
  {
    id: 'Smartwatches',
    query: 'Watches',
    title: 'Smartwatches',
    subtext: 'Apple Watch,\nSamsung Galaxy, etc.',
    image: CATEGORY_THIRD_PARTY_IMAGES.Smartwatches,
    isSelected: false,
  },
  {
    id: 'Earbuds',
    query: 'Audio',
    title: 'Earbuds',
    subtext: 'AirPods, boAt, JBL,\nNoise, etc.',
    image: CATEGORY_THIRD_PARTY_IMAGES.Earbuds,
    isSelected: false,
  },
  {
    id: 'Accessories',
    query: 'Accessories',
    title: 'Accessories',
    subtext: 'Chargers, Cables,\nCases, Covers, etc.',
    image: CATEGORY_THIRD_PARTY_IMAGES.Accessories,
    isSelected: false,
  },
];

const BANNER_IMAGE = { uri: 'https://pngimg.com/uploads/iphone_14/iphone_14_PNG48.png' };

export default function CategoriesScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { totalItems } = useCart();
  const [selectedCatId, setSelectedCatId] = useState<string>('Smartphones');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.brands.getAll().catch(() => {});
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, []);

  const handleSelectCategory = (cat: typeof CATEGORY_ITEMS[0]) => {
    setSelectedCatId(cat.id);
    navigation.navigate('MainTabs', {
      screen: 'Shop',
      params: { category: cat.query, _t: Date.now() },
    });
  };

  const handleExploreBanner = () => {
    navigation.navigate('MainTabs', {
      screen: 'Shop',
      params: { category: 'All', _t: Date.now() },
    });
  };

  // Ultra-smooth synchronized banner animations (Hardware-accelerated, zero lag)
  const bannerPulseAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Synchronized floating and aura breathing (Silky sine curve)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulseAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bannerPulseAnim, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Slow gentle sparkle rotation (Linear, continuous)
    const rotateLoop = Animated.loop(
      Animated.timing(sparkleRotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    rotateLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, [bannerPulseAnim, sparkleRotateAnim]);

  const bannerFloatY = bannerPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });
  const auraScale = bannerPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });
  const auraOpacity = bannerPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.72],
  });
  const sparkleScale = bannerPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.25],
  });
  const sparkleRotateDeg = sparkleRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const sparkleRotateOppositeDeg = sparkleRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={styles.screenContainer}>
      {/* 1. TOP BAR 2 (Category / Shop Top Bar) */}
      <HomeHeader
        mode="category"
        title="Shop by Category"
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        searchPlaceholder="Search in Categories..."
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFC400"
            colors={['#FFC400', '#10B981']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >

        {/* 3. HEADING & SUBTITLE */}
        <View style={styles.headingSection}>
          <Text style={styles.mainTitle}>Shop by Category</Text>
          <Text style={styles.subtitle}>
            Explore our wide range of pre-owned and verified devices.
          </Text>
        </View>

        {/* 4. 2-COLUMN RESPONSIVE CATEGORY GRID */}
        <View style={styles.categoryGrid}>
          {CATEGORY_ITEMS.map((cat) => {
            const isHighlighted = selectedCatId === cat.id;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  isHighlighted && styles.categoryCardSelected,
                ]}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={`${cat.title} category`}
              >
                {/* Real Device Image */}
                <View style={styles.categoryImageContainer}>
                  <Image
                    source={{ uri: cat.image }}
                    style={styles.categoryImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Card Bottom: Text Details + Circular Action Button */}
                <View style={styles.categoryBottomRow}>
                  <View style={styles.categoryTextWrap}>
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                    <Text style={styles.categorySubtext}>{cat.subtext}</Text>
                  </View>

                  <View style={styles.categoryArrowButton}>
                    <Ionicons name="arrow-forward" size={15} color="#0F172A" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. PROMOTIONAL BANNER WITH RICH ANIMATIONS & SHIMMER */}
        <View style={styles.bannerContainer}>

          {/* Twinkling & Rotating Animated Sparkles */}
          <Animated.View
            style={[
              styles.sparkleOne,
              {
                transform: [{ rotate: sparkleRotateDeg }, { scale: sparkleScale }],
              },
            ]}
          >
            <Text style={{ fontSize: 16, color: '#F59E0B' }}>✦</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.sparkleTwo,
              {
                transform: [{ rotate: sparkleRotateOppositeDeg }, { scale: sparkleScale }],
              },
            ]}
          >
            <Text style={{ fontSize: 14, color: '#F59E0B' }}>✦</Text>
          </Animated.View>

          <View style={styles.bannerLeftContent}>
            {/* Shimmering Badge */}
            <View style={styles.certifiedBadge}>
              <ShimmerText
                variant="gold-badge"
                style={styles.certifiedBadgeText}
                duration={4200}
              >
                CERTIFIED PRE-OWNED
              </ShimmerText>
            </View>

            {/* Shimmering Headline */}
            <ShimmerText
              variant="gold"
              style={styles.bannerHeadline}
              duration={4800}
            >
              {'Premium Devices\nat Better Prices'}
            </ShimmerText>

            <Text style={styles.bannerSubtext}>
              Same performance. Greater value.
            </Text>

            <TouchableOpacity
              style={styles.bannerCtaButton}
              onPress={handleExploreBanner}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Explore pre-owned devices"
            >
              <Text style={styles.bannerCtaText}>Explore Now →</Text>
            </TouchableOpacity>
          </View>

          {/* Right Graphic: Yellow Circle Aura BEHIND, Device Image UP AHEAD */}
          <View style={styles.bannerRightGraphic}>
            {/* The rounded yellow circle aura strictly BEHIND the device */}
            <Animated.View
              style={[
                styles.bannerAuraGlow,
                {
                  transform: [{ scale: auraScale }],
                  opacity: auraOpacity,
                },
              ]}
            />

            {/* The device image strictly UP AHEAD of the rounded yellow circle */}
            <Animated.Image
              source={BANNER_IMAGE}
              style={[
                styles.bannerImage,
                {
                  transform: [{ translateY: bannerFloatY }],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Extra spacing for bottom floating navigation */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 6. FLOATING BOTTOM NAVIGATION (MATCHING GLOBAL RENEWX SPEC) */}
      <View style={styles.floatingNavContainer} pointerEvents="box-none">
        <View style={styles.floatingNavbarCapsule}>
          {/* Home */}
          <TouchableOpacity
            style={styles.floatingNavItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            activeOpacity={0.78}
          >
            <Ionicons name="home-outline" size={20} color="#64748B" />
            <Text style={styles.floatingNavLabel}>Home</Text>
          </TouchableOpacity>

          {/* Shop (Active tab on Category screen) */}
          <TouchableOpacity
            style={[styles.floatingNavItem, styles.floatingNavItemActive]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
            activeOpacity={0.78}
          >
            <Ionicons name="bag-handle" size={20} color="#000000" />
            <Text style={[styles.floatingNavLabel, styles.floatingNavLabelActive]}>
              Shop
            </Text>
          </TouchableOpacity>

          {/* Sell Button - elevated circular action in center */}
          <TouchableOpacity
            style={styles.floatingSellBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' })}
            activeOpacity={0.85}
          >
            <Ionicons name="pricetag" size={20} color="#000000" />
            <Text style={styles.floatingSellLabel}>Sell</Text>
          </TouchableOpacity>

          {/* Track */}
          <TouchableOpacity
            style={styles.floatingNavItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Track' })}
            activeOpacity={0.78}
          >
            <Ionicons name="cube-outline" size={20} color="#64748B" />
            <Text style={styles.floatingNavLabel}>Track</Text>
          </TouchableOpacity>

          {/* Account */}
          <TouchableOpacity
            style={styles.floatingNavItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
            activeOpacity={0.78}
          >
            <Ionicons name="person-outline" size={20} color="#64748B" />
            <Text style={styles.floatingNavLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 1. Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // 2. Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterButton: {
    paddingLeft: 10,
    paddingVertical: 6,
  },

  // 3. Main Heading
  headingSection: {
    marginBottom: 18,
  },
  mainTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 20,
  },

  // 4. Category Grid (2 columns)
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 188,
  },
  categoryCardSelected: {
    backgroundColor: '#FFFDF0',
    borderColor: '#FDE047',
    borderWidth: 1.5,
  },
  categoryImageContainer: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  categoryTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  categorySubtext: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    fontWeight: '500',
    marginTop: 3,
  },
  categoryArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },

  // 5. Promotional Banner
  bannerContainer: {
    backgroundColor: '#FFFDF0',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FEF08A',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerAuraGlow: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderRadius: 62.5,
    backgroundColor: '#FDE047',
    zIndex: 1,
  },
  sparkleOne: {
    position: 'absolute',
    top: 50,
    right: 175,
    zIndex: 3,
  },
  sparkleTwo: {
    position: 'absolute',
    top: 18,
    right: 20,
    zIndex: 3,
  },
  bannerLeftContent: {
    flex: 1.15,
    paddingRight: 10,
    zIndex: 2,
  },
  certifiedBadge: {
    backgroundColor: '#FEF08A',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  certifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  bannerHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  bannerSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 12,
  },
  bannerCtaButton: {
    backgroundColor: '#FACC15',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bannerRightGraphic: {
    flex: 0.85,
    height: 135,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 5,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    zIndex: 10,
  },

  // 6. Floating Bottom Navigation
  floatingNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingNavbarCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 420,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    paddingHorizontal: 10,
  },
  floatingNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  floatingNavItemActive: {
    backgroundColor: '#FEF08A',
  },
  floatingNavLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  floatingNavLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  floatingSellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingSellLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: -1,
  },
});
