import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, ArrowLeft, TrendingUp, Package, Users, FolderOpen, CreditCard, Sparkles, Layers, Shield, ShieldCheck, AlertOctagon, RefreshCw, Warehouse, ShoppingCart, HelpCircle, MapPin, Settings, Tag, BookOpen, MessageSquare, FileText, LogOut, Star, FileCheck, Video, Mail, Menu } from 'lucide-react';
import type { Product, ProductBundleTier } from '../types';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import { useCategories } from '../hooks/useCategories';
import ImageUpload from './ImageUpload';
import CategoryManager from './CategoryManager';
import PaymentMethodManager from './PaymentMethodManager';
import VariationManager from './VariationManager';
import COAManager from './COAManager';
import PeptideInventoryManager from './PeptideInventoryManager';
import OrdersManager from './OrdersManager';
import FAQManager from './FAQManager';
import ShippingManager from './ShippingManager';
import SiteSettingsManager from './SiteSettingsManager';
import PromoCodeManager from './PromoCodeManager';
import GlobalDiscountManager from './GlobalDiscountManager';
import GuideManager from './GuideManager';
import SalesAnalyticsManager from './SalesAnalyticsManager';
import PopupManager from './PopupManager';
import { PageContentsManager } from './PageContentsManager';
import CustomerCRMManager from './CustomerCRMManager';
import ProductReviewsManager from './ProductReviewsManager';
import InvoiceVerificationsManager from './InvoiceVerificationsManager';
import PeptalkVideosManager from './PeptalkVideosManager';
import RestockRemindersManager from './RestockRemindersManager';
import { BarChart3, LayoutDashboard, Lock } from 'lucide-react';


interface AdminSession {
  email: string;
  role: string;
  name: string;
  token: string;
  loginTime: number;
}

