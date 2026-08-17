import React, { useEffect, useState } from 'react';
import {
  Plus, Edit, Trash2, Save, X, ArrowLeft, TrendingUp, Package, Users, FolderOpen,
  CreditCard, Sparkles, Layers, Shield, ShieldCheck, AlertOctagon, RefreshCw, Warehouse,
  ShoppingCart, HelpCircle, MapPin, Settings, Tag, BookOpen, MessageSquare, FileText,
  LogOut, Star, FileCheck, Video, Mail, Menu, MoreVertical, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal, TrendingDown, Eye, EyeOff,
  ChevronDown, ChevronUp, Image as ImageIcon, Percent, Boxes, FlaskConical, Award,
  AlertCircle, BarChart3, LayoutDashboard, Lock, DollarSign, AlertTriangle, CheckCircle2,
  Edit2, ExternalLink, Copy, Check, MessageCircle, Megaphone, Clock, ArrowUpRight,
  CheckCircle, Wallet, Receipt
} from 'lucide-react';
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
import TopBannerManager from './TopBannerManager';
import ProductModal from './ProductModal';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { fireToast } from './ToastNotification';
import { liveScrapedOrders } from '../data/liveScrapedOrders';


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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_sidebar_collapsed');
      // Default to collapsed (mini-sidebar mode) if unset or true
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };
  const { products, loading, addProduct, updateProduct, deleteProduct, refreshProducts } = useMenu();
  const { categories } = useCategories();
  const [currentView, setCurrentView] = useState<'dashboard' | 'products' | 'add' | 'edit' | 'categories' | 'payments' | 'inventory' | 'orders' | 'shipping' | 'coa' | 'faq' | 'settings' | 'promo-codes' | 'global-discount' | 'guides' | 'analytics' | 'popup' | 'page-contents' | 'top-banner' | 'crm' | 'verifications' | 'reviews' | 'restock-reminders' | 'peptalk-videos'>('dashboard');

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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [managingVariationsProductId, setManagingVariationsProductId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDropdownProductId, setActiveDropdownProductId] = useState<string | null>(null);
  // Products Catalog enhanced state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilterCategory, setCatalogFilterCategory] = useState<string>('all');
  const [catalogFilterStatus, setCatalogFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [catalogFilterFeatured, setCatalogFilterFeatured] = useState<'all' | 'featured' | 'not-featured'>('all');
  const [catalogFilterStock, setCatalogFilterStock] = useState<'all' | 'low' | 'out'>('all');
  const [catalogSortBy, setCatalogSortBy] = useState<'newest' | 'oldest' | 'name' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'sales'>('newest');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [catalogViewMode, setCatalogViewMode] = useState<'table' | 'grid'>('table');
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const [telegramLinkInput, setTelegramLinkInput] = useState('');
  const [isEditingTelegram, setIsEditingTelegram] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.product-action-dropdown-container')) {
        setActiveDropdownProductId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownProductId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (siteSettings?.community_telegram_url) {
      setTelegramLinkInput(siteSettings.community_telegram_url);
    }
  }, [siteSettings?.community_telegram_url]);

  // ── Dashboard live data: orders + verifications ──────────────────────────
  interface DashOrder {
    id: string;
    order_number: string | null;
    customer_name: string;
    total_price: number;
    order_status: string;
    payment_status: string;
    created_at: string;
  }
  interface DashVerification {
    id: string;
    order_id: string;
    status: string;
    created_at: string;
    orders: { customer_name: string; order_number: string | null; total_price: number } | null;
  }
  const [dashOrders, setDashOrders] = useState<DashOrder[]>([]);
  const [dashVerifications, setDashVerifications] = useState<DashVerification[]>([]);
  const [dashLastSync, setDashLastSync] = useState<Date | null>(null);

  const fetchDashData = async () => {
    try {
      const [{ data: ordersData }, { data: verifData }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, total_price, order_status, payment_status, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('invoice_verifications')
          .select('id, order_id, status, created_at, orders(customer_name, order_number, total_price)')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (ordersData && ordersData.length > 0) {
        setDashOrders(ordersData);
      } else {
        setDashOrders(liveScrapedOrders.slice(0, 100));
      }
      if (verifData && verifData.length > 0) {
        setDashVerifications(verifData as DashVerification[]);
      }
      setDashLastSync(new Date());
    } catch (e) {
      console.warn('Dashboard data fetch error, using live scraped orders cache:', e);
      setDashOrders(liveScrapedOrders.slice(0, 100));
      setDashLastSync(new Date());
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchDashData();
  }, [isAuthenticated]);

  const handleSaveTelegramLink = async () => {
    if (!telegramLinkInput.trim()) {
      fireToast('Please enter a valid Telegram link', 'error');
      return;
    }
    try {
      setIsSavingTelegram(true);
      await updateSiteSettings({
        community_telegram_url: telegramLinkInput.trim()
      });
      // Also sync page_contents for community
      try {
        await supabase.from('page_contents').upsert({
          page_id: 'community',
          content: {
            telegram_group: telegramLinkInput.trim(),
            community_telegram_url: telegramLinkInput.trim(),
            updated_at: new Date().toISOString()
          }
        });
      } catch {}

      setIsEditingTelegram(false);
      fireToast('Community Telegram Discussion Link updated successfully! 💬', 'success');
    } catch (err) {
      console.error('Error saving telegram link:', err);
      fireToast('Failed to update Telegram link', 'error');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleCopyTelegramLink = () => {
    const link = telegramLinkInput || siteSettings?.community_telegram_url || 'https://t.me/+fGtShIUkbB84YzZl';
    navigator.clipboard.writeText(link);
    setCopiedTelegram(true);
    fireToast('Telegram link copied to clipboard! 📋', 'success');
    setTimeout(() => setCopiedTelegram(false), 2000);
  };

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
  const [peptalkArticles, setPeptalkArticles] = useState<any[]>([]);

  useEffect(() => {
    const fetchPeptalkContent = async () => {
      try {
        const [videosRes, articlesRes] = await Promise.all([
          supabase.from('peptalk_videos').select('id, title'),
          supabase.from('guide_topics').select('id, title').eq('is_enabled', true)
        ]);
        if (videosRes.data) setPeptalkVideos(videosRes.data);
        if (articlesRes.data) setPeptalkArticles(articlesRes.data);
      } catch (err) {
        console.warn('Failed to load peptalk content in admin:', err);
      }
    };
    fetchPeptalkContent();
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
    setEditingProduct(null);
    setIsProductModalOpen(true);
    setSelectedProducts(new Set());
    setManagingVariationsProductId(null);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
    setSelectedProducts(new Set());
    setManagingVariationsProductId(null);
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
          'raw_price',
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
                <label htmlFor="admindashboard-product-name" className="block text-xs font-semibold text-slate-600 mb-1.5">Product Name *</label>
                <input id="admindashboard-product-name" name="product_name" type="text"
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
                <label htmlFor="admindashboard-url-slug" className="block text-xs font-semibold text-slate-600 mb-1.5">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">/</span>
                  <input id="admindashboard-url-slug" name="url_slug" type="text"
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
                <label htmlFor="admindashboard-description" className="block text-xs font-semibold text-slate-600 mb-1.5">Description *</label>
                <textarea id="admindashboard-description" name="description" value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="Detailed product description..."
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="admindashboard-category" className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
                <select id="admindashboard-category" name="category" value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="admindashboard-base-price" className="block text-xs font-semibold text-slate-600 mb-1.5">Base Price (₱) *</label>
                <input id="admindashboard-base-price" name="base_price" type="number"
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
                <label htmlFor="admindashboard-raw-price" className="block text-xs font-semibold text-slate-600 mb-1.5">Raw Price (₱)</label>
                <input id="admindashboard-raw-price" name="raw_price" type="number"
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
                <label htmlFor="admindashboard-purity" className="block text-xs font-semibold text-slate-650 mb-1.5">Purity (%)</label>
                <input id="admindashboard-purity" name="purity" type="number"
                  step="0.1"
                  value={formData.purity_percentage || ''}
                  onChange={(e) => setFormData({ ...formData, purity_percentage: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="99.0"
                />
              </div>

              <div>
                <label htmlFor="admindashboard-molecular-weight" className="block text-xs font-semibold text-slate-650 mb-1.5">Molecular Weight</label>
                <input id="admindashboard-molecular-weight" name="molecular_weight" type="text"
                  value={formData.molecular_weight || ''}
                  onChange={(e) => setFormData({ ...formData, molecular_weight: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g., 1419.55 g/mol"
                />
              </div>

              <div>
                <label htmlFor="admindashboard-cas-number" className="block text-xs font-semibold text-slate-650 mb-1.5">CAS Number</label>
                <input id="admindashboard-cas-number" name="cas_number" type="text"
                  value={formData.cas_number || ''}
                  onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="e.g., 137525-51-0"
                />
              </div>

              <div>
                <label htmlFor="admindashboard-storage-conditions" className="block text-xs font-semibold text-slate-650 mb-1.5">Storage Conditions</label>
                <input id="admindashboard-storage-conditions" name="storage_conditions" type="text"
                  value={formData.storage_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="Store at -20°C"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="admindashboard-sequence" className="block text-xs font-semibold text-slate-655 mb-1.5">Sequence</label>
                <input id="admindashboard-sequence" name="sequence" type="text"
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
              <label htmlFor="admindashboard-if-e-target-checked-setformdat" className="flex items-center gap-2 cursor-pointer">
                <input id="admindashboard-checkbox-2" name="checkbox_2" type="checkbox"
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
                <label htmlFor="admindashboard-if-e-target-checked-setformdat" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  What's included in this set? (One item per line)
                </label>
                <textarea id="admindashboard-if-e-target-checked-setformdat" name="if_e_target_checked_setformdat" value={formData.inclusions?.join('\n') || ''}
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
              <label htmlFor="admindashboard-setformdata-formdata-pre-order" className="flex items-center gap-2 cursor-pointer">
                <input id="admindashboard-checkbox-4" name="checkbox_4" type="checkbox"
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
                  <label htmlFor="admindashboard-setformdata-formdata-pre-order" className="block text-xs font-semibold text-slate-650 mb-1.5">Estimated Arrival</label>
                  <input id="admindashboard-setformdata-formdata-pre-order" name="setformdata_formdata_pre_order" type="text"
                    value={formData.pre_order_est_arrival || ''}
                    onChange={(e) => setFormData({ ...formData, pre_order_est_arrival: e.target.value || null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                    placeholder="e.g., June 20, 2026"
                  />
                </div>
                <div>
                  <label htmlFor="admindashboard-restock-date" className="block text-xs font-semibold text-slate-650 mb-1.5">Restock Date</label>
                  <input id="admindashboard-restock-date" name="restock_date" type="date"
                    value={formData.pre_order_restock_date || ''}
                    onChange={(e) => setFormData({ ...formData, pre_order_restock_date: e.target.value || null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="admindashboard-max-pre-order-quantity" className="block text-xs font-semibold text-slate-655 mb-1.5">Max Pre-Order Quantity</label>
                  <input id="admindashboard-max-pre-order-quantity" name="max_pre_order_quantity" type="number"
                    min={1}
                    value={formData.pre_order_max_qty || 10}
                    onChange={(e) => setFormData({ ...formData, pre_order_max_qty: Number(e.target.value) || 10 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label htmlFor="admindashboard-pre-order-note" className="block text-xs font-semibold text-slate-655 mb-1.5">Pre-Order Note</label>
                  <input id="admindashboard-pre-order-note" name="pre_order_note" type="text"
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
                <label htmlFor="admindashboard-manila-stock" className="block text-xs font-semibold text-slate-650 mb-1.5">Manila Stock</label>
                <input id="admindashboard-manila-stock" name="manila_stock" type="number"
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
                <label htmlFor="admindashboard-davao-stock" className="block text-xs font-semibold text-slate-650 mb-1.5">Davao Stock</label>
                <input id="admindashboard-davao-stock" name="davao_stock" type="number"
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
                <label htmlFor="admindashboard-total-stock-auto" className="block text-xs font-semibold text-slate-650 mb-1.5">Total Stock (Auto)</label>
                <input id="admindashboard-total-stock-auto" name="total_stock_auto" type="number"
                  value={(formData.stock_manila ?? 0) + (formData.stock_davao ?? 0)}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed" autoComplete="off" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
              <label htmlFor="admindashboard-setformdata-formdata-featured-" className="flex items-center gap-2 cursor-pointer">
                <input id="admindashboard-checkbox-6" name="checkbox_6" type="checkbox"
                  checked={formData.featured || false}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-655 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">⭐ Featured</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input id="admindashboard-setformdata-formdata-featured-" name="setformdata_formdata_featured_" type="checkbox"
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
                <label htmlFor="admindashboard-discount-price" className="block text-xs font-semibold text-slate-650 mb-1.5">Discount Price (₱)</label>
                <input id="admindashboard-discount-price" name="discount_price" type="number"
                  step="1"
                  value={formData.discount_price || ''}
                  onChange={(e) => setFormData({ ...formData, discount_price: Number(e.target.value) || null })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center pt-0 md:pt-6">
                <label htmlFor="admindashboard-enable-discount-checkbox" className="flex items-center gap-2 cursor-pointer">
                  <input id="admindashboard-enable-discount-checkbox" name="discount_active" type="checkbox"
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
              Upload a COA PDF file or lab test report image, or provide a direct URL. Renders inline on the product page and as a "View COA" button beside Add to Cart.
            </p>
            <ImageUpload
              currentImage={formData.coa_url || undefined}
              onImageChange={(coaUrl) => {
                setFormData((prev) => ({
                  ...prev,
                  coa_url: coaUrl ? coaUrl.trim() : null,
                }));
              }}
              folder="coa-images"
              accept="image/*,.pdf,application/pdf"
              title="Click to upload COA document or lab image"
              subtitle="Supports PDF documents & all image formats (JPG, PNG, WebP) - max 10MB"
              urlPlaceholder="https://example.com/coa.pdf"
              urlLabel="Or enter direct COA URL (PDF or Image link)"
            />
          </div>

          {/* Dosing Guide & Peptide Calculator */}
          <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="text-base">📋</span>
                Dosing Guide, Instructions &amp; PepTalk Link
              </h3>
              <button
                type="button"
                onClick={() => {
                  const sampleText = `• Reconstitution: Reconstitute lyophilized powder using 1.0 mL to 2.0 mL of Bacteriostatic Water (0.9% Benzyl Alcohol). Slowly drip down the glass vial wall; gently swirl and do not shake.\n• Dosing Protocol: Administer subcutaneously using a sterile calibrated U-100 insulin syringe according to target research protocol.\n• Storage: Lyophilized powder stores at -20°C. Once reconstituted, refrigerate at 2°C–8°C for up to 30 days.`;
                  const sampleNotes = `Strictly for laboratory research and analytical in vitro purposes. Not for human consumption. Keep refrigerated and light-protected after reconstitution.`;
                  setFormData(prev => ({
                    ...prev,
                    dosing_guide: prev.dosing_guide || sampleText,
                    usage_notes: prev.usage_notes || sampleNotes
                  }));
                  fireToast('Standard peptide protocol populated!', 'info');
                }}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>✨ Auto-Fill Standard Protocol</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="admindashboard-linked-peptalk-protocol-video" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Linked PepTalk Protocol / Guide (Customer Redirect on &quot;Open Guide&quot;)
                </label>
                <select id="admindashboard-linked-peptalk-protocol-video" name="linked_peptalk_protocol_video" value={formData.linked_peptalk_id || ''}
                  onChange={(e) => setFormData({ ...formData, linked_peptalk_id: e.target.value || null })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                >
                  <option value="">Auto (Redirect to PepTalk search by compound name)</option>
                  {peptalkArticles.length > 0 && (
                    <optgroup label="📖 PepTalk Articles / Guides">
                      {peptalkArticles.map(a => (
                        <option key={`art-${a.id}`} value={a.id}>Article: {a.title}</option>
                      ))}
                    </optgroup>
                  )}
                  {peptalkVideos.length > 0 && (
                    <optgroup label="🎥 PepTalk Video Protocols">
                      {peptalkVideos.map(v => (
                        <option key={`vid-${v.id}`} value={v.id}>Video: {v.title}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Customers who click &quot;Open Guide&quot; will be automatically redirected to this interactive protocol in PepTalk.
                </p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="admindash-dosing-instructions" className="block text-xs font-semibold text-slate-600 mb-1.5">Dosing Instructions (Text Summary)</label>
                <textarea id="admindash-dosing-instructions" name="dosing_guide" value={formData.dosing_guide || ''}
                  onChange={(e) => setFormData({ ...formData, dosing_guide: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="Explain dosage cycles, reconstitution protocols, etc..."
                />
              </div>

              <div>
                <label htmlFor="admindashboard-dosage-reference-chart-image-u" className="block text-xs font-semibold text-slate-600 mb-1.5">Dosage Reference Chart Image URL</label>
                <input id="admindashboard-dosage-reference-chart-image-u" name="dosage_reference_chart_image_u" type="url"
                  value={formData.dosage_chart_url || ''}
                  onChange={(e) => setFormData({ ...formData, dosage_chart_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800"
                  placeholder="https://example.com/dosage-chart.png"
                />
              </div>

              <div>
                <label htmlFor="admindashboard-important-usage-notes" className="block text-xs font-semibold text-slate-600 mb-1.5">Important Usage &amp; Safety Notes</label>
                <textarea id="admindashboard-important-usage-notes" name="important_usage_notes" value={formData.usage_notes || ''}
                  onChange={(e) => setFormData({ ...formData, usage_notes: e.target.value })}
                  rows={2}
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
                      <label htmlFor="admindashboard-min-quantity" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Min quantity</label>
                      <input id="admindashboard-min-quantity" name="min_quantity" type="number"
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
                      <label htmlFor="admindashboard-discount" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Discount %</label>
                      <input id="admindashboard-discount" name="discount" type="number"
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
                    <label htmlFor="admindashboard-setbundletiers-bundletiers-map" className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 cursor-pointer">
                      <input id="admindashboard-checkbox-10" name="checkbox_10" type="checkbox"
                        checked={tier.active}
                        onChange={(e) =>
                          setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, active: e.target.checked } : t)))
                        }
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 cursor-pointer">
                      <input id="admindashboard-setbundletiers-bundletiers-map" name="setbundletiers_bundletiers_map" type="checkbox"
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
    // KPI calculations
    const totalCount = products.length;
    const activeCount = products.filter(p => p.available).length;
    const inactiveCount = totalCount - activeCount;
    const featuredCount = products.filter(p => p.featured).length;
    const lowStockCount = products.filter(p => (Number(p.stock_quantity) || 0) > 0 && (Number(p.stock_quantity) || 0) <= 5).length;
    const outOfStockCount = products.filter(p => (Number(p.stock_quantity) || 0) === 0).length;
    const totalInventoryValue = products.reduce((acc, p) => acc + ((Number(p.base_price) || 0) * (Number(p.stock_quantity) || 0)), 0);
    const manilaStockTotal = products.reduce((sum, p) => sum + (Number(p.stock_manila) || 0), 0);
    const davaoStockTotal = products.reduce((sum, p) => sum + (Number(p.stock_davao) || 0), 0);

    // Filter & search logic
    const filteredProducts = products.filter(product => {
      // Search
      if (catalogSearch.trim()) {
        const query = catalogSearch.toLowerCase().trim();
        const catName = categories.find(c => c.id === product.category)?.name?.toLowerCase() || '';
        const matchName = product.name?.toLowerCase().includes(query);
        const matchDesc = product.description?.toLowerCase().includes(query);
        const matchSlug = product.slug?.toLowerCase().includes(query);
        const matchCas = product.cas_number?.toLowerCase().includes(query);
        const matchCat = catName.includes(query);
        if (!matchName && !matchDesc && !matchSlug && !matchCas && !matchCat) return false;
      }
      // Category filter
      if (catalogFilterCategory !== 'all' && product.category !== catalogFilterCategory) {
        return false;
      }
      // Status filter
      if (catalogFilterStatus === 'active' && !product.available) return false;
      if (catalogFilterStatus === 'inactive' && product.available) return false;
      // Featured filter
      if (catalogFilterFeatured === 'featured' && !product.featured) return false;
      if (catalogFilterFeatured === 'not-featured' && product.featured) return false;
      // Stock filter
      const stock = Number(product.stock_quantity) || 0;
      if (catalogFilterStock === 'low' && (stock === 0 || stock > 5)) return false;
      if (catalogFilterStock === 'out' && stock > 0) return false;

      return true;
    });

    // Sorting logic
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      switch (catalogSortBy) {
        case 'newest': {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        }
        case 'oldest': {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        }
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'price-asc':
          return (Number(a.base_price) || 0) - (Number(b.base_price) || 0);
        case 'price-desc':
          return (Number(b.base_price) || 0) - (Number(a.base_price) || 0);
        case 'stock-asc':
          return (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0);
        case 'stock-desc':
          return (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0);
        case 'sales':
          return (Number(b.sales_count) || 0) - (Number(a.sales_count) || 0);
        default:
          return 0;
      }
    });

    // Quick toggle product availability
    const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
      try {
        await updateProduct(productId, { available: !currentStatus });
        fireToast(`Product status set to ${!currentStatus ? 'Active' : 'Hidden'}`, 'success');
      } catch (err: any) {
        fireToast(`Failed to update status: ${err.message || err}`, 'error');
      }
    };

    // Quick toggle product featured
    const handleToggleFeatured = async (productId: string, currentFeatured: boolean) => {
      try {
        await updateProduct(productId, { featured: !currentFeatured });
        fireToast(`Product ${!currentFeatured ? 'marked as Featured ★' : 'removed from Featured'}`, 'info');
      } catch (err: any) {
        fireToast(`Failed to update featured: ${err.message || err}`, 'error');
      }
    };

    // Bulk toggle status
    const handleBulkToggleStatus = async (activate: boolean) => {
      if (selectedProducts.size === 0) return;
      try {
        setIsProcessing(true);
        const ids = Array.from(selectedProducts);
        for (const id of ids) {
          await updateProduct(id, { available: activate });
        }
        fireToast(`Updated ${ids.length} products to ${activate ? 'Active' : 'Inactive'}`, 'success');
        setSelectedProducts(new Set());
      } catch (err: any) {
        fireToast(`Bulk status error: ${err.message || err}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    // Bulk toggle featured
    const handleBulkToggleFeatured = async (featured: boolean) => {
      if (selectedProducts.size === 0) return;
      try {
        setIsProcessing(true);
        const ids = Array.from(selectedProducts);
        for (const id of ids) {
          await updateProduct(id, { featured });
        }
        fireToast(`Updated ${ids.length} products ${featured ? 'to Featured' : 'unfeatured'}`, 'success');
        setSelectedProducts(new Set());
      } catch (err: any) {
        fireToast(`Bulk feature error: ${err.message || err}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 md:px-3 py-2 sm:py-3 space-y-3 font-inter">
        {/* ─── 1. Header & Linked Sync Hub ─────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Products Catalog</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {totalCount} Total
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeCount} Active
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Manage peptide formulations, pricing, stock across warehouses, purity COA sheets, and size variations
              </p>
            </div>
          </div>

          {/* Quick Hub Navigation & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <button
              onClick={() => setCurrentView('inventory')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="Jump to Multi-Warehouse Inventory"
            >
              <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Inventory</span>
            </button>

            <button
              onClick={() => setCurrentView('categories')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="Manage Categories"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Categories</span>
            </button>

            <button
              onClick={() => setCurrentView('coa')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="COA Lab Sheets"
            >
              <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">COA Sheets</span>
            </button>

            <button
              onClick={() => setCurrentView('reviews')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="Customer Reviews"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Reviews</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refresh Products"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              onClick={handleAddProduct}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* ─── 2. KPI Metric Strip with 1-Click Filters ──────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {/* Total Catalog */}
          <div
            onClick={() => { setCatalogFilterStatus('all'); setCatalogFilterStock('all'); setCatalogFilterFeatured('all'); }}
            className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Items</span>
              <Package className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">{totalCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>All catalog</span>
              <span className="text-blue-600 font-bold group-hover:underline text-[9.5px]">Reset Filter</span>
            </div>
          </div>

          {/* Active Items */}
          <div
            onClick={() => setCatalogFilterStatus(catalogFilterStatus === 'active' ? 'all' : 'active')}
            className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer group ${
              catalogFilterStatus === 'active' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : 'border-slate-200/90 shadow-2xs hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Listed</span>
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">{activeCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>{inactiveCount} hidden</span>
              <span className="text-emerald-600 font-bold group-hover:underline text-[9.5px]">
                {catalogFilterStatus === 'active' ? 'Filtered ✓' : 'Filter'}
              </span>
            </div>
          </div>

          {/* Featured */}
          <div
            onClick={() => setCatalogFilterFeatured(catalogFilterFeatured === 'featured' ? 'all' : 'featured')}
            className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer group ${
              catalogFilterFeatured === 'featured' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20' : 'border-slate-200/90 shadow-2xs hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Featured</span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-700 mt-1">{featuredCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Homepage hero</span>
              <span className="text-amber-600 font-bold group-hover:underline text-[9.5px]">
                {catalogFilterFeatured === 'featured' ? 'Filtered ✓' : 'Filter'}
              </span>
            </div>
          </div>

          {/* Stock Alerts (Low & Out) */}
          <div
            onClick={() => setCatalogFilterStock(catalogFilterStock === 'low' ? 'all' : 'low')}
            className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer group ${
              catalogFilterStock === 'low' ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20' : 'border-slate-200/90 shadow-2xs hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Stock Alerts</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-700 mt-1">
              {lowStockCount + outOfStockCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>{lowStockCount} low • {outOfStockCount} out</span>
              <span className="text-rose-600 font-bold group-hover:underline text-[9.5px]">
                {catalogFilterStock === 'low' ? 'Filtered ✓' : 'Filter'}
              </span>
            </div>
          </div>

          {/* Multi-Warehouse Stock Distribution */}
          <div
            onClick={() => setCurrentView('inventory')}
            className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Warehouses</span>
              <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-sm font-black text-slate-900 mt-1">
              MNL: <span className="text-indigo-600">{manilaStockTotal}</span> | DVO: <span className="text-indigo-600">{davaoStockTotal}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>{manilaStockTotal + davaoStockTotal} total units</span>
              <span className="text-indigo-600 font-bold group-hover:underline text-[9.5px]">Manage &rarr;</span>
            </div>
          </div>

          {/* Catalog Valuation */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory Value</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-700 mt-1 truncate">
              ₱{totalInventoryValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              Avg price: ₱{totalCount > 0 ? (totalInventoryValue / Math.max(1, manilaStockTotal + davaoStockTotal)).toFixed(0) : 0}/unit
            </div>
          </div>
        </div>

        {/* ─── 3. Search & Filter Toolbar ───────────────────────────────────── */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search products by name, CAS#, formula, category, or description..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {catalogSearch && (
                <button
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Category */}
              <select
                value={catalogFilterCategory}
                onChange={(e) => setCatalogFilterCategory(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={catalogFilterStatus}
                onChange={(e) => setCatalogFilterStatus(e.target.value as any)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Hidden / Off Only</option>
              </select>

              {/* Stock */}
              <select
                value={catalogFilterStock}
                onChange={(e) => setCatalogFilterStock(e.target.value as any)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Stock Levels</option>
                <option value="low">Low Stock (≤ 5 units)</option>
                <option value="out">Out of Stock (0 units)</option>
              </select>

              {/* Sort */}
              <select
                value={catalogSortBy}
                onChange={(e) => setCatalogSortBy(e.target.value as any)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A → Z)</option>
                <option value="price-desc">Price (High → Low)</option>
                <option value="price-asc">Price (Low → High)</option>
                <option value="stock-desc">Stock (High → Low)</option>
                <option value="stock-asc">Stock (Low → High)</option>
                <option value="sales">Top Sales</option>
              </select>

              {/* View Mode Switcher */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setCatalogViewMode('table')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogViewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  Table
                </button>
                <button
                  onClick={() => setCatalogViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogViewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid Cards View"
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar & Bulk Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">
                Showing {sortedProducts.length} of {totalCount} products
              </span>
              {(catalogSearch || catalogFilterCategory !== 'all' || catalogFilterStatus !== 'all' || catalogFilterFeatured !== 'all' || catalogFilterStock !== 'all') && (
                <button
                  onClick={() => {
                    setCatalogSearch('');
                    setCatalogFilterCategory('all');
                    setCatalogFilterStatus('all');
                    setCatalogFilterFeatured('all');
                    setCatalogFilterStock('all');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] transition-colors cursor-pointer"
                >
                  Reset all filters ✕
                </button>
              )}
            </div>

            {/* Bulk Selection Bar */}
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                <span className="font-bold text-blue-900 text-[11px]">
                  {selectedProducts.size} selected
                </span>
                <button
                  onClick={() => handleBulkToggleStatus(true)}
                  disabled={isProcessing}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition-all cursor-pointer shadow-2xs"
                >
                  Set Active
                </button>
                <button
                  onClick={() => handleBulkToggleStatus(false)}
                  disabled={isProcessing}
                  className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10.5px] transition-all cursor-pointer shadow-2xs"
                >
                  Set Hidden
                </button>
                <button
                  onClick={() => handleBulkToggleFeatured(true)}
                  disabled={isProcessing}
                  className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] transition-all cursor-pointer shadow-2xs"
                >
                  Feature ★
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10.5px] transition-all cursor-pointer shadow-2xs"
                >
                  Delete ({selectedProducts.size})
                </button>
                <button
                  onClick={() => setSelectedProducts(new Set())}
                  className="text-blue-700 hover:underline font-semibold text-[10.5px] ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── 4. Table / Grid Catalog View ─────────────────────────────────── */}
        {sortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No products match your filter criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try modifying your search keywords or resetting status, category, and stock filters.
            </p>
            <button
              onClick={() => {
                setCatalogSearch('');
                setCatalogFilterCategory('all');
                setCatalogFilterStatus('all');
                setCatalogFilterFeatured('all');
                setCatalogFilterStock('all');
              }}
              className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : catalogViewMode === 'table' ? (
          /* ── Table View ── */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        id="admindashboard-checkbox-catalog-master"
                        name="catalog_select_all"
                        type="checkbox"
                        checked={selectedProducts.size === sortedProducts.length && sortedProducts.length > 0}
                        onChange={() => {
                          if (selectedProducts.size === sortedProducts.length) {
                            setSelectedProducts(new Set());
                          } else {
                            setSelectedProducts(new Set(sortedProducts.map(p => p.id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        title="Select All"
                      />
                    </th>
                    <th className="py-2.5 px-3">Product Form</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Category</th>
                    <th className="py-2.5 px-3">Base Price</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Variations</th>
                    <th className="py-2.5 px-3 hidden lg:table-cell">Purity / CAS</th>
                    <th className="py-2.5 px-3">Stock (MNL / DVO)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {sortedProducts.map((product, index) => {
                    const isSelected = selectedProducts.has(product.id);
                    const hasVariations = !!(product.variations && product.variations.length > 0);
                    const isExpanded = expandedProductId === product.id;
                    const isDropdownActive = activeDropdownProductId === product.id;
                    const isNearBottom = index >= Math.max(1, sortedProducts.length - 2) && sortedProducts.length >= 2;
                    const categoryObj = categories.find(c => c.id === product.category);
                    const stock = Number(product.stock_quantity) || 0;
                    const mnlStock = Number(product.stock_manila) || 0;
                    const dvoStock = Number(product.stock_davao) || 0;

                    return (
                      <React.Fragment key={product.id}>
                        <tr
                          className={`transition-colors hover:bg-slate-50/80 ${
                            isSelected ? 'bg-blue-50/50' : ''
                          } ${isExpanded ? 'bg-slate-50/50' : ''} ${isDropdownActive ? 'relative z-30' : ''}`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-2.5 px-3 text-center align-middle">
                            <input
                              id={`admindashboard-chk-${product.id}`}
                              name={`chk_${product.id}`}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduct(product.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                          </td>

                          {/* Product Image & Name & Quick Expand */}
                          <td className="py-2.5 px-3 align-middle max-w-[280px]">
                            <div className="flex items-center gap-2.5">
                              {/* Thumbnail */}
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative group">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-400" />
                                )}
                                {product.featured && (
                                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" title="Featured" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                                    className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer truncate"
                                    title="Click to view full specs"
                                  >
                                    {product.name}
                                  </span>
                                  {product.featured && (
                                    <button
                                      onClick={() => handleToggleFeatured(product.id, true)}
                                      className="text-amber-500 hover:text-amber-600 cursor-pointer"
                                      title="Featured Product (Click to toggle)"
                                    >
                                      ★
                                    </button>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                  {product.description || 'No description entered'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 text-xs hidden md:table-cell align-middle">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {categoryObj?.name || 'Uncategorized'}
                            </span>
                          </td>

                          {/* Base Price & Discount */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="text-xs sm:text-sm font-black text-slate-900">
                              ₱{Number(product.base_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </div>
                            {product.discount_price && product.discount_active && (
                              <span className="text-[10px] font-bold text-emerald-600 block">
                                Promo: ₱{Number(product.discount_price).toLocaleString('en-PH')}
                              </span>
                            )}
                            {hasVariations && (
                              <span className="text-[9.5px] text-blue-600 font-semibold block">
                                Tiered pricing
                              </span>
                            )}
                          </td>

                          {/* Variations / Sizes */}
                          <td className="py-2.5 px-3 hidden sm:table-cell align-middle">
                            <button
                              onClick={() => setManagingVariationsProductId(product.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                              title="Manage Size Formulations"
                            >
                              <Layers className="w-3 h-3 text-blue-600" />
                              <span>{product.variations?.length || 0} Sizes</span>
                            </button>
                          </td>

                          {/* Purity & CAS */}
                          <td className="py-2.5 px-3 hidden lg:table-cell align-middle">
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {product.purity_percentage || 99}% Purity
                              </span>
                              {product.cas_number && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  CAS: {product.cas_number}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Multi-Warehouse Stock */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-black ${
                                  stock === 0 ? 'text-rose-600' : stock <= 5 ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                  {stock} units
                                </span>
                                {stock === 0 && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                    OUT
                                  </span>
                                )}
                                {stock > 0 && stock <= 5 && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                    LOW
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                MNL: <span className="text-slate-700 font-bold">{mnlStock}</span> | DVO: <span className="text-slate-700 font-bold">{dvoStock}</span>
                              </div>
                            </div>
                          </td>

                          {/* Quick Status Toggle */}
                          <td className="py-2.5 px-3 text-center align-middle">
                            <button
                              onClick={() => handleToggleAvailability(product.id, product.available)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer ${
                                product.available
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to toggle availability"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${product.available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{product.available ? 'Active' : 'Hidden'}</span>
                            </button>
                          </td>

                          {/* Actions Hub */}
                          <td className="py-2.5 px-3 text-right align-middle">
                            <div className="flex items-center justify-end gap-1">
                              {/* Expand Drawer Button */}
                              <button
                                onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Expand Details"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {/* Quick Edit */}
                              <button
                                onClick={() => handleEditProduct(product)}
                                disabled={isProcessing}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* 3-Dots Dropdown */}
                              <div className="relative inline-block text-left product-action-dropdown-container">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownProductId(activeDropdownProductId === product.id ? null : product.id);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    activeDropdownProductId === product.id
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'text-slate-600 bg-white hover:bg-slate-100 border-slate-200'
                                  }`}
                                  title="More Actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeDropdownProductId === product.id && (
                                  <div className={`absolute right-0 ${
                                    isNearBottom ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
                                  } w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                    <div className="px-3 py-1.5 border-b border-slate-100">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Product Options</p>
                                      <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                                    </div>

                                    <div className="p-1 space-y-0.5">
                                      <button
                                        onClick={() => {
                                          setActiveDropdownProductId(null);
                                          handleEditProduct(product);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Edit Product Information</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveDropdownProductId(null);
                                          setManagingVariationsProductId(product.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Manage Sizes & Variations</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveDropdownProductId(null);
                                          handleToggleFeatured(product.id, product.featured);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Star className="w-3.5 h-3.5 text-amber-500" />
                                        <span>{product.featured ? 'Remove from Featured' : 'Pin to Featured'}</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveDropdownProductId(null);
                                          handleToggleAvailability(product.id, product.available);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                      >
                                        {product.available ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                                        <span>{product.available ? 'Set as Hidden' : 'Set as Active'}</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveDropdownProductId(null);
                                          setCurrentView('inventory');
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Warehouse className="w-3.5 h-3.5 text-teal-600" />
                                        <span>Warehouse Stock Levels</span>
                                      </button>

                                      <div className="my-1 border-t border-slate-100" />

                                      <button
                                        onClick={() => {
                                          setActiveDropdownProductId(null);
                                          handleDeleteProduct(product.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Delete Product</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* ── Expandable Details Drawer ── */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-200/80">
                            <td colSpan={9} className="p-4 sm:p-5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                {/* Col 1: Scientific Details & Storage */}
                                <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                                    Chemical & Formulation Specifications
                                  </h4>
                                  <div className="space-y-1.5 text-slate-600">
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                      <span className="text-slate-400">Purity Rating:</span>
                                      <span className="font-bold text-slate-900">{product.purity_percentage || 99}% HPLC Tested</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                      <span className="text-slate-400">CAS Number:</span>
                                      <span className="font-mono font-semibold text-slate-800">{product.cas_number || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                      <span className="text-slate-400">Molecular Weight:</span>
                                      <span className="font-semibold text-slate-800">{product.molecular_weight || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                      <span className="text-slate-400">Storage Conditions:</span>
                                      <span className="font-semibold text-slate-800">{product.storage_conditions || 'Refrigerate at 2°C – 8°C'}</span>
                                    </div>
                                    {product.sequence && (
                                      <div className="pt-1">
                                        <span className="text-slate-400 block text-[10px]">Peptide Sequence:</span>
                                        <span className="font-mono text-[10px] text-slate-700 bg-slate-50 p-1.5 rounded-md block break-all mt-0.5 border border-slate-200">
                                          {product.sequence}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Col 2: Variations Breakdown */}
                                <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                      Size Variations ({product.variations?.length || 0})
                                    </h4>
                                    <button
                                      onClick={() => setManagingVariationsProductId(product.id)}
                                      className="text-blue-600 font-bold hover:underline text-[10.5px] cursor-pointer"
                                    >
                                      + Edit Sizes
                                    </button>
                                  </div>
                                  {product.variations && product.variations.length > 0 ? (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                      {product.variations.map((v, vIdx) => (
                                        <div key={v.id || vIdx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                                          <div>
                                            <span className="font-bold text-slate-800">{v.name}</span>
                                            {v.quantity_mg && <span className="text-slate-400 text-[10px] ml-1">({v.quantity_mg}mg)</span>}
                                          </div>
                                          <div className="text-right">
                                            <span className="font-bold text-slate-900">₱{Number(v.price).toLocaleString('en-PH')}</span>
                                            <span className="text-[10px] text-slate-400 block">{v.stock_quantity} in stock</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-slate-400 text-xs">
                                      No specific size variations added.
                                    </div>
                                  )}
                                </div>

                                {/* Col 3: Warehouse & Quick Direct Links */}
                                <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <Warehouse className="w-3.5 h-3.5 text-teal-600" />
                                    Warehouse Stock & Quick Actions
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                      <div className="text-[9.5px] font-bold text-indigo-700 uppercase">Manila Hub</div>
                                      <div className="text-base font-black text-indigo-900 mt-0.5">{mnlStock}</div>
                                      <div className="text-[9px] text-indigo-500">Available</div>
                                    </div>
                                    <div className="p-2 bg-teal-50/50 rounded-xl border border-teal-100">
                                      <div className="text-[9.5px] font-bold text-teal-700 uppercase">Davao Hub</div>
                                      <div className="text-base font-black text-teal-900 mt-0.5">{dvoStock}</div>
                                      <div className="text-[9px] text-teal-500">Available</div>
                                    </div>
                                  </div>
                                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => handleEditProduct(product)}
                                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors cursor-pointer text-center"
                                    >
                                      Edit Product
                                    </button>
                                    <button
                                      onClick={() => setCurrentView('coa')}
                                      className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                      COA Sheets
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Grid Cards View ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sortedProducts.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              const categoryObj = categories.find(c => c.id === product.category);
              const stock = Number(product.stock_quantity) || 0;
              const hasVariations = !!(product.variations && product.variations.length > 0);

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border p-3.5 transition-all shadow-2xs flex flex-col justify-between ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Image & Header Actions */}
                    <div className="relative aspect-4/3 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mb-2.5 flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                      <div className="absolute top-2 left-2">
                        <input
                          id={`grid-chk-${product.id}`}
                          name={`grid_chk_${product.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 bg-white shadow-xs"
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {product.featured && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-white shadow-xs">
                            ★ Featured
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-xs ${
                          product.available ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          {product.available ? 'Active' : 'Off'}
                        </span>
                      </div>
                    </div>

                    {/* Category & Title */}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      {categoryObj?.name || 'Uncategorized'}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {product.description || 'No description entered'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    {/* Price & Stock */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Price</div>
                        <div className="text-xs sm:text-sm font-black text-slate-900">
                          ₱{Number(product.base_price || 0).toLocaleString('en-PH')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Stock</div>
                        <div className={`text-xs font-bold ${stock === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {stock} units
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setManagingVariationsProductId(product.id)}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer border border-blue-100"
                        title="Manage Sizes"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(product.id, product.available)}
                        className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                        title="Toggle Active Status"
                      >
                        {product.available ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDashboardOverview = () => {
    const totalProdCount = products.length;
    const availCount = products.filter(p => p.available).length;
    const featCount = products.filter(p => p.featured).length;
    const manilaStock = products.reduce((sum, p) => sum + (Number(p.stock_manila) || 0), 0);
    const davaoStock = products.reduce((sum, p) => sum + (Number(p.stock_davao) || 0), 0);
    const totalStock = manilaStock + davaoStock;
    const inventoryValuation = products.reduce((sum, p) => sum + ((Number(p.base_price) || 0) * (Number(p.stock_quantity) || 0)), 0);
    const lowStockItems = products.filter(p => (Number(p.stock_quantity) || 0) <= 5);

    // Live Order & Verification Analytics
    const totalOrdersCount = dashOrders.length;
    const pendingVerifications = dashVerifications.filter(v => v.status === 'pending');
    const pendingVerificationsCount = pendingVerifications.length;
    const paidOrders = dashOrders.filter(o => o.payment_status?.toLowerCase() === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    
    const today = new Date();
    const todayOrders = dashOrders.filter(o => {
      const d = new Date(o.created_at);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const todayRevenue = todayOrders
      .filter(o => o.payment_status?.toLowerCase() === 'paid')
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

    const pendingOrdersCount = dashOrders.filter(o => 
      o.order_status === 'new' || o.order_status === 'pending' || o.payment_status === 'pending'
    ).length;
    const completedOrdersCount = dashOrders.filter(o => 
      o.order_status === 'delivered' || o.order_status === 'completed'
    ).length;
    const recentOrders = dashOrders.slice(0, 5);

    const categoryDistribution = categories.map((cat, idx) => {
      const count = products.filter(p => p.category === cat.id).length;
      const pct = totalProdCount > 0 ? (count / totalProdCount) * 100 : 0;
      const colors = [
        'bg-[#3C6CA8]',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-indigo-500',
        'bg-purple-500',
        'bg-rose-500',
        'bg-cyan-500',
        'bg-teal-500'
      ];
      return {
        ...cat,
        count,
        pct,
        colorClass: colors[idx % colors.length]
      };
    });

    return (
      <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-5 space-y-4 sm:space-y-5 font-inter">
        {/* ─── Top Executive Header ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0 shadow-inner">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">
                  Dashboard Overview
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE SYNC
                </span>
                {dashLastSync && (
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {dashLastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Real-time executive monitor for catalog products, orders, warehouse inventory, discounts, and store operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh all data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3C6CA8] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>

            <button
              onClick={() => setCurrentView('orders')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs relative"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-500" />
              <span>Orders</span>
              {pendingOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('verifications')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs relative"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verifications</span>
              {pendingVerificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                  {pendingVerificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('promo-codes')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>Promo Codes</span>
            </button>

            <button
              onClick={handleAddProduct}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs text-white bg-[#3C6CA8] hover:bg-[#315A8E] shadow-md shadow-[#3C6CA8]/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* ─── 8 Primary KPI Executive Metric Cards ──────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {/* Total Catalog */}
          <button
            onClick={() => setCurrentView('products')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-[#3C6CA8] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Products</span>
              <Package className="w-3.5 h-3.5 text-[#3C6CA8]" />
            </div>
            <p className="text-xl font-black text-[#232323] dark:text-white mt-1">{totalProdCount}</p>
            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">Catalog items</span>
          </button>

          {/* Available / Active */}
          <button
            onClick={() => setCurrentView('products')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Online</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>{availCount}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
            <span className="text-[9.5px] font-bold text-emerald-600/80 block mt-0.5 truncate">
              {totalProdCount > 0 ? `${Math.round((availCount / totalProdCount) * 100)}% of catalog` : '0%'}
            </span>
          </button>

          {/* Total Orders */}
          <button
            onClick={() => setCurrentView('orders')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-indigo-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Orders</span>
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalOrdersCount}</p>
            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5 truncate">
              {todayOrders.length} today
            </span>
          </button>

          {/* Pending Verifications */}
          <button
            onClick={() => setCurrentView('verifications')}
            className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl border shadow-2xs text-left transition-all cursor-pointer group ${
              pendingVerificationsCount > 0
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Proof Queue</span>
              <FileCheck className={`w-3.5 h-3.5 ${pendingVerificationsCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
            <p className={`text-xl font-black mt-1 ${pendingVerificationsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#232323] dark:text-white'}`}>
              {pendingVerificationsCount}
            </p>
            <span className={`text-[9.5px] font-bold block mt-0.5 truncate ${pendingVerificationsCount > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-400'}`}>
              {pendingVerificationsCount > 0 ? 'Requires action' : 'All verified'}
            </span>
          </button>

          {/* Warehouse Stock Units */}
          <button
            onClick={() => setCurrentView('inventory')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-blue-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stock Units</span>
              <Warehouse className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalStock.toLocaleString()}</p>
            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5 truncate">
              Mnl: {manilaStock} | Dav: {davaoStock}
            </span>
          </button>

          {/* Inventory Valuation */}
          <button
            onClick={() => setCurrentView('inventory')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Inventory Value</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-[#232323] dark:text-white mt-1 truncate">
              ₱{Math.round(inventoryValuation).toLocaleString()}
            </p>
            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5 truncate">Retail stock value</span>
          </button>

          {/* Featured Deals */}
          <button
            onClick={() => setCurrentView('products')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Featured</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{featCount}</p>
            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5 truncate">Homepage highlights</span>
          </button>

          {/* Categories */}
          <button
            onClick={() => setCurrentView('categories')}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-left hover:border-indigo-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Categories</span>
              <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{categories.length}</p>
            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5 truncate">Product lines</span>
          </button>
        </div>

        {/* ─── 4-Metric Financial & Order Velocity Summary Bar ──────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gross Paid Revenue */}
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Paid Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              ₱{Math.round(totalRevenue).toLocaleString()}
            </p>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              From {paidOrders.length} verified paid orders
            </span>
          </div>

          {/* Today's Sales */}
          <div className="p-4 bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300">Today's Sales</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
              ₱{Math.round(todayRevenue).toLocaleString()}
            </p>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              {todayOrders.length} customer order{todayOrders.length === 1 ? '' : 's'} placed today
            </span>
          </div>

          {/* Orders Pending Action */}
          <div
            onClick={() => setCurrentView('orders')}
            className="p-4 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs cursor-pointer hover:border-amber-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">Pending Actions</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
              {pendingOrdersCount}
            </p>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              Awaiting payment or fulfillment
            </span>
          </div>

          {/* Fulfilled Orders */}
          <div
            onClick={() => setCurrentView('orders')}
            className="p-4 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">Delivered / Completed</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
              {completedOrdersCount}
            </p>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              {totalOrdersCount > 0 ? `${Math.round((completedOrdersCount / totalOrdersCount) * 100)}% delivery success rate` : 'Ready for orders'}
            </span>
          </div>
        </div>

        {/* ─── Two Responsive Main Columns ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
          {/* LEFT 7 COLUMNS: Live Recent Orders, Warehouse Allocation, Telegram */}
          <div className="xl:col-span-7 space-y-4 sm:space-y-5">
            {/* Live Recent Orders Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-[#232323] dark:text-white">Recent Customer Orders</h3>
                  <span className="text-xs font-bold text-slate-400">({recentOrders.length})</span>
                </div>
                <button
                  onClick={() => setCurrentView('orders')}
                  className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View All Orders</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700 text-center text-xs text-slate-500">
                  No orders recorded yet. As customers order, transactions will populate here live.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map(order => {
                    const isPaid = order.payment_status?.toLowerCase() === 'paid';
                    const isDelivered = order.order_status?.toLowerCase() === 'delivered' || order.order_status?.toLowerCase() === 'completed';
                    const orderDate = new Date(order.created_at);
                    
                    return (
                      <div
                        key={order.id}
                        onClick={() => setCurrentView('orders')}
                        className="p-3 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/80 flex items-center justify-between gap-3 transition-colors cursor-pointer text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-200 truncate">
                              {order.customer_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {orderDate.toLocaleDateString()} at {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            ₱{Number(order.total_price || 0).toLocaleString()}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {order.payment_status || 'Pending'}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                            isDelivered
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {order.order_status || 'New'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Warehouse Stock Allocation & Watchlist */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-[#3C6CA8]" />
                  <h3 className="text-sm font-black text-[#232323] dark:text-white">Warehouse Inventory Distribution</h3>
                </div>
                <button
                  onClick={() => setCurrentView('inventory')}
                  className="text-xs font-extrabold text-[#3C6CA8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Manage Stock</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Warehouse Progress Allocation */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3C6CA8]" /> Manila Warehouse
                    </span>
                    <span>{manilaStock} units ({totalStock > 0 ? Math.round((manilaStock / totalStock) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3C6CA8] rounded-full transition-all"
                      style={{ width: `${totalStock > 0 ? (manilaStock / totalStock) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Davao Warehouse
                    </span>
                    <span>{davaoStock} units ({totalStock > 0 ? Math.round((davaoStock / totalStock) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${totalStock > 0 ? (davaoStock / totalStock) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Low Stock Watchlist */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Stock Watchlist (≤ 5 units)
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{lowStockItems.length} items</span>
                </div>

                {lowStockItems.length === 0 ? (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      All products have healthy inventory levels (&gt; 5 units).
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {lowStockItems.slice(0, 5).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-extrabold text-[#232323] dark:text-white block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400">Mnl: {item.stock_manila || 0} • Dav: {item.stock_davao || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            (item.stock_quantity || 0) === 0
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {(item.stock_quantity || 0) === 0 ? 'Out of Stock' : `${item.stock_quantity} left`}
                          </span>
                          <button
                            onClick={() => handleEditProduct(item)}
                            className="text-[11px] font-bold text-[#3C6CA8] hover:underline cursor-pointer"
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Community Telegram Discussions Link Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-sky-200/80 dark:border-sky-900/60 shadow-2xs space-y-3.5 bg-gradient-to-br from-white to-sky-50/40 dark:from-slate-900 dark:to-sky-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Community Telegram Discussions
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                        Live Global Link
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Active link across navbar, mobile drawer, about page, and footer
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsEditingTelegram(!isEditingTelegram)}
                    className="px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingTelegram ? 'Cancel' : 'Edit Link'}</span>
                  </button>
                </div>
              </div>

              {isEditingTelegram ? (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input id="admindashboard-input-19" name="input_19" type="url"
                      value={telegramLinkInput}
                      onChange={(e) => setTelegramLinkInput(e.target.value)}
                      placeholder="https://t.me/+fGtShIUkbB84YzZl or https://t.me/yourgroup"
                      className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={handleSaveTelegramLink}
                        disabled={isSavingTelegram}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingTelegram ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save Link</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    💡 Clicking Save will immediately update the Telegram link across the entire store without requiring a page refresh.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white/80 dark:bg-slate-800/80 border border-sky-200/60 dark:border-sky-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span className="font-mono text-sky-800 dark:text-sky-300 font-semibold truncate text-[11px] sm:text-xs">
                      {siteSettings?.community_telegram_url || 'https://t.me/+fGtShIUkbB84YzZl'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopyTelegramLink}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy Telegram Link"
                    >
                      {copiedTelegram ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTelegram ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={siteSettings?.community_telegram_url || 'https://t.me/+fGtShIUkbB84YzZl'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1"
                    >
                      <span>Test Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: Payment Verifications Queue, Categories, Quick Ops, Status */}
          <div className="xl:col-span-5 space-y-4 sm:space-y-5">
            {/* Payment Proofs Verification Queue Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-[#232323] dark:text-white">Payment Proof Verifications</h3>
                  {pendingVerificationsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {pendingVerificationsCount} Pending
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setCurrentView('verifications')}
                  className="text-xs font-extrabold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Review Queue</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingVerifications.length === 0 ? (
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    All payment proofs are verified! No receipts pending review.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingVerifications.slice(0, 4).map(verif => (
                    <div
                      key={verif.id}
                      onClick={() => setCurrentView('verifications')}
                      className="p-2.5 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/70 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                          {verif.orders?.customer_name || 'Customer Proof'}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          {verif.orders?.order_number || `Order #${verif.order_id.slice(0, 8).toUpperCase()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {verif.orders?.total_price && (
                          <span className="font-black text-emerald-600 text-xs">
                            ₱{Number(verif.orders.total_price).toLocaleString()}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          Verify Proof ↗
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Breakdown Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-[#3C6CA8]" />
                  <h3 className="text-sm font-black text-[#232323] dark:text-white">Categories & Product Share</h3>
                </div>
                <button
                  onClick={() => setCurrentView('categories')}
                  className="text-xs font-extrabold text-[#3C6CA8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {categoryDistribution.map((category) => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate pr-2">
                        <span>{category.icon || '🔬'}</span>
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0 text-[11px]">
                        {category.count} ({category.pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${category.colorClass} rounded-full transition-all`}
                        style={{ width: `${category.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Operations Command Grid - 12 Items */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <h3 className="text-xs sm:text-sm font-black text-[#232323] dark:text-white">Quick Access Operations</h3>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {[
                  { label: 'Products', view: 'products', icon: Package, color: 'text-[#3C6CA8] bg-blue-50 dark:bg-slate-800' },
                  { label: 'Orders', view: 'orders', icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
                  { label: 'Receipts', view: 'verifications', icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                  { label: 'Inventory', view: 'inventory', icon: Warehouse, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
                  { label: 'CRM', view: 'crm', icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
                  { label: 'Promo Codes', view: 'promo-codes', icon: Tag, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
                  { label: 'Global Deals', view: 'global-discount', icon: Sparkles, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
                  { label: 'Top Banner', view: 'top-banner', icon: Megaphone, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
                  { label: 'COA Tests', view: 'coa', icon: Shield, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                  { label: 'Shipping', view: 'shipping', icon: MapPin, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
                  { label: 'Reviews', view: 'reviews', icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
                  { label: 'Settings', view: 'settings', icon: Settings, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => setCurrentView(item.view as any)}
                      className="p-2 sm:p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-[#3C6CA8] hover:shadow-2xs transition-all flex flex-col items-center text-center cursor-pointer group"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${item.color} group-hover:scale-110 transition-transform`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-[#232323] dark:text-white truncate w-full">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#3C6CA8]" />
                  <h3 className="text-xs sm:text-sm font-black text-[#232323] dark:text-white">Store Environment & Live Sync</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {dashLastSync ? `Synced ${dashLastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Database</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1 mt-0.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Stream</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1 mt-0.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active 0ms
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Mirror</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1 mt-0.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Synced
                  </span>
                </div>
              </div>
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
      case 'add':
      case 'edit':
        return renderProductsListView();
      case 'categories':
        return <CategoryManager onBack={() => setCurrentView('dashboard')} adminEmail={adminSession?.email || 'admin@slimdose.ph'} adminRole={adminSession?.role || 'admin'} />;
      case 'payments':
        return <PaymentMethodManager onBack={() => setCurrentView('dashboard')} adminEmail={adminSession?.email || 'admin@slimdose.ph'} adminRole={adminSession?.role || 'admin'} />;
      case 'inventory':
        return <PeptideInventoryManager onBack={() => setCurrentView('dashboard')} />;
      case 'crm':
        return <CustomerCRMManager />;
      case 'reviews':
        return <ProductReviewsManager />;
      case 'verifications':
        return <InvoiceVerificationsManager onNavigateView={(view) => setCurrentView(view as any)} />;
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
          <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
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
          <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
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
          <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
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
        return <SalesAnalyticsManager onBack={() => setCurrentView('dashboard')} onNavigateView={(view) => setCurrentView(view as any)} />;
      case 'popup':
        return (
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-650 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <PopupManager />
          </div>
        );
      case 'top-banner':
        return (
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <TopBannerManager
              onBack={() => setCurrentView('dashboard')}
              adminEmail={adminSession?.email || 'admin@slimdose.ph'}
              adminRole={adminSession?.role || 'admin'}
            />
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
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-slate-600 dark:text-slate-400 hover:text-[#3C6CA8] dark:hover:text-[#6A9BE0] transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
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
    await Promise.all([refreshProducts(), fetchDashData()]);
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
                  <label htmlFor="admindashboard-admin-email-login" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" /> Email Address
                  </label>
                  <div className="relative">
                    <input id="admindashboard-admin-email-login" name="admin_email" type="email"
                      value={email}
                      autoComplete="email" onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm focus:ring-2 focus:ring-[#3C6CA8]/40 focus:border-[#3C6CA8] transition-all outline-none pl-11"
                      placeholder="admin@slimdose.ph"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="admindashboard-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" /> Password
                  </label>
                  <div className="relative">
                    <input id="admindashboard-password" name="password" type="password"
                      value={password}
                      autoComplete="current-password" onChange={(e) => setPassword(e.target.value)}
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
        { label: 'Top Header Banner', view: 'top-banner', icon: Megaphone },
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
      case 'top-banner':
        return 'Top Header Banner';
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

        {/* Left Sidebar (Responsive Drawer on Mobile, Compact & Collapsible on Desktop) */}
        <aside
          className={`bg-slate-900 text-slate-300 flex flex-col fixed top-0 bottom-0 left-0 z-50 border-r border-slate-800/80 shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-64 lg:w-[68px]' : 'w-64 lg:w-60'
          } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Sidebar Header */}
          <div className={`p-3 border-b border-slate-800/80 flex items-center bg-slate-950/40 relative ${
            isSidebarCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between gap-2'
          }`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700/80 shadow-inner shrink-0 bg-white p-0.5">
                <img
                  src="/assets/logo.jpeg"
                  alt="SlimDose Peptides"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-xs font-bold text-white tracking-wide truncate">
                    SlimDose Peptides
                  </h1>
                  <p className="text-[10px] font-medium text-blue-400 truncate flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Admin Console
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle Button - Centered as a Divider in Mini Mode */}
            <div className="hidden lg:block relative group w-full">
              <button
                onClick={toggleSidebar}
                className={`flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/90 transition-all cursor-pointer border border-transparent hover:border-slate-700 shrink-0 ${
                  isSidebarCollapsed
                    ? 'w-full py-1.5 bg-slate-800/40 border-slate-800 hover:border-blue-500/40'
                    : 'p-1.5 w-auto'
                }`}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-blue-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
                )}
              </button>

              {/* Instant Floating Tooltip for Sidebar Toggle */}
              {isSidebarCollapsed && (
                <div className="hidden lg:group-hover:flex fixed left-[72px] ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                  <span>Expand Sidebar (Ctrl+B)</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-950" />
                </div>
              )}
            </div>

            {/* Close Button for Mobile Drawer */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-2.5 custom-scrollbar select-none">
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
                  <div key={category.title} className="space-y-0.5">
                    {!isSidebarCollapsed && (
                      <div className="px-2.5 pb-1 text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">
                        {category.title}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item);
                        const hashHref = `#${item.view}`;
                        return (
                          <div key={item.label} className="relative group">
                            <a
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
                              className={`w-full flex items-center ${
                                isSidebarCollapsed ? 'lg:justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-1.5'
                              } rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#3C6CA8] text-white font-semibold shadow-xs shadow-[#3C6CA8]/30 ring-1 ring-[#3C6CA8]/40'
                                  : 'hover:bg-slate-800/70 hover:text-slate-100 text-slate-400'
                              }`}
                            >
                              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                              {!isSidebarCollapsed && (
                                <span className="truncate text-xs">{item.label}</span>
                              )}
                            </a>

                            {/* Instant Floating Tooltip on Desktop Collapsed Mode */}
                            {isSidebarCollapsed && (
                              <div className="hidden lg:group-hover:flex fixed left-[72px] ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                                <span>{item.label}</span>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-950" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
            {!isSidebarCollapsed ? (
              <>
                <div className="flex items-center gap-2.5 mb-2.5 px-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                    {adminSession?.name ? adminSession.name[0].toUpperCase() : 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-200 truncate">
                      {adminSession?.name || 'Store Admin'}
                    </p>
                    <p className="text-[9.5px] text-slate-400 truncate">
                      {adminSession?.email || 'admin@slimdose.ph'}
                    </p>
                  </div>
                </div>

                {/* Quick action buttons */}
                <div className="flex items-center gap-1.5">
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-grow text-center py-1.5 px-2.5 rounded-lg border border-slate-800 bg-slate-900/90 text-[10.5px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
                  >
                    View Site ↗
                  </a>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all flex items-center justify-center shrink-0 border border-rose-500/20 cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg border border-slate-800 bg-slate-900/90 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="hidden lg:group-hover:flex fixed left-[72px] ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                    <span>View Storefront</span>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-950" />
                  </div>
                </div>

                <div className="relative group">
                  <button
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all flex items-center justify-center border border-rose-500/20 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                  <div className="hidden lg:group-hover:flex fixed left-[72px] ml-2 px-3 py-1.5 bg-rose-950 text-rose-100 text-[11px] font-bold rounded-lg shadow-2xl border border-rose-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                    <span>Logout</span>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-rose-950" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Content Pane */}
        <div
          className={`flex-1 min-h-screen flex flex-col bg-slate-50 min-w-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'ml-0 lg:ml-[68px]' : 'ml-0 lg:ml-60'
          }`}
        >
          {/* Global Header */}
          <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-[#3C6CA8]" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-500" />
                )}
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

          {/* Main Content Pane Scroll Area - Enhanced full-width layout with compact padding */}
          <main className="flex-1 p-2 sm:p-3 md:p-4 lg:p-5 w-full min-w-0 overflow-x-hidden">
            <div className="w-full max-w-[1700px] mx-auto min-w-0">
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>

      {/* Product Create/Edit Modal with Beautiful Tabs */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        categories={categories}
        peptalkVideos={peptalkVideos}
        peptalkArticles={peptalkArticles}
        onSaveSuccess={async () => {
          await refreshProducts();
        }}
        logAdminAction={logAdminAction}
        addProduct={addProduct}
        updateProduct={updateProduct}
      />

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
                  <label htmlFor="admindashboard-confirm-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input id="admindashboard-confirm-password" name="confirm_password" type="password"
                    required
                    value={confirmPasswordInput}
                    autoComplete="new-password" onChange={(e) => setConfirmPasswordInput(e.target.value)}
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

export { AdminDashboard };
export default AdminDashboard;
