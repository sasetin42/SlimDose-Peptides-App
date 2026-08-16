import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { demoProducts } from '../data/demoProducts';
import type { Product, ProductBundleTier, Protocol, ProductVariation } from '../types';
import Header from './Header';
import Footer from './Footer';
import ProductDetailModal from './ProductDetailModal';
import { useCart } from '../hooks/useCart';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';

const PRODUCT_COLUMNS =
  'id, name, slug, description, category, base_price, discount_price, discount_start_date, discount_end_date, discount_active, purity_percentage, molecular_weight, cas_number, sequence, storage_conditions, inclusions, stock_quantity, available, featured, image_url, safety_sheet_url, coa_url, created_at, updated_at';

// Premium Mock Bundle Tiers Generator
function getMockBundleTiers(productId: string): ProductBundleTier[] {
  return [
    {
      id: `mock-tier-1-${productId}`,
      product_id: productId,
      min_quantity: 2,
      discount_percentage: 10,
      most_popular: false,
      active: true,
    },
    {
      id: `mock-tier-2-${productId}`,
      product_id: productId,
      min_quantity: 5,
      discount_percentage: 15,
      most_popular: true,
      active: true,
    },
    {
      id: `mock-tier-3-${productId}`,
      product_id: productId,
      min_quantity: 10,
      discount_percentage: 20,
      most_popular: false,
      active: true,
    },
  ];
}

// Premium Mock Protocols Generator
function getMockProtocols(productId: string, productName: string): Protocol[] {
  const nameLower = productName.toLowerCase();
  const isWeightMgmt = nameLower.includes('sema') || nameLower.includes('tirz') || nameLower.includes('frag');
  const isRecovery = nameLower.includes('bpc') || nameLower.includes('tb');
  
  if (isWeightMgmt) {
    return [
      {
        id: `mock-proto-1-${productId}`,
        product_id: productId,
        name: `${productName} Weight Management Protocol`,
        dosage: '0.25mg to 1.0mg weekly',
        frequency: 'Once weekly (every 7 days)',
        duration: '12 - 24 weeks cycles',
        storage: 'Reconstituted: 2-8°C (Refrigerated) for up to 30 days. Lyophilized: -20°C.',
        notes: [
          'Administer subcutaneously in the abdomen, thigh, or upper arm.',
          'Rotate injection sites weekly to prevent lipodystrophy.',
          'Start at the lowest dose (0.25mg) for the first 4 weeks to assess tolerance.',
          'Increase dose gradually under clinical guidance if needed.'
        ],
        image_url: null,
        file_url: null,
        active: true,
        sort_order: 1,
      }
    ];
  }

  if (isRecovery) {
    return [
      {
        id: `mock-proto-1-${productId}`,
        product_id: productId,
        name: `${productName} Tissue Repair & Healing Protocol`,
        dosage: '250mcg to 500mcg daily',
        frequency: 'Once or twice daily (morning/night)',
        duration: '4 - 6 weeks cycles',
        storage: 'Reconstituted: Keep refrigerated at 2-8°C. Do not freeze reconstituted peptide.',
        notes: [
          'Administer via subcutaneous or intramuscular injection near the site of injury if applicable.',
          'Maintain sterile procedures at all times during reconstitution and administration.',
          'A typical rest period of 2 weeks is recommended between cycles.'
        ],
        image_url: null,
        file_url: null,
        active: true,
        sort_order: 1,
      }
    ];
  }

  return [
    {
      id: `mock-proto-1-${productId}`,
      product_id: productId,
      name: `${productName} Standard Research Protocol`,
      dosage: '100mcg to 300mcg daily',
      frequency: 'Once daily before sleep',
      duration: '8 - 12 weeks',
      storage: 'Store reconstituted vials in the refrigerator (2-8°C). Lyophilized vials at -20°C.',
      notes: [
        'Perform injections on an empty stomach for optimal absorption.',
        'Always reconstitute with sterile bacteriostatic water gently down the vial side.',
        'Never shake the vial after adding water; roll gently between palms.'
      ],
      image_url: null,
      file_url: null,
      active: true,
      sort_order: 1,
    }
  ];
}

const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const optimisticProduct = (location.state as { product?: Product } | null)?.product ?? null;
  
  const cart = useCart();
  const { globalDiscount } = useGlobalDiscount();

  const [product, setProduct] = useState<Product | null>(optimisticProduct);
  const [bundleTiers, setBundleTiers] = useState<ProductBundleTier[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(!optimisticProduct);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (!slug) return;
    let cancelled = false;
    
    // If we have optimistic data, don't show loading — just fetch in background
    if (!optimisticProduct) {
      setLoading(true);
    }
    setNotFound(false);
    (async () => {
      let foundProduct: Product | null = null;
      let isDemo = false;

      // 1. Try Supabase first
      try {
        const { data: prod, error } = await supabase
          .from('products')
          .select(PRODUCT_COLUMNS)
          .eq('slug', slug)
          .maybeSingle();

        if (!error && prod) {
          const { data: variations } = await supabase
            .from('product_variations')
            .select('*')
            .eq('product_id', prod.id)
            .order('quantity_mg', { ascending: true });

          foundProduct = {
            ...(prod as Product),
            variations: (variations as ProductVariation[]) ?? [],
          };
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
      }

      // 2. Try demoProducts fallback
      if (!foundProduct) {
        const matchedDemo = demoProducts.find((p) => p.slug === slug);
        if (matchedDemo) {
          foundProduct = matchedDemo;
          isDemo = true;
        }
      }

      if (cancelled) return;

      if (foundProduct) {
        let tiers: ProductBundleTier[] = [];
        let protos: Protocol[] = [];

        if (isDemo || foundProduct.id.startsWith('demo-')) {
          // Generate beautiful mock bundle tiers and protocols for demo products
          tiers = getMockBundleTiers(foundProduct.id);
          protos = getMockProtocols(foundProduct.id, foundProduct.name);
        } else {
          // Fetch from Supabase for real products
          try {
            const { data } = await supabase
              .from('product_bundle_tiers')
              .select('*')
              .eq('product_id', foundProduct.id)
              .eq('active', true)
              .order('min_quantity', { ascending: true });
            if (data) tiers = data as ProductBundleTier[];
          } catch (e) {
            console.warn('Failed to load bundle tiers:', e);
          }

          try {
            const { data } = await supabase
              .from('protocols')
              .select('*')
              .eq('product_id', foundProduct.id)
              .eq('active', true)
              .order('sort_order', { ascending: true });
            if (data) protos = data as Protocol[];
          } catch (e) {
            console.warn('Failed to load protocols:', e);
          }
        }

        if (cancelled) return;
        setProduct(foundProduct);
        setBundleTiers(tiers);
        setProtocols(protos);
        setLoading(false);
      } else {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="bg-cream-50">
      <main className="flex-grow">
        {loading && (
          <div className="flex items-center justify-center py-24 text-charcoal-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading product…
          </div>
        )}
        {notFound && (
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Product not found</h1>
            <p className="text-charcoal-500 mb-6">We couldn't find a product at /{slug}.</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-full bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
            >
              Browse all products
            </button>
          </div>
        )}
        {product && (
          <ProductDetailModal
            asPage
            product={product}
            bundleTiers={bundleTiers}
            protocols={protocols}
            onClose={() => navigate(-1)}
            onAddToCart={(p, v, q, priceOverride) => cart.addToCart(p, v, q, priceOverride)}
            globalDiscount={globalDiscount}
          />
        )}
      </main>
    </div>
  );
};

export default ProductPage;
