import React, { useState, useMemo } from 'react';
import { Star, MessageSquare, Check, User, Loader2, Sparkles, ThumbsUp, ShieldCheck, Award, Filter, ArrowUpDown, X } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import { fireToast } from './ToastNotification';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

type FilterOption = 'all' | '5star' | '4star' | '3star' | '2star' | '1star' | 'verified';
type SortOption = 'newest' | 'highest' | 'lowest' | 'most_helpful';

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const { reviews, loading, addReview, stats, refreshReviews } = useReviews(productId);
  
  // Submit review state
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Sort state
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Local state to track helpfulness clicks per review ID
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [votedHelpful, setVotedHelpful] = useState<Record<string, boolean>>({});

  const handleHelpfulClick = (reviewId: string) => {
    if (votedHelpful[reviewId]) return;
    
    setHelpfulCounts(prev => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1
    }));
    setVotedHelpful(prev => ({
      ...prev,
      [reviewId]: true
    }));
    fireToast('Thank you for your feedback!', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !reviewText.trim()) {
      fireToast('Please fill in your name and review text.', 'warning');
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
        fireToast('Thank you! Your review has been submitted for approval.', 'success');
        setCustomerName('');
        setReviewText('');
        setRating(5);
        setShowForm(false);
        refreshReviews();
      } else {
        fireToast(res.error || 'Failed to submit review', 'error');
      }
    } catch (err) {
      console.error(err);
      fireToast('An error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Filter
    if (activeFilter === '5star') {
      result = result.filter(r => r.rating === 5);
    } else if (activeFilter === '4star') {
      result = result.filter(r => r.rating === 4);
    } else if (activeFilter === '3star') {
      result = result.filter(r => r.rating === 3);
    } else if (activeFilter === '2star') {
      result = result.filter(r => r.rating === 2);
    } else if (activeFilter === '1star') {
      result = result.filter(r => r.rating === 1);
    } else if (activeFilter === 'verified') {
      result = result.filter(r => r.is_verified_purchase);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
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

  if (loading) {
    return (
      <div className="py-8 flex justify-center items-center text-xs text-gray-500" aria-busy="true" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading reviews...
      </div>
    );
  }

  return (
    <div className="mt-10 w-full text-left">
      {/* Compact Header Bar — Inline Title & Write Review Button */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#3C6CA8] dark:text-[#6A9BE0] uppercase">Customer Feedback</span>
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] border border-[#3C6CA8]/30">
              <ShieldCheck className="w-3 h-3 text-[#3C6CA8]" /> Lab Verified
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5 truncate">Product Reviews</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          aria-controls="review-form"
          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#274873] text-white text-[11px] sm:text-xs font-extrabold transition-all shadow-sm cursor-pointer shrink-0 flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {/* Trust Feature Bar */}
      <div className="mb-5 p-3 rounded-2xl bg-[#3C6CA8]/5 dark:bg-[#3C6CA8]/15 border border-[#3C6CA8]/20 dark:border-[#3C6CA8]/40 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-[11px] sm:text-xs text-gray-900 dark:text-white">100% Authentic Research Grade Feedback</span>
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <form id="review-form" onSubmit={handleSubmit} className="mb-6 p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-[#3C6CA8]/30 dark:border-[#3C6CA8]/40 space-y-4 animate-slideIn">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">Write a Review for {productName}</h4>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-semibold">Moderated submission</span>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer-name" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Your Name</label>
              <input
                id="customer-name"
                type="text"
                value={customerName}
                autoComplete="name" onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full min-h-[44px] text-xs px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="review-text" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1" id="rating-label">Rating</label>
              <div className="flex items-center gap-1 py-1" role="group" aria-labelledby="rating-label">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="review-text" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Review Comments</label>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this peptide..."
              rows={4}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] py-3 bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#274873] text-white rounded-full font-bold text-xs shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Submit Review
              </>
            )}
          </button>
        </form>
      )}

      {/* 2-Column Rating Summary Card with Clickable Rating Bars */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Left Column: Average Score */}
          <div className="sm:col-span-5 flex items-center sm:flex-col justify-between sm:justify-center text-left sm:text-center sm:border-r border-gray-200 dark:border-slate-800 pr-0 sm:pr-4">
            <div>
              <div className="flex items-baseline gap-1.5 sm:justify-center">
                <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-none">{stats.average}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold">/ 5.0</span>
              </div>
              <div className="flex items-center gap-0.5 mt-1 sm:justify-center" aria-label={`Average rating ${stats.average} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(stats.average)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-slate-400 font-semibold sm:mt-1.5">
              Based on <span className="font-bold text-gray-900 dark:text-slate-100">{stats.total}</span> verified {stats.total === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Right Column: Interactive Star Distribution Progress Bars */}
          <div className="sm:col-span-7 space-y-1.5 text-[11px] text-gray-700 dark:text-slate-300 font-semibold">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              const filterKey = `${stars}star` as FilterOption;
              const isSelected = activeFilter === filterKey;

              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setActiveFilter(isSelected ? 'all' : filterKey)}
                  aria-pressed={isSelected}
                  aria-label={`Filter by ${stars} star reviews (${count} available)`}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] min-h-[36px] ${
                    isSelected
                      ? 'bg-[#3C6CA8]/15 dark:bg-[#3C6CA8]/30 font-bold ring-1 ring-[#3C6CA8] dark:ring-[#6A9BE0]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-3 text-right text-[10px] font-bold text-gray-800 dark:text-slate-200">{stars}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-2.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden border border-gray-200/50 dark:border-slate-700/50">
                    <div className="h-full bg-[#3C6CA8] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-[10px] text-gray-600 dark:text-slate-400 font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Sort Section — 3 Columns on Mobile */}
      <div className="mb-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-[#3C6CA8]" />
            <span>Filter Reviews</span>
          </div>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Reset Filter
            </button>
          )}
        </div>

        {/* 3-Column Selection Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {/* All Reviews */}
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`min-h-[42px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              activeFilter === 'all'
                ? 'bg-[#3C6CA8] text-white shadow-sm ring-2 ring-[#3C6CA8]/30 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700'
            }`}
          >
            <span className="truncate w-full">All Reviews</span>
            <span className="text-[9.5px] opacity-75 font-semibold">({reviews.length})</span>
          </button>

          {/* 5 Stars */}
          <button
            type="button"
            onClick={() => setActiveFilter('5star')}
            className={`min-h-[42px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              activeFilter === '5star'
                ? 'bg-[#3C6CA8] text-white shadow-sm ring-2 ring-[#3C6CA8]/30 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700'
            }`}
          >
            <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> 5 Stars</span>
            <span className="text-[9.5px] opacity-75 font-semibold">({stats.distribution[5] || 0})</span>
          </button>

          {/* 4 Stars */}
          <button
            type="button"
            onClick={() => setActiveFilter('4star')}
            className={`min-h-[42px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              activeFilter === '4star'
                ? 'bg-[#3C6CA8] text-white shadow-sm ring-2 ring-[#3C6CA8]/30 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700'
            }`}
          >
            <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> 4 Stars</span>
            <span className="text-[9.5px] opacity-75 font-semibold">({stats.distribution[4] || 0})</span>
          </button>

          {/* 3 Stars */}
          <button
            type="button"
            onClick={() => setActiveFilter('3star')}
            className={`min-h-[42px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              activeFilter === '3star'
                ? 'bg-[#3C6CA8] text-white shadow-sm ring-2 ring-[#3C6CA8]/30 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700'
            }`}
          >
            <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> 3 Stars</span>
            <span className="text-[9.5px] opacity-75 font-semibold">({stats.distribution[3] || 0})</span>
          </button>

          {/* 2 & 1 Stars */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === '2star' ? '1star' : '2star')}
            className={`min-h-[42px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              activeFilter === '2star' || activeFilter === '1star'
                ? 'bg-[#3C6CA8] text-white shadow-sm ring-2 ring-[#3C6CA8]/30 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700'
            }`}
          >
            <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> &le; 2 Stars</span>
            <span className="text-[9.5px] opacity-75 font-semibold">({(stats.distribution[2] || 0) + (stats.distribution[1] || 0)})</span>
          </button>

          {/* Verified Purchases */}
          <button
            type="button"
            onClick={() => setActiveFilter('verified')}
            className={`min-h-[42px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              activeFilter === 'verified'
                ? 'bg-[#3C6CA8] text-white shadow-sm ring-2 ring-[#3C6CA8]/30 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700'
            }`}
          >
            <span className="inline-flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> Verified</span>
            <span className="text-[9.5px] opacity-75 font-semibold">
              ({reviews.filter((r) => r.is_verified_purchase).length})
            </span>
          </button>
        </div>

        {/* Sort and Count Sub-bar */}
        <div className="flex items-center justify-between pt-1 text-xs text-gray-600 dark:text-slate-300">
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
            Showing <strong className="text-gray-900 dark:text-white">{filteredAndSortedReviews.length}</strong> of {reviews.length} reviews
          </span>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#3C6CA8] shrink-0" />
            <label htmlFor="review-sort" className="text-[11px] font-bold">Sort:</label>
            <select
              id="review-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-xs font-bold rounded-lg px-2 py-1 border border-gray-200 dark:border-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#3C6CA8]"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="most_helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Cards List */}
      {filteredAndSortedReviews.length === 0 ? (
        <div className="p-6 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800">
          <MessageSquare className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-700 dark:text-slate-300">No matching reviews found.</p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 font-medium">Try resetting filters or be the first to leave feedback!</p>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="mt-3 min-h-[44px] inline-flex items-center text-xs font-bold text-[#3C6CA8] dark:text-[#6A9BE0] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" role="region" aria-label="Customer review cards">
          {filteredAndSortedReviews.map((rev) => {
            const helpfulCount = (helpfulCounts[rev.id] || 0) + (rev.is_verified_purchase ? 3 : 1);
            const isVoted = votedHelpful[rev.id];

            return (
              <article
                key={rev.id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-[#3C6CA8]/50 dark:hover:border-[#3C6CA8]/60 transition-colors space-y-2.5"
              >
                {/* Header info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] text-xs font-bold shrink-0 border border-[#3C6CA8]/20">
                        {rev.customer_name.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {rev.customer_name}
                          </h5>
                          {rev.is_verified_purchase && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.25 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shrink-0">
                              <Check className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
                          <time dateTime={rev.review_date}>
                            {new Date(rev.review_date).toLocaleDateString(undefined, {
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

                    {/* Rating stars */}
                    <div className="flex items-center gap-0.5 shrink-0" aria-label={`Rated ${rev.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed font-medium">
                    {rev.review_text}
                  </p>
                </div>

                {/* Footer Micro Details & Actions */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                  <span className="font-bold text-gray-600 dark:text-slate-400">Was this review helpful?</span>
                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(rev.id)}
                    disabled={isVoted}
                    aria-label={`Mark review as helpful. Currently ${helpfulCount} people found this helpful.`}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] font-bold ${
                      isVoted
                        ? 'bg-[#3C6CA8]/15 text-[#3C6CA8] border-[#3C6CA8]/40 dark:bg-[#3C6CA8]/30 dark:text-[#94BBE9] dark:border-[#3C6CA8]/60'
                        : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] dark:hover:bg-[#3C6CA8]/20 dark:hover:text-[#94BBE9]'
                    }`}
                  >
                    <ThumbsUp className="w-2.5 h-2.5" />
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
