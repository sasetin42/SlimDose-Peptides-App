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
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  profile_image_url: string | null;
  is_verified_purchase: boolean;
  review_date: string;
  is_approved: boolean;
  products?: { name: string } | null;
}

export default function ProductReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
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
          .select('*, products(name)')
          .order('review_date', { ascending: false }),
        supabase
          .from('products')
          .select('id, name')
          .order('name', { ascending: true })
      ]);

      if (revRes.error) throw revRes.error;
      if (prodRes.error) throw prodRes.error;

      setReviews(revRes.data || []);
      setProducts(prodRes.data || []);
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
            fireToast('⭐ New customer review submitted for moderation!', 'info');
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
  const handleToggleApprove = async (review: Review) => {
    try {
      const nextStatus = !review.is_approved;
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: nextStatus })
        .eq('id', review.id);

      if (error) throw error;

      fireToast(
        nextStatus ? 'Review approved & published live!' : 'Review unpublished to pending.',
        nextStatus ? 'success' : 'info'
      );
      await loadData(true);
    } catch (err: any) {
      fireToast(`Approval action failed: ${err.message}`, 'error');
    }
  };

  // Delete Review
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete review from "${name}"?`)) return;
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
      fireToast('Please select a product, customer name, and review text.', 'warning');
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
  const formatDateDisplay = (dateString: string) => {
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
    const pending = reviews.filter(r => !r.is_approved);
    const approved = reviews.filter(r => r.is_approved);
    const verified = reviews.filter(r => r.is_verified_purchase);

    const ratingsSum = reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    const avgRating = total > 0 ? (ratingsSum / total).toFixed(1) : '5.0';
    const fiveStarCount = reviews.filter(r => r.rating === 5).length;

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

        if (statusFilter === 'pending' && r.is_approved) return false;
        if (statusFilter === 'approved' && !r.is_approved) return false;
        if (statusFilter === '5-star' && r.rating !== 5) return false;
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
      .sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime());
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
                Moderate verified customer testimonials, star ratings &amp; clinical feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.pendingCount}</span>
            {stats.pendingCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full animate-pulse">
                Needs Audit
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
            <input id="productreviewsmanager-search" name="search" type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, peptide product, or testimonial comment..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] transition-all text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <select id="productreviewsmanager-input-2" name="input_2" value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] cursor-pointer"
            >
              <option value="all">All Peptide Products</option>
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
                  name: 'Clarissa M.',
                  rating: 5,
                  text: 'Noticeable energy improvement and appetite regulation on Semaglutide. Highly recommend!',
                  verified: true
                },
                {
                  name: 'Kenzo Tan',
                  rating: 5,
                  text: 'Prompt customer support and genuine research peptides with verifiable COA documentation.',
                  verified: true
                }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPresetTestimonial(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 font-medium transition-colors cursor-pointer"
                >
                  + Template: {preset.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddReview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="productreviewsmanager-target-product" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Product *
                </label>
                <select id="productreviewsmanager-target-product" name="target_product" required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                >
                  <option value="">-- Select Peptide Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="productreviewsmanager-customer-reviewer-name" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer / Reviewer Name *
                </label>
                <input id="productreviewsmanager-customer-reviewer-name" name="customer_reviewer_name" type="text"
                  required
                  value={customerName}
                  autoComplete="name" onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Dra. Sophia Lim"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                />
              </div>

              <div>
                <label htmlFor="productreviewsmanager-star-rating-1-to-5-1-2-3-4-5-m" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Star Rating (1 to 5) *
                </label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${starVal <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-slate-700">{rating} Stars</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="productreviewsmanager-star-rating-1-to-5-1-2-3-4-5-m" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Testimonial Narrative &amp; Feedback *
              </label>
              <textarea id="productreviewsmanager-star-rating-1-to-5-1-2-3-4-5-m" name="star_rating_1_to_5_1_2_3_4_5_m" required
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Enter client testimonial, research observations, or recovery feedback..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label htmlFor="productreviewsmanager-profile-photo-url-optional" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Profile Photo URL (Optional)
                </label>
                <input id="productreviewsmanager-profile-photo-url-optional" name="profile_photo_url_optional" type="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div className="flex items-center pt-2 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input id="productreviewsmanager-checkbox-4" name="checkbox_4" type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="w-4 h-4 text-[#3C6CA8] rounded focus:ring-[#3C6CA8]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    🛡️ Mark with "Verified Purchase" Badge
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                <span>Publish Testimonial</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Reviews Cards Grid ── */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Reviews Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No customer testimonials matching "${searchQuery}".`
              : 'Customer reviews submitted on product pages will appear here for verification.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
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
                  !review.is_approved
                    ? 'border-amber-300 bg-amber-50/15'
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
                          <span>{initials || 'U'}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {review.customer_name}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.2">
                          Target: <strong className="text-slate-700">{review.products?.name || 'General Product'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
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
                    {review.is_approved ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live on Site
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Pending Approval
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
                      onClick={() => handleToggleApprove(review)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        review.is_approved
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={review.is_approved ? 'Unpublish Review' : 'Approve Review'}
                    >
                      <Check className="w-3 h-3" />
                      <span>{review.is_approved ? 'Unpublish' : 'Approve'}</span>
                    </button>

                    <button
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
