import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, ShoppingBag, MapPin, Phone, Mail, LogOut, CheckCircle, Clock,
  Package, Truck, Loader2, Save, LayoutDashboard, Heart, Bell, HelpCircle,
  Shield, Settings, ChevronDown, ChevronRight, Search, Filter, Download,
  RefreshCw, AlertTriangle, Star, Eye, RotateCcw, XCircle, ArrowRight,
  Plus, Trash2, Edit3, Check, AlertCircle, Lock, Smartphone, Globe,
  MessageSquare, Send, ChevronUp, Info, BarChart2, CreditCard, Home,
  Building2, Navigation, Copy, ExternalLink, Zap, BadgeCheck, Sparkles,
  ToggleLeft, ToggleRight, Camera, EyeOff, ShieldCheck, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

import { demoProducts } from '../data/demoProducts';

// ─── Product Image Lookup Helper ───────────────────────────────────────────
const getProductImageFallback = (item: any): string | null => {
  if (item?.image_url) return item.image_url;
  if (item?.image) return item.image;
  if (item?.product?.image_url) return item.product.image_url;
  if (item?.product?.image) return item.product.image;

  const rawName = item?.product_name || item?.name || item?.product?.name || '';
  if (!rawName) return null;
  const nameLower = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const match = demoProducts.find(p => {
    const pName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pSlug = p.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    return pName.includes(nameLower) || nameLower.includes(pName) || pSlug.includes(nameLower) || nameLower.includes(pSlug);
  });

  return match?.image_url || null;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomerDashboardProps {
  customer: any;
  onClose: () => void;
  onLogout: () => void;
}

type TabId = 'dashboard' | 'profile' | 'orders' | 'wishlist' | 'addresses' | 'notifications' | 'support' | 'security' | 'preferences';

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

interface Notification {
  id: string;
  category: 'order' | 'payment' | 'shipping' | 'promo' | 'account';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  message: string;
}

interface WishlistItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  category: string;
  inStock: boolean;
}


