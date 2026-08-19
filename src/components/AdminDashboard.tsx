import React, { useEffect, useState, useMemo, Suspense, lazy } from 'react';
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
import type { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useMenuContext } from '../contexts/MenuContext';
import { useCategories } from '../hooks/useCategories';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { fireToast } from './ToastNotification';
import { liveScrapedOrders } from '../data/liveScrapedOrders';

// Dynamic code-split lazy imports for all admin panel submodules
const CategoryManager = lazy(() => import('./CategoryManager'));
const PaymentMethodManager = lazy(() => import('./PaymentMethodManager'));
const VariationManager = lazy(() => import('./VariationManager'));
const COAManager = lazy(() => import('./COAManager'));
const PeptideInventoryManager = lazy(() => import('./PeptideInventoryManager'));
const OrdersManager = lazy(() => import('./OrdersManager'));
const FAQManager = lazy(() => import('./FAQManager'));
const ShippingManager = lazy(() => import('./ShippingManager'));
const SiteSettingsManager = lazy(() => import('./SiteSettingsManager'));
const PromoCodeManager = lazy(() => import('./PromoCodeManager'));
const GlobalDiscountManager = lazy(() => import('./GlobalDiscountManager'));
const GuideManager = lazy(() => import('./GuideManager'));
const SalesAnalyticsManager = lazy(() => import('./SalesAnalyticsManager'));
const PopupManager = lazy(() => import('./PopupManager'));
const PageContentsManager = lazy(() => import('./PageContentsManager').then(m => ({ default: m.PageContentsManager })));
const CustomerCRMManager = lazy(() => import('./CustomerCRMManager'));
const ProductReviewsManager = lazy(() => import('./ProductReviewsManager'));
const InvoiceVerificationsManager = lazy(() => import('./InvoiceVerificationsManager'));
const PeptalkVideosManager = lazy(() => import('./PeptalkVideosManager'));
const RestockRemindersManager = lazy(() => import('./RestockRemindersManager'));
const TopBannerManager = lazy(() => import('./TopBannerManager'));
const ProductModal = lazy(() => import('./ProductModal'));

