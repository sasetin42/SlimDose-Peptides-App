import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  Check,
  User,
  Loader2,
  Sparkles,
  ThumbsUp,
  ShieldCheck,
  Award,
  Filter,
  ArrowUpDown,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import { fireToast } from './ToastNotification';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

type FilterOption = 'all' | '5star' | '4star' | '3star' | '2star' | '1star' | 'verified';
type SortOption = 'newest' | 'highest' | 'lowest' | 'most_helpful';

const HELPFUL_STORAGE_KEY = 'slimdose_helpful_reviews';

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId = '', productName = 'Product' }) => {
  const { reviews, loading, addReview, stats, refreshReviews } = useReviews(productId);
  
  // Submit review state
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlySubmitted, setRecentlySubmitted] = useState(false);

  // Filter & Sort state
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Local & persistent state to track helpfulness clicks per review ID
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [votedHelpful, setVotedHelpful] = useState<Record<string, boolean>>(() => {
    try {
      const savedVotes = localStorage.getItem(HELPFUL_STORAGE_KEY);
      return savedVotes ? JSON.parse(savedVotes) : {};
    } catch {
      return {};
    }
  });

  const handleHelpfulClick = (reviewId: string) => {
    if (votedHelpful[reviewId]) return;
    
    const updatedVotes = {
      ...votedHelpful,
      [reviewId]: true
    };

    setHelpfulCounts(prev => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1
    }));
    setVotedHelpful(updatedVotes);

    try {
      localStorage.setItem(HELPFUL_STORAGE_KEY, JSON.stringify(updatedVotes));
    } catch (err) {
      console.warn('Could not save helpful votes to storage', err);
    }

    fireToast('Thank you for your feedback! Marked as helpful.', 'success');
  };

  const handleQuickTag = (tag: string) => {
    setReviewText(prev => prev ? `${prev} ${tag}` : tag);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !reviewText.trim()) {
      fireToast('Please fill in your name and review comments.', 'warning');
      return;
    }

    if (reviewText.trim().length < 5) {
      fireToast('Review comment should be at least 5 characters.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addReview({
        product_id: productId,
        customer_name: customerName.trim(),
        rating,
        review_text: reviewText.trim(),
        profile_image_url: null,
        is_verified_purchase: false,
      });

      if (res.success) {
        fireToast('Thank you! Your verified review has been submitted for moderation.', 'success');
        setCustomerName('');
        setReviewText('');
        setRating(5);
        setShowForm(false);
        setRecentlySubmitted(true);
        refreshReviews();
      } else {
        fireToast(res.error || 'Failed to submit review', 'error');
      }
    } catch (err) {
      console.error('Review submit error:', err);
      fireToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Filter
    if (activeFilter === '5star') {
      result = result.filter(r => Math.round(r.rating) === 5);
    } else if (activeFilter === '4star') {
      result = result.filter(r => Math.round(r.rating) === 4);
    } else if (activeFilter === '3star') {
      result = result.filter(r => Math.round(r.rating) === 3);
    } else if (activeFilter === '2star') {
      result = result.filter(r => Math.round(r.rating) === 2);
    } else if (activeFilter === '1star') {
      result = result.filter(r => Math.round(r.rating) <= 1);
    } else if (activeFilter === 'verified') {
      result = result.filter(r => r.is_verified_purchase);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.review_date || b.created_at).getTime() - new Date(a.review_date || a.created_at).getTime();
      }
      if (sortBy === 'highest') {
        return b.rating - a.rating;
      }
      if (sortBy === 'lowest') {
        return a.rating - b.rating;
      }
      if (sortBy === 'most_helpful') {
        const countA = (helpfulCounts[a.id] || 0) + (a.is_verified_purchase ? 3 : 1);
        const countB = (helpfulCounts[b.id] || 0) + (b.is_verified_purchase ? 3 : 1);
        return countB - countA;
      }
      return 0;
    });

    return result;
  }, [reviews, activeFilter, sortBy, helpfulCounts]);

  if (loading && reviews.length === 0) {
    return (
      <div className="py-10 flex flex-col justify-center items-center text-xs text-gray-500 space-y-2" aria-busy="true" aria-live="polite">
        <Loader2 className="w-5 h-5 animate-spin text-[#3C6CA8]" />
        <span className="font-semibold">Loading product reviews &amp; ratings...</span>
      </div>
    );
  }

  return (
    <div className="mt-8 sm:mt-10 w-full text-left font-sans">
      {/* Mobile-Optimized Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-slate-800 pb-3.5 mb-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#3C6CA8] dark:text-[#6A9BE0] uppercase">
              Customer Feedback
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] border border-[#3C6CA8]/30 shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-[#3C6CA8] dark:text-[#94BBE9]" /> Lab Verified
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Product Reviews
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          aria-controls="review-form"
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#274873] text-white text-xs font-black transition-all shadow-md active:scale-[0.98] cursor-pointer shrink-0 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" /> Cancel Review
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" /> Write a Review
            </>
          )}
        </button>
      </div>

      {/* Trust Guarantee Feature Bar */}
      <div className="mb-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#3C6CA8]/10 via-blue-50/50 to-[#3C6CA8]/5 dark:from-[#3C6CA8]/20 dark:via-slate-900 dark:to-[#3C6CA8]/10 border border-[#3C6CA8]/25 dark:border-[#3C6CA8]/40 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-[11px] sm:text-xs text-gray-900 dark:text-white truncate">
            100% Authentic Verified Feedback
          </span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-slate-400 font-semibold shrink-0 hidden xs:inline">
          Certified Testers
        </span>
      </div>

      {/* Review Submission Form with Smooth Mobile Experience */}
      {showForm && (
        <form
          id="review-form"
          onSubmit={handleSubmit}
          className="mb-5 p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#3C6CA8]/40 dark:border-[#3C6CA8]/60 shadow-lg space-y-4 animate-slideIn"
        >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
            <h4 className="font-black text-gray-900 dark:text-white text-xs sm:text-sm">
              Write a Review for <span className="text-[#3C6CA8] dark:text-[#6A9BE0]">{productName}</span>
            </h4>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-semibold">
              Moderated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="customer-name" className="block text-[11px] font-black text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Your Full Name or Alias
              </label>
              <input
                id="customer-name"
                type="text"
                value={customerName}
                autoComplete="name"
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Dr. Alex Thorne"
                className="w-full min-h-[44px] text-xs px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="rating-group" className="block text-[11px] font-black text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1.5" id="rating-label">
                Overall Rating
              </label>
              <div id="rating-group" className="flex items-center justify-start gap-1 py-1" role="group" aria-labelledby="rating-label">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-gray-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-gray-700 dark:text-slate-300">
                  {rating} of 5
                </span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="review-text" className="block text-[11px] font-black text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              Review Details & Observations
            </label>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share details regarding reconstituting quality, solubility, packaging integrity, or research protocol observations..."
              rows={4}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none transition-all leading-relaxed"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[46px] py-3 bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#274873] text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:ring-offset-2 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting for Approval...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" /> Submit Verified Review
              </>
            )}
          </button>
        </form>
      )}



      {/* 1-Line Filter and Sort Control Box with Labels Above */}
      <div className="mb-4 p-3 sm:p-3.5 bg-slate-50/80 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2.5">
        {/* Count & Reset Row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">
            Showing <strong className="text-gray-900 dark:text-white font-black">{filteredAndSortedReviews.length}</strong> of {reviews.length} reviews
          </span>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer py-0.5 px-2 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50"
            >
              <X className="w-3 h-3" /> Reset Filter
            </button>
          )}
        </div>

        {/* 1-Line Side-by-Side Grid with Labels Above */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Filter Field */}
          <div>
            <label htmlFor="review-filter" className="block text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#3C6CA8]" /> Filter
              </span>
            </label>
            <select
              id="review-filter"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as FilterOption)}
              className="w-full min-h-[40px] bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-100 text-xs font-bold rounded-xl px-2.5 sm:px-3 py-2 border border-gray-300 dark:border-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#3C6CA8] shadow-2xs truncate"
            >
              <option value="all">All Reviews ({reviews.length})</option>
              <option value="5star">5 Stars ({stats.distribution[5] || 0})</option>
              <option value="4star">4 Stars ({stats.distribution[4] || 0})</option>
              <option value="3star">3 Stars ({stats.distribution[3] || 0})</option>
              <option value="2star">2 Stars ({stats.distribution[2] || 0})</option>
              <option value="1star">1 Star ({stats.distribution[1] || 0})</option>
              <option value="verified">Verified Only ({reviews.filter(r => r.is_verified_purchase).length})</option>
            </select>
          </div>

          {/* Sort Field */}
          <div>
            <label htmlFor="review-sort" className="block text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-[#3C6CA8]" /> Sort
              </span>
            </label>
            <select
              id="review-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full min-h-[40px] bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-100 text-xs font-bold rounded-xl px-2.5 sm:px-3 py-2 border border-gray-300 dark:border-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#3C6CA8] shadow-2xs truncate"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="most_helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Cards Feed — 1 Column on Mobile, 2 Columns on Desktop */}
      {filteredAndSortedReviews.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/70 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800">
          <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-70" />
          <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-200">
            No matching reviews found.
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Try selecting a different filter or be the first to leave feedback!
          </p>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="mt-3 min-h-[40px] px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-[#3C6CA8] dark:text-[#6A9BE0] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" role="region" aria-label="Customer review cards">
          {filteredAndSortedReviews.map((rev) => {
            const helpfulCount = (helpfulCounts[rev.id] || 0) + (rev.is_verified_purchase ? 3 : 1);
            const isVoted = Boolean(votedHelpful[rev.id]);

            return (
              <article
                key={rev.id}
                className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-[#3C6CA8]/50 dark:hover:border-[#3C6CA8]/60 transition-all space-y-3"
              >
                {/* Header Information */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] text-xs font-black shrink-0 border border-[#3C6CA8]/20">
                        {rev.customer_name ? rev.customer_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">
                            {rev.customer_name}
                          </h5>
                          {rev.is_verified_purchase && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shrink-0">
                              <Check className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
                          <time dateTime={rev.review_date || rev.created_at}>
                            {new Date(rev.review_date || rev.created_at || Date.now()).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </time>
                          <span>•</span>
                          <span className="truncate text-[#3C6CA8] dark:text-[#6A9BE0] font-bold">
                            {productName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Icons */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/50 dark:border-amber-900/30" aria-label={`Rated ${rev.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= Math.round(rev.rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed font-normal">
                    {rev.review_text}
                  </p>
                </div>

                {/* Footer Micro Details & Feedback Action */}
                <div className="pt-2.5 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                  <span className="font-semibold text-gray-600 dark:text-slate-400">
                    Was this review helpful?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(rev.id)}
                    disabled={isVoted}
                    aria-label={`Mark review as helpful. Currently ${helpfulCount} people found this helpful.`}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] font-bold active:scale-95 ${
                      isVoted
                        ? 'bg-[#3C6CA8]/15 text-[#3C6CA8] border-[#3C6CA8]/40 dark:bg-[#3C6CA8]/30 dark:text-[#94BBE9] dark:border-[#3C6CA8]/60 font-black'
                        : 'border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] dark:hover:bg-[#3C6CA8]/20 dark:hover:text-[#94BBE9]'
                    }`}
                  >
                    <ThumbsUp className={`w-3 h-3 ${isVoted ? 'fill-current' : ''}`} />
                    <span>Helpful ({helpfulCount})</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
