import { useState, useMemo } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import HomeHeader from '@/components/HomeHeader';
import HeroBanner from '@/components/HeroBanner';
import CategoryPills from '@/components/CategoryPills';
import ProductCardGrid from '@/components/ProductCardGrid';

interface HomeScreenProps {
  products: Product[];
  onProductPress: (p: Product) => void;
  onSearch: () => void;
  onCart: () => void;
  isAdmin: boolean;
  onAdmin: () => void;
  onLogout: () => void;
}

export default function HomeScreen({
  products,
  onProductPress,
  onSearch,
  onCart,
  isAdmin,
  onAdmin,
  onLogout,
}: HomeScreenProps) {
  const { addToCart, totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState('All');
  const filtered = useMemo(
    () => (activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory)),
    [activeCategory, products]
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f7f2]">
      <HomeHeader
        onSearch={onSearch}
        cartCount={totalItems}
        onCart={onCart}
        isAdmin={isAdmin}
        onAdmin={onAdmin}
        onLogout={onLogout}
      />
      <div className="flex-1 overflow-y-auto pb-20">
        <HeroBanner />
        <div className="flex items-baseline justify-between px-4 mb-1">
          <h2 className="text-xl font-bold text-gray-900">
            {activeCategory === 'All' ? 'All Products' : activeCategory}
          </h2>
          <span className="text-sm text-gray-400">{filtered.length} items</span>
        </div>
        <CategoryPills active={activeCategory} onChange={setActiveCategory} />
        <div className="grid grid-cols-2 gap-3 px-4">
          {filtered.map((p) => (
            <ProductCardGrid
              key={p._uuid || p.id}
              product={p}
              onPress={() => onProductPress(p)}
              onAdd={() => addToCart(p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