const AdminSectionSkeleton: React.FC = () => (
  <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
    <div className="w-11 h-11 rounded-2xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] mb-3 animate-pulse">
      <RefreshCw className="w-5 h-5 animate-spin text-[#3C6CA8]" />
    </div>
    <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded-full mb-2 animate-pulse" />
    <div className="h-3 w-64 bg-slate-100 dark:bg-slate-850 rounded-full animate-pulse" />
  </div>
);


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
  const [mobileMenuSearch, setMobileMenuSearch] = useState('');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };
  const { products, loading, addProduct, updateProduct, deleteProduct, deleteMultipleProducts, refreshProducts } = useMenuContext();
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

    const handleHash = (rawHash: string) => {
      const hash = rawHash.replace('#', '');
      if (!hash) return;
      
      const gatedViews = ['analytics', 'payments'];
      if (gatedViews.includes(hash)) {
        let isUnlocked = false;
        try {
          isUnlocked = sessionStorage.getItem(`section_gate_unlocked_${hash}`) === '1';
        } catch {}
        if (!isUnlocked) {
          setPendingViewChange(hash as any);
          setConfirmPasswordInput('');
          setConfirmPasswordError('');
          setIsPasswordConfirmOpen(true);
          return;
        }
      }
      setCurrentView(hash as any);
    };

    const initialHash = window.location.hash;
    if (initialHash) {
      handleHash(initialHash);
    }

    const handleHashChange = () => {
      handleHash(window.location.hash);
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
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<boolean>(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [confirmPasswordCallback, setConfirmPasswordCallback] = useState<(() => void) | null>(null);

  // Fixed gate password for Sales Analytics & Payment Methods
  const SECTION_GATE_PASSWORD = '123456#';
  // Per-view session key so each protected section requires its own unlock
  const sectionGateKey = (view: string) => `section_gate_unlocked_${view}`;

  const isSensitiveSessionValid = () => {
    // Check if the pending view has already been unlocked this session
    if (pendingViewChange) {
      try {
        return sessionStorage.getItem(sectionGateKey(pendingViewChange)) === '1';
      } catch {
        return false;
      }
    }
    return false;
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

  const handlePasswordConfirmCancel = () => {
    const wasViewChange = pendingViewChange !== null;
    setIsPasswordConfirmOpen(false);
    setConfirmPasswordCallback(null);
    setPendingViewChange(null);
    setPendingDeleteProduct(null);
    setPendingBulkDelete(false);
    setConfirmPasswordInput('');
    setConfirmPasswordError('');
    if (wasViewChange) {
      setCurrentView('dashboard');
      try {
        window.location.hash = 'dashboard';
      } catch {}
    }
  };

  useEffect(() => {
    if (!isPasswordConfirmOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlePasswordConfirmCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPasswordConfirmOpen, pendingViewChange]);

  const handlePasswordConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmPasswordError('');
    setIsProcessing(true);
    try {
      // Check fixed section gate password
      const isValid = confirmPasswordInput === SECTION_GATE_PASSWORD;
      if (isValid) {
        // 1. Single product deletion
        if (pendingDeleteProduct) {
          const productToDelete = pendingDeleteProduct;
          const id = productToDelete.id;
          const confirmName = productToDelete.name ? `"${productToDelete.name}"` : 'product';
          
          setManagingVariationsProductId(null);
          const result = await deleteProduct(id);
          if (result.success) {
            logAdminAction('delete_product', { id, name: productToDelete.name, data: productToDelete });
            setSelectedProducts(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            fireToast(`Product ${confirmName} permanently deleted`, 'success');
            setIsPasswordConfirmOpen(false);
            setPendingDeleteProduct(null);
            setConfirmPasswordInput('');
            setConfirmPasswordError('');
          } else {
            setConfirmPasswordError(result.error || 'Failed to delete product.');
          }
          return;
        }

        // 2. Bulk products deletion
        if (pendingBulkDelete) {
          const count = selectedProducts.size;
          const idsArray = Array.from(selectedProducts);
          setManagingVariationsProductId(null);
          const result = await deleteMultipleProducts(idsArray);
          if (result.success) {
            logAdminAction('bulk_delete_products', { count, ids: idsArray });
            setSelectedProducts(new Set());
            fireToast(`Successfully deleted ${count} product(s)`, 'success');
            setIsPasswordConfirmOpen(false);
            setPendingBulkDelete(false);
            setConfirmPasswordInput('');
            setConfirmPasswordError('');
          } else {
            setConfirmPasswordError(result.error || 'Failed to delete selected products.');
          }
          return;
        }

        // 3. View change
        const targetView = pendingViewChange;
        if (targetView) {
          try { sessionStorage.setItem(sectionGateKey(targetView), '1'); } catch {}
        }
        setIsPasswordConfirmOpen(false);
        setConfirmPasswordInput('');
        setConfirmPasswordError('');
        if (confirmPasswordCallback) {
          confirmPasswordCallback();
          setConfirmPasswordCallback(null);
        } else if (targetView) {
          setCurrentView(targetView);
          try { window.location.hash = targetView; } catch {}
          setPendingViewChange(null);
        }
      } else {
        setConfirmPasswordError('Incorrect password. Access strictly denied.');
      }
    } catch (err: any) {
      setConfirmPasswordError(err?.message || 'An error occurred. Please try again.');
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
        setCurrentView('dashboard');
        try { window.location.hash = 'dashboard'; } catch {}
        return;
      }
    }

    // Password gate — only for analytics and payments
    const gatedViews = ['analytics', 'payments'];
    if (gatedViews.includes(view)) {
      // Check if already unlocked this session for this specific view
      let alreadyUnlocked = false;
      try {
        alreadyUnlocked = sessionStorage.getItem(sectionGateKey(view)) === '1';
      } catch {}

      if (!alreadyUnlocked) {
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
      try { window.location.hash = view; } catch {}
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
    <Suspense fallback={null}>
      <VariationManager
        product={variationManagerProduct}
        onClose={() => setManagingVariationsProductId(null)}
      />
    </Suspense>
  ) : null;

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

  const handleDeleteProduct = (id: string) => {
    const productToDelete = products.find(p => String(p.id) === String(id)) || null;
    if (!productToDelete) return;

    setPendingDeleteProduct(productToDelete);
    setPendingBulkDelete(false);
    setPendingViewChange(null);
    setConfirmPasswordCallback(null);
    setConfirmPasswordInput('');
    setConfirmPasswordError('');
    setIsPasswordConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) {
      fireToast('Please select products to delete', 'warning');
      return;
    }

    setPendingBulkDelete(true);
    setPendingDeleteProduct(null);
    setPendingViewChange(null);
    setConfirmPasswordCallback(null);
    setConfirmPasswordInput('');
    setConfirmPasswordError('');
    setIsPasswordConfirmOpen(true);
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
    if (selectedProducts.size > 0 && selectedProducts.size >= products.length) {
      setSelectedProducts(new Set());
      setManagingVariationsProductId(null);
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const renderProductsListView = () => {
    // KPI calculations
    const totalCount = products.length;
    const activeCount = products.filter(p => p.available).length;
    const inactiveCount = totalCount - activeCount;
    const featuredCount = products.filter(p => p.featured).length;
    const getProductRealStock = (p: Product) => {
      const hasVars = !!(p.variations && p.variations.length > 0);
      let s = Number(p.stock_quantity) || 0;
      let m = Number(p.stock_manila) || 0;
      let d = Number(p.stock_davao) || 0;

      if (hasVars && p.variations) {
        const vSum = p.variations.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
        const vMnl = p.variations.reduce((sum, v) => sum + (Number((v as any).stock_manila) || 0), 0);
        const vDvo = p.variations.reduce((sum, v) => sum + (Number((v as any).stock_davao) || 0), 0);
        if (vSum > 0 || s === 0) s = vSum;
        if (vMnl > 0 || vDvo > 0) {
          m = vMnl;
          d = vDvo;
        } else if (s > 0 && m === 0 && d === 0) {
          m = s;
          d = 0;
        }
      } else if (s > 0 && m === 0 && d === 0) {
        m = s;
        d = 0;
      }
      return { total: s, mnl: m, dvo: d };
    };

    const lowStockCount = products.filter(p => {
      const { total } = getProductRealStock(p);
      return total > 0 && total <= 5;
    }).length;
    const outOfStockCount = products.filter(p => getProductRealStock(p).total === 0).length;
    const totalInventoryValue = products.reduce((acc, p) => {
      const { total } = getProductRealStock(p);
      return acc + ((Number(p.base_price) || 0) * total);
    }, 0);
    const manilaStockTotal = products.reduce((sum, p) => sum + getProductRealStock(p).mnl, 0);
    const davaoStockTotal = products.reduce((sum, p) => sum + getProductRealStock(p).dvo, 0);

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
      const stock = getProductRealStock(product).total;
      if (catalogFilterStock === 'low' && (stock === 0 || stock > 5)) return false;
      if (catalogFilterStock === 'out' && stock > 0) return false;

      return true;
    });

    // Sorting logic
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      switch (catalogSortBy) {
        case 'newest': {
          const timeA = Math.max(
            a.updated_at ? new Date(a.updated_at).getTime() : 0,
            a.created_at ? new Date(a.created_at).getTime() : 0
          );
          const timeB = Math.max(
            b.updated_at ? new Date(b.updated_at).getTime() : 0,
            b.created_at ? new Date(b.created_at).getTime() : 0
          );
          if (timeB !== timeA) return timeB - timeA;
          return (a.name || '').localeCompare(b.name || '');
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
          return getProductRealStock(a).total - getProductRealStock(b).total;
        case 'stock-desc':
          return getProductRealStock(b).total - getProductRealStock(a).total;
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
                <option value="newest">Latest / Newest First</option>
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
                    // Calculate real stock across variations or direct product allocations
                    let stock = Number(product.stock_quantity) || 0;
                    let mnlStock = Number(product.stock_manila) || 0;
                    let dvoStock = Number(product.stock_davao) || 0;

                    if (hasVariations && product.variations && product.variations.length > 0) {
                      const totalVarStock = product.variations.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
                      const totalVarMnl = product.variations.reduce((sum, v) => sum + (Number((v as any).stock_manila) || 0), 0);
                      const totalVarDvo = product.variations.reduce((sum, v) => sum + (Number((v as any).stock_davao) || 0), 0);

                      if (totalVarStock > 0 || stock === 0) {
                        stock = totalVarStock;
                      }
                      if (totalVarMnl > 0 || totalVarDvo > 0) {
                        mnlStock = totalVarMnl;
                        dvoStock = totalVarDvo;
                      } else if (stock > 0 && mnlStock === 0 && dvoStock === 0) {
                        mnlStock = stock;
                        dvoStock = 0;
                      }
                    } else if (stock > 0 && mnlStock === 0 && dvoStock === 0) {
                      // Standalone product with total stock entered: assign available units to primary hub (Manila)
                      mnlStock = stock;
                      dvoStock = 0;
                    }

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
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer border border-rose-100"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
                              {order.order_number || (order.id ? `#${String(order.id).slice(0, 8).toUpperCase()}` : '#ORDER')}
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
                          {verif.orders?.order_number || (verif.order_id ? `Order #${String(verif.order_id).slice(0, 8).toUpperCase()}` : 'Order')}
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
        if (typeof window !== 'undefined' && sessionStorage.getItem(sectionGateKey('payments')) !== '1') {
          return (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl text-center space-y-4">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment Methods Protected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                This section is protected by security authentication. Access is strictly denied until authorized.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('dashboard');
                    try { window.location.hash = 'dashboard'; } catch {}
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-655 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('payments')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Authorize Access
                </button>
              </div>
            </div>
          );
        }
        return <PaymentMethodManager onBack={() => { setCurrentView('dashboard'); try { window.location.hash = 'dashboard'; } catch {} }} adminEmail={adminSession?.email || 'admin@slimdose.ph'} adminRole={adminSession?.role || 'admin'} />;
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
        if (typeof window !== 'undefined' && sessionStorage.getItem(sectionGateKey('analytics')) !== '1') {
          return (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl text-center space-y-4">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sales Analytics Protected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                This section is protected by security authentication. Access is strictly denied until authorized.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('dashboard');
                    try { window.location.hash = 'dashboard'; } catch {}
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-655 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('analytics')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Authorize Access
                </button>
              </div>
            </div>
          );
        }
        return <SalesAnalyticsManager onBack={() => { setCurrentView('dashboard'); try { window.location.hash = 'dashboard'; } catch {} }} onNavigateView={(view) => handleViewChange(view as any)} />;
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

  // Dashboard Stats (memoized to prevent layout re-computation)
  const { totalProducts, featuredProducts, availableProducts, categoryCounts } = useMemo(() => {
    return {
      totalProducts: products.length,
      featuredProducts: products.filter(p => p.featured).length,
      availableProducts: products.filter(p => p.available).length,
      categoryCounts: categories.map(cat => ({
        ...cat,
        count: products.filter(p => p.category === cat.id).length
      }))
    };
  }, [products, categories]);

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

  const getItemBadge = (view: string) => {
    switch (view) {
      case 'products':
        return { text: `${products.length}`, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'orders': {
        const orderCount = dashOrders.length > 0 ? dashOrders.length : liveScrapedOrders.length;
        return { text: `${orderCount}`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      }
      case 'verifications': {
        const pendingCount = dashVerifications.filter(v => v.status === 'pending').length;
        return pendingCount > 0 ? { text: `${pendingCount} new`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold' } : null;
      }
      case 'crm':
        return { text: '427', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'inventory': {
        const lowStockCount = products.filter(p => (p.stock_quantity ?? 0) <= 5).length;
        return lowStockCount > 0 ? { text: `${lowStockCount} alert`, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' } : null;
      }
      default:
        return null;
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
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md lg:hidden transition-opacity duration-300"
          />
        )}

        {/* Left Sidebar (Responsive Drawer on Mobile, Compact & Collapsible on Desktop) */}
        <aside
          className={`bg-slate-900 text-slate-300 flex flex-col fixed top-0 bottom-0 left-0 z-50 border-r border-slate-800/80 shadow-2xl transition-all duration-300 ease-in-out w-[290px] sm:w-[320px] max-w-[85vw] ${
            isSidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'
          } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Sidebar Header */}
          <div className={`p-3 sm:p-3.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center ${
            isSidebarCollapsed ? 'lg:flex-col lg:gap-2.5 lg:justify-center justify-between gap-3' : 'justify-between gap-3'
          }`}>
            <div className={`flex items-center gap-3 min-w-0 ${isSidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner shrink-0 bg-white p-0.5">
                <img
                  src="/assets/logo.jpeg"
                  alt="SlimDose Peptides"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className={`min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  SlimDose Peptides
                </h1>
                <p className="text-[10px] font-medium text-blue-400 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Admin Console
                </p>
              </div>
            </div>

            {/* Desktop Collapse Toggle Button */}
            <div className="hidden lg:block relative group">
              <button
                onClick={toggleSidebar}
                className={`flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/90 transition-all cursor-pointer border border-transparent hover:border-slate-700 shrink-0 ${
                  isSidebarCollapsed
                    ? 'w-full py-1.5 bg-slate-800/40 border-slate-800 hover:border-blue-500/40'
                    : 'p-1.5 w-auto'
                }`}
                title={isSidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-blue-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
                )}
              </button>

              {/* Instant Floating Tooltip for Sidebar Toggle on Desktop */}
              {isSidebarCollapsed && (
                <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                  <span>Expand Sidebar (Ctrl+B)</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-950" />
                </div>
              )}
            </div>

            {/* Close Button for Mobile Drawer - Always visible on mobile screens */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              title="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Menu Filter (Visible on Mobile & Expanded Desktop) */}
          <div className={`px-3 pt-3 pb-1 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={mobileMenuSearch}
                onChange={(e) => setMobileMenuSearch(e.target.value)}
                placeholder="Jump to menu..."
                style={{ paddingLeft: '2.35rem', paddingRight: '2rem' }}
                className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all shadow-inner"
              />
              {mobileMenuSearch && (
                <button
                  onClick={() => setMobileMenuSearch('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2.5 space-y-3 custom-scrollbar select-none">
            {(() => {
              const isStaff = adminSession?.role === 'content_editor' || adminSession?.role === 'order_manager';
              const disallowed = ['analytics', 'payments', 'global-discount', 'promo-codes', 'settings', 'popup', 'page-contents'];
              const query = mobileMenuSearch.trim().toLowerCase();

              return menuCategories.map((category) => {
                const filteredItems = category.items.filter(item => {
                  if (isStaff && disallowed.includes(item.view)) return false;
                  if (query && !item.label.toLowerCase().includes(query) && !category.title.toLowerCase().includes(query)) {
                    return false;
                  }
                  return true;
                });

                if (filteredItems.length === 0) return null;

                return (
                  <div key={category.title} className="space-y-1">
                    <div className={`px-3 pt-2 pb-1 text-[9.5px] font-extrabold tracking-wider text-slate-400 uppercase ${
                      isSidebarCollapsed ? 'lg:hidden' : 'block'
                    }`}>
                      {category.title}
                    </div>

                    <div className="space-y-1">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item);
                        const badge = getItemBadge(item.view);
                        const hashHref = `#${item.view}`;
                        return (
                          <div key={item.label} className="relative group">
                            <a
                              href={hashHref}
                              onClick={(e) => {
                                e.preventDefault();
                                if (item.action) {
                                  handleViewChange(item.view, item.action);
                                } else if (item.view) {
                                  handleViewChange(item.view);
                                }
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                                isSidebarCollapsed ? 'lg:gap-0 lg:justify-center lg:px-2 lg:py-2' : 'gap-3 px-2.5 py-2'
                              } ${
                                active
                                  ? 'bg-gradient-to-r from-blue-600 to-[#294E7A] text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40 font-bold'
                                  : 'hover:bg-slate-800/80 hover:text-slate-100 text-slate-300 active:bg-slate-800'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-800/70 text-slate-400 group-hover:bg-blue-600/20 group-hover:text-blue-400'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className={`truncate text-xs flex-1 ${isSidebarCollapsed ? 'lg:hidden' : 'inline'}`}>
                                {item.label}
                              </span>
                              {badge && (
                                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.color} ${isSidebarCollapsed ? 'lg:hidden' : 'inline-block'}`}>
                                  {badge.text}
                                </span>
                              )}
                            </a>

                            {/* Instant Floating Tooltip on Desktop Collapsed Mode */}
                            {isSidebarCollapsed && (
                              <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
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
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm">
            {/* Desktop Collapsed View ONLY */}
            <div className={`hidden ${isSidebarCollapsed ? 'lg:flex' : 'lg:hidden'} flex-col items-center gap-2`}>
              <div className="relative group">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
                  title="View Storefront"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                  <span>View Storefront</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-950" />
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={handleLogout}
                  className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all flex items-center justify-center border border-rose-500/20 cursor-pointer shadow-xs"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-rose-950 text-rose-100 text-[11px] font-bold rounded-lg shadow-2xl border border-rose-700/90 whitespace-nowrap z-[99999] pointer-events-none items-center">
                  <span>Logout</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-rose-950" />
                </div>
              </div>
            </div>

            {/* Mobile (ALWAYS!) and Desktop Expanded View */}
            <div className={`${isSidebarCollapsed ? 'block lg:hidden' : 'block'}`}>
              <div className="flex items-center gap-3 mb-3 px-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-[#1E3A5E] border border-blue-400/30 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-blue-600/20">
                  {adminSession?.name ? adminSession.name[0].toUpperCase() : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {adminSession?.name || 'Store Admin'}
                  </p>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    {adminSession?.email || 'admin@slimdose.ph'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                  {adminSession?.role ? adminSession.role.replace('_', ' ') : 'Admin'}
                </span>
              </div>

              {/* Quick action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
                >
                  <span>Storefront</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                </a>
                <button
                  onClick={handleLogout}
                  className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-rose-500/30 text-xs font-bold cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
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
              <Suspense fallback={<AdminSectionSkeleton />}>
                {renderActiveView()}
              </Suspense>
            </div>
          </main>
        </div>
      </div>

      {/* Product Create/Edit Modal with Beautiful Tabs */}
      {isProductModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Password Confirmation Modal */}
      {isPasswordConfirmOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl transition-all duration-300 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handlePasswordConfirmCancel();
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/10">
            <div className="text-center space-y-4">
              <div className={`w-14 h-14 ${
                pendingDeleteProduct || pendingBulkDelete 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              } rounded-2xl flex items-center justify-center mx-auto border shadow-inner`}>
                {pendingDeleteProduct || pendingBulkDelete ? (
                  <Trash2 className="w-7 h-7" />
                ) : (
                  <Lock className="w-7 h-7" />
                )}
              </div>
              
              <div className="space-y-1.5">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  pendingDeleteProduct || pendingBulkDelete
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                } border`}>
                  {pendingDeleteProduct || pendingBulkDelete ? (
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  {pendingDeleteProduct || pendingBulkDelete ? 'Deletion Authorization' : 'Security Gate'}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {pendingDeleteProduct 
                    ? `Delete Product Authorization` 
                    : pendingBulkDelete 
                    ? `Bulk Deletion Authorization` 
                    : `🔒 ${pendingViewChange === 'analytics' ? 'Sales Analytics' : pendingViewChange === 'payments' ? 'Payment Methods' : 'Restricted Section'}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  {pendingDeleteProduct ? (
                    <>
                      Confirm permanent deletion of <span className="font-bold text-slate-800 dark:text-slate-200">"{pendingDeleteProduct.name}"</span>. Enter the Access Password to authorize this deletion.
                    </>
                  ) : pendingBulkDelete ? (
                    <>
                      Confirm permanent deletion of <span className="font-bold text-slate-800 dark:text-slate-200">{selectedProducts.size} selected products</span>. Enter the Access Password to authorize.
                    </>
                  ) : (
                    'This section is strictly protected. Enter the section authorization password to access this data.'
                  )}
                </p>
              </div>

              <form onSubmit={handlePasswordConfirmSubmit} className="space-y-4 pt-1 text-left">
                <div>
                  <label htmlFor="admindashboard-confirm-password" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {pendingDeleteProduct || pendingBulkDelete ? 'Access Password to Confirm Deletion' : 'Section Authorization Password'}
                  </label>
                  <div className="relative">
                    <input 
                      id="admindashboard-confirm-password" 
                      name="confirm_password" 
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={confirmPasswordInput}
                      autoComplete="new-password" 
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Enter access password"
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {confirmPasswordError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-600 dark:text-rose-400 font-semibold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{confirmPasswordError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePasswordConfirmCancel}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`flex-1 py-2.5 rounded-xl ${
                      pendingDeleteProduct || pendingBulkDelete
                        ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/25'
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/25'
                    } text-white font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5`}
                  >
                    {isProcessing ? (
                      'Processing...'
                    ) : pendingDeleteProduct || pendingBulkDelete ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Authorize & Delete</span>
                      </>
                    ) : (
                      'Verify & Enter'
                    )}
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
