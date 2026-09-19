import { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { CartProvider, useCart } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import type { ProductRow } from '@/lib/supabase';
import type { Product } from '@/types';
import { RefreshCw } from 'lucide-react';

import StatusBar from '@/components/StatusBar';
import BottomTabs, { type Tab } from '@/components/BottomTabs';
import FloatingContactButtons from '@/components/FloatingContactButtons';
import HomeScreen from '@/screens/HomeScreen';
import ShopScreen from '@/screens/ShopScreen';
import SellScreen from '@/screens/SellScreen';
import TrackScreen from '@/screens/TrackScreen';
import AccountScreen from '@/screens/AccountScreen';
import CartScreen from '@/screens/CartScreen';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import SearchScreen from '@/screens/SearchScreen';
import AuthScreen from '@/screens/AuthScreen';
import AdminPanel from '@/screens/AdminPanel';
import ProtectedRoute from '@/components/ProtectedRoute';

function mapRow(row: ProductRow): Product {
  return {
    id: 0,
    _uuid: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category as Product['category'],
    originalPrice: row.original_price,
    price: row.price,
    condition: row.condition as Product['condition'],
    warrantyMonths: row.warranty_months,
    image: row.image_url,
    rating: row.rating,
    reviews: row.reviews,
    stock: row.stock,
    description: row.description,
    specs: Array.isArray(row.specs) ? row.specs : [],
  };
}

function AppRoutes({
  products,
  openProduct,
}: {
  products: Product[];
  openProduct: (p: Product) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { addToCart, totalItems } = useCart();

  const path = location.pathname;

  // Derive active tab from URL pathname
  const getActiveTab = (): Tab => {
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/sell')) return 'sell';
    if (path.startsWith('/track')) return 'track';
    if (path.startsWith('/account')) return 'account';
    if (path.startsWith('/cart')) return 'cart';
    if (path.startsWith('/admin')) return 'admin';
    return 'home';
  };

  const handleTabChange = (t: Tab) => {
    switch (t) {
      case 'home':
        navigate('/');
        break;
      case 'shop':
        navigate('/shop');
        break;
      case 'sell':
        navigate('/sell');
        break;
      case 'track':
        navigate('/track');
        break;
      case 'account':
        navigate('/account');
        break;
      case 'cart':
        navigate('/cart');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  const showTabs =
    path === '/' ||
    path.startsWith('/shop') ||
    path.startsWith('/sell') ||
    path.startsWith('/track') ||
    path.startsWith('/account');

  const showFloatingContact =
    path === '/' ||
    path.startsWith('/shop') ||
    path.startsWith('/sell') ||
    path.startsWith('/track') ||
    path.startsWith('/product');

  return (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden relative">
      <StatusBar />
      <div className="flex-1 overflow-hidden relative">
        <Routes>
          {/* Main Storefront Routes */}
          <Route
            path="/"
            element={
              <HomeScreen
                products={products}
                onProductPress={openProduct}
                onSearch={() => navigate('/search')}
                onCart={() => navigate('/cart')}
                isAdmin={isAdmin}
                onAdmin={() => navigate('/admin/dashboard')}
                onLogout={signOut}
              />
            }
          />
          <Route
            path="/shop"
            element={
              <ShopScreen
                products={products}
                onProductPress={openProduct}
                onCart={() => navigate('/cart')}
                onSearch={() => navigate('/search')}
                onAccount={() => navigate('/account')}
                onAdmin={() => navigate('/admin/dashboard')}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/sell"
            element={<SellScreen onComplete={() => navigate('/track')} />}
          />
          <Route
            path="/track"
            element={<TrackScreen onShopNow={() => navigate('/shop')} />}
          />
          <Route
            path="/track/:orderId"
            element={<TrackScreen onShopNow={() => navigate('/shop')} />}
          />
          <Route
            path="/account"
            element={
              <AccountScreen
                onAdmin={() => navigate('/admin/dashboard')}
                onViewOrders={() => navigate('/track')}
                onShopNow={() => navigate('/shop')}
              />
            }
          />
          <Route
            path="/cart"
            element={<CartScreen userId={user?.id || ''} />}
          />
          <Route
            path="/search"
            element={
              <SearchScreen
                products={products}
                onProductPress={openProduct}
                onBack={() => navigate('/shop')}
              />
            }
          />
          <Route
            path="/product/:id"
            element={<ProductDetailRoute products={products} />}
          />

          {/* Clean Admin Sub-Routes (Protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly>
                <AdminPanel onExit={() => navigate('/account')} />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {showFloatingContact && <FloatingContactButtons />}
      </div>

      {showTabs && (
        <BottomTabs
          active={getActiveTab()}
          onChange={handleTabChange}
          cartCount={totalItems}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function ProductDetailRoute({ products }: { products: Product[] }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const product = products.find((p) => p._uuid === id || p.id.toString() === id);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-sm font-bold text-gray-700">Product not found</p>
        <button
          onClick={() => navigate('/shop')}
          className="mt-4 px-4 py-2 rounded-xl bg-black text-[#ffc400] text-xs font-bold"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <ProductDetailScreen
      product={product}
      onBack={() => navigate('/shop')}
      onAddToCart={() => addToCart(product)}
      onCart={() => navigate('/cart')}
    />
  );
}

function MobileAppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    if (data) setProducts((data as ProductRow[]).map(mapRow));
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  const openProduct = (p: Product) => {
    navigate(`/product/${p._uuid || p.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <AppRoutes products={products} openProduct={openProduct} />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <div
              className="min-h-screen bg-gray-200 flex items-center justify-center p-4 md:p-8"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, #e5e7eb 0%, #d1d5db 100%)',
              }}
            >
              <div className="hidden md:block absolute top-8 left-8 text-gray-500 max-w-xs">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">RenewX Mobile</h1>
                <p className="text-sm text-gray-500">
                  Sign in to shop certified pre-owned tech or sell your device with instant valuation.
                </p>
              </div>
              <div
                className="relative bg-black rounded-[3rem] p-2.5 shadow-2xl"
                style={{
                  width: '100%',
                  maxWidth: 390,
                  aspectRatio: '390 / 844',
                  maxHeight: 'calc(100vh - 2rem)',
                }}
              >
                <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50"></div>
                  <div className="w-full h-full overflow-hidden">
                    <MobileAppContent />
                  </div>
                </div>
              </div>
            </div>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
