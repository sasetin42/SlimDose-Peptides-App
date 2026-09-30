import { describe, it, expect } from 'vitest';
import {
  getGlobalDiscountedPrice,
  resolveProductPricing,
  getCartItemUnitBasePrice,
  pickBundleTier,
  matchBundleInCart,
  pickBestMultiBundle,
  computeCartPricing,
} from './pricing';
import type { CartItem, GlobalDiscount, Product, ProductBundleTier, ProductVariation } from '../types';
import type { Bundle, BundleItem } from '../lib/bundles';

// ─── Factories ────────────────────────────────────────────────────────────────

const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Test Peptide',
  description: '',
  category: 'general',
  base_price: 1000,
  raw_price: 1000,
  discount_price: null,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: false,
  purity_percentage: 99,
  molecular_weight: null,
  cas_number: null,
  sequence: null,
  storage_conditions: '',
  inclusions: null,
  stock_quantity: 100,
  available: true,
  featured: false,
  image_url: null,
  safety_sheet_url: null,
  coa_url: null,
  pre_order_enabled: false,
  pre_order_est_arrival: null,
  pre_order_restock_date: null,
  pre_order_note: null,
  pre_order_max_qty: 0,
  slug: 'test-peptide',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

const makeItem = (over: Partial<CartItem> & { id?: string; basePrice?: number } = {}): CartItem => {
  const { id = 'p1', basePrice = 1000, ...rest } = over;
  return {
    product: makeProduct({ id, base_price: basePrice, raw_price: basePrice }),
    quantity: 1,
    price: basePrice,
    ...rest,
  };
};

