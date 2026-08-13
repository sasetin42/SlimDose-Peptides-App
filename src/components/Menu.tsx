import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuItemCard from './MenuItemCard';
import Hero from './Hero';
import type { Product, ProductVariation, CartItem } from '../types';
import { 
  Search, 
  ChevronDown, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  ArrowRight,
  Tag,
  Sparkles,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  ShieldCheck,
  Award,
  Gem,
  Coins,
  Layout
} from 'lucide-react';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';

interface MenuProps {
  menuItems: Product[];
  loading?: boolean;
  addToCart: (product: Product, variation?: ProductVariation, quantity?: number, priceOverride?: number) => void;
  cartItems: CartItem[];
  updateQuantity: (index: number, quantity: number) => void;
}

const Menu: React.FC<MenuProps> = ({ menuItems, loading = false, addToCart, cartItems }) => {
  const { globalDiscount } = useGlobalDiscount();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [purityFilter, setPurityFilter] = useState<string>('all');
  const productsRef = useRef<HTMLDivElement | null>(null);

  // Dropdown Open States
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isPurityOpen, setIsPurityOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Dropdown Refs
  const priceRef = useRef<HTMLDivElement>(null);
  const purityRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Outside click listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priceRef.current && !priceRef.current.contains(event.target as Node)) {
        setIsPriceOpen(false);
      }
      if (purityRef.current && !purityRef.current.contains(event.target as Node)) {
        setIsPurityOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = menuItems.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesPrice = true;
    if (priceRange === 'under-2000') {
      matchesPrice = product.base_price < 2000;
    } else if (priceRange === '2000-3000') {
      matchesPrice = product.base_price >= 2000 && product.base_price <= 3000;
    } else if (priceRange === 'over-3000') {
      matchesPrice = product.base_price > 3000;
    }
    
    let matchesPurity = true;
    if (purityFilter !== 'all') {
      const minPurity = parseFloat(purityFilter);
      matchesPurity = product.purity_percentage >= minPurity;
    }
    
    return matchesSearch && matchesPrice && matchesPurity;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price':
        return a.base_price - b.base_price;
      case 'purity':
        return b.purity_percentage - a.purity_percentage;
      default:
        return 0;
    }
  });

  // Dropdown Configs & Labels
  const sortLabels: Record<typeof sortBy, string> = {
    name: 'Most Popular',
    price: 'Price: Low to High',
  };

  const priceOptions = [
    { value: 'all', label: 'All Prices', icon: Tag },
    { value: 'under-2000', label: 'Under ₱2,000', icon: ArrowDown },
    { value: '2000-3000', label: '₱2,000 – ₱3,000', icon: ArrowRight },
    { value: 'over-3000', label: 'Over ₱3,000', icon: ArrowUp },
  ];

  const purityOptions = [
    { value: 'all', label: 'All Purity', icon: Sparkles },
    { value: '99', label: '99%+ Purity', icon: ShieldCheck },
    { value: '99.5', label: '99.5%+ Purity', icon: Award },
    { value: '99.8', label: '99.8%+ Purity', icon: Gem },
  ];

  const sortOptions = [
    { value: 'name', label: 'Most Popular', icon: Layout },
    { value: 'price', label: 'Price: Low to High', icon: Coins },
  ];

  const getCartQuantity = (productId: string, variationId?: string) => {
    return cartItems
      .filter(item =>
        item.product.id === productId &&
        (variationId ? item.variation?.id === variationId : !item.variation)
      )
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleProductClick = (product: Product) => {
    if (product.slug) {
      navigate(`/${product.slug}`);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-[#0F1219]">
        <Hero
          onShopAll={() => {
            productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />

        {/* ═══ PRODUCT CATALOG CONTAINER ═══ */}
        <div className="container-global relative z-30 pt-0 sm:pt-1" ref={productsRef}>

          {/* Header & Controls Bar — Unified Inline Layout with elevated z-index for filter dropdowns */}
          <div className="mt-1 mb-3 sm:mt-2 sm:mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-4 border-b border-gray-200/60 pb-2 sm:pb-4 relative z-40">
            {/* Title & Subtitle */}
            <div className="flex-shrink-0">
              <h1 className="text-[20px] sm:text-3xl font-heading font-extrabold tracking-tight text-[#3C6CA8]">
                All Products
              </h1>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[#232323]/70 dark:text-gray-400 font-medium">
                Premium research peptides with 99%+ purity
              </p>
            </div>

            {/* Inline Controls (Search + Filters) */}
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto relative transition-all ${isPriceOpen || isPurityOpen || isSortOpen ? 'z-[100]' : 'z-40'}`}>
              {/* Search Input */}
              <div className="relative min-w-[200px] lg:w-[240px] xl:w-[280px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-xs sm:text-sm text-[#232323] dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/10 focus:border-[#3C6CA8]/40 transition-all shadow-sm"
                />
              </div>

              {/* Filter Group Container — 100% single line row */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-visible shrink-0 relative z-50 w-full sm:w-auto justify-between sm:justify-start">
                {/* Price Filter */}
                <div className="relative flex-1 sm:flex-initial inline-flex shrink-0" ref={priceRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPriceOpen(!isPriceOpen);
                      setIsPurityOpen(false);
                      setIsSortOpen(false);
                    }}
                    className={`w-full sm:w-auto inline-flex items-center justify-between h-8 sm:h-10 px-2.5 sm:px-4 rounded-full border text-[11px] sm:text-sm font-semibold transition-all shadow-sm gap-1 cursor-pointer ${
                      priceRange !== 'all'
                        ? 'border-[#3C6CA8] bg-blue-50/70 dark:bg-blue-950/40 text-[#3C6CA8] dark:text-blue-400 font-bold'
                        : 'border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-[#232323] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <Tag className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${priceRange !== 'all' ? 'text-[#3C6CA8] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className="truncate">{priceOptions.find(o => o.value === priceRange)?.label}</span>
                    </div>
                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${isPriceOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    className={`absolute top-full left-0 mt-1.5 w-44 sm:w-52 rounded-2xl border border-gray-150/90 dark:border-gray-800 bg-white/95 dark:bg-[#161B26]/95 backdrop-blur-md shadow-2xl z-[999] p-1.5 transition-all duration-200 origin-top-left ${
                      isPriceOpen 
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    {priceOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPriceRange(opt.value);
                          setIsPriceOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                          priceRange === opt.value
                            ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <opt.icon className={`w-3.5 h-3.5 ${
                          priceRange === opt.value 
                            ? 'text-[#3C6CA8] dark:text-blue-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purity Filter */}
                <div className="relative flex-1 sm:flex-initial inline-flex shrink-0" ref={purityRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPurityOpen(!isPurityOpen);
                      setIsPriceOpen(false);
                      setIsSortOpen(false);
                    }}
                    className={`w-full sm:w-auto inline-flex items-center justify-between h-8 sm:h-10 px-2.5 sm:px-4 rounded-full border text-[11px] sm:text-sm font-semibold transition-all shadow-sm gap-1 cursor-pointer ${
                      purityFilter !== 'all'
                        ? 'border-[#3C6CA8] bg-blue-50/70 dark:bg-blue-950/40 text-[#3C6CA8] dark:text-blue-400 font-bold'
                        : 'border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-[#232323] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <Sparkles className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${purityFilter !== 'all' ? 'text-[#3C6CA8] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className="truncate">{purityOptions.find(o => o.value === purityFilter)?.label}</span>
                    </div>
                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${isPurityOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-0 mt-1.5 w-44 sm:w-52 rounded-2xl border border-gray-150/90 dark:border-gray-800 bg-white/95 dark:bg-[#161B26]/95 backdrop-blur-md shadow-2xl z-[999] p-1.5 transition-all duration-200 origin-top ${
                      isPurityOpen 
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    {purityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPurityFilter(opt.value);
                          setIsPurityOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                          purityFilter === opt.value
                            ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <opt.icon className={`w-3.5 h-3.5 ${
                          purityFilter === opt.value 
                            ? 'text-[#3C6CA8] dark:text-blue-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="relative flex-1 sm:flex-initial inline-flex shrink-0" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortOpen(!isSortOpen);
                      setIsPriceOpen(false);
                      setIsPurityOpen(false);
                    }}
                    className={`w-full sm:w-auto inline-flex items-center justify-between h-8 sm:h-10 px-2.5 sm:px-4 rounded-full border text-[11px] sm:text-sm font-semibold transition-all shadow-sm gap-1 cursor-pointer ${
                      sortBy !== 'name'
                        ? 'border-[#3C6CA8] bg-blue-50/70 dark:bg-blue-950/40 text-[#3C6CA8] dark:text-blue-400 font-bold'
                        : 'border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-[#232323] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <SlidersHorizontal className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${sortBy !== 'name' ? 'text-[#3C6CA8] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className="truncate">{sortLabels[sortBy]}</span>
                    </div>
                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    className={`absolute top-full right-0 mt-1.5 w-44 sm:w-52 rounded-2xl border border-gray-150/90 dark:border-gray-800 bg-white/95 dark:bg-[#161B26]/95 backdrop-blur-md shadow-2xl z-[999] p-1.5 transition-all duration-200 origin-top-right ${
                      isSortOpen 
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value as any);
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                          sortBy === opt.value
                            ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <opt.icon className={`w-3.5 h-3.5 ${
                          sortBy === opt.value 
                            ? 'text-[#3C6CA8] dark:text-blue-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid — 24px gap, responsive columns */}
          {loading && menuItems.length === 0 ? (
            <div className="catalog-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#161B26] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-soft animate-pulse"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white dark:bg-[#161B26] rounded-2xl shadow-soft p-12 max-w-md mx-auto border border-gray-100 dark:border-gray-800">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-50 dark:bg-gray-800">
                  <Package className="w-10 h-10 text-[#3C6CA8]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No products found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchQuery
                    ? `No products match "${searchQuery}".`
                    : 'No products available.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#3C6CA8] font-semibold hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="catalog-grid">
              {sortedProducts.map((product) => (
                <MenuItemCard
                  key={product.id}
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  onProductClick={handleProductClick}
                  onAddToCart={addToCart}
                  globalDiscount={globalDiscount}
                />
              ))}
            </div>
          )}

          {/* Bottom breathing space */}
          <div style={{ height: '32px' }} />
        </div>
      </div>

      {/* ─── Scoped Styles ─── */}
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* ═══ CATALOG GRID ═══ */
        .catalog-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: repeat(4, 1fr);
        }

        /* Tablet: 2 columns */
        @media (max-width: 1024px) {
          .catalog-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }

        /* Mobile: 2 columns */
        @media (max-width: 640px) {
          .catalog-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </>
  );
};

export default Menu;
