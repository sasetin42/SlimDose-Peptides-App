import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  Check,
  Trash2,
  Plus,
  MessageSquare,
  ShieldAlert,
  User,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Filter,
  X,
  ExternalLink,
  ThumbsUp,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FileSpreadsheet,
  CheckCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

export interface AdminReview {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  profile_image_url: string | null;
  is_verified_purchase: boolean;
  review_date: string;
  approved: boolean;
  is_approved?: boolean;
  products?: { name: string } | null;
}

export default function ProductReviewsManager() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | '5-star' | 'verified'>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');

  // Form states for manual review upload
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [revRes, prodRes] = await Promise.all([
        supabase
          .from('product_reviews')
          .select('*')
          .order('review_date', { ascending: false }),
        supabase
          .from('products')
          .select('id, name')
          .order('name', { ascending: true })
      ]);

      if (revRes.error) throw revRes.error;
      if (prodRes.error) throw prodRes.error;

      const prods = prodRes.data || [];
      const prodMap = new Map<string, string>();
      prods.forEach((p: any) => {
        if (p.id && p.name) prodMap.set(p.id, p.name);
      });

      const normalizedReviews: AdminReview[] = (revRes.data || []).map((r: any) => {
        const isAppr = r.approved !== undefined ? Boolean(r.approved) : Boolean(r.is_approved);
        const prodName = prodMap.get(r.product_id) || r.products?.name || (r.product_id ? 'Peptide Item' : 'General Product');
        return {
          ...r,
          approved: isAppr,
          is_approved: isAppr,
          products: { name: prodName }
        };
      });

      setReviews(normalizedReviews);
      setProducts(prods);
    } catch (err: any) {
      console.error('Error loading reviews:', err);
      if (!silent) {
        fireToast(`Failed to load reviews: ${err.message}`, 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('product_reviews_realtime_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_reviews' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fireToast('⭐ New customer review received for moderation!', 'info');
          }
          loadData(true);
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    fireToast('Reviews updated live from database', 'success', 2000);
  };

  // Toggle Approval Status
  const handleToggleApprove = async (review: AdminReview) => {
    try {
      const nextStatus = !review.approved;
      const { error } = await supabase
        .from('product_reviews')
        .update({ approved: nextStatus, is_approved: nextStatus })
        .eq('id', review.id);

      if (error) throw error;

      fireToast(
        nextStatus ? 'Review approved & published live!' : 'Review unpublished to pending status.',
        nextStatus ? 'success' : 'info'
      );
      await loadData(true);
    } catch (err: any) {
      fireToast(`Approval action failed: ${err.message}`, 'error');
    }
  };

  // Bulk Approve All Pending
  const handleApproveAllPending = async () => {
    const pendingList = reviews.filter(r => !r.approved);
    if (pendingList.length === 0) return;

    if (!confirm(`Are you sure you want to approve and publish all ${pendingList.length} pending reviews?`)) {
      return;
    }

    try {
      setIsRefreshing(true);
      await Promise.all(
        pendingList.map(r =>
          supabase
            .from('product_reviews')
            .update({ approved: true, is_approved: true })
            .eq('id', r.id)
        )
      );
      fireToast(`All ${pendingList.length} pending reviews published live!`, 'success');
      await loadData(true);
    } catch (err: any) {
      fireToast(`Batch approval error: ${err.message}`, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Delete Review
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete review from "${name}"?`)) return;
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fireToast('Review deleted permanently.', 'info');
      await loadData(true);
    } catch (err: any) {
      fireToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Submit Manual Review
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !customerName.trim() || !reviewText.trim()) {
      fireToast('Please select a product, customer name, and review comments.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('product_reviews')
        .insert([{
          product_id: selectedProductId,
          customer_name: customerName.trim(),
          rating: Number(rating),
          review_text: reviewText.trim(),
          profile_image_url: profileImageUrl.trim() || null,
          is_verified_purchase: Boolean(isVerified),
          approved: true,
          is_approved: true,
          review_date: new Date().toISOString()
        }]);

      if (error) throw error;

      setIsAdding(false);
      setSelectedProductId('');
      setCustomerName('');
      setRating(5);
      setReviewText('');
      setProfileImageUrl('');
      setIsVerified(true);

      fireToast('New review testimonial published successfully!', 'success');
      await loadData(true);
    } catch (err: any) {
      fireToast(`Failed to add review: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Preset Testimonial Helper
  const applyPresetTestimonial = (preset: { name: string; rating: number; text: string; verified: boolean }) => {
    setCustomerName(preset.name);
    setRating(preset.rating);
    setReviewText(preset.text);
    setIsVerified(preset.verified);
  };

  // Format Relative / Absolute Date
  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'Recent';
    const d = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 86400 * 7) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(r => !r.approved);
    const approved = reviews.filter(r => r.approved);
    const verified = reviews.filter(r => r.is_verified_purchase);

    const ratingsSum = reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    const avgRating = total > 0 ? (ratingsSum / total).toFixed(1) : '5.0';
    const fiveStarCount = reviews.filter(r => Math.round(r.rating) === 5).length;

    return {
      total,
      pendingCount: pending.length,
      approvedCount: approved.length,
      verifiedCount: verified.length,
      avgRating,
      fiveStarCount
    };
  }, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews
      .filter(r => {
        if (selectedProductFilter !== 'all' && r.product_id !== selectedProductFilter) return false;

        if (statusFilter === 'pending' && r.approved) return false;
        if (statusFilter === 'approved' && !r.approved) return false;
        if (statusFilter === '5-star' && Math.round(r.rating) !== 5) return false;
        if (statusFilter === 'verified' && !r.is_verified_purchase) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (r.customer_name || '').toLowerCase().includes(q);
          const textMatch = (r.review_text || '').toLowerCase().includes(q);
          const prodMatch = (r.products?.name || '').toLowerCase().includes(q);
          return nameMatch || textMatch || prodMatch;
        }
        return true;
      })
      .sort((a, b) => new Date(b.review_date || 0).getTime() - new Date(a.review_date || 0).getTime());
  }, [reviews, statusFilter, selectedProductFilter, searchQuery]);

  if (loading && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center animate-pulse">
          <RefreshCw className="w-6 h-6 text-[#3C6CA8] animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading Product Reviews &amp; Testimonials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left max-w-7xl mx-auto pb-10">
      {/* ── Top Header & Live Sync Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Product Reviews &amp; Testimonials
                </h1>
                {/* Live Realtime Pulse Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                    isLiveConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="hidden xs:inline">{isLiveConnected ? 'Live Sync Active' : 'Connecting'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Moderate customer testimonials, star ratings &amp; clinical feedback across all products.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {stats.pendingCount > 0 && (
            <button
              onClick={handleApproveAllPending}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Approve All Pending Reviews"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Approve All ({stats.pendingCount})</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3C6CA8]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
            <span>{isAdding ? 'Close Form' : 'Add Testimonial'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Average Rating Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Rating</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.avgRating}</span>
            <div className="flex items-center text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400" />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {stats.fiveStarCount} perfect 5-star ratings
          </p>
        </div>

        {/* Pending Approvals Card */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'pending'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Moderation</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.pendingCount}</span>
            {stats.pendingCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full animate-pulse">
                Needs Review
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Submitted from storefront forms
          </p>
        </div>

        {/* Verified Purchase Card */}
        <div
          onClick={() => setStatusFilter('verified')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'verified'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verified Buyers</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">{stats.verifiedCount}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Confirmed peptide purchasers
          </p>
        </div>

        {/* Total Reviews Card */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'all'
              ? 'border-[#3C6CA8] ring-2 ring-[#3C6CA8]/20 bg-blue-50/20'
              : 'border-slate-200/80 hover:border-[#3C6CA8]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Testimonials</span>
            <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.total}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {stats.approvedCount} live &amp; visible on site
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="productreviewsmanager-search"
              name="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, peptide product, or review text..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] transition-all text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              id="productreviewsmanager-product-filter"
              name="product_filter"
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] cursor-pointer"
            >
              <option value="all">All Products ({products.length})</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3 custom-scrollbar">
          {(
            [
              { id: 'all', label: 'All Testimonials', count: stats.total },
              { id: 'pending', label: 'Pending Review', count: stats.pendingCount, alert: stats.pendingCount > 0 },
              { id: 'approved', label: 'Approved Live', count: stats.approvedCount },
              { id: '5-star', label: '5-Star Ratings', count: stats.fiveStarCount },
              { id: 'verified', label: 'Verified Buyers', count: stats.verifiedCount }
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'bg-slate-100/70 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Add Manual Testimonial Form Drawer ── */}
      {isAdding && (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-5 sm:p-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Post Customer Testimonial
                </h3>
                <p className="text-xs text-slate-500">Publish clinical feedback or verified patient reviews</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Testimonial Templates:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  name: 'Dr. Marco Alcantara',
                  rating: 5,
                  text: 'Superb purity and high consistency on BPC-157. Fast cold-chain courier delivery in Manila.',
                  verified: true
                },
                {
                  name: 'Ma. Theresa Santos, QC',
                  rating: 5,
                  text: 'Down 12kg after 8 weeks with Tirzepatide. Appetite suppression kicked in smoothly on day one with zero crashes.',
                  verified: true
                },
                {
                  name: 'Atty. James L., Makati',
                  rating: 5,
                  text: 'SlimPen Pro makes microdosing extremely easy and foolproof. Reconstitution is straightforward with BAC water.',
                  verified: true
                }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPresetTestimonial(preset)}
                  className="text-[11px] font-semibold bg-slate-100 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  ⚡ {preset.name.split(' ')[0]}: "{preset.text.slice(0, 32)}..."
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleAddReview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]"
                  required
                >
                  <option value="">Select a Product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer / Reviewer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Dr. Roberto K. or Jane D."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]"
                  required
                />
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Star Rating (1 to 5)
                </label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-black text-slate-700 ml-2">{rating}.0 / 5.0</span>
                </div>
              </div>

              {/* Verified Purchase Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Verified Buyer Status
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer mt-1.5">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="w-4 h-4 text-[#3C6CA8] rounded-md focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">Mark as Verified Purchase</span>
                </label>
              </div>
            </div>

            {/* Review Comments */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Testimonial / Review Comments <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Enter customer review observations, clinical benefits, weight loss results, or delivery experience..."
                rows={3}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]"
                required
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Testimonial Live'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Testimonials Grid ── */}
      {filteredReviews.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-black text-slate-800">No matching reviews found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search term or clearing filters.'
              : 'There are no testimonials in this category yet.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Testimonial</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((review) => {
            const initials = review.customer_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={review.id}
                className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between ${
                  !review.approved
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Review Header & Rating */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with fallback initials */}
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#3C6CA8] font-bold text-xs shrink-0 overflow-hidden">
                        {review.profile_image_url ? (
                          <img
                            src={review.profile_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as any).style.display = 'none'; }}
                          />
                        ) : (
                          <span>{initials || <User className="w-4 h-4" />}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {review.customer_name}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.2">
                          Target: <strong className="text-slate-800">{review.products?.name || 'General Product'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < Math.round(review.rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
                        />
                      ))}
                      <span className="text-[10px] font-black text-amber-700 ml-1">{review.rating}.0</span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50/60 p-3 rounded-xl border border-slate-100 mb-3">
                    "{review.review_text}"
                  </p>
                </div>

                {/* Footer Badges & Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {review.approved ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live on Site
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Pending Moderation
                      </span>
                    )}

                    {review.is_verified_purchase && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#3C6CA8] border border-blue-200">
                        ✓ Verified Buyer
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 ml-1">
                      {formatDateDisplay(review.review_date)}
                    </span>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleApprove(review)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        review.approved
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={review.approved ? 'Unpublish Review' : 'Approve Review'}
                    >
                      <Check className="w-3 h-3" />
                      <span>{review.approved ? 'Unpublish' : 'Approve'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(review.id, review.customer_name)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
}