const makeGlobalDiscount = (over: Partial<GlobalDiscount> = {}): GlobalDiscount => ({
  id: 'gd1',
  name: 'Site Sale',
  discount_type: 'percentage',
  discount_value: 10,
  active: true,
  excluded_product_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

const makeTier = (min: number, pct: number, over: Partial<ProductBundleTier> = {}): ProductBundleTier => ({
  id: `tier-${min}`,
  product_id: 'p1',
  min_quantity: min,
  discount_percentage: pct,
  most_popular: false,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

const makeBundleItem = (over: Partial<BundleItem> = {}): BundleItem => ({
  product_id: 'p1',
  product_name: 'Test Peptide',
  quantity: 1,
  unit_price: 1000,
  ...over,
});

const makeBundle = (over: Partial<Bundle> = {}): Bundle => ({
  name: 'Starter Duo',
  slug: 'starter-duo',
  description: '',
  image_url: null,
  items: [],
  discount_type: 'fixed',
  discount_value: 0,
  original_total: 0,
  bundle_price: 0,
  start_date: null,
  end_date: null,
  active: true,
  featured: false,
  customer_visible: true,
  ...over,
});

// ─── getGlobalDiscountedPrice ─────────────────────────────────────────────────

describe('getGlobalDiscountedPrice', () => {
  it('applies a percentage discount to the original price', () => {
    const gd = makeGlobalDiscount({ discount_type: 'percentage', discount_value: 10 });
    expect(getGlobalDiscountedPrice(1000, 'p1', gd)).toEqual({ price: 900, hasGlobalDiscount: true });
  });

  it('applies a fixed discount and floors at zero', () => {
    const gd = makeGlobalDiscount({ discount_type: 'fixed', discount_value: 250 });
    expect(getGlobalDiscountedPrice(1000, 'p1', gd).price).toBe(750);
    expect(getGlobalDiscountedPrice(100, 'p1', gd).price).toBe(0);
  });

  it('excludes products listed in excluded_product_ids', () => {
    const gd = makeGlobalDiscount({ excluded_product_ids: ['p1'] });
    expect(getGlobalDiscountedPrice(1000, 'p1', gd)).toEqual({ price: 1000, hasGlobalDiscount: false });
  });

  it('respects the eligibility window (start/end dates)', () => {
    const started = makeGlobalDiscount({ start_date: '2020-01-01' });
    const notYet = makeGlobalDiscount({ start_date: '2999-01-01' });
    const ended = makeGlobalDiscount({ end_date: '2021-12-31' });
    const inclusiveEnd = makeGlobalDiscount({ start_date: '2026-09-29', end_date: '2026-09-29' });

    expect(getGlobalDiscountedPrice(1000, 'p1', started).hasGlobalDiscount).toBe(true);
    expect(getGlobalDiscountedPrice(1000, 'p1', notYet).hasGlobalDiscount).toBe(false);
    expect(getGlobalDiscountedPrice(1000, 'p1', ended).hasGlobalDiscount).toBe(false);
    // end_date boundary is inclusive (T23:59:59.999)
    expect(getGlobalDiscountedPrice(1000, 'p1', inclusiveEnd).hasGlobalDiscount).toBe(true);
  });

  it('treats an inactive or missing discount as no discount', () => {
    expect(getGlobalDiscountedPrice(1000, 'p1', makeGlobalDiscount({ active: false })).hasGlobalDiscount).toBe(false);
    expect(getGlobalDiscountedPrice(1000, 'p1', null)).toEqual({ price: 1000, hasGlobalDiscount: false });
  });
});

// ─── resolveProductPricing ────────────────────────────────────────────────────

describe('resolveProductPricing — global discount vs individual discount (no stacking)', () => {
  it('applies the global discount when there is no individual discount', () => {
    const p = makeProduct();
    const res = resolveProductPricing(p, undefined, makeGlobalDiscount());
    expect(res.price).toBe(900);
    expect(res.hasGlobalDiscount).toBe(true);
    expect(res.hasIndividualDiscount).toBe(false);
  });

  it('keeps the individual discount when it is deeper than the global one (no stacking)', () => {
    // base 1000, individual sale price 850; global 10% → 900. Individual wins.
    const p = makeProduct({ discount_active: true, discount_price: 850 });
    const res = resolveProductPricing(p, undefined, makeGlobalDiscount({ discount_value: 10 }));
    expect(res.price).toBe(850);
    expect(res.hasGlobalDiscount).toBe(false);
    expect(res.hasIndividualDiscount).toBe(true);
  });

  it('applies the global discount when it is deeper than the individual one (no stacking)', () => {
    // base 1000, individual sale 950; global 20% → 800. Global wins.
    const p = makeProduct({ discount_active: true, discount_price: 950 });
    const res = resolveProductPricing(p, undefined, makeGlobalDiscount({ discount_value: 20 }));
    expect(res.price).toBe(800);
    expect(res.hasGlobalDiscount).toBe(true);
  });

  it('uses the variation price as the baseline and never stacks the two discounts', () => {
    const v: ProductVariation = {
      id: 'v1',
      product_id: 'p1',
      name: '5mg',
      quantity_mg: 5,
      price: 2000,
      cost_price: 1500,
      discount_price: 1800,
      discount_active: true,
      stock_quantity: 10,
      created_at: '2026-01-01T00:00:00Z',
    };
    const res = resolveProductPricing(makeProduct(), v, makeGlobalDiscount({ discount_value: 20 }));
    // global 20% of 2000 = 1600 beats individual 1800 → 1600 (NOT 1800 * 0.8 = 1440)
    expect(res.price).toBe(1600);
    expect(res.hasGlobalDiscount).toBe(true);
  });
});

// ─── getCartItemUnitBasePrice ─────────────────────────────────────────────────

describe('getCartItemUnitBasePrice', () => {
  it('returns the best non-stacked price for the item', () => {
    expect(getCartItemUnitBasePrice(makeItem())).toBe(1000);
    expect(getCartItemUnitBasePrice(makeItem(), makeGlobalDiscount())).toBe(900);
  });
});

// ─── pickBundleTier ───────────────────────────────────────────────────────────

describe('pickBundleTier', () => {
  const tiers = [makeTier(2, 10), makeTier(5, 15), makeTier(10, 20)];

  it('picks the highest qualifying tier', () => {
    expect(pickBundleTier(tiers, 7)?.discount_percentage).toBe(15);
    expect(pickBundleTier(tiers, 10)?.discount_percentage).toBe(20);
  });

  it('returns null when quantity is below the smallest tier or no tiers exist', () => {
    expect(pickBundleTier(tiers, 1)).toBeNull();
    expect(pickBundleTier([], 5)).toBeNull();
    expect(pickBundleTier(undefined, 5)).toBeNull();
  });

  it('ignores inactive tiers', () => {
    const mixed = [makeTier(2, 10), makeTier(5, 99, { active: false })];
    expect(pickBundleTier(mixed, 9)?.discount_percentage).toBe(10);
  });
});

// ─── computeCartPricing — per-product bundle tiers ────────────────────────────

describe('computeCartPricing — multi-quantity bundle savings', () => {
  it('computes tiered bundle savings across the line', () => {
    // 3 units @ 1000 with a 15% tier for qty>=3
    const lines = computeCartPricing(
      [makeItem({ quantity: 3 })],
      { p1: [makeTier(2, 10), makeTier(3, 15)] }
    );
    expect(lines.subtotal).toBe(2550); // 3000 * 0.85
    expect(lines.bundleSavings).toBe(450);
    expect(lines.hasBundleDiscount).toBe(true);
    expect(lines.lines[0].appliedTier?.discount_percentage).toBe(15);
  });

  it('reports no bundle discount below the minimum tier quantity', () => {
    const lines = computeCartPricing([makeItem({ quantity: 2 })], { p1: [makeTier(3, 15)] });
    expect(lines.subtotal).toBe(2000);
    expect(lines.bundleSavings).toBe(0);
    expect(lines.hasBundleDiscount).toBe(false);
  });
});

// ─── computeCartPricing — global discount no-stacking with bundles ───────────

describe('computeCartPricing — global discount cancels bundle discount (no stacking)', () => {
  it('skips per-product tier pricing for globally discounted products', () => {
    const items = [makeItem({ quantity: 5 })]; // would earn 15% bundle tier
    const gd = makeGlobalDiscount({ discount_value: 10 });

    const withoutGd = computeCartPricing(items, { p1: [makeTier(2, 10), makeTier(5, 15)] });
    expect(withoutGd.subtotal).toBe(4250); // bundle path: 5000 * 0.85
    expect(withoutGd.bundleSavings).toBe(750);

    const withGd = computeCartPricing(items, { p1: [makeTier(2, 10), makeTier(5, 15)] }, gd);
    // Global path: 10% off 5000 = 4500, bundle tier NOT applied on top (no 4500*0.85=3825)
    expect(withGd.subtotal).toBe(4500);
    expect(withGd.bundleSavings).toBe(0);
    expect(withGd.lines[0].appliedTier).toBeNull();
  });

  it('excluded products keep their bundle tier while global-discounted ones do not', () => {
    const items = [
      makeItem({ id: 'p1', quantity: 5 }), // global applies
      makeItem({ id: 'p2', quantity: 5 }), // excluded from global → bundle tier applies
    ];
    const gd = makeGlobalDiscount({ excluded_product_ids: ['p2'] });
    const tiers = {
      p1: [makeTier(2, 10)],
      p2: [makeTier(2, 20)],
    };
    const res = computeCartPricing(items, tiers, gd);
    // p1: 5000 * 0.90 = 4500 (global only); p2: 5000 * 0.80 = 4000 (bundle only)
    expect(res.subtotal).toBe(8500);
    expect(res.lines[0].appliedTier).toBeNull();
    expect(res.lines[1].appliedTier?.discount_percentage).toBe(20);
  });
});

// ─── Multi-product bundles ────────────────────────────────────────────────────

const bundles: Bundle[] = [
  makeBundle({
    id: 'b1',
    name: 'Duo',
      items: [
        makeBundleItem({ product_id: 'p1', quantity: 1, unit_price: 1000 }),
        makeBundleItem({ product_id: 'p2', quantity: 1, unit_price: 800 }),
      ],
      original_total: 1800,
      bundle_price: 1500, // savings 300
    }),
    makeBundle({
      id: 'b2',
      name: 'Trio',
      items: [
        makeBundleItem({ product_id: 'p1', quantity: 2, unit_price: 1000 }),
        makeBundleItem({ product_id: 'p2', quantity: 1, unit_price: 800 }),
      ],
      original_total: 2800,
      bundle_price: 2200, // savings 600
    }),
];

describe('multi-product bundle matching', () => {
  it('matchBundleInCart requires every bundle item to be satisfied', () => {
    const cart1 = [makeItem({ id: 'p1', quantity: 1 })];
    const cart2 = [makeItem({ id: 'p1', quantity: 1 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const cart3 = [makeItem({ id: 'p1', quantity: 2 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const cart4 = [makeItem({ id: 'p1', quantity: 1 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 }), makeItem({ id: 'p3', quantity: 9 })];

    expect(matchBundleInCart(cart1, bundles[0])).toBe(false);
    expect(matchBundleInCart(cart2, bundles[0])).toBe(true);
    expect(matchBundleInCart(cart3, bundles[1])).toBe(true);
    expect(matchBundleInCart(cart4, bundles[1])).toBe(false); // p1 qty 1 < 2
  });

  it('pickBestMultiBundle selects the bundle with the largest savings', () => {
    const cart = [makeItem({ id: 'p1', quantity: 2 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    expect(pickBestMultiBundle(cart, bundles)?.id).toBe('b2'); // 600 > 300
  });

  it('ignores inactive bundles and unprofitable ones', () => {
    const cart = [makeItem({ id: 'p1', quantity: 1 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const inactive = bundles.map((b) => ({ ...b, active: false }));
    expect(pickBestMultiBundle(cart, inactive)).toBeNull();

    const unprofitable = [
      makeBundle({
        id: 'b3',
        items: [makeBundleItem({ product_id: 'p1', quantity: 1, unit_price: 1000 })],
        original_total: 1000,
        bundle_price: 1200, // savings negative
      }),
    ];
    expect(pickBestMultiBundle(cart, unprofitable)).toBeNull();
  });

  it('computes multi-bundle savings against current cart prices', () => {
    const cart = [makeItem({ id: 'p1', quantity: 2 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const res = computeCartPricing(cart, {}, null, bundles);
    expect(res.appliedMultiBundle?.bundleId).toBe('b2');
    // matched value 2800 − bundle price 2200
    expect(res.bundleSavings).toBe(600);
    expect(res.subtotal).toBe(2800 - 600);
  });
});

// ─── Multi-bundle × global discount no-stacking ───────────────────────────────

describe('computeCartPricing — multi-bundle suppressed while a global discount is active', () => {
  it('does not apply any multi-bundle when a global discount is active', () => {
    const cart = [makeItem({ id: 'p1', quantity: 2 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const gd = makeGlobalDiscount({ discount_value: 10 });

    const noGd = computeCartPricing(cart, {}, null, bundles);
    expect(noGd.appliedMultiBundle?.bundleId).toBe('b2');

    const withGd = computeCartPricing(cart, {}, gd, bundles);
    // Global path only: (2000 + 800) * 0.9 = 2520 — multi-bundle must NOT stack
    expect(withGd.appliedMultiBundle).toBeNull();
    expect(withGd.bundleSavings).toBe(0);
    expect(withGd.subtotal).toBe(2520);
  });

  it('re-applies the multi-bundle once the global discount expires', () => {
    const cart = [makeItem({ id: 'p1', quantity: 2 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const expired = makeGlobalDiscount({ end_date: '2021-01-01' });
    const res = computeCartPricing(cart, {}, expired, bundles);
    expect(res.appliedMultiBundle?.bundleId).toBe('b2');
  });

  it('keeps the whole cart consistent: totals reconcile with savings', () => {
    const cart = [makeItem({ id: 'p1', quantity: 2 }), makeItem({ id: 'p2', quantity: 1, basePrice: 800 })];
    const res = computeCartPricing(cart, {}, null, bundles);
    expect(res.originalSubtotal).toBe(2800);
    expect(res.subtotalBeforeBundle).toBe(2800);
    expect(res.subtotal + res.bundleSavings).toBe(res.subtotalBeforeBundle);
    expect(res.totalSavingsBeforePromo).toBe(res.itemDiscountSavings + res.bundleSavings);
  });
});