// ─── Helper Components ────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; type?: 'order' | 'payment' | 'ticket' }> = ({ status, type = 'order' }) => {
  const configs: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    new:         { label: 'New',         cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',       icon: <Clock className="w-3 h-3" /> },
    confirmed:   { label: 'Confirmed',   cls: 'bg-[#3C6CA8]/10 text-[#3C6CA8] border-[#3C6CA8]/20 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40', icon: <CheckCircle className="w-3 h-3" /> },
    processing:  { label: 'Processing',  cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800', icon: <Package className="w-3 h-3" /> },
    shipped:     { label: 'Shipped',     cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800', icon: <Truck className="w-3 h-3" /> },
    delivered:   { label: 'Delivered',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:   { label: 'Cancelled',   cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',             icon: <XCircle className="w-3 h-3" /> },
    paid:        { label: 'Paid',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800', icon: <Check className="w-3 h-3" /> },
    pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',       icon: <Clock className="w-3 h-3" /> },
    open:        { label: 'Open',        cls: 'bg-[#3C6CA8]/10 text-[#3C6CA8] border-[#3C6CA8]/20 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40', icon: <MessageSquare className="w-3 h-3" /> },
    in_progress: { label: 'In Progress', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    resolved:    { label: 'Resolved',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800', icon: <CheckCircle className="w-3 h-3" /> },
  };
  const c = configs[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Info className="w-3 h-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  );
};

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; label: string; desc?: string }> = ({ enabled, onChange, label, desc }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
    <div>
      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{label}</p>
      {desc && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>}
    </div>
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${enabled ? 'bg-[#3C6CA8]' : 'bg-gray-200 dark:bg-slate-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

const InputField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; hint?: string }> = ({ label, value, onChange, type = 'text', placeholder, required, hint }) => (
  <div>
    <label htmlFor="customerdashboard-label-required" className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>
    <input id="customerdashboard-label-required" name="label_required" type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full text-sm px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all"
    />
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ customer, onClose, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const cacheKey = `slimdose_orders_${customer?.id || customer?.email || 'guest'}`;

  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loadingOrders, setLoadingOrders] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return !cached;
    } catch {
      return true;
    }
  });

  // Profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fullName, setFullName] = useState(customer.full_name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [profileEmail] = useState(customer.email || '');
  const [address, setAddress] = useState(customer.shipping_address || '');
  const [barangay, setBarangay] = useState(customer.shipping_barangay || '');
  const [city, setCity] = useState(customer.shipping_city || '');
  const [provinceState, setProvinceState] = useState(customer.shipping_state || '');
  const [zipCode, setZipCode] = useState(customer.shipping_zip_code || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(customer.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${customer.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, { upsert: true });

      let publicUrl = '';
      if (!uploadError) {
        const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      } else {
        // Fallback to local Data URL preview if bucket upload is not configured
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setAvatarUrl(publicUrl);
      const updated = { ...customer, avatar_url: publicUrl };
      localStorage.setItem('slimdose_customer', JSON.stringify(updated));

      // Persist in DB if available
      await supabase.from('customers').update({ avatar_url: publicUrl }).eq('id', customer.id);
      window.dispatchEvent(new Event('storage'));
      fireToast('Profile image updated successfully!', 'success');
    } catch {
      fireToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Orders state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);

  // Addresses state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => {
    try { return JSON.parse(localStorage.getItem(`slimdose_addresses_${customer.id}`) || '[]'); } catch { return []; }
  });
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try { return JSON.parse(localStorage.getItem(`slimdose_notifs_${customer.id}`) || '[]'); } catch { return []; }
  });
  const [notifFilter, setNotifFilter] = useState<string>('all');

  // Wishlist state
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(`slimdose_wishlist_${customer.id}`) || '[]'); } catch { return []; }
  });

  // Support state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('General');
  const [ticketMessage, setTicketMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try { return JSON.parse(localStorage.getItem(`slimdose_tickets_${customer.id}`) || '[]'); } catch { return []; }
  });

  // Preferences state
  const [prefs, setPrefs] = useState(() => {
    const defaults = { emailOrders: true, emailShipping: true, emailPromo: false, smsOrders: true, smsShipping: true, smsPromo: false };
    try { return JSON.parse(localStorage.getItem(`slimdose_prefs_${customer.id}`) || JSON.stringify(defaults)); } catch { return defaults; }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Load Orders (Live Supabase & Real-Time Sync) ────────────────────────────
  useEffect(() => {
    loadCustomerOrders();

    const customerIdentifier = customer?.id || customer?.email || 'guest';
    const channel = supabase
      .channel(`customer_orders_${customerIdentifier}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadCustomerOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer?.id, customer?.email]);

  const loadCustomerOrders = async () => {
    if (!customer?.id && !customer?.email) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    const filters: string[] = [];
    if (customer.id) filters.push(`customer_id.eq.${customer.id}`);
    if (customer.email) filters.push(`customer_email.eq.${customer.email}`);

    if (filters.length === 0) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    // Safety timeout in case Supabase hangs or takes longer than 3.5s
    const timeoutTimer = setTimeout(() => {
      setLoadingOrders(false);
    }, 3500);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(filters.join(','))
        .order('created_at', { ascending: false });

      clearTimeout(timeoutTimer);

      if (error) throw error;

      const orderData = data || [];
      setOrders(orderData);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(orderData));
      } catch {}
    } catch (err) {
      clearTimeout(timeoutTimer);
      console.warn('Error loading live customer orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ── Persist helpers ────────────────────────────────────────────────────────
  const saveAddresses = (list: Address[]) => {
    setSavedAddresses(list);
    localStorage.setItem(`slimdose_addresses_${customer.id}`, JSON.stringify(list));
  };
  const saveNotifications = (list: Notification[]) => {
    setNotifications(list);
    localStorage.setItem(`slimdose_notifs_${customer.id}`, JSON.stringify(list));
  };
  const saveWishlist = (list: WishlistItem[]) => {
    setWishlist(list);
    localStorage.setItem(`slimdose_wishlist_${customer.id}`, JSON.stringify(list));
  };
  const savePrefs = (p: typeof prefs) => {
    setPrefs(p);
    localStorage.setItem(`slimdose_prefs_${customer.id}`, JSON.stringify(p));
  };

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { fireToast('Full name is required.', 'error'); return; }
    if (!phone.trim()) { fireToast('Phone number is required.', 'error'); return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('customers').update({
        full_name: fullName.trim(), phone: phone.trim(),
        shipping_address: address.trim() || null, shipping_barangay: barangay.trim() || null,
        shipping_city: city.trim() || null, shipping_state: provinceState.trim() || null,
        shipping_zip_code: zipCode.trim() || null,
      }).eq('id', customer.id);
      if (error) throw error;
      const updated = { ...customer, full_name: fullName.trim(), phone: phone.trim(), shipping_address: address.trim() || null, shipping_barangay: barangay.trim() || null, shipping_city: city.trim() || null, shipping_state: provinceState.trim() || null, shipping_zip_code: zipCode.trim() || null };
      localStorage.setItem('slimdose_customer', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      fireToast('Profile updated successfully!', 'success');
      setEditingProfile(false);
    } catch {
      fireToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-[#3C6CA8]', 'bg-emerald-500'];
    return { score, label: labels[score], color: colors[score] };
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { fireToast('Enter your current password.', 'error'); return; }
    if (newPassword.length < 8) { fireToast('New password must be at least 8 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { fireToast('Passwords do not match.', 'error'); return; }
    fireToast('Password updated successfully!', 'success');
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  // ── Order helpers ─────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const matchStatus = orderStatusFilter === 'all' || o.order_status === orderStatusFilter;
    const q = orderSearch.toLowerCase();
    const matchSearch = !q || (o.order_number || '').toLowerCase().includes(q) ||
      (Array.isArray(o.order_items) && o.order_items.some((i: any) => i.product_name.toLowerCase().includes(q)));
    return matchStatus && matchSearch;
  });

  const handleDownloadReceipt = (order: any) => {
    const orderRef = getOrderRef(order);
    const rawDate = order.created_at || order.createdAt;
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const dateFormatted = !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    const itemsList = Array.isArray(order.order_items) && order.order_items.length > 0
      ? order.order_items
      : Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : [];

    const itemsFormatted = itemsList.length > 0
      ? itemsList.map((i: any) => {
          const qty = i.quantity || 1;
          const pName = i.product_name || i.name || i.product?.name || 'Peptide Product';
          const vName = i.variation_name || i.variation?.name ? ` (${i.variation_name || i.variation?.name})` : '';
          const uPrice = i.unit_price ? `₱${Number(i.unit_price).toLocaleString('en-PH')}` : (i.price ? `₱${Number(i.price).toLocaleString('en-PH')}` : 'Included');
          return `  ${qty}x ${pName}${vName} @ ${uPrice}`;
        }).join('\n')
      : '  1x Peptide Solution';

    const subtotalNum = Number(order.total_price || 0);
    const shippingNum = Number(order.shipping_fee || 0);
    const grandTotalNum = subtotalNum + shippingNum;
    const paymentChannel = order.payment_method || order.payment_method_name || 'GCash / Bank Transfer (Manual)';
    const deliveryAddr = order.shipping_address || (customer ? `${customer.full_name}, ${customer.phone || ''}` : 'Customer Address');

    const content = `================================================
              SLIMDOSE OFFICIAL RECEIPT
================================================
Order Ref     : ${orderRef}
Date          : ${dateFormatted}
Order Status  : ${String(order.order_status || 'new').toUpperCase()}
Payment Status: ${String(order.payment_status || 'pending').toUpperCase()}

------------------------------------------------
ORDERED ITEMS:
------------------------------------------------
${itemsFormatted}

------------------------------------------------
PAYMENT BREAKDOWN:
------------------------------------------------
Subtotal     : ₱${subtotalNum.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
Shipping Fee : ₱${shippingNum.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
Total Paid   : ₱${grandTotalNum.toLocaleString('en-PH', { minimumFractionDigits: 0 })}

Payment Method : ${paymentChannel}
Shipping Target: ${deliveryAddr}
================================================
     Thank you for choosing SlimDose Research!
================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SlimDose-Receipt-${orderRef.replace('#', '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    fireToast('Receipt downloaded successfully!', 'success');
  };

  // ── Address helpers ───────────────────────────────────────────────────────
  const emptyAddress = (): Address => ({ id: Date.now().toString(), label: 'Home', fullName: customer.full_name || '', phone: customer.phone || '', street: '', barangay: '', city: '', province: '', zip: '', isDefaultShipping: savedAddresses.length === 0, isDefaultBilling: savedAddresses.length === 0 });

  const handleSaveAddress = (addr: Address) => {
    let list = savedAddresses.filter(a => a.id !== addr.id);
    if (addr.isDefaultShipping) list = list.map(a => ({ ...a, isDefaultShipping: false }));
    if (addr.isDefaultBilling) list = list.map(a => ({ ...a, isDefaultBilling: false }));
    saveAddresses([addr, ...list]);
    setShowAddressForm(false); setEditingAddress(null);
    fireToast('Address saved!', 'success');
  };

  const handleDeleteAddress = (id: string) => {
    saveAddresses(savedAddresses.filter(a => a.id !== id));
    fireToast('Address removed.', 'success');
  };

  // ── Support ticket ────────────────────────────────────────────────────────
  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) { fireToast('Please fill all fields.', 'error'); return; }
    const t: SupportTicket = { id: `T${Date.now()}`, subject: ticketSubject, category: ticketCategory, status: 'open', createdAt: new Date().toISOString(), message: ticketMessage };
    const updated = [t, ...tickets];
    setTickets(updated);
    localStorage.setItem(`slimdose_tickets_${customer.id}`, JSON.stringify(updated));
    setTicketSubject(''); setTicketMessage('');
    fireToast('Support ticket submitted! We\'ll respond within 24 hours.', 'success');
  };

  // ─── Nav Items ────────────────────────────────────────────────────────────
  const NAV_ITEMS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',     label: 'Dashboard',     icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'profile',       label: 'Profile',        icon: <User className="w-4 h-4" /> },
    { id: 'orders',        label: 'Orders',         icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'wishlist',      label: 'Wishlist',       icon: <Heart className="w-4 h-4" /> },
    { id: 'addresses',     label: 'Addresses',      icon: <MapPin className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-4 h-4" /> },
    { id: 'support',       label: 'Support',        icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'security',      label: 'Security',       icon: <Shield className="w-4 h-4" /> },
    { id: 'preferences',   label: 'Preferences',    icon: <Settings className="w-4 h-4" /> },
  ];

  // ─── Address Form Component ───────────────────────────────────────────────
  const AddressForm: React.FC<{ initial: Address; onSave: (a: Address) => void; onCancel: () => void }> = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState<Address>(initial);
    const u = (k: keyof Address, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
    return (
      <form onSubmit={e => { e.preventDefault(); if (!form.street || !form.city) { fireToast('Street and City are required.', 'error'); return; } onSave(form); }} className="bg-[#3C6CA8]/5 dark:bg-slate-800/60 border border-[#3C6CA8]/20 dark:border-slate-700 rounded-2xl p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800 dark:text-white">{form.id ? 'Edit' : 'Add'} Address</p>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Label" value={form.label} onChange={v => u('label', v)} placeholder="Home, Office..." />
          <InputField label="Full Name" value={form.fullName} onChange={v => u('fullName', v)} required />
        </div>
        <InputField label="Phone" value={form.phone} onChange={v => u('phone', v)} required />
        <InputField label="Street / House No." value={form.street} onChange={v => u('street', v)} required />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Barangay" value={form.barangay} onChange={v => u('barangay', v)} />
          <InputField label="City / Municipality" value={form.city} onChange={v => u('city', v)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Province" value={form.province} onChange={v => u('province', v)} />
          <InputField label="ZIP Code" value={form.zip} onChange={v => u('zip', v)} />
        </div>
        <div className="flex gap-4 pt-1">
          <label htmlFor="customerdashboard-u-isdefaultshipping-e-target-c" className="flex items-center gap-2 cursor-pointer">
            <input id="customerdashboard-checkbox-2" name="checkbox_2" type="checkbox" checked={form.isDefaultShipping} onChange={e => u('isDefaultShipping', e.target.checked)} className="rounded text-[#3C6CA8]" />
            <span className="text-xs text-gray-600 dark:text-slate-400">Default Shipping</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input id="customerdashboard-u-isdefaultshipping-e-target-c" name="u_isdefaultshipping_e_target_c" type="checkbox" checked={form.isDefaultBilling} onChange={e => u('isDefaultBilling', e.target.checked)} className="rounded text-[#3C6CA8]" />
            <span className="text-xs text-gray-600 dark:text-slate-400">Default Billing</span>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="flex-1 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"><Save className="w-3.5 h-3.5" />Save Address</button>
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
        </div>
      </form>
    );
  };

  // ─── Track Order Modal ────────────────────────────────────────────────────
  const TrackOrderModal: React.FC<{ order: any; onClose: () => void }> = ({ order, onClose }) => {
    const steps = [
      { label: 'Order Placed', done: true, icon: <FileText className="w-4 h-4" /> },
      { label: 'Confirmed', done: ['confirmed','processing','shipped','delivered'].includes(order.order_status), icon: <CheckCircle className="w-4 h-4" /> },
      { label: 'Processing', done: ['processing','shipped','delivered'].includes(order.order_status), icon: <Package className="w-4 h-4" /> },
      { label: 'Shipped', done: ['shipped','delivered'].includes(order.order_status), icon: <Truck className="w-4 h-4" /> },
      { label: 'Delivered', done: order.order_status === 'delivered', icon: <CheckCircle className="w-4 h-4" /> },
    ];
    return (
      <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2"><Truck className="w-5 h-5 text-[#3C6CA8]" />Track Order</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="bg-[#3C6CA8]/10 dark:bg-slate-800 rounded-xl p-3 mb-5 flex items-center justify-between border border-[#3C6CA8]/20">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Order Number</p>
              <p className="font-bold text-gray-900 dark:text-white">#{order.order_number}</p>
            </div>
            {order.tracking_number && (
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-slate-400">Tracking No.</p>
                <p className="font-mono font-bold text-[#3C6CA8] dark:text-blue-300 text-xs">{order.tracking_number}</p>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />
            <div className="space-y-5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 relative">
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step.done ? 'bg-[#3C6CA8] border-[#3C6CA8] text-white' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-400'}`}>
                    {step.icon}
                  </div>
                  <span className={`text-sm font-semibold ${step.done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>{step.label}</span>
                  {step.done && i === steps.filter(s => s.done).length - 1 && (
                    <span className="ml-auto text-[10px] font-bold text-[#3C6CA8] bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/30 dark:text-blue-300 px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {order.tracking_number && (
            <a href={`https://www.jtexpress.ph/tracking?number=${order.tracking_number}`} target="_blank" rel="noopener noreferrer"
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-sm font-bold rounded-xl transition-all cursor-pointer">
              <ExternalLink className="w-4 h-4" /> Track on J&T Express
            </a>
          )}
        </div>
      </div>
    );
  };

  // Helper formatters
  const formatOrderDate = (d: any) => {
    if (!d) return 'Recently';
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return 'Recently';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getOrderRef = (o: any) => {
    if (o?.order_number) return `#${o.order_number}`;
    if (o?.id) return `#ORD-${o.id.slice(0, 8).toUpperCase()}`;
    return '#SDP-ORDER';
  };

  // ─── Tab: Dashboard ───────────────────────────────────────────────────────
  const DashboardTab = () => {
    const totalSpent = orders
      .filter(o => o.order_status !== 'cancelled' && o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total_price || 0) + Number(o.shipping_fee || 0), 0);
    const pendingOrders = orders.filter(o => ['new', 'confirmed', 'processing'].includes(o.order_status)).length;
    const recentNotifs = notifications.filter(n => !n.read).slice(0, 3);
    const stats = [
      { label: 'Total Orders', value: orders.length, icon: <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#3C6CA8]" />, bg: 'bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20' },
      { label: 'Total Spent', value: `₱${totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`, icon: <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />, bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
      { label: 'Pending Orders', value: pendingOrders, icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />, bg: 'bg-amber-50 dark:bg-amber-950/30' },
      { label: 'Saved Items', value: wishlist.length, icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />, bg: 'bg-rose-50 dark:bg-rose-950/30' },
    ];
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-[#3C6CA8] to-[#2D5383] rounded-2xl p-4 sm:p-5 text-white shadow-xs">
          <p className="text-xs sm:text-sm font-medium text-white/90">Welcome back,</p>
          <h2 className="text-lg sm:text-xl font-black mt-0.5 text-white">{customer.full_name || 'Customer'} 👋</h2>
          <p className="text-[11px] sm:text-xs text-white/80 mt-1 truncate">{customer.email}</p>
          <div className="mt-3 sm:mt-4 flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('orders')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" />View Orders</button>
            <button onClick={() => setActiveTab('profile')} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" />Edit Profile</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {stats.map((s, i) => {
            const isClickable = s.label === 'Saved Items' || s.label === 'Total Orders' || s.label === 'Pending Orders';
            const handleClick = () => {
              if (s.label === 'Saved Items') setActiveTab('wishlist');
              else if (s.label === 'Total Orders' || s.label === 'Pending Orders') setActiveTab('orders');
            };
            return (
              <div
                key={i}
                onClick={isClickable ? handleClick : undefined}
                className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 shadow-xs transition-all ${
                  isClickable ? 'cursor-pointer hover:border-[#3C6CA8] hover:shadow-sm' : ''
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{s.label}</p>
                  <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight truncate">{s.value}</p>
                </div>
                {isClickable && <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">Recent Orders</h3>
            <button onClick={() => setActiveTab('orders')} className="text-xs text-[#3C6CA8] hover:underline font-bold flex items-center gap-1 cursor-pointer">View all <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className="text-center py-6 sm:py-8 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-400">No orders placed yet</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Your recent research purchases will appear here.</p>
              </div>
            ) : orders.slice(0, 3).map(order => {
              const firstItem = Array.isArray(order.order_items) ? order.order_items[0] : (Array.isArray(order.items) ? order.items[0] : null);
              const imgUrl = getProductImageFallback(firstItem);
              const orderRef = getOrderRef(order);
              const dateFormatted = formatOrderDate(order.created_at || order.createdAt);
              const totalAmount = Number(order.total_price || 0) + Number(order.shipping_fee || 0);

              return (
                <div key={order.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={firstItem?.product_name || 'Product'}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0 bg-gray-50"
                    />
                  ) : (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <ShoppingBag className="w-4 h-4 text-[#3C6CA8]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate">{orderRef}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                      {dateFormatted}{firstItem?.product_name ? ` · ${firstItem.product_name}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={order.order_status || 'new'} />
                    <p className="text-xs sm:text-sm font-extrabold text-gray-800 dark:text-slate-200 mt-0.5">
                      ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications preview */}
        {recentNotifs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-[#3C6CA8]" />Unread Notifications</h3>
              <button onClick={() => setActiveTab('notifications')} className="text-xs text-[#3C6CA8] hover:underline font-bold cursor-pointer">See all</button>
            </div>
            <div className="space-y-2">
              {recentNotifs.map(n => (
                <div key={n.id} className="bg-[#3C6CA8]/5 dark:bg-[#3C6CA8]/15 border border-[#3C6CA8]/20 dark:border-[#3C6CA8]/30 rounded-xl p-3 flex gap-2.5">
                  <Bell className="w-4 h-4 text-[#3C6CA8] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Tab: Profile ─────────────────────────────────────────────────────────
  const ProfileTab = () => (
    <div className="space-y-4 sm:space-y-5">
      <input id="customerdashboard-file-upload" name="file_upload" type="file"
        ref={avatarInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"/>
      
      {/* Sleek Profile Card Header */}
      <div className="bg-slate-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4 shadow-xs">
        <div className="relative group shrink-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#3C6CA8] to-[#2D5383] flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md overflow-hidden ring-2 ring-[#3C6CA8]/30">
            {avatarUrl ? (
              <img src={avatarUrl} alt={customer.full_name} className="w-full h-full object-cover" />
            ) : (
              (customer.full_name || 'U')[0].toUpperCase()
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#3C6CA8] text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md cursor-pointer hover:bg-[#315A8E] hover:scale-110 transition-all"
            title="Upload Profile Picture"
            aria-label="Upload Profile Picture"
          >
            {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg truncate">{customer.full_name}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{customer.email}</p>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-[#3C6CA8] dark:text-blue-300 hover:underline cursor-pointer"
          >
            <Camera className="w-3 h-3" /> {avatarUrl ? 'Change Profile Image' : 'Upload Profile Image'}
          </button>
        </div>
      </div>

      {/* Personal Info Box */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-[#3C6CA8]" />Personal Information
          </h3>
          {!editingProfile && (
            <button onClick={() => setEditingProfile(true)} className="text-xs text-[#3C6CA8] hover:underline font-bold flex items-center gap-1 cursor-pointer">
              <Edit3 className="w-3 h-3" />Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-3.5 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InputField label="Full Name" value={fullName} onChange={setFullName} required />
              <InputField label="Phone Number" value={phone} onChange={setPhone} required />
            </div>
            <InputField label="Email Address" value={profileEmail} onChange={() => {}} hint="Email cannot be changed here. Contact support." />
            <div className="border-t border-gray-100 dark:border-slate-700 pt-3.5">
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2.5">Default Shipping Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <InputField label="Street / House No." value={address} onChange={setAddress} placeholder="e.g. 23 Rizal Ave." />
                <InputField label="Barangay" value={barangay} onChange={setBarangay} placeholder="e.g. Brgy. San Antonio" />
                <InputField label="City / Municipality" value={city} onChange={setCity} placeholder="e.g. Makati City" />
                <InputField label="Province" value={provinceState} onChange={setProvinceState} placeholder="e.g. Metro Manila" />
                <InputField label="ZIP Code" value={zipCode} onChange={setZipCode} placeholder="e.g. 1200" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={savingProfile} className="flex-1 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] disabled:opacity-60 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save Changes
              </button>
              <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
            {[
              { icon: <User className="w-4 h-4 text-gray-400" />, label: 'NAME', val: customer.full_name },
              { icon: <Mail className="w-4 h-4 text-gray-400" />, label: 'EMAIL', val: customer.email },
              { icon: <Phone className="w-4 h-4 text-gray-400" />, label: 'PHONE', val: customer.phone || '—' }
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-700/70 last:border-0">
                {row.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{row.label}</p>
                  <p className="text-gray-900 dark:text-slate-100 font-bold truncate mt-0.5">{row.val}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 pt-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">DEFAULT SHIPPING ADDRESS</p>
                {address ? (
                  <p className="text-gray-800 dark:text-slate-200 font-medium leading-relaxed">{address}{barangay && `, ${barangay}`}, {city}, {provinceState} {zipCode}</p>
                ) : (
                  <p className="text-gray-400 italic text-xs">No default address saved yet. Click Edit to add one.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Tab: Orders ──────────────────────────────────────────────────────────
  const OrdersTab = () => (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input id="customerdashboard-input-4" name="input_4" value={orderSearch}
            onChange={e => setOrderSearch(e.target.value)}
            placeholder="Search by order # or product..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {['all','confirmed','processing','shipped','delivered'].map(s => (
            <button
              key={s}
              onClick={() => setOrderStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize shrink-0 whitespace-nowrap ${
                orderStatusFilter === s
                  ? 'bg-[#3C6CA8] border-[#3C6CA8] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#3C6CA8]'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loadingOrders ? (
        <div className="py-16 flex justify-center items-center text-gray-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" />Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-gray-500 dark:text-slate-400">No orders found</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const isExpanded = expandedOrder === order.id;
            const total = Number(order.total_price || 0) + Number(order.shipping_fee || 0);
            const itemsList = Array.isArray(order.order_items) ? order.order_items : (Array.isArray(order.items) ? order.items : []);
            const itemCount = itemsList.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
            const firstItem = itemsList[0];
            const imgUrl = firstItem?.image_url || firstItem?.image || firstItem?.product?.image_url;
            const orderRef = getOrderRef(order);
            const dateFormatted = formatOrderDate(order.created_at || order.createdAt);

            return (
              <div key={order.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:border-[#3C6CA8]/50 transition-colors">
                {/* Order Header */}
                <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {(() => {
                      const imgUrl = getProductImageFallback(firstItem);
                      return imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={firstItem?.product_name || 'Product'}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0 bg-gray-50"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                          <ShoppingBag className="w-4 h-4 text-[#3C6CA8]" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{orderRef}</p>
                      <p className="text-[10px] text-gray-400 truncate">{dateFormatted} · {itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusBadge status={order.order_status || 'new'} />
                      {order.payment_status && <StatusBadge status={order.payment_status} />}
                    </div>
                    <span className="font-black text-gray-900 dark:text-white text-xs sm:text-sm">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-slate-700 p-3 sm:p-4 space-y-3.5 bg-gray-50/50 dark:bg-slate-900/50">
                    {/* Items */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ordered Items</p>
                      <div className="space-y-2">
                        {itemsList.map((item: any, idx: number) => {
                          const itemImg = getProductImageFallback(item);
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-gray-100 dark:border-slate-700">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {itemImg ? (
                                  <img src={itemImg} alt={item.product_name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0 bg-gray-50" />
                                ) : (
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20"><Package className="w-4 h-4 text-[#3C6CA8]" /></div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-extrabold text-gray-800 dark:text-slate-200 text-xs sm:text-sm truncate">{item.product_name || 'Peptide Product'}</p>
                                  <p className="text-[10px] text-gray-400">{item.variation_name ? `${item.variation_name} · ` : ''}Qty: {item.quantity}</p>
                                </div>
                              </div>
                              <span className="font-bold text-gray-700 dark:text-slate-300 text-xs shrink-0">{item.unit_price ? `₱${(item.unit_price * item.quantity).toLocaleString('en-PH')}` : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pricing & Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 space-y-1.5 text-xs">
                        <p className="font-bold text-gray-400 uppercase text-[10px] mb-2">Order Summary</p>
                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold text-gray-800 dark:text-slate-200">₱{Number(order.total_price || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="font-semibold text-gray-800 dark:text-slate-200">{Number(order.shipping_fee || 0) === 0 ? 'FREE' : `₱${Number(order.shipping_fee).toLocaleString()}`}</span></div>
                        <div className="flex justify-between pt-1.5 border-t border-gray-100 dark:border-slate-700"><span className="font-bold text-gray-700 dark:text-slate-300">Total</span><span className="font-black text-[#3C6CA8]">₱{total.toLocaleString()}</span></div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 space-y-1.5 text-xs">
                        <p className="font-bold text-gray-400 uppercase text-[10px] mb-2">Shipping & Payment</p>
                        {order.payment_method && <div className="flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-gray-400" /><span className="text-gray-600 dark:text-slate-400">{order.payment_method}</span></div>}
                        {order.tracking_number && <div className="flex items-center gap-1.5"><Truck className="w-3 h-3 text-gray-400" /><span className="font-mono text-[#3C6CA8] dark:text-blue-300">{order.tracking_number}</span></div>}
                        {order.shipping_address && <div className="flex items-start gap-1.5 mt-1"><MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" /><span className="text-gray-600 dark:text-slate-400 leading-snug">{order.shipping_address}</span></div>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                      <button
                        onClick={() => handleDownloadReceipt(order)}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      <button
                        onClick={() => { fireToast('Reorder added to your cart!', 'success'); }}
                        className="py-2.5 px-3 border border-[#3C6CA8]/30 dark:border-[#3C6CA8]/50 text-[#3C6CA8] dark:text-blue-300 bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 hover:bg-[#3C6CA8]/20 active:scale-95 rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reorder</span>
                      </button>

                      {['new', 'confirmed'].includes(order.order_status) ? (
                        <button
                          onClick={() => fireToast('Cancel request submitted. Our team will review within 1 hour.', 'success')}
                          className="py-2.5 px-3 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      ) : order.order_status === 'delivered' ? (
                        <button
                          onClick={() => fireToast('Return/refund request submitted. We\'ll contact you within 24 hours.', 'success')}
                          className="py-2.5 px-3 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:scale-95 rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Refund</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => fireToast('Order processing. We will update you via SMS.', 'info')}
                          className="py-2.5 px-3 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 active:scale-95 rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Status</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Tab: Wishlist ────────────────────────────────────────────────────────
  const WishlistTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" />Saved Items ({wishlist.length})</h3>
      </div>
      {wishlist.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <Heart className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-gray-500">No saved items yet</p>
          <p className="text-xs text-gray-400 mt-1">Browse products and tap the heart to save them.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {wishlist.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-3 hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{item.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.variant} · {item.category}</p>
                </div>
                <button onClick={() => { saveWishlist(wishlist.filter(w => w.id !== item.id)); fireToast('Removed from wishlist.', 'success'); }} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 cursor-pointer transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-[#3C6CA8]">₱{item.price.toLocaleString()}</span>
                {item.inStock ? (
                  <button onClick={() => fireToast(`${item.name} added to cart!`, 'success')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"><Plus className="w-3 h-3" />Add to Cart</button>
                ) : (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-full border border-rose-200">Out of Stock</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Tab: Addresses ───────────────────────────────────────────────────────
  const AddressesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-[#3C6CA8]" />Saved Addresses</h3>
        {!showAddressForm && <button onClick={() => { setEditingAddress(emptyAddress()); setShowAddressForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"><Plus className="w-3.5 h-3.5" />Add Address</button>}
      </div>
      {showAddressForm && editingAddress && (
        <AddressForm initial={editingAddress} onSave={handleSaveAddress} onCancel={() => { setShowAddressForm(false); setEditingAddress(null); }} />
      )}
      {savedAddresses.length === 0 && !showAddressForm ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <MapPin className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-gray-500">No saved addresses</p>
          <p className="text-xs text-gray-400 mt-1">Add a shipping or billing address for faster checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedAddresses.map(addr => (
            <div key={addr.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center shrink-0">
                    {addr.label === 'Office' ? <Building2 className="w-4 h-4 text-[#3C6CA8]" /> : <Home className="w-4 h-4 text-[#3C6CA8]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{addr.label}</span>
                      {addr.isDefaultShipping && <span className="text-[9px] font-bold bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/30 text-[#3C6CA8] dark:text-blue-300 border border-[#3C6CA8]/20 dark:border-[#3C6CA8]/40 px-2 py-0.5 rounded-full">Default Shipping</span>}
                      {addr.isDefaultBilling && <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">Default Billing</span>}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">{addr.fullName} · {addr.phone}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5 leading-snug">{addr.street}{addr.barangay && `, ${addr.barangay}`}, {addr.city}{addr.province && `, ${addr.province}`} {addr.zip}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setEditingAddress(addr); setShowAddressForm(true); }} className="p-1.5 rounded-lg hover:bg-[#3C6CA8]/10 text-gray-400 hover:text-[#3C6CA8] cursor-pointer transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 cursor-pointer transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Tab: Notifications ───────────────────────────────────────────────────
  const NotificationsTab = () => {
    const cats = ['all', 'order', 'payment', 'shipping', 'promo', 'account'];
    const catIcon: Record<string, React.ReactNode> = { order: <ShoppingBag className="w-3 h-3" />, payment: <CreditCard className="w-3 h-3" />, shipping: <Truck className="w-3 h-3" />, promo: <Sparkles className="w-3 h-3" />, account: <User className="w-3 h-3" /> };
    const filtered = notifFilter === 'all' ? notifications : notifications.filter(n => n.category === notifFilter);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Bell className="w-4 h-4 text-[#3C6CA8]" />Notifications {unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-[#3C6CA8] text-white text-[10px] font-black flex items-center justify-center">{unreadCount}</span>}</h3>
          {unreadCount > 0 && <button onClick={() => saveNotifications(notifications.map(n => ({ ...n, read: true })))} className="text-xs text-[#3C6CA8] hover:underline font-bold cursor-pointer">Mark all read</button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {cats.map(c => (
            <button key={c} onClick={() => setNotifFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize ${notifFilter === c ? 'bg-[#3C6CA8] border-[#3C6CA8] text-white' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#3C6CA8]'}`}>
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-400">No notifications</p>
            </div>
          ) : filtered.map(n => (
            <div key={n.id} onClick={() => saveNotifications(notifications.map(x => x.id === n.id ? { ...x, read: true } : x))} className={`flex gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${n.read ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700' : 'bg-[#3C6CA8]/5 dark:bg-[#3C6CA8]/15 border-[#3C6CA8]/20 dark:border-[#3C6CA8]/30'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-gray-100 dark:bg-slate-700 text-gray-500' : 'bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/30 text-[#3C6CA8]'}`}>
                {catIcon[n.category] || <Bell className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-bold ${n.read ? 'text-gray-700 dark:text-slate-300' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#3C6CA8] shrink-0 mt-1" />}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">{n.message}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Tab: Support ─────────────────────────────────────────────────────────
  const SupportTab = () => (
    <div className="space-y-6">

      {/* Ticket Form */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4"><MessageSquare className="w-4 h-4 text-[#3C6CA8]" />Submit a Support Ticket</h3>
        <form onSubmit={handleSubmitTicket} className="space-y-3">
          <InputField label="Subject" value={ticketSubject} onChange={setTicketSubject} required placeholder="e.g. Issue with my order" />
          <div>
            <label htmlFor="customerdashboard-category" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            <select id="customerdashboard-category" name="category" value={ticketCategory} onChange={e => setTicketCategory(e.target.value)} className="w-full text-sm px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 transition-all">
              {['General','Order Issue','Shipping','Product Info','Returns','Payment','Account'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="customerdashboard-message" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message <span className="text-rose-500">*</span></label>
            <textarea id="customerdashboard-message" name="message" value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} rows={4} placeholder="Describe your issue in detail..." required className="w-full text-sm px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 resize-none transition-all" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"><Send className="w-4 h-4" />Submit Ticket</button>
        </form>
      </div>

      {/* Ticket History */}
      {tickets.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-[#3C6CA8]" />Your Tickets</h3>
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center shrink-0"><MessageSquare className="w-3.5 h-3.5 text-[#3C6CA8]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{t.subject}</p>
                    <StatusBadge status={t.status} type="ticket" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t.category} · {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 truncate">{t.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Tab: Security ────────────────────────────────────────────────────────
  const SecurityTab = () => (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-[#3C6CA8]" />Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="relative">
            <label htmlFor="customerdashboard-current-password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Password <span className="text-rose-500">*</span></label>
            <input id="customerdashboard-current-password" name="current_password" type={showCurrentPw ? 'text' : 'password'} value={currentPassword} autoComplete="current-password" onChange={(e) => setCurrentPassword(e.target.value)} className="w-full text-sm px-3 py-2.5 pr-10 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 transition-all" />
            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600 cursor-pointer">{showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          <div className="relative">
            <label htmlFor="customerdashboard-new-password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password <span className="text-rose-500">*</span></label>
            <input id="customerdashboard-new-password" name="new_password" type={showNewPw ? 'text' : 'password'} value={newPassword} autoComplete="new-password" onChange={(e) => setNewPassword(e.target.value)} className="w-full text-sm px-3 py-2.5 pr-10 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 transition-all" placeholder="Min. 8 characters" />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600 cursor-pointer">{showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          {newPassword && (() => {
            const pwStrength = getPasswordStrength(newPassword);
            return (
              <div className="space-y-1">
                <div className="flex gap-1">{[1,2,3,4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwStrength.score ? pwStrength.color : 'bg-gray-200 dark:bg-slate-700'}`} />)}</div>
                <p className="text-[10px] text-gray-500">{pwStrength.label && `Strength: ${pwStrength.label}`}</p>
              </div>
            );
          })()}
          <div>
            <label htmlFor="customerdashboard-confirm-new-password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password <span className="text-rose-500">*</span></label>
            <input id="customerdashboard-confirm-new-password" name="confirm_new_password" type="password" value={confirmPassword} autoComplete="new-password" onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full text-sm px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 transition-all ${confirmPassword && confirmPassword !== newPassword ? 'border-rose-300 dark:border-rose-700' : 'border-gray-200 dark:border-slate-700'}`} />
            {confirmPassword && confirmPassword !== newPassword && <p className="text-[10px] text-rose-500 mt-1">Passwords don't match.</p>}
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"><Lock className="w-4 h-4" />Update Password</button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4"><Smartphone className="w-4 h-4 text-[#3C6CA8]" />Active Sessions</h3>
        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl mb-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Smartphone className="w-4 h-4 text-green-600" /></div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-800 dark:text-slate-200">Current Device</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">{navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser'} · Active now</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <button onClick={() => { fireToast('All other sessions have been logged out.', 'success'); }} className="w-full py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-all flex items-center justify-center gap-1.5"><LogOut className="w-3.5 h-3.5" />Logout All Other Devices</button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Security Tips</p>
          <ul className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 space-y-1 leading-relaxed">
            <li>• Use a strong, unique password (min. 8 characters)</li>
            <li>• Never share your login credentials with anyone</li>
            <li>• Log out from shared/public devices after use</li>
            <li>• Contact support immediately if you suspect unauthorized access</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // ─── Tab: Preferences ────────────────────────────────────────────────────
  const PreferencesTab = () => (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-[#3C6CA8]" />Email Notifications</h3>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-4">Manage which emails SlimDose sends to {customer.email}</p>
        <ToggleSwitch enabled={prefs.emailOrders} onChange={() => savePrefs({ ...prefs, emailOrders: !prefs.emailOrders })} label="Order Confirmations" desc="Receive an email when an order is placed or updated" />
        <ToggleSwitch enabled={prefs.emailShipping} onChange={() => savePrefs({ ...prefs, emailShipping: !prefs.emailShipping })} label="Shipping Updates" desc="Get notified when your order ships or is delivered" />
        <ToggleSwitch enabled={prefs.emailPromo} onChange={() => savePrefs({ ...prefs, emailPromo: !prefs.emailPromo })} label="Promotions & Offers" desc="Receive exclusive deals and new product announcements" />
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-1"><Phone className="w-4 h-4 text-[#3C6CA8]" />SMS Notifications</h3>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-4">Sent to {customer.phone || 'your registered number'}</p>
        <ToggleSwitch enabled={prefs.smsOrders} onChange={() => savePrefs({ ...prefs, smsOrders: !prefs.smsOrders })} label="Order & Payment Alerts" desc="SMS when payment is confirmed or order status changes" />
        <ToggleSwitch enabled={prefs.smsShipping} onChange={() => savePrefs({ ...prefs, smsShipping: !prefs.smsShipping })} label="Shipping & Delivery SMS" desc="Text alerts when your package is dispatched or delivered" />
        <ToggleSwitch enabled={prefs.smsPromo} onChange={() => savePrefs({ ...prefs, smsPromo: !prefs.smsPromo })} label="Promotional SMS" desc="Receive special offers and promo codes via SMS" />
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-[#3C6CA8]" />Account Settings</h3>
        {[{ label: 'Language', value: 'English (Philippines)' }, { label: 'Timezone', value: 'Asia/Manila (UTC+8)' }, { label: 'Currency', value: 'PHP (Philippine Peso ₱)' }].map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{s.label}</p>
              <p className="text-[11px] text-gray-400">{s.value}</p>
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Default</span>
          </div>
        ))}
      </div>

      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-4">
        <h3 className="font-bold text-rose-700 dark:text-rose-400 text-sm mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Danger Zone</h3>
        <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-3">These actions are permanent. Please proceed with caution.</p>
        <button onClick={() => fireToast('Account deletion request submitted. Support will contact you within 24 hours.', 'success')} className="flex items-center gap-1.5 px-3 py-2 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer transition-all"><XCircle className="w-3.5 h-3.5" />Request Account Deletion</button>
      </div>
    </div>
  );

  // ─── Tab Renderer ─────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':      return DashboardTab();
      case 'profile':        return ProfileTab();
      case 'orders':         return OrdersTab();
      case 'wishlist':       return WishlistTab();
      case 'addresses':      return AddressesTab();
      case 'notifications':  return NotificationsTab();
      case 'support':        return SupportTab();
      case 'security':       return SecurityTab();
      case 'preferences':    return PreferencesTab();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {trackingOrder && <TrackOrderModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />}

      <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-white dark:bg-slate-900 shadow-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

          {/* ── Sticky Header ── */}
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 bg-gradient-to-r from-[#3C6CA8] to-[#2D5383] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><ShoppingBag className="w-4 h-4 text-white" /></div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-xs sm:text-sm leading-tight truncate">Customer Account Portal</h3>
                <p className="text-white/80 text-[10px] truncate">{customer.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={onLogout} className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer"><LogOut className="w-3.5 h-3.5" />Logout</button>
              <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* ── Body: Sidebar + Content ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Desktop Sidebar ── */}
            <nav className="hidden md:flex flex-col w-56 shrink-0 bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 py-4 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 px-4 py-2.5 mx-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer relative mb-0.5 ${activeTab === item.id ? 'bg-[#3C6CA8] text-white shadow-sm font-bold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200/70 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'}`}>
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-20 md:pb-6 bg-white dark:bg-slate-900">
              {renderTabContent()}
            </main>
          </div>

          {/* ── Mobile Horizontally Scrollable Bottom Tab Bar ── */}
          <div className="md:hidden shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 z-20 flex items-center gap-1 overflow-x-auto px-2 py-2 shadow-lg no-scrollbar">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 shrink-0 rounded-xl relative transition-all duration-200 cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 font-extrabold'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium'
                }`}
              >
                {item.icon}
                <span className="text-[9px] tracking-tight whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