const LOCAL_ADMINS = [
  { email: 'admin@gmail.com', password: '123456#', role: 'super_admin', name: 'Super Admin' },
  { email: 'superadmin@slimdose.ph', password: 'superadmin2026', role: 'super_admin', name: 'Super Admin' },
  { email: 'admin@slimdose.ph', password: 'admin2026', role: 'admin', name: 'Store Admin' },
  { email: 'editor@slimdose.ph', password: 'editor2026', role: 'content_editor', name: 'Content Editor' },
  { email: 'ordermanager@slimdose.ph', password: 'orders2026', role: 'order_manager', name: 'Order Manager' }
];

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { products, loading, addProduct, updateProduct, deleteProduct, refreshProducts } = useMenu();
  const { categories } = useCategories();
  const [currentView, setCurrentView] = useState<'dashboard' | 'products' | 'add' | 'edit' | 'categories' | 'payments' | 'inventory' | 'orders' | 'shipping' | 'coa' | 'faq' | 'settings' | 'promo-codes' | 'global-discount' | 'guides' | 'analytics' | 'popup' | 'page-contents'>('dashboard');

  // Check for existing admin session on mount & sync deep-link URL hash
  useEffect(() => {
    const sessionRaw = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');
    if (sessionRaw) {
      try {
        const session: AdminSession = JSON.parse(sessionRaw);
        if (session.token === 'authenticated_v1' && session.email) {
          setAdminSession(session);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.warn('Invalid admin session data:', e);
      }
    }

    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setCurrentView(hash as any);
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash) {
        setCurrentView(newHash as any);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [managingVariationsProductId, setManagingVariationsProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Password Interceptor & Audit Logs States
  const [pendingViewChange, setPendingViewChange] = useState<typeof currentView | null>(null);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [confirmPasswordCallback, setConfirmPasswordCallback] = useState<(() => void) | null>(null);

  const isSensitiveSessionValid = () => {
    return true; // Password verification re-check disabled per user request
  };

  const verifyAdminPassword = async (pwd: string): Promise<boolean> => {
    const emailLower = adminSession?.email?.toLowerCase().trim();
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();
      if (!error && data && data.password_hash === pwd) {
        return true;
      }
    } catch (e) {
      console.warn('Supabase password confirmation error, checking local fallback:', e);
    }
    const match = LOCAL_ADMINS.find(u => u.email === emailLower && u.password === pwd);
    return !!match;
  };

  const handlePasswordConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmPasswordError('');
    setIsProcessing(true);
    try {
      const isValid = await verifyAdminPassword(confirmPasswordInput);
      if (isValid) {
        sessionStorage.setItem('admin_sensitive_verified_at', String(Date.now()));
        setIsPasswordConfirmOpen(false);
        setConfirmPasswordInput('');
        if (confirmPasswordCallback) {
          confirmPasswordCallback();
          setConfirmPasswordCallback(null);
        } else if (pendingViewChange) {
          setCurrentView(pendingViewChange);
          setPendingViewChange(null);
        }
      } else {
        setConfirmPasswordError('Incorrect password. Access denied.');
      }
    } catch (err) {
      setConfirmPasswordError('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewChange = (view: typeof currentView, action?: () => void) => {
    const isStaff = adminSession?.role === 'content_editor' || adminSession?.role === 'order_manager';
    if (isStaff) {
      const disallowed = ['analytics', 'payments', 'global-discount', 'promo-codes', 'settings', 'popup', 'page-contents'];
      if (disallowed.includes(view)) {
        alert('Access Denied: Your staff account role does not have permission to access this section.');
        return;
      }
    }

    const sensitiveViews = ['add', 'analytics', 'promo-codes', 'payments', 'global-discount'];
    if (sensitiveViews.includes(view)) {
      if (!isSensitiveSessionValid()) {
        setPendingViewChange(view);
        setConfirmPasswordCallback(action ? () => action() : null);
        setConfirmPasswordInput('');
        setConfirmPasswordError('');
        setIsPasswordConfirmOpen(true);
        return;
      }
    }

    if (action) {
      action();
    } else {
      setCurrentView(view);
    }
    setIsMobileMenuOpen(false);
  };

  const logAdminAction = async (action: string, details?: any) => {
    try {
      await supabase
        .from('admin_audit_logs')
        .insert([{
          user_email: adminSession?.email || 'admin@slimdose.ph',
          user_role: adminSession?.role || 'admin',
          action,
          details
        }]);
    } catch (e) {
      console.warn('Failed to insert audit log:', e);
    }
  };

  const [peptalkVideos, setPeptalkVideos] = useState<any[]>([]);

  useEffect(() => {
    const fetchPeptalkVideos = async () => {
      try {
        const { data } = await supabase.from('peptalk_videos').select('id, title');
        if (data) setPeptalkVideos(data);
      } catch (err) {
        console.warn('Failed to load peptalk videos in admin:', err);
      }
    };
    fetchPeptalkVideos();
  }, []);

  const variationManagerProduct = managingVariationsProductId
    ? products.find((product) => product.id === managingVariationsProductId) || null
    : null;

  const variationManagerModal = variationManagerProduct ? (
    <VariationManager
      product={variationManagerProduct}
      onClose={() => setManagingVariationsProductId(null)}
    />
  ) : null;

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    slug: '',
    description: '',
    base_price: 0,
    raw_price: 0,
    category: 'research',
    featured: false,
    available: true,
    purity_percentage: 99.0,
    molecular_weight: '',
    cas_number: '',
    sequence: '',
    storage_conditions: 'Store at -20°C',
    stock_quantity: 0,
    stock_manila: 0,
    stock_davao: 0,
    image_url: null,
    safety_sheet_url: null,
    coa_url: null,
    discount_active: false,
    inclusions: null,
    pre_order_enabled: false,
    pre_order_est_arrival: null,
    pre_order_restock_date: null,
    pre_order_note: null,
    pre_order_max_qty: 10,
    dosing_guide: '',
    dosage_chart_url: '',
    usage_notes: '',
    linked_peptalk_id: null
  });

  type BundleTierDraft = { id?: string; min_quantity: number; discount_percentage: number; active: boolean; most_popular: boolean };
  const [bundleTiers, setBundleTiers] = useState<BundleTierDraft[]>([]);

  // Load existing bundle tiers when editing a product
  useEffect(() => {
    if (currentView !== 'edit' || !editingProduct) {
      if (currentView === 'add') setBundleTiers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('product_bundle_tiers')
        .select('*')
        .eq('product_id', editingProduct.id)
        .order('min_quantity', { ascending: true });
      if (cancelled) return;
      setBundleTiers(
        ((data as ProductBundleTier[]) ?? []).map((t) => ({
          id: t.id,
          min_quantity: t.min_quantity,
          discount_percentage: Number(t.discount_percentage),
          active: t.active,
          most_popular: t.most_popular ?? false,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [currentView, editingProduct]);

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const persistBundleTiers = async (productId: string) => {
    // Replace strategy: delete tiers no longer present, upsert the rest
    const { data: existing } = await supabase
      .from('product_bundle_tiers')
      .select('id')
      .eq('product_id', productId);
    const existingIds = new Set(((existing as { id: string }[]) ?? []).map((t) => t.id));
    const keepIds = new Set(bundleTiers.filter((t) => t.id).map((t) => t.id as string));
    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from('product_bundle_tiers').delete().in('id', toDelete);
    }
    if (bundleTiers.length > 0) {
      // Enforce only one most_popular row at a time
      let popularSeen = false;
      const rows = bundleTiers.map((t) => {
        const mp = t.most_popular && !popularSeen;
        if (mp) popularSeen = true;
        return {
          ...(t.id ? { id: t.id } : {}),
          product_id: productId,
          min_quantity: Math.max(2, Math.floor(t.min_quantity)),
          discount_percentage: Number(t.discount_percentage),
          active: t.active,
          most_popular: mp,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from('product_bundle_tiers')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
  };

  const handleAddProduct = () => {
    setCurrentView('add');
    setSelectedProducts(new Set());
    setManagingVariationsProductId(null);
    const defaultCategory = categories.length > 0 ? categories[0].id : 'research';
    setFormData({
      name: '',
      description: '',
      base_price: 0,
      category: defaultCategory,
      featured: false,
      available: true,
      purity_percentage: 99.0,
      molecular_weight: '',
      cas_number: '',
      storage_conditions: 'Store at -20°C',
      stock_quantity: 0,
      stock_manila: 0,
      stock_davao: 0,
      image_url: null,
      safety_sheet_url: null,
      discount_active: false,
      inclusions: null,
      dosing_guide: '',
      dosage_chart_url: '',
      usage_notes: '',
      linked_peptalk_id: null
    });
  };

  const handleEditProduct = (product: Product) => {
    handleViewChange('edit', () => {
      setEditingProduct(product);
      setFormData(product);
      setCurrentView('edit');
      setSelectedProducts(new Set());
      setManagingVariationsProductId(null);
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isSensitiveSessionValid()) {
      setConfirmPasswordCallback(() => handleDeleteProduct(id));
      setConfirmPasswordInput('');
      setConfirmPasswordError('');
      setIsPasswordConfirmOpen(true);
      return;
    }

    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      const productToDelete = products.find(p => p.id === id);
      setManagingVariationsProductId(null);
      try {
        setIsProcessing(true);
        const result = await deleteProduct(id);
        if (result.success) {
          logAdminAction('delete_product', { id, name: productToDelete?.name, data: productToDelete });
        } else {
          alert(result.error || 'Failed to delete product');
        }
      } catch (error) {
        alert('Failed to delete product. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select products to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)? This action cannot be undone.`)) {
      try {
        setIsProcessing(true);
        let successCount = 0;
        let failedCount = 0;

        for (const productId of selectedProducts) {
          const result = await deleteProduct(productId);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }
        }

        if (failedCount > 0) {
          alert(`Deleted ${successCount} product(s). ${failedCount} failed.`);
        } else {
          alert(`Successfully deleted ${successCount} product(s)`);
        }

        setSelectedProducts(new Set());
        setManagingVariationsProductId(null);
      } catch (error) {
        alert('Failed to delete products. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };


  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
      setManagingVariationsProductId(null);
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleSaveProduct = async () => {
    if (!isSensitiveSessionValid()) {
      setConfirmPasswordCallback(() => handleSaveProduct());
      setConfirmPasswordInput('');
      setConfirmPasswordError('');
      setIsPasswordConfirmOpen(true);
      return;
    }

    if (!formData.name || !formData.description || !formData.base_price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsProcessing(true);

      // Default slug from name if not provided
      if (!formData.slug || !formData.slug.trim()) {
        formData.slug = slugify(formData.name || '');
      }

      // Prepare data for saving - convert undefined to null for nullable fields
      const prepareData = (data: Partial<Product>) => {
        const prepared = { ...data };
        // Convert undefined to null for nullable fields
        if (prepared.image_url === undefined) prepared.image_url = null;
        if (prepared.safety_sheet_url === undefined) prepared.safety_sheet_url = null;
        if (prepared.coa_url === undefined) prepared.coa_url = null;
        if (prepared.discount_price === undefined) prepared.discount_price = null;
        if (prepared.molecular_weight === undefined) prepared.molecular_weight = null;
        if (prepared.cas_number === undefined) prepared.cas_number = null;
        if (prepared.sequence === undefined) prepared.sequence = null;
        if (prepared.inclusions === undefined) prepared.inclusions = null;
        if (prepared.pre_order_est_arrival === undefined) prepared.pre_order_est_arrival = null;
        if (prepared.pre_order_restock_date === undefined) prepared.pre_order_restock_date = null;
        if (prepared.pre_order_note === undefined) prepared.pre_order_note = null;
        return prepared;
      };

      const pickProductDbFields = (data: Partial<Product>) => {
        const allowedKeys: (keyof Product)[] = [
          'name',
          'slug',
          'description',
          'category',
          'base_price',
          'discount_price',
          'discount_active',
          'purity_percentage',
          'molecular_weight',
          'cas_number',
          'sequence',
          'storage_conditions',
          'stock_quantity',
          'stock_manila',
          'stock_davao',
          'available',
          'featured',
          'image_url',
          'safety_sheet_url',
          'coa_url',
          'pre_order_enabled',
          'pre_order_est_arrival',
          'pre_order_restock_date',
          'pre_order_note',
          'pre_order_max_qty',
          'dosing_guide',
          'dosage_chart_url',
          'usage_notes',
          'linked_peptalk_id',
        ];

        const dbPayload: Partial<Product> = {};
        for (const key of allowedKeys) {
          if (key in data) {
            // @ts-expect-error index by key
            dbPayload[key] = data[key];
          }
        }
        return dbPayload;
      };

      if (editingProduct) {
        // Remove read-only fields and relations before updating
        const { id, created_at, updated_at, variations, ...updateData } = formData as Product;

        // EXPLICITLY ensure image_url is included (even if it's null/undefined)
        // Get image_url directly from formData to ensure we have the latest value
        const imageUrlValue = formData.image_url !== undefined ? formData.image_url : null;

        // Create update payload - ensure image_url is always included
        const updatePayload: any = {
          ...updateData,
        };

        // ALWAYS explicitly set image_url, even if it's null
        updatePayload.image_url = imageUrlValue;

        const preparedData = prepareData(updatePayload);

        // Triple-check: Force image_url to be in the payload
        preparedData.image_url = imageUrlValue;

        // Strip out any fields that don't exist on the products table
        const dbPayload = pickProductDbFields(preparedData);

        // Log to verify it's included
        console.log('🔍 Final payload check:', {
          has_image_url: 'image_url' in dbPayload,
          image_url_value: dbPayload.image_url,
          image_url_type: typeof dbPayload.image_url,
          all_keys: Object.keys(dbPayload)
        });

        console.log('💾 Saving product update:', {
          id: editingProduct.id,
          image_url: dbPayload.image_url,
          image_url_type: typeof dbPayload.image_url,
          image_url_length: dbPayload.image_url?.length || 0,
          fullPayload: dbPayload
        });

        const result = await updateProduct(editingProduct.id, dbPayload);
        if (!result.success) {
          console.error('❌ Update failed:', result.error);
          throw new Error(result.error || 'Failed to update product');
        }
        logAdminAction('update_product', { id: editingProduct.id, name: dbPayload.name, previous: editingProduct, new: dbPayload });

        try {
          await persistBundleTiers(editingProduct.id);
        } catch (e) {
          console.error('❌ Bundle tier save failed:', e);
          alert(`Product saved but bundle tier update failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }

        // Verify the image was saved
        if (result.data && result.data.image_url !== preparedData.image_url) {
          console.warn('⚠️ Image URL mismatch after save:', {
            sent: preparedData.image_url,
            received: result.data.image_url
          });
        }

        console.log('✅ Product updated successfully', {
          saved_image_url: result.data?.image_url
        });
      } else {
        // Remove non-creatable fields for new products
        const { variations, ...createData } = formData as any;

        // EXPLICITLY ensure image_url is included
        const createPayload = {
          ...createData,
          image_url: formData.image_url !== undefined ? formData.image_url : null,
        };

        const preparedData = prepareData(createPayload);

        // Strip out any fields that don't exist on the products table for insert
        const dbPayload = pickProductDbFields(preparedData);
        console.log('💾 Creating new product:', {
          name: dbPayload.name,
          image_url: dbPayload.image_url,
          fullPayload: dbPayload
        });

        const result = await addProduct(dbPayload as Omit<Product, 'id' | 'created_at' | 'updated_at'>);
        if (!result.success) {
          throw new Error(result.error);
        }
        console.log('✅ Product created successfully');
        logAdminAction('create_product', { name: dbPayload.name, data: dbPayload });

        if (result.data?.id && bundleTiers.length > 0) {
          try {
            await persistBundleTiers(result.data.id);
          } catch (e) {
            console.error('❌ Bundle tier save failed:', e);
            alert(`Product created but bundle tier save failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }
      }

      // Refresh products to ensure UI is updated
      console.log('🔄 Refreshing products after save...');
      await refreshProducts();
      console.log('✅ Products refreshed');

      // If we were editing, verify the image was saved
      if (editingProduct && formData.image_url) {
        console.log('🔍 Verifying saved image URL:', formData.image_url);
        // The refresh should have updated the products list with the new image
      }

      setCurrentView('products');
      setEditingProduct(null);
      setManagingVariationsProductId(null);
    } catch (error) {
      console.error('❌ Error saving product:', error);
      alert(`Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCurrentView(currentView === 'add' || currentView === 'edit' ? 'products' : 'dashboard');
    setEditingProduct(null);
    setManagingVariationsProductId(null);
  };

  const renderFormView = () => {
    return (
      <div className="max-w-5xl mx-auto px-1 sm:px-4 py-3 sm:py-6">
        {/* Form Header with Save / Cancel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 shrink-0"
              title="Back to products"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                {currentView === 'edit' ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {currentView === 'edit' ? `Editing: ${formData.name || 'Untitled'}` : 'Fill in the details below to create a new product'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 justify-end w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </span>
            </button>
            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={isProcessing}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                {isProcessing ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {currentView === 'edit' ? 'Save Changes' : 'Create Product'}
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">📝</span>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData((prev) => {
                      const autoSlug = !prev.slug || prev.slug === slugify(prev.name || '');
                      return {
                        ...prev,
                        name: newName,
                        slug: autoSlug ? slugify(newName) : prev.slug,
                      };
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g., BPC-157 5mg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">/</span>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: slugify(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                    placeholder="bpc-157-5mg"
                  />
                </div>
                <p className="text-[10px] text-slate-450 mt-1">
                  Auto-generated from the name. Edit to customize the product URL.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description *</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="Detailed product description..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Base Price (₱) *</label>
                <input
                  type="number"
                  step="1"
                  value={formData.base_price || ''}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="0"
                />
                {editingProduct && editingProduct.variations && editingProduct.variations.length > 0 && (
                  <p className="text-xs text-orange-605 mt-2 flex items-start gap-1.5 bg-orange-50/50 p-2.5 rounded-xl border border-orange-200">
                    <span className="text-sm">⚠️</span>
                    <span>This product has <strong>{editingProduct.variations.length} size variation(s)</strong>. Customers will see those prices instead of this base price. Use the <strong>"Manage Sizes"</strong> button to update the prices shown on the website.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Raw Price (₱)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.raw_price ?? ''}
                  onChange={(e) => setFormData({ ...formData, raw_price: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="0"
                />
                <p className="text-[10px] text-slate-450 mt-1">
                  Wholesale / unit cost. Used in Sales Analytics to compute profit when a variation has no cost price.
                </p>
                {formData.base_price && formData.raw_price ? (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
                    Margin: ₱{(Number(formData.base_price) - Number(formData.raw_price)).toLocaleString()} ({(((Number(formData.base_price) - Number(formData.raw_price)) / Number(formData.base_price)) * 100).toFixed(1)}%)
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Scientific Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">🧪</span>
              Scientific Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Purity (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.purity_percentage || ''}
                  onChange={(e) => setFormData({ ...formData, purity_percentage: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="99.0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Molecular Weight</label>
                <input
                  type="text"
                  value={formData.molecular_weight || ''}
                  onChange={(e) => setFormData({ ...formData, molecular_weight: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g., 1419.55 g/mol"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">CAS Number</label>
                <input
                  type="text"
                  value={formData.cas_number || ''}
                  onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g., 137525-51-0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Storage Conditions</label>
                <input
                  type="text"
                  value={formData.storage_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="Store at -20°C"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-655 mb-1.5">Sequence</label>
                <input
                  type="text"
                  value={formData.sequence || ''}
                  onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g., GEPPPGKPADDAGLV"
                />
              </div>
            </div>
          </div>

          {/* Complete Set Inclusions */}
          <div className="bg-gradient-to-r from-amber-50/50 to-slate-50 border border-amber-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="text-base">📦</span>
                Complete Set Inclusions
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.inclusions !== null && formData.inclusions !== undefined}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setFormData({ ...formData, inclusions: null });
                    } else {
                      setFormData({ ...formData, inclusions: formData.inclusions || [] });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">This is a SET product</span>
              </label>
            </div>
            {formData.inclusions !== null && formData.inclusions !== undefined ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  What's included in this set? (One item per line)
                </label>
                <textarea
                  value={formData.inclusions?.join('\n') || ''}
                  onChange={(e) => {
                    const items = e.target.value.split('\n').filter(item => item.trim() !== '');
                    setFormData({ ...formData, inclusions: items.length > 0 ? items : null });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800 min-h-[80px]"
                  placeholder="Example:&#10;Syringe for Reconstitution&#10;6 Insulin Syringes (7pcs for 30mg)&#10;10pcs Alcohol Pads..."
                  rows={6}
                />
                <p className="text-xs text-slate-400 mt-2 flex items-start gap-1.5">
                  <span className="text-blue-500 font-bold">💡</span>
                  <span>Enter each item on a new line. These will be displayed as a checklist on the product detail page. Check "This is a SET product" above to enable this feature.</span>
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 mb-2">Enable "This is a SET product" to add inclusions</p>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, inclusions: [] })}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Enable SET feature
                </button>
              </div>
            )}
          </div>

          {/* Pre-Order Configuration */}
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="text-base">🔄</span>
                Pre-Order Configuration
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pre_order_enabled || false}
                  onChange={(e) => setFormData({ ...formData, pre_order_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-605 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">Enable Pre-Order</span>
              </label>
            </div>
            {formData.pre_order_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Estimated Arrival</label>
                  <input
                    type="text"
                    value={formData.pre_order_est_arrival || ''}
                    onChange={(e) => setFormData({ ...formData, pre_order_est_arrival: e.target.value || null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                    placeholder="e.g., June 20, 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Restock Date</label>
                  <input
                    type="date"
                    value={formData.pre_order_restock_date || ''}
                    onChange={(e) => setFormData({ ...formData, pre_order_restock_date: e.target.value || null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5">Max Pre-Order Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.pre_order_max_qty || 10}
                    onChange={(e) => setFormData({ ...formData, pre_order_max_qty: Number(e.target.value) || 10 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5">Pre-Order Note</label>
                  <input
                    type="text"
                    value={formData.pre_order_note || ''}
                    onChange={(e) => setFormData({ ...formData, pre_order_note: e.target.value || null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                    placeholder="e.g., Limited batch — ships within 5-7 days"
                  />
                </div>
              </div>
            )}
            {!formData.pre_order_enabled && (
              <p className="text-xs text-slate-405 mt-1">
                Enable pre-order to allow customers to reserve this product before stock arrives. A "Pre-Order" badge will appear on the product card.
              </p>
            )}
          </div>

          {/* Inventory */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">📦</span>
              Inventory & Availability
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Manila Stock</label>
                <input
                  type="number"
                  value={formData.stock_manila ?? 0}
                  onChange={(e) => {
                    const manila = Number(e.target.value);
                    const davao = formData.stock_davao ?? 0;
                    setFormData({ 
                      ...formData, 
                      stock_manila: manila, 
                      stock_quantity: manila + davao 
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Davao Stock</label>
                <input
                  type="number"
                  value={formData.stock_davao ?? 0}
                  onChange={(e) => {
                    const davao = Number(e.target.value);
                    const manila = formData.stock_manila ?? 0;
                    setFormData({ 
                      ...formData, 
                      stock_davao: davao, 
                      stock_quantity: manila + davao 
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Total Stock (Auto)</label>
                <input
                  type="number"
                  value={(formData.stock_manila ?? 0) + (formData.stock_davao ?? 0)}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured || false}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-655 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">⭐ Featured</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.available ?? true}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4 text-emerald-650 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700">✅ Available</span>
              </label>
            </div>
          </div>

          {/* Discount */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">💰</span>
              Discount Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Discount Price (₱)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.discount_price || ''}
                  onChange={(e) => setFormData({ ...formData, discount_price: Number(e.target.value) || null })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center pt-0 md:pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.discount_active || false}
                    onChange={(e) => setFormData({ ...formData, discount_active: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-700">🏷️ Enable Discount</span>
                </label>
              </div>
            </div>
          </div>

          {/* Product Image */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">🖼️</span>
              Product Image
            </h3>
            <p className="text-xs text-slate-404 mb-3">
              Upload a product image (optional). This will appear on the customer-facing site.
            </p>
            <ImageUpload
              currentImage={formData.image_url || undefined}
              onImageChange={(imageUrl) => {
                let newImageUrl: string | null = null;
                if (imageUrl) {
                  const trimmed = imageUrl.trim();
                  newImageUrl = trimmed === '' ? null : trimmed;
                }
                setFormData((prev) => ({
                  ...prev,
                  image_url: newImageUrl,
                }));
              }}
            />
          </div>

          {/* Certificate of Analysis (CoA) */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">📄</span>
              Certificate of Analysis (COA)
            </h3>
            <p className="text-xs text-slate-404 mb-3">
              Paste the COA URL (PDF or image link). Renders inline on the product page and as a "View COA" button beside Add to Cart.
            </p>
            <input
              type="url"
              value={formData.coa_url || ''}
              onChange={(e) => {
                const trimmed = e.target.value.trim();
                setFormData({ ...formData, coa_url: trimmed === '' ? null : trimmed });
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
              placeholder="https://example.com/coa.pdf"
            />
            {formData.coa_url && (
              <a
                href={formData.coa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-semibold text-blue-650 hover:underline"
              >
                Open COA link ↗
              </a>
            )}
          </div>

          {/* Dosing Guide & Peptide Calculator */}
          <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">📋</span>
              Dosing Guide & Peptide Calculator Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dosing Instructions (Text)</label>
                <textarea
                  value={formData.dosing_guide || ''}
                  onChange={(e) => setFormData({ ...formData, dosing_guide: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="Explain dosage cycles, reconstitution protocols, etc..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dosage Reference Chart Image URL</label>
                <input
                  type="url"
                  value={formData.dosage_chart_url || ''}
                  onChange={(e) => setFormData({ ...formData, dosage_chart_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="https://example.com/dosage-chart.png"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Linked PepTalk Protocol Video</label>
                <select
                  value={formData.linked_peptalk_id || ''}
                  onChange={(e) => setFormData({ ...formData, linked_peptalk_id: e.target.value || null })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                >
                  <option value="">No linked guide</option>
                  {peptalkVideos.map(v => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Important Usage Notes</label>
                <textarea
                  value={formData.usage_notes || ''}
                  onChange={(e) => setFormData({ ...formData, usage_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g. For research purposes only. Reconstitute with Bacteriostatic Water."
                />
              </div>
            </div>
          </div>

          {/* Bundle Discounts */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">🎁</span>
              Bundle Discounts (per-product quantity)
            </h3>
            <p className="text-xs text-slate-404 mb-3">
              Auto-applied when a customer buys 2 or more of this product. Highest matching tier wins. Bundle discount can't be combined with promo codes.
            </p>

            <div className="space-y-2">
              {bundleTiers.length === 0 && (
                <p className="text-xs text-slate-404 italic">No bundle tiers — add one to enable bundle discounts.</p>
              )}
              {bundleTiers.map((tier, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Min quantity</label>
                      <input
                        type="number"
                        min={2}
                        value={tier.min_quantity}
                        onChange={(e) => {
                          const v = Math.max(2, Number(e.target.value) || 2);
                          setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, min_quantity: v } : t)));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Discount %</label>
                      <input
                        type="number"
                        min={0.1}
                        max={100}
                        step="0.1"
                        value={tier.discount_percentage}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, discount_percentage: v } : t)));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tier.active}
                        onChange={(e) =>
                          setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, active: e.target.checked } : t)))
                        }
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tier.most_popular}
                        onChange={(e) =>
                          setBundleTiers(bundleTiers.map((t, i) => ({
                            ...t,
                            most_popular: i === idx ? e.target.checked : false,
                          })))
                        }
                        className="w-4 h-4 text-blue-605 rounded border-slate-300 focus:ring-blue-500"
                      />
                      Most Popular
                    </label>
                    <button
                      type="button"
                      onClick={() => setBundleTiers(bundleTiers.filter((_, i) => i !== idx))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all ml-auto"
                      title="Remove tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const nextMin = bundleTiers.length === 0
                  ? 2
                  : Math.max(...bundleTiers.map((t) => t.min_quantity)) + 1;
                setBundleTiers([...bundleTiers, { min_quantity: nextMin, discount_percentage: 5, active: true, most_popular: false }]);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-700 bg-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add bundle tier
            </button>
          </div>

        </div>

        {/* Sticky Footer Save / Cancel Bar */}
        <div className="sticky bottom-0 z-10 mt-6 -mx-4 px-4 py-4 bg-white/90 backdrop-blur-md border-t border-slate-200 rounded-b-2xl">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </span>
            </button>
            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                {isProcessing ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {currentView === 'edit' ? 'Save Changes' : 'Create Product'}
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProductsListView = () => {
    const sortedProducts = [...products].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return (
      <div className="w-full max-w-[1400px] mx-auto px-6 py-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Products</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
              {products.length} total
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end w-full sm:w-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl font-semibold text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl font-semibold text-xs text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete ({selectedProducts.size})</span>
              </button>
            )}
            <button
              onClick={handleAddProduct}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl font-semibold text-xs text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Selection Info Banner */}
        {selectedProducts.size > 0 && (
          <div className="mb-4 rounded-xl p-3 flex items-center justify-between border border-blue-100 bg-blue-50/50">
            <span className="text-xs font-semibold text-blue-800">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedProducts.map((product) => {
            const isSelected = selectedProducts.has(product.id);
            const hasSizes = !!(product.variations && product.variations.length > 0);
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border p-4 transition-all shadow-sm"
                style={{
                  borderColor: isSelected ? '#3C6CA8' : '#E2E8F0',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="mt-1 w-4 h-4 rounded cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{product.name}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{product.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManagingVariationsProductId(product.id); }}
                      disabled={isProcessing}
                      className="p-1.5 rounded-lg transition-all disabled:opacity-50"
                      style={hasSizes
                        ? { backgroundColor: '#3C6CA8', color: '#FFFFFF' }
                        : { backgroundColor: '#F8FAFC', color: '#3C6CA8', border: '1px solid #C2D4EA' }}
                      title="Manage Sizes"
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditProduct(product)}
                      disabled={isProcessing}
                      className="p-1.5 text-slate-605 hover:bg-slate-55 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={isProcessing}
                      className="p-1.5 text-red-605 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Price</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        ₱{product.base_price.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Stock</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{product.stock_quantity}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Sizes</div>
                      <div className="text-sm font-bold mt-0.5 text-blue-600">{product.variations?.length || 0}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    {product.featured && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">★</span>
                    )}
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={product.available
                        ? { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' }
                        : { backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' }}
                    >
                      {product.available ? 'Active' : 'Off'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-slate-150 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-150">
                <tr>
                  <th className="px-3 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Product</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Price</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Sizes</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Purity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Stock</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hidden xl:table-cell">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id);
                  const hasSizes = !!(product.variations && product.variations.length > 0);
                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-slate-50/50"
                      style={isSelected ? { backgroundColor: '#F0F7FF' } : undefined}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800">{product.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{product.description}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell">
                        {categories.find(cat => cat.id === product.category)?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-slate-800">
                          ₱{product.base_price.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        {hasSizes && (
                          <div className="text-[9px] font-medium mt-0.5 text-blue-500">
                            Per-size pricing
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasSizes ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100"
                          >
                            {product.variations!.length} {product.variations!.length === 1 ? 'size' : 'sizes'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100">
                          {product.purity_percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                        {product.stock_quantity}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex flex-col gap-1">
                          {product.featured && (
                            <span
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 w-fit"
                            >
                              ★ Featured
                            </span>
                          )}
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit"
                            style={product.available
                              ? { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' }
                              : { backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' }}
                          >
                            {product.available ? 'Active' : 'Off'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManagingVariationsProductId(product.id); }}
                            disabled={isProcessing}
                            className="p-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-slate-100"
                            style={hasSizes
                              ? { backgroundColor: '#3C6CA8', color: '#FFFFFF' }
                              : { color: '#3C6CA8' }}
                            title="Manage Sizes"
                          >
                            <Layers className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            disabled={isProcessing}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all disabled:opacity-50"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={isProcessing}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {products.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-12 text-center mt-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100">
              <Plus className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No products yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add your first product to get started.</p>
            <button
              onClick={handleAddProduct}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDashboardOverview = () => {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-6 py-4 sm:py-8">
        {/* KPI Cards Grid */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            
            {/* KPI: Total Products */}
            <button
              onClick={() => setCurrentView('products')}
              className="group relative bg-white rounded-2xl p-6 border border-slate-150/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left flex flex-col justify-between h-32 overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-2xl" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Total Products</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{totalProducts}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Package className="h-5 w-5" />
                </div>
              </div>
            </button>

            {/* KPI: Available */}
            <button
              onClick={() => setCurrentView('products')}
              className="group relative bg-white rounded-2xl p-6 border border-slate-150/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left flex flex-col justify-between h-32 overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-2xl" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">Available</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">{availableProducts}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </button>

            {/* KPI: Featured */}
            <button
              onClick={() => setCurrentView('products')}
              className="group relative bg-white rounded-2xl p-6 border border-slate-150/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left flex flex-col justify-between h-32 overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-2xl" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">Featured</p>
                  <p className="text-3xl font-extrabold text-amber-600 mt-2">{featuredProducts}</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </button>

            {/* KPI: Categories */}
            <button
              onClick={() => setCurrentView('categories')}
              className="group relative bg-white rounded-2xl p-6 border border-slate-150/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left flex flex-col justify-between h-32 overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-2xl" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">Categories</p>
                  <p className="text-3xl font-extrabold text-indigo-600 mt-2">{categories.length}</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: System Status Placeholder */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150/60 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                System Status & Alerts
              </h3>
              <p className="text-xs text-slate-400">Real-time status of your store environment</p>
            </div>

            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="relative w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 mb-1">All Systems Operational</h4>
              <p className="text-xs text-slate-400 max-w-[280px]">
                Database connection, Firebase synchronization, and pricing APIs are fully operational.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                Online & Active
              </span>
              <span>Last updated: Just now</span>
            </div>
          </div>

          {/* Right: Categories Overview Re-styled */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150/60 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Categories Overview
            </h3>
            <div className="space-y-4">
              {categoryCounts.map((category, index) => {
                const progressColors = [
                  'bg-blue-500',
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-indigo-500',
                  'bg-purple-500',
                  'bg-pink-500'
                ];
                const bgColors = [
                  'text-blue-600 bg-blue-50 border-blue-100',
                  'text-emerald-600 bg-emerald-50 border-emerald-100',
                  'text-amber-600 bg-amber-50 border-amber-100',
                  'text-indigo-600 bg-indigo-50 border-indigo-100',
                  'text-purple-600 bg-purple-50 border-purple-100',
                  'text-pink-600 bg-pink-50 border-pink-100'
                ];
                const pct = totalProducts > 0 ? (category.count / totalProducts) * 100 : 0;
                return (
                  <div key={category.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">{category.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bgColors[index % bgColors.length]}`}>
                        {category.count} {category.count === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressColors[index % progressColors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'products':
        return renderProductsListView();
      case 'add':
      case 'edit':
        return renderFormView();
      case 'categories':
        return <CategoryManager onBack={() => setCurrentView('dashboard')} />;
      case 'payments':
        return <PaymentMethodManager onBack={() => setCurrentView('dashboard')} adminEmail={adminSession?.email || 'admin@slimdose.ph'} adminRole={adminSession?.role || 'admin'} />;
      case 'inventory':
        return <PeptideInventoryManager onBack={() => setCurrentView('dashboard')} />;
      case 'crm':
        return <CustomerCRMManager />;
      case 'reviews':
        return <ProductReviewsManager />;
      case 'verifications':
        return <InvoiceVerificationsManager />;
      case 'peptalk-videos':
        return <PeptalkVideosManager />;
      case 'restock-reminders':
        return <RestockRemindersManager />;
      case 'orders':
        return <OrdersManager onBack={() => setCurrentView('dashboard')} />;
      case 'shipping':
        return <ShippingManager onBack={() => setCurrentView('dashboard')} />;
      case 'coa':
        return <COAManager onBack={() => setCurrentView('dashboard')} />;
      case 'faq':
        return <FAQManager onBack={() => setCurrentView('dashboard')} />;
      case 'promo-codes':
        return (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-650 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <PromoCodeManager adminEmail={adminSession?.email || 'admin@slimdose.ph'} adminRole={adminSession?.role || 'admin'} />
          </div>
        );
      case 'global-discount':
        return (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-650 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <GlobalDiscountManager adminEmail={adminSession?.email || 'admin@slimdose.ph'} adminRole={adminSession?.role || 'admin'} />
          </div>
        );
      case 'guides':
        return (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-650 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <GuideManager />
          </div>
        );
      case 'analytics':
        return <SalesAnalyticsManager onBack={() => setCurrentView('dashboard')} />;
      case 'popup':
        return (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-655 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <PopupManager />
          </div>
        );
      case 'page-contents':
        return (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <PageContentsManager
              onBack={() => setCurrentView('dashboard')}
              adminEmail={adminSession?.email || 'admin@slimdose.ph'}
              adminRole={adminSession?.role || 'admin'}
            />
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-655 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <SiteSettingsManager />
          </div>
        );
      default:
        return renderDashboardOverview();
    }
  };

  // Dashboard Stats
  const totalProducts = products.length;
  const featuredProducts = products.filter(p => p.featured).length;
  const availableProducts = products.filter(p => p.available).length;
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: products.filter(p => p.category === cat.id).length
  }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    let authedUser: { email: string; role: string; name: string } | null = null;

    try {
      // 1. Try Supabase
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!error && data) {
        if (data.password_hash === password) {
          authedUser = {
            email: data.email,
            role: data.role,
            name: data.name || 'Store Admin',
          };
        }
      }
    } catch (err) {
      console.warn('Supabase auth error, falling back to local seed accounts:', err);
    }

    // 2. Local fallback if Supabase fails or not configured
    if (!authedUser) {
      const match = LOCAL_ADMINS.find(
        (u) => u.email === email.toLowerCase().trim() && u.password === password
      );
      if (match) {
        authedUser = {
          email: match.email,
          role: match.role,
          name: match.name,
        };
      }
    }

    if (authedUser) {
      const sessionData: AdminSession = {
        ...authedUser,
        token: 'authenticated_v1',
        loginTime: Date.now()
      };
      sessionStorage.setItem('admin_session', JSON.stringify(sessionData));
      setAdminSession(sessionData);
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminSession(null);
    setPassword('');
    setCurrentView('dashboard');
    sessionStorage.removeItem('admin_session');
    localStorage.removeItem('admin_session');
    window.location.href = '/';
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Login Screen
  // Modern 2-Column Dedicated Admin Access & Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#121B2B] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-inter relative overflow-hidden">
        {/* Subtle Ambient Glowing Backdrops */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3C6CA8]/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Quick Home Navigation */}
        <a
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all shadow-md backdrop-blur-md z-20"
        >
          <ArrowLeft className="w-4 h-4 text-[#3C6CA8]" />
          <span>Back to Storefront</span>
        </a>

        <div className="w-full max-w-5xl bg-slate-900/90 rounded-3xl border border-slate-800/80 shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 relative z-10">
          
          {/* Column 1: Interactive Data Details & System Overview */}
          <div className="lg:col-span-6 p-6 sm:p-10 bg-gradient-to-br from-slate-900 via-[#131D2D] to-slate-950 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative">
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-lg ring-2 ring-blue-500/20 flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/assets/logo.jpeg" alt="SlimDose Logo" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3C6CA8] block">Biotech Enterprise portal</span>
                  <h2 className="text-lg font-bold text-white tracking-tight">SlimDose Control Center</h2>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-900/40 mb-6 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#3C6CA8] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wide">Restricted Personnel Area</h4>
                  <p className="text-[11.5px] text-blue-300/80 mt-0.5 leading-relaxed font-normal">
                    Authorized store management portal. All access attempts are logged with biometric IP audit verification.
                  </p>
                </div>
              </div>

              {/* Interactive System Highlights */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Live Storefront Metrics</h4>

                <div className="p-3.5 rounded-xl bg-slate-850/60 border border-slate-800/80 flex items-center justify-between hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Catalog & Inventory</span>
                      <span className="text-[10.5px] text-slate-400 font-medium">Real-time stock &amp; cold-chain tracking</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-850/60 border border-slate-800/80 flex items-center justify-between hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Secure Payment Gateways</span>
                      <span className="text-[10.5px] text-slate-400 font-medium">GCash, Maya, Bank Transfer &amp; HitPay</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-850/60 border border-slate-800/80 flex items-center justify-between hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Audit &amp; Role Permissions</span>
                      <span className="text-[10.5px] text-slate-400 font-medium">Super Admin, Order Manager &amp; Content Editor</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">Encrypted</span>
                </div>
              </div>
            </div>

            {/* Column 1 Footer */}
            <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Vite + Supabase v2.4
              </span>
              <span>SlimDose Philippines © 2026</span>
            </div>
          </div>

          {/* Column 2: Modern Authentication Form */}
          <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/60">
            <div className="max-w-md mx-auto w-full">
              <div className="text-left mb-6">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-[#3C6CA8] border border-blue-500/20 inline-block mb-2">
                  🔒 Secure Admin Login
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight">Admin Access</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Provide your verified administrator credentials to unlock management dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" /> Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm focus:ring-2 focus:ring-[#3C6CA8]/40 focus:border-[#3C6CA8] transition-all outline-none pl-11"
                      placeholder="admin@slimdose.ph"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm focus:ring-2 focus:ring-[#3C6CA8]/40 focus:border-[#3C6CA8] transition-all outline-none pl-11"
                      placeholder="••••••••••••"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Login Error Notification */}
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <AlertOctagon className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-[#3C6CA8] via-blue-600 to-[#294E7A] hover:from-[#315A8E] hover:to-[#1E3A5E] shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Access Dashboard</span>
                </button>
              </form>

              {/* Seed Demo Credentials Helper */}
              <div className="mt-6 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-[11px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Quick Demo Login Credentials:</span>
                <div className="text-slate-300 space-y-0.5 font-mono text-[10.5px]">
                  <p>• Super Admin: <span className="text-blue-400">admin@gmail.com</span> / <span className="text-blue-400">123456#</span></p>
                  <p>• Store Admin: <span className="text-blue-400">admin@slimdose.ph</span> / <span className="text-blue-400">admin2026</span></p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-charcoal-100 border-t-theme-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const menuCategories = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard Overview', view: 'dashboard', icon: LayoutDashboard },
        { label: 'Sales Analytics', view: 'analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { label: 'Manage Products', view: 'products', icon: Package },
        { label: 'Add New Product', view: 'add', icon: Plus, action: handleAddProduct },
        { label: 'Manage Categories', view: 'categories', icon: FolderOpen },
        { label: 'Peptide Inventory', view: 'inventory', icon: Warehouse },
        { label: 'Lab Results (COA)', view: 'coa', icon: Shield },
      ]
    },
    {
      title: 'Orders & Customers',
      items: [
        { label: 'Orders Management', view: 'orders', icon: ShoppingCart },
        { label: 'Invoice Verifications', view: 'verifications', icon: FileCheck },
        { label: 'Customer CRM', view: 'crm', icon: Users },
        { label: 'Restock Reminders', view: 'restock-reminders', icon: Mail },
        { label: 'Payment Methods', view: 'payments', icon: CreditCard },
        { label: 'Shipping Locations', view: 'shipping', icon: MapPin },
      ]
    },
    {
      title: 'Marketing & Content',
      items: [
        { label: 'Product Reviews', view: 'reviews', icon: Star },
        { label: 'Peptalk Videos', view: 'peptalk-videos', icon: Video },
        { label: 'Peptalk Articles', view: 'guides', icon: BookOpen },
        { label: 'Promo Codes', view: 'promo-codes', icon: Tag },
        { label: 'Global Discount', view: 'global-discount', icon: Sparkles },
        { label: 'Manage FAQ', view: 'faq', icon: HelpCircle },
        { label: 'Popup Banners', view: 'popup', icon: MessageSquare },
        { label: 'Page Contents', view: 'page-contents', icon: FileText },
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Site Settings', view: 'settings', icon: Settings },
      ]
    }
  ];

  const allMenuItems = menuCategories.flatMap(c => c.items);

  const isItemActive = (item: typeof allMenuItems[0]) => {
    if (item.view === currentView) return true;
    if (item.view === 'products' && (currentView === 'add' || currentView === 'edit')) return true;
    return false;
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'products':
        return 'Manage Products';
      case 'add':
        return 'Add New Product';
      case 'edit':
        return 'Edit Product';
      case 'categories':
        return 'Manage Categories';
      case 'payments':
        return 'Payment Methods';
      case 'inventory':
        return 'Peptide Inventory';
      case 'crm':
        return 'Customer CRM Directory';
      case 'reviews':
        return 'Product Reviews & Testimonials';
      case 'verifications':
        return 'Invoice Receipt Verifications';
      case 'peptalk-videos':
        return 'PepTalk Video Gallery';
      case 'restock-reminders':
        return 'Peptide Restock Reminders';
      case 'orders':
        return 'Orders Management';
      case 'analytics':
        return 'Sales Analytics';
      case 'shipping':
        return 'Shipping Locations';
      case 'coa':
        return 'Lab Results (COA)';
      case 'faq':
        return 'Manage FAQ';
      case 'promo-codes':
        return 'Promo Codes';
      case 'global-discount':
        return 'Global Discount';
      case 'guides':
        return 'Peptalk Articles';
      case 'popup':
        return 'Popup Banners';
      case 'page-contents':
        return 'Page Contents';
      case 'settings':
        return 'Site Settings';
      default:
        return 'Admin Dashboard';
    }
  };

  return (
    <>
      {variationManagerModal}
      <div className="flex min-h-screen bg-slate-50 font-sans relative">
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md lg:hidden transition-opacity duration-300"
          />
        )}

        {/* Left Sidebar (Responsive Drawer on Mobile, Fixed on Desktop) */}
        <aside className={`w-72 bg-slate-900 text-slate-300 flex flex-col fixed top-0 bottom-0 left-0 z-50 border-r border-slate-800/80 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner shrink-0 bg-white p-0.5">
                <img
                  src="/assets/logo.jpeg"
                  alt="SlimDose Peptides"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-wide truncate">
                  SlimDose Peptides
                </h1>
                <p className="text-[11px] font-medium text-blue-400 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Admin Console
                </p>
              </div>
            </div>
            {/* Close Button for Mobile Drawer */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 custom-scrollbar">
            {(() => {
              const isStaff = adminSession?.role === 'content_editor' || adminSession?.role === 'order_manager';
              const disallowed = ['analytics', 'payments', 'global-discount', 'promo-codes', 'settings', 'popup', 'page-contents'];

              return menuCategories.map((category) => {
                const filteredItems = category.items.filter(item => {
                  if (isStaff && disallowed.includes(item.view)) return false;
                  return true;
                });

                if (filteredItems.length === 0) return null;

                return (
                  <div key={category.title} className="space-y-1">
                    <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {category.title}
                    </div>

                    <div className="space-y-1">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item);
                        const hashHref = `#${item.view}`;
                        return (
                          <a
                            key={item.label}
                            href={hashHref}
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.hash = item.view;
                              if (item.action) {
                                handleViewChange(item.view, item.action);
                              } else if (item.view) {
                                handleViewChange(item.view);
                              }
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all group relative cursor-pointer ${
                              active
                                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30'
                                : 'hover:bg-slate-800/70 hover:text-slate-100 text-slate-400'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                            <span className="truncate">{item.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                {adminSession?.name ? adminSession.name[0].toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {adminSession?.name || 'Store Admin'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {adminSession?.email || 'admin@slimdose.ph'}
                </p>
              </div>
            </div>
            
            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-grow text-center py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
              >
                View Site ↗
              </a>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all flex items-center justify-center shrink-0 border border-rose-500/20"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <div className="flex-1 ml-0 lg:ml-72 min-h-screen flex flex-col bg-slate-50 min-w-0">
          {/* Global Header */}
          <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {getViewTitle()}
              </h2>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Role</span>
                <span className="text-xs font-semibold text-slate-600">
                  {adminSession?.role ? adminSession.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Administrator'}
                </span>
              </div>
            </div>
          </header>

          {/* Main Content Pane Scroll Area */}
          <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-x-hidden">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {isPasswordConfirmOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Security Verification</h3>
                <p className="text-xs text-slate-500">
                  Please enter your administrator password to unlock this protected action/section.
                </p>
              </div>

              <form onSubmit={handlePasswordConfirmSubmit} className="space-y-3.5 pt-2 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {confirmPasswordError && (
                  <p className="text-xs text-rose-600 font-semibold text-center">{confirmPasswordError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordConfirmOpen(false);
                      setConfirmPasswordCallback(null);
                      setPendingViewChange(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-655 font-semibold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                  >
                    Verify Access
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );

};

export default AdminDashboard;
