import { useState, useEffect, useRef, useCallback } from 'react';
import type { CartItem, Product, ProductVariation } from '../types';
import { supabase } from '../lib/supabase';
import { demoProducts } from '../data/demoProducts';

import { getCartItemUnitBasePrice } from '../utils/pricing';
import { fireToast } from '../components/ToastNotification';

const STORAGE_KEY = 'peptide_cart';
const STORAGE_KEY_FULL = 'peptide_cart_full_v1';
const PRODUCT_COLUMNS =
  'id, name, slug, description, category, base_price, discount_price, discount_start_date, discount_end_date, discount_active, purity_percentage, molecular_weight, cas_number, sequence, storage_conditions, inclusions, stock_quantity, available, featured, image_url, safety_sheet_url, coa_url, created_at, updated_at';

interface PersistedCartItem {
  product_id: string;
  variation_id: string | null;
  quantity: number;
}

const STORAGE_FULL_KEY = 'peptide_cart_full_v1';

const persist = (items: CartItem[]) => {
  // 1. Persist full items for instant 0ms sync hydration on subsequent loads
  try {
    localStorage.setItem(STORAGE_KEY_FULL, JSON.stringify(items));
  } catch {}

  // 2. Persist slim structure for backward compatibility
  try {
    const slim: PersistedCartItem[] = items.map((i) => ({
      product_id: i.product.id,
      variation_id: i.variation?.id ?? null,
      quantity: i.quantity,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {}
};

const loadInitialCart = (): { items: CartItem[]; hydrated: boolean } => {
  try {
    if (typeof window !== 'undefined') {
      const fullRaw = localStorage.getItem(STORAGE_KEY_FULL);
      if (fullRaw) {
        const parsed = JSON.parse(fullRaw);
        if (Array.isArray(parsed)) {
          return { items: parsed, hydrated: true };
        }
      }
      const slimRaw = localStorage.getItem(STORAGE_KEY);
      if (!slimRaw || slimRaw === '[]') {
        return { items: [], hydrated: true };
      }
    }
  } catch {}
  return { items: [], hydrated: false };
};

const loadPersistedIds = (): PersistedCartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: any): PersistedCartItem | null => {
        if (entry?.product_id) return { product_id: entry.product_id, variation_id: entry.variation_id ?? null, quantity: Number(entry.quantity) || 0 };
        if (entry?.product?.id) return { product_id: entry.product.id, variation_id: entry.variation?.id ?? null, quantity: Number(entry.quantity) || 0 };
        return null;
      })
      .filter((x): x is PersistedCartItem => !!x && x.quantity > 0);
  } catch {
    return [];
  }
};

