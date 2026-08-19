import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  MessageCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  X, 
  Clock, 
  DollarSign, 
  Award, 
  Users, 
  TrendingUp, 
  SlidersHorizontal,
  Calendar,
  Package,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';
import { formatOrderId } from '../utils/orderUtils';
import { liveScrapedCustomers } from '../data/liveScrapedCustomers';
import { liveScrapedOrders } from '../data/liveScrapedOrders';

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface CustomerOrder {
  id: string;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  total_price: number;
  shipping_fee?: number;
  order_status: string;
  payment_status?: string;
  payment_method?: string;
  created_at: string;
  order_items?: any[];
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
}

type FilterTier = 'all' | 'vip' | 'repeat' | 'first' | 'prospect';
type SortOption = 'spent-desc' | 'spent-asc' | 'orders-desc' | 'name-asc' | 'recent';

export default function CustomerCRMManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<FilterTier>('all');
  const [sortBy, setSortBy] = useState<SortOption>('spent-desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected customer for detailed modal/drawer
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime Live-Sync for customers and orders
    const channel = supabase
      .channel('crm_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        loadData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [custRes, ordRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      if (custRes.error) console.warn('CRM customers fetch notice:', custRes.error);
      if (ordRes.error) console.warn('CRM orders fetch notice:', ordRes.error);

      const fetchedCustomers: Customer[] = custRes.data || [];
      const fetchedOrders: CustomerOrder[] = ordRes.data || [];

      // Merge distinct guest checkout customers from orders who haven't registered an account yet
      const knownEmails = new Set(fetchedCustomers.map(c => c.email.toLowerCase().trim()));
      const guestCustomersMap: Record<string, Customer> = {};

      fetchedOrders.forEach(o => {
        const email = String(o.customer_email || '').trim().toLowerCase();
        if (!email || knownEmails.has(email) || guestCustomersMap[email]) return;

        guestCustomersMap[email] = {
          id: `guest_${email.replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
          full_name: o.customer_name || email.split('@')[0] || 'Guest Customer',
          email: o.customer_email || email,
          phone: o.customer_phone || '',
          shipping_address: o.shipping_address || '',
          shipping_city: o.shipping_city || '',
          shipping_state: o.shipping_state || '',
          shipping_zip_code: o.shipping_zip_code || '',
          created_at: o.created_at
        };
      });

      let finalCustomers = [...fetchedCustomers, ...Object.values(guestCustomersMap)];
      let finalOrders = fetchedOrders;

      if (finalCustomers.length === 0 && liveScrapedCustomers.length > 0) {
        finalCustomers = liveScrapedCustomers as Customer[];
      }
      if (finalOrders.length === 0 && liveScrapedOrders.length > 0) {
        finalOrders = liveScrapedOrders as CustomerOrder[];
      }

      setCustomers(finalCustomers);
      setOrders(finalOrders);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error loading CRM data, using scraped live cache:', err);
      setCustomers(liveScrapedCustomers as Customer[]);
      setOrders(liveScrapedOrders as CustomerOrder[]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
    fireToast('CRM data synchronized live', 'success');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Compile customer metrics (orders count, total spent, order history, last order date)
  const customerStatsMap = useMemo(() => {
    const map: Record<string, { 
      orderCount: number; 
      totalSpent: number; 
      lastOrderDate: string | null;
      customerOrders: CustomerOrder[];
      tier: 'VIP Platinum' | 'VIP Gold' | 'Silver' | 'Starter' | 'Prospect';
    }> = {};

    customers.forEach(c => {
      const email = c.email.toLowerCase().trim();
      map[email] = {
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        customerOrders: [],
        tier: 'Prospect'
      };
    });

    orders.forEach(order => {
      const email = String(order.customer_email || '').trim().toLowerCase();
      if (!email) return;

      if (!map[email]) {
        map[email] = {
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          customerOrders: [],
          tier: 'Prospect'
        };
      }

      const spent = Number(order.total_price || 0) + Number(order.shipping_fee || 0);
      const isPaid = order.order_status !== 'cancelled';

      map[email].orderCount += 1;
      map[email].customerOrders.push(order);

      if (isPaid) {
        map[email].totalSpent += spent;
      }

      if (!map[email].lastOrderDate || new Date(order.created_at) > new Date(map[email].lastOrderDate!)) {
        map[email].lastOrderDate = order.created_at;
      }
    });

    // Determine Tier badge
    Object.keys(map).forEach(email => {
      const stat = map[email];
      if (stat.totalSpent >= 15000) stat.tier = 'VIP Platinum';
      else if (stat.totalSpent >= 6000) stat.tier = 'VIP Gold';
      else if (stat.orderCount >= 2 || stat.totalSpent >= 2500) stat.tier = 'Silver';
      else if (stat.orderCount === 1) stat.tier = 'Starter';
      else stat.tier = 'Prospect';
    });

    return map;
  }, [customers, orders]);

  // High-level CRM KPI calculations
  const kpiData = useMemo(() => {
    const totalCustomers = customers.length;
    let repeatCustomers = 0;
    let totalRevenue = 0;
    let totalOrders = 0;

    Object.values(customerStatsMap).forEach(stat => {
      if (stat.orderCount >= 2) repeatCustomers += 1;
      totalRevenue += stat.totalSpent;
      totalOrders += stat.orderCount;
    });

    const avgLtv = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const repeatRate = totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(0) : '0';

    return {
      totalCustomers,
      repeatCustomers,
      repeatRate,
      totalRevenue,
      avgLtv,
      totalOrders
    };
  }, [customers, customerStatsMap]);

  // Filter & Sort Logic
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const stats = customerStatsMap[c.email.toLowerCase().trim()];
        const matchBasic = (
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.shipping_city && c.shipping_city.toLowerCase().includes(q)) ||
          (c.shipping_address && c.shipping_address.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q)
        );
        const matchOrders = stats?.customerOrders.some(o => 
          (o.order_number && o.order_number.toLowerCase().includes(q)) ||
          o.id.toLowerCase().includes(q)
        );
        return matchBasic || matchOrders;
      });
    }

    // Tier segment filter
    if (selectedTier !== 'all') {
      result = result.filter(c => {
        const stats = customerStatsMap[c.email.toLowerCase().trim()];
        if (!stats) return false;
        if (selectedTier === 'vip') return stats.tier === 'VIP Platinum' || stats.tier === 'VIP Gold';
        if (selectedTier === 'repeat') return stats.orderCount >= 2;
        if (selectedTier === 'first') return stats.orderCount === 1;
        if (selectedTier === 'prospect') return stats.orderCount === 0;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const statsA = customerStatsMap[a.email.toLowerCase().trim()] || { totalSpent: 0, orderCount: 0, lastOrderDate: null };
      const statsB = customerStatsMap[b.email.toLowerCase().trim()] || { totalSpent: 0, orderCount: 0, lastOrderDate: null };

      if (sortBy === 'spent-desc') return statsB.totalSpent - statsA.totalSpent;
      if (sortBy === 'spent-asc') return statsA.totalSpent - statsB.totalSpent;
      if (sortBy === 'orders-desc') return statsB.orderCount - statsA.orderCount;
      if (sortBy === 'name-asc') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'recent') {
        const dateA = statsA.lastOrderDate ? new Date(statsA.lastOrderDate).getTime() : 0;
        const dateB = statsB.lastOrderDate ? new Date(statsB.lastOrderDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [customers, searchQuery, selectedTier, sortBy, customerStatsMap]);

  const copyToClipboard = (text: string, key: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    fireToast(`${label}: ${text}`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getWhatsAppLink = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('09')) {
      formattedPhone = '63' + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(`Hi ${name}! Thank you for choosing SlimDose. We are following up regarding your peptide protocol.`);
    return `https://wa.me/${formattedPhone}?text=${message}`;
  };

  const handleExportCSV = () => {
    const headers = [
      'Customer ID', 
      'Full Name', 
      'Email', 
      'Phone', 
      'Full Address', 
      'City', 
      'State/Province', 
      'Zip Code', 
      'Customer Tier',
      'Total Orders', 
      'Total Spent (PHP)',
      'Last Order Date',
      'Registered At'
    ];
    
    const rows = filteredAndSortedCustomers.map(c => {
      const stats = customerStatsMap[c.email.toLowerCase().trim()] || { orderCount: 0, totalSpent: 0, tier: 'Prospect', lastOrderDate: null };
      const fullAddress = `"${[c.shipping_address, c.shipping_city, c.shipping_state, c.shipping_zip_code].filter(Boolean).join(', ')}"`;
      return [
        c.id,
        `"${c.full_name.replace(/"/g, '""')}"`,
        c.email,
        `"${c.phone || ''}"`,
        fullAddress,
        `"${c.shipping_city || ''}"`,
        `"${c.shipping_state || ''}"`,
        c.shipping_zip_code || '',
        stats.tier,
        stats.orderCount,
        stats.totalSpent.toFixed(2),
        stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString('en-US') : 'N/A',
        c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : 'N/A'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `slimdose_crm_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    fireToast(`Exported ${filteredAndSortedCustomers.length} customer records to CSV`, 'success');
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'VIP Platinum':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'VIP Gold':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Silver':
        return 'bg-blue-100 text-[#3C6CA8] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Starter':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="animate-spin w-9 h-9 border-3 border-[#3C6CA8] border-t-transparent rounded-full shadow-md" />
        <p className="text-xs font-bold text-slate-500 animate-pulse">Loading Customer CRM Directory & Realtime Metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left font-inter max-w-7xl mx-auto">
      
      {/* ── Top Header & KPI Dashboard ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Customer Directory */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Total Customers
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {kpiData.totalCustomers}
              </span>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md">
                Active CRM
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Revenue Spent */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Total Customer LTV
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-[#3C6CA8] dark:text-blue-400">
                ₱{kpiData.totalRevenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Repeat Customer Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Retention & Repeat
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {kpiData.repeatRate}%
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                ({kpiData.repeatCustomers} repeats)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Avg Spend / Customer */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Average Spend / User
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                ₱{kpiData.avgLtv.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Action Toolbar: Search, Filters, Live Sync Badge & CSV Export ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input id="customercrmmanager-search-by-name-email-phone-cit" name="search_by_name_email_phone_cit" type="text"
              placeholder="Search by name, email, phone, city, order ID..."
              value={searchQuery}
              autoComplete="email" onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            
            {/* Realtime Live Sync Status */}
            <div 
              onClick={handleRefresh}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all select-none"
              title="Click to manually refresh CRM data"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Live Realtime</span>
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isRefreshing ? 'animate-spin text-[#3C6CA8]' : ''}`} />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1">
              <select id="customercrmmanager-input-2" name="input_2" value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort customer records"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 cursor-pointer"
              >
                <option value="spent-desc">Highest Spend (LTV)</option>
                <option value="orders-desc">Most Orders</option>
                <option value="recent">Recent Order Activity</option>
                <option value="name-asc">Alphabetical (A-Z)</option>
                <option value="spent-asc">Lowest Spend</option>
              </select>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#3C6CA8] hover:bg-[#325a8c] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              title="Export filtered customer list as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-[11px] font-bold">
          <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-[#3C6CA8]" /> Segment:
          </span>

          <button
            type="button"
            onClick={() => setSelectedTier('all')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              selectedTier === 'all'
                ? 'bg-[#3C6CA8] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('vip')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              selectedTier === 'vip'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100'
            }`}
          >
            VIP Platinum & Gold
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('repeat')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              selectedTier === 'repeat'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-[#3C6CA8] dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100'
            }`}
          >
            Repeat Buyers (2+)
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('first')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              selectedTier === 'first'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            1st-Time Buyers (1)
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('prospect')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              selectedTier === 'prospect'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Prospects / 0 Orders
          </button>
        </div>
      </div>

      {/* ── Main CRM Records Display: Responsive Desktop Table & Mobile Cards ── */}
      {filteredAndSortedCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <h4 className="text-base font-black text-slate-800 dark:text-white">No Customers Match Filter</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Try adjusting your search query or switching to &ldquo;All&rdquo; segments to view registered and guest customer profiles.
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSelectedTier('all'); }}
            className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          {/* 1. DESKTOP VIEW: High-Density Table (Hidden on Mobile & Tablet <1024px) */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th className="py-3.5 px-5 text-left">Customer Profile</th>
                  <th className="py-3.5 px-5 text-left">Contact Channels</th>
                  <th className="py-3.5 px-5 text-left">Delivery Address</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-5 text-right">Lifetime Spent</th>
                  <th className="py-3.5 px-4 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredAndSortedCustomers.map((c) => {
                  const emailKey = c.email.toLowerCase().trim();
                  const stats = customerStatsMap[emailKey] || { 
                    orderCount: 0, 
                    totalSpent: 0, 
                    tier: 'Prospect', 
                    lastOrderDate: null, 
                    customerOrders: [] 
                  };
                  const initial = c.full_name.trim().charAt(0).toUpperCase() || 'C';

                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => setActiveCustomer(c)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    >
                      {/* Customer Profile Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3C6CA8] to-blue-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-[#3C6CA8] transition-colors">
                                {c.full_name}
                              </p>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border shrink-0 ${getTierBadgeStyle(stats.tier)}`}>
                                {stats.tier}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>ID: {c.id ? String(c.id).slice(0, 8) : 'N/A'}</span>
                              {c.id && String(c.id).startsWith('guest_') && (
                                <span className="px-1 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-bold text-slate-500">
                                  Guest
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details Column */}
                      <td className="py-3.5 px-5" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          {/* Email */}
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <a 
                              href={`mailto:${c.email}`} 
                              className="hover:text-[#3C6CA8] truncate max-w-[180px]"
                              title={`Email ${c.email}`}
                            >
                              {c.email}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.email, `email_${c.id}`, 'Email copied')}
                              className="p-0.5 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Copy Email"
                            >
                              {copiedKey === `email_${c.id}` ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>

                          {/* Phone & WhatsApp */}
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <a 
                                href={`tel:${c.phone}`} 
                                className="hover:text-[#3C6CA8]"
                              >
                                {c.phone}
                              </a>
                              <a
                                href={getWhatsAppLink(c.phone, c.full_name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 text-emerald-600 hover:text-emerald-700 transition-colors"
                                title="Open WhatsApp Chat"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(c.phone, `phone_${c.id}`, 'Phone copied')}
                                className="p-0.5 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Copy Phone"
                              >
                                {copiedKey === `phone_${c.id}` ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">No phone listed</span>
                          )}
                        </div>
                      </td>

                      {/* Default Delivery Address */}
                      <td className="py-3.5 px-5 max-w-[220px]" onClick={(e) => e.stopPropagation()}>
                        {c.shipping_address || c.shipping_city ? (
                          <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] leading-tight line-clamp-2" title={[c.shipping_address, c.shipping_city, c.shipping_state, c.shipping_zip_code].filter(Boolean).join(', ')}>
                              {[c.shipping_address, c.shipping_city, c.shipping_state].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No address saved</span>
                        )}
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-xs ${
                          stats.orderCount > 0 
                            ? 'bg-blue-50 text-[#3C6CA8] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900' 
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}>
                          <ShoppingBag className="w-3 h-3" />
                          {stats.orderCount}
                        </span>
                      </td>

                      {/* Lifetime Spent */}
                      <td className="py-3.5 px-5 text-right">
                        <p className="font-black text-slate-900 dark:text-white text-xs">
                          ₱{stats.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        {stats.lastOrderDate && (
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Last: {new Date(stats.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </td>

                      {/* Action Arrow */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveCustomer(c)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#3C6CA8] hover:text-white text-slate-500 transition-all cursor-pointer shadow-xs"
                          title="View customer timeline & order history"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 2. MOBILE & TABLET VIEW: Ultra-Responsive High-Density Cards (<1024px) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
            {filteredAndSortedCustomers.map((c) => {
              const emailKey = c.email.toLowerCase().trim();
              const stats = customerStatsMap[emailKey] || { 
                orderCount: 0, 
                totalSpent: 0, 
                tier: 'Prospect', 
                lastOrderDate: null, 
                customerOrders: [] 
              };
              const initial = c.full_name.trim().charAt(0).toUpperCase() || 'C';

              return (
                <div
                  key={c.id}
                  onClick={() => setActiveCustomer(c)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-[#3C6CA8] transition-all cursor-pointer active:scale-[0.99]"
                >
                  {/* Card Header: Avatar, Name, Tier & Total Spent */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3C6CA8] to-blue-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {c.full_name}
                          </h4>
                        </div>
                        <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border mt-0.5 ${getTierBadgeStyle(stats.tier)}`}>
                          {stats.tier}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Spent</span>
                      <span className="font-black text-sm text-[#3C6CA8] dark:text-blue-400">
                        ₱{stats.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Card Contact Info: Email & Phone */}
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <a href={`mailto:${c.email}`} className="truncate hover:text-[#3C6CA8]">{c.email}</a>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(c.email, `m_email_${c.id}`, 'Email copied')}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {copiedKey === `m_email_${c.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {c.phone && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <a href={`tel:${c.phone}`} className="hover:text-[#3C6CA8] font-mono">{c.phone}</a>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getWhatsAppLink(c.phone, c.full_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1"
                          >
                            <MessageCircle className="w-2.5 h-2.5" /> WA
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.phone, `m_phone_${c.id}`, 'Phone copied')}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            {copiedKey === `m_phone_${c.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta & Open Action */}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-bold">
                      <ShoppingBag className="w-3 h-3 text-[#3C6CA8]" />
                      <span>{stats.orderCount} {stats.orderCount === 1 ? 'Order' : 'Orders'}</span>
                    </span>

                    <span className="flex items-center gap-1 text-[#3C6CA8] dark:text-blue-400 font-extrabold">
                      View Profile & History <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── CUSTOMER PROFILE & ORDER TIMELINE MODAL / DRAWER ── */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-[#1E3A60] to-[#3C6CA8] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg text-white border border-white/30 shadow-xs">
                  {activeCustomer.full_name.trim().charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="text-base font-black text-white leading-tight">
                    {activeCustomer.full_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-blue-100 font-medium">
                    <span>ID: {activeCustomer.id}</span>
                    <span>•</span>
                    <span className="text-emerald-300 font-bold">
                      {customerStatsMap[activeCustomer.email.toLowerCase().trim()]?.tier || 'Customer'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveCustomer(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Top Quick Stats Grid */}
              {(() => {
                const stats = customerStatsMap[activeCustomer.email.toLowerCase().trim()] || { orderCount: 0, totalSpent: 0, lastOrderDate: null, customerOrders: [] };
                return (
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Orders</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">{stats.orderCount}</span>
                    </div>
                    <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900">
                      <span className="text-[10px] font-bold text-[#3C6CA8] uppercase block">Lifetime Value</span>
                      <span className="text-lg font-black text-[#3C6CA8] dark:text-blue-300 mt-0.5 block">
                        ₱{stats.totalSpent.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Activity</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 block">
                        {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Contact & Address Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Contact Channels */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    Contact Channels
                  </span>
                  <div className="space-y-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${activeCustomer.email}`} className="truncate hover:text-[#3C6CA8]">{activeCustomer.email}</a>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeCustomer.email, 'modal_email', 'Email copied')}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        {copiedKey === 'modal_email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {activeCustomer.phone && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a href={`tel:${activeCustomer.phone}`} className="hover:text-[#3C6CA8] font-mono">{activeCustomer.phone}</a>
                        </span>
                        <div className="flex items-center gap-1">
                          <a
                            href={getWhatsAppLink(activeCustomer.phone, activeCustomer.full_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1"
                          >
                            <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeCustomer.phone, 'modal_phone', 'Phone copied')}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          >
                            {copiedKey === 'modal_phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    Default Shipping Address
                  </span>
                  {activeCustomer.shipping_address || activeCustomer.shipping_city ? (
                    <div className="text-slate-700 dark:text-slate-300 font-medium space-y-1">
                      <p className="leading-tight">
                        {[activeCustomer.shipping_address, activeCustomer.shipping_city, activeCustomer.shipping_state, activeCustomer.shipping_zip_code].filter(Boolean).join(', ')}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard([activeCustomer.shipping_address, activeCustomer.shipping_city, activeCustomer.shipping_state, activeCustomer.shipping_zip_code].filter(Boolean).join(', '), 'modal_address', 'Address copied')}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3C6CA8] hover:underline pt-0.5 cursor-pointer"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy Full Address
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No saved delivery address available.</p>
                  )}
                </div>
              </div>

              {/* Order History Timeline */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#3C6CA8]" />
                    <span>Customer Order History & Timeline</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {customerStatsMap[activeCustomer.email.toLowerCase().trim()]?.customerOrders.length || 0} Records
                  </span>
                </div>

                {(() => {
                  const ordersList = customerStatsMap[activeCustomer.email.toLowerCase().trim()]?.customerOrders || [];
                  if (ordersList.length === 0) {
                    return (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                        No orders recorded yet for this customer profile.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {ordersList.map(ord => (
                        <div
                          key={ord.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 dark:text-white">
                                {formatOrderId(ord)}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                                ord.order_status === 'delivered' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : ord.order_status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-blue-100 text-[#3C6CA8] dark:bg-blue-950/60 dark:text-blue-300'
                              }`}>
                                {ord.order_status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {new Date(ord.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-slate-900 dark:text-white text-xs block">
                              ₱{(Number(ord.total_price || 0) + Number(ord.shipping_fee || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {ord.order_items?.length || 1} {(ord.order_items?.length || 1) === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Customer Record: {activeCustomer.email}
              </span>
              <button
                type="button"
                onClick={() => setActiveCustomer(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
