import React, { useState } from 'react';
import { Star, MessageSquare, Check, User, Loader2, Sparkles } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import { fireToast } from './ToastNotification';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const { reviews, loading, addReview, stats, refreshReviews } = useReviews(productId);
  
  // Submit review state
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading reviews...
      </div>
    );
  }

  return (
    <div className="mt-16 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 mb-8">
        <div>
          <span className="text-xs font-semibold tracking-wider text-blue-600 dark:text-blue-400 uppercase">Customer Testimonials</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">Product Reviews</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-full bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-gray-200 dark:border-slate-800/80 space-y-4 animate-slideIn">
          <h4 className="font-bold text-gray-900 dark:text-white text-sm">Write a Review for {productName}</h4>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-100 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rating</label>
              <div className="flex items-center gap-1.5 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
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
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Review Comments</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this peptide..."
              rows={4}
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-100 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* Summary Statistics Card */}
      <div className="grid md:grid-cols-3 gap-6 items-center p-6 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl shadow-sm mb-8">
        <div className="text-center">
          <p className="text-5xl font-black text-navy-900 dark:text-white mb-2">{stats.average}</p>
          <div className="flex items-center justify-center gap-0.5 mb-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(stats.average)
                    ? 'fill-amber-405 text-amber-405'
                    : 'text-gray-250 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 font-semibold">{stats.total} reviews verified</p>
        </div>

        {/* Stars bars */}
        <div className="md:col-span-2 space-y-2 text-xs text-gray-600 dark:text-slate-400 font-semibold">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.distribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-3 text-right">{stars}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right opacity-80">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews Cards List */}
      {reviews.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-semibold">No reviews approved yet.</p>
          <p className="text-xs text-gray-400 mt-1">Be the first to share your biotech experience!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-navy-50 dark:bg-slate-800 flex items-center justify-center text-navy-800 dark:text-slate-200">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-normal">
                      {rev.customer_name}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-505 dark:text-slate-400">
                        {new Date(rev.review_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {rev.is_verified_purchase && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.25 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50">
                          <Check className="w-2.5 h-2.5" /> Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= rev.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-200 dark:text-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                {rev.review_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