async function findProductById(id: string): Promise<Product | null> {
  // 1. Check demo products (fast, sync)
  const demo = demoProducts.find(p => p.id === id);
  if (demo) return demo;

  // 2. Try Supabase
  try {
    const { data: prod, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (!error && prod) {
      const { data: variations } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', prod.id)
        .order('quantity_mg', { ascending: true });

      return {
        ...(prod as Product),
        variations: (variations as ProductVariation[]) ?? [],
      };
    }
  } catch (err) {
    console.warn('findProductById Supabase lookup failed:', err);
  }

  return null;
}


async function hydrateItems(persisted: PersistedCartItem[]): Promise<CartItem[]> {
  if (persisted.length === 0) return [];
  const productIds = Array.from(new Set(persisted.map((p) => p.product_id)));

  // Try Supabase first (for real products)
  const productMap = new Map<string, Product>();
  const variationMap = new Map<string, ProductVariation>();

  try {
    const { data: products } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .in('id', productIds);

    if (products && products.length > 0) {
      (products as Product[]).forEach((p) => productMap.set(p.id, p));

      const variationIds = persisted.map((p) => p.variation_id).filter((v): v is string => !!v);
      if (variationIds.length > 0) {
        const { data: vData } = await supabase.from('product_variations').select('*').in('id', variationIds);
        (vData as ProductVariation[] ?? []).forEach((v) => variationMap.set(v.id, v));
      }
    }
  } catch {
    // Supabase unavailable
  }

  // For any product IDs not found in Supabase, look up Firebase/demo
  const missingIds = productIds.filter(id => !productMap.has(id));
  await Promise.all(missingIds.map(async (id) => {
    const p = await findProductById(id);
    if (p) productMap.set(id, p);
  }));

  const hydrated: CartItem[] = [];
  for (const entry of persisted) {
    const product = productMap.get(entry.product_id);
    if (!product) continue;

    // For demo products, variations are embedded
    let variation: ProductVariation | undefined;
    if (entry.variation_id) {
      variation = variationMap.get(entry.variation_id)
        ?? product.variations?.find(v => v.id === entry.variation_id);
      if (!variation) continue;
    }

    const item: CartItem = { product, variation, quantity: entry.quantity, price: 0 };
    item.price = getCartItemUnitBasePrice(item);
    hydrated.push(item);
  }
  return hydrated;
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadInitialCart().items);
  const [hydrated, setHydrated] = useState(() => loadInitialCart().hydrated);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<number | null>(null);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = loadPersistedIds();
      if (persisted.length === 0) {
        if (!cancelled) setHydrated(true);
        return;
      }
      // If we already have items from full cache, rehydrate quietly in background
      const items = await hydrateItems(persisted);
      if (!cancelled) {
        if (items.length > 0) {
          setCartItems(items);
        }
        setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isInitialMountRef.current) { isInitialMountRef.current = false; }
    persist(cartItems);
  }, [cartItems, hydrated]);

  // Listen for addToCart events from other components
  useEffect(() => {
    const handleAddToCartEvent = (e: CustomEvent) => {
      const { product, variation, quantity = 1 } = e.detail;
      const productData: Product = {
        ...product,
        slug: product.slug ?? '',
        coa_url: product.coa_url ?? null,
        stock_quantity: product.stock_quantity ?? 999,
        purity_percentage: product.purity_percentage ?? 0,
        category: product.category ?? '',
        description: product.description ?? '',
        available: product.available ?? true,
        featured: product.featured ?? false,
        storage_conditions: product.storage_conditions ?? '',
        molecular_weight: product.molecular_weight ?? null,
        cas_number: product.cas_number ?? null,
        sequence: product.sequence ?? null,
        inclusions: product.inclusions ?? null,
        safety_sheet_url: product.safety_sheet_url ?? null,
        discount_start_date: product.discount_start_date ?? null,
        discount_end_date: product.discount_end_date ?? null,
        created_at: product.created_at ?? new Date().toISOString(),
        updated_at: product.updated_at ?? new Date().toISOString(),
      };
      const variationData = variation ? { ...variation, stock_quantity: variation.stock_quantity ?? 999 } : undefined;

      setCartItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.product.id === productData.id && (variationData ? item.variation?.id === variationData.id : !item.variation)
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
          return updated;
        }
        const newItem: CartItem = { product: productData, variation: variationData, quantity, price: 0 };
        newItem.price = getCartItemUnitBasePrice(newItem);
        return [...prev, newItem];
      });
    };

    window.addEventListener('addToCart', handleAddToCartEvent as EventListener);
    return () => window.removeEventListener('addToCart', handleAddToCartEvent as EventListener);
  }, []);

  const addToCart = (product: Product, variation?: ProductVariation, quantity: number = 1) => {
    const availableStock = variation ? variation.stock_quantity : product.stock_quantity;
    if (availableStock === 0) {
      fireToast(`Sorry, ${product.name}${variation ? ` (${variation.name})` : ''} is out of stock.`, 'warning');
      return;
    }

    const existingItemIndex = cartItems.findIndex(
      (item) => item.product.id === product.id && (variation ? item.variation?.id === variation.id : !item.variation)
    );

    if (existingItemIndex > -1) {
      const currentQuantity = cartItems[existingItemIndex].quantity;
      const newQuantity = currentQuantity + quantity;
      if (newQuantity > availableStock) {
        const remainingStock = availableStock - currentQuantity;
        if (remainingStock > 0) {
          fireToast(`Only ${remainingStock} item(s) left in stock. Added ${remainingStock} to your cart.`, 'warning');
          const updated = [...cartItems];
          updated[existingItemIndex] = { ...updated[existingItemIndex], quantity: currentQuantity + remainingStock };
          setCartItems(updated);
        } else {
          fireToast(`You already have the maximum available quantity (${currentQuantity}) in your cart.`, 'warning');
        }
        return;
      }
      const updated = [...cartItems];
      updated[existingItemIndex] = { ...updated[existingItemIndex], quantity: newQuantity };
      setCartItems(updated);
    } else {
      let qty = quantity;
      if (qty > availableStock) {
        fireToast(`Only ${availableStock} item(s) available. Added ${availableStock} to your cart.`, 'warning');
        qty = availableStock;
      }
      const newItem: CartItem = { product, variation, quantity: qty, price: 0 };
      newItem.price = getCartItemUnitBasePrice(newItem);
      setCartItems([...cartItems, newItem]);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) { removeFromCart(index); return; }
    const item = cartItems[index];
    const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
    if (quantity > availableStock) {
      fireToast(`Only ${availableStock} item(s) available in stock.`, 'warning');
      quantity = availableStock;
    }
    const updated = [...cartItems];
    updated[index] = { ...updated[index], quantity };
    setCartItems(updated);
    fireToast('Cart updated.', 'info', 2000);
  };

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
    fireToast('Item removed from cart.', 'warning', 3000);
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_FULL);
  };

  const getTotalPrice = () =>
    cartItems.reduce((total, item) => total + getCartItemUnitBasePrice(item) * item.quantity, 0);

  const getTotalItems = () =>
    cartItems.reduce((total, item) => total + item.quantity, 0);

  const refreshCartPrices = useCallback(async (): Promise<boolean> => {
    if (cartItems.length === 0) return false;
    const before = new Map<string, number>();
    cartItems.forEach((item, idx) => before.set(`${idx}`, getCartItemUnitBasePrice(item)));

    const persisted: PersistedCartItem[] = cartItems.map((i) => ({
      product_id: i.product.id,
      variation_id: i.variation?.id ?? null,
      quantity: i.quantity,
    }));
    const fresh = await hydrateItems(persisted);

    let changed = fresh.length !== cartItems.length;
    if (!changed) {
      for (let i = 0; i < fresh.length; i++) {
        const newPrice = getCartItemUnitBasePrice(fresh[i]);
        const oldPrice = before.get(`${i}`) ?? 0;
        if (Math.abs(newPrice - oldPrice) > 0.001) { changed = true; break; }
      }
    }
    setCartItems(fresh);
    if (changed) setPricesUpdatedAt(Date.now());
    return changed;
  }, [cartItems]);

  const dismissPriceUpdateNotice = () => setPricesUpdatedAt(null);

  return {
    cartItems,
    hydrated,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    refreshCartPrices,
    pricesUpdatedAt,
    dismissPriceUpdateNotice,
  };
}
