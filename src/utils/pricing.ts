import type { CartItem, GlobalDiscount, Product, ProductBundleTier, ProductVariation } from '../types';
import type { Bundle } from '../lib/bundles';

interface DiscountedPriceResult {
  price: number;
  hasDiscount: boolean;
  hasGlobalDiscount: boolean;
  hasIndividualDiscount: boolean;
  originalPrice: number;
}

const getDateBoundary = (value: string | undefined, boundary: 'start' | 'end') => {
  if (!value) return null;

  const datePart = value.slice(0, 10);
  const timePart = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
  const parsed = new Date(`${datePart}${timePart}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isGlobalDiscountActive = (globalDiscount?: GlobalDiscount | null) => {
  if (!globalDiscount?.active) return false;

  const now = new Date();
  const startDate = getDateBoundary(globalDiscount.start_date, 'start');
  const endDate = getDateBoundary(globalDiscount.end_date, 'end');

  if (startDate && startDate > now) return false;
  if (endDate && endDate < now) return false;

  return true;
};

export const getGlobalDiscountedPrice = (
  originalPrice: number,
  productId: string,
  globalDiscount?: GlobalDiscount | null
): { price: number; hasGlobalDiscount: boolean } => {
  if (!isGlobalDiscountActive(globalDiscount)) {
    return { price: originalPrice, hasGlobalDiscount: false };
  }

  if (globalDiscount?.excluded_product_ids?.includes(productId)) {
    return { price: originalPrice, hasGlobalDiscount: false };
  }

  // Category / product eligibility scoping (added fields; backwards compatible)
  if ((globalDiscount as any).eligible_product_ids?.length && !(globalDiscount as any).eligible_product_ids.includes(productId)) {
    return { price: originalPrice, hasGlobalDiscount: false };
  }

  const discountedPrice = globalDiscount?.discount_type === 'percentage'
    ? originalPrice * (1 - (globalDiscount?.discount_value ?? 0) / 100)
    : Math.max(0, originalPrice - (globalDiscount?.discount_value ?? 0));

  return { price: Math.round(discountedPrice), hasGlobalDiscount: discountedPrice < originalPrice };
};

export const resolveProductPricing = (
  product: Product,
  variation?: ProductVariation,
  globalDiscount?: GlobalDiscount | null
): DiscountedPriceResult => {
  const originalPrice = variation?.price ?? product.base_price;
  const individualPrice = variation
    ? (variation.discount_active && variation.discount_price !== null ? variation.discount_price : variation.price)
    : (product.discount_active && product.discount_price !== null ? product.discount_price : product.base_price);

  const hasIndividualDiscount = individualPrice < originalPrice;
  const globalResult = getGlobalDiscountedPrice(originalPrice, product.id, globalDiscount);

  if (globalResult.hasGlobalDiscount && (!hasIndividualDiscount || globalResult.price < individualPrice)) {
    return {
      price: globalResult.price,
      hasDiscount: true,
      hasGlobalDiscount: true,
      hasIndividualDiscount,
      originalPrice,
    };
  }

  return {
    price: individualPrice,
    hasDiscount: hasIndividualDiscount,
    hasGlobalDiscount: false,
    hasIndividualDiscount,
    originalPrice,
  };
};

// ----- Bundle (per-product quantity) discount logic -----

export type BundleTiersMap = Record<string, ProductBundleTier[]>;

export interface PricedLine {
  index: number;
  unitBasePrice: number;
  bundlePercent: number;
  unitFinalPrice: number;
  lineSubtotal: number;
  lineSavings: number;
  appliedTier: ProductBundleTier | null;
}

export interface CartPricing {
  lines: PricedLine[];
  originalSubtotal: number;
  itemDiscountSavings: number;
  subtotalBeforeBundle: number;
  bundleSavings: number;
  subtotal: number;
  totalSavingsBeforePromo: number;
  hasBundleDiscount: boolean;
  hasItemDiscount: boolean;
  // Multi-product bundle extension
  appliedMultiBundle: MultiBundleApplication | null;
}

export interface MultiBundleApplication {
  bundleId: string;
  bundleName: string;
  savings: number;
}

export const getCartItemUnitBasePrice = (
  item: CartItem,
  globalDiscount?: GlobalDiscount | null
): number => {
  return resolveProductPricing(item.product, item.variation, globalDiscount).price;
};

export const pickBundleTier = (
  tiers: ProductBundleTier[] | undefined,
  quantity: number
): ProductBundleTier | null => {
  if (!tiers || tiers.length === 0) return null;
  return tiers
    .filter((t) => t.active && quantity >= t.min_quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)[0] ?? null;
};

/**
 * Check whether the cart fully satisfies a multi-product bundle:
 * for every bundle item, cart quantity of that product >= required qty.
 */
export const matchBundleInCart = (
  cartItems: CartItem[],
  bundle: Bundle
): boolean => {
  const qtyByProduct = new Map<string, number>();
  cartItems.forEach((i) => qtyByProduct.set(i.product.id, (qtyByProduct.get(i.product.id) || 0) + i.quantity));

  return bundle.items.every((bi) => (qtyByProduct.get(bi.product_id) || 0) >= Number(bi.quantity));
};

/** Best multi-product bundle for the cart (largest savings wins; no stacking). */
export const pickBestMultiBundle = (
  cartItems: CartItem[],
  bundles: Bundle[]
): Bundle | null => {
  const matches = bundles
    .filter((b) => b.active !== false && matchBundleInCart(cartItems, b))
    .map((b) => {
      const savings = b.items.reduce((sum, bi) => {
        const unit = bi.unit_price || 0;
        return sum + unit * bi.quantity;
      }, 0) - b.bundle_price;
      return { bundle: b, savings };
    })
    .filter((m) => m.savings > 0)
    .sort((a, b) => b.savings - a.savings);
  return matches[0]?.bundle ?? null;
};

export const computeCartPricing = (
  items: CartItem[],
  tiersByProduct: BundleTiersMap,
  globalDiscount?: GlobalDiscount | null,
  multiBundles: Bundle[] = []
): CartPricing => {
  const lines: PricedLine[] = items.map((item, index) => {
    const pricing = resolveProductPricing(item.product, item.variation, globalDiscount);
    const unitBasePrice = pricing.price;

    // When a global discount applies to this product, cancel out bundle discount (do not stack)
    const isBundleEligible = !pricing.hasGlobalDiscount;
    const tier = isBundleEligible ? pickBundleTier(tiersByProduct[item.product.id], item.quantity) : null;
    const bundlePercent = tier ? Number(tier.discount_percentage) : 0;
    const unitFinalPrice = unitBasePrice * (1 - bundlePercent / 100);
    const lineSubtotal = unitFinalPrice * item.quantity;
    const lineSavings = (unitBasePrice - unitFinalPrice) * item.quantity;
    return {
      index,
      unitBasePrice,
      bundlePercent,
      unitFinalPrice,
      lineSubtotal,
      lineSavings,
      appliedTier: tier,
    };
  });

  const subtotalBeforeBundle = items.reduce(
    (sum, item, i) => sum + lines[i].unitBasePrice * item.quantity,
    0
  );
  const originalSubtotal = items.reduce((sum, item) => {
    const unitOriginal = item.variation?.price ?? item.product.base_price;
    return sum + unitOriginal * item.quantity;
  }, 0);
  const itemDiscountSavings = Math.max(0, originalSubtotal - subtotalBeforeBundle);

  // Multi-product bundle: applied only when no global discount is active (no stacking)
  let multiBundleSavings = 0;
  let appliedMultiBundle: MultiBundleApplication | null = null;
  const globalActive = isGlobalDiscountActive(globalDiscount);
  if (!globalActive && multiBundles.length > 0 && items.length > 0) {
    const best = pickBestMultiBundle(items, multiBundles);
    if (best) {
      // Simple, consistent math: savings = matched items value at current prices − bundle price
      const matchedValue = best.items.reduce((sum, bi) => {
        const lineForProduct = items
          .map((i, idx) => ({ i, line: lines[idx] }))
          .filter(({ i }) => i.product.id === bi.product_id)
          .reduce((acc, { i, line }) => acc + line.unitBasePrice * Math.min(i.quantity, bi.quantity), 0);
        return sum + lineForProduct;
      }, 0);
      multiBundleSavings = Math.max(0, matchedValue - best.bundle_price);
      appliedMultiBundle = {
        bundleId: best.id || best.slug,
        bundleName: best.name,
        savings: multiBundleSavings,
      };
    }
  }

  const bundleSavings = lines.reduce((sum, l) => sum + l.lineSavings, 0) + multiBundleSavings;
  // Final subtotal must reflect ALL bundle savings (per-product tiers + multi-product bundles).
  const subtotal = subtotalBeforeBundle - bundleSavings;
  return {
    lines,
    originalSubtotal,
    itemDiscountSavings,
    subtotalBeforeBundle,
    bundleSavings,
    subtotal,
    totalSavingsBeforePromo: itemDiscountSavings + bundleSavings,
    hasBundleDiscount: bundleSavings > 0,
    hasItemDiscount: itemDiscountSavings > 0,
    appliedMultiBundle,
  };
};
