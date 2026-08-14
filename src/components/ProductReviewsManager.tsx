import React, { useState, useEffect } from 'react';
import { Star, Check, Trash2, Plus, MessageSquare, ShieldAlert, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  // Form states for manual review upload
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [revRes, prodRes] = await Promise.all([
        supabase.from('product_reviews').select('*, products(name)').order('review_date', { ascending: false }),
        supabase.from('products').select('id, name')
      ]);

      if (revRes.error) throw revRes.error;
      if (prodRes.error) throw prodRes.error;

      setReviews(revRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !customerName.trim() || !reviewText.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert([{
          product_id: selectedProductId,
          customer_name: customerName,
          rating,
          review_text: reviewText,
          profile_image_url: profileImageUrl.trim() || null,
          is_verified_purchase: isVerified,
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
      await loadData();
      alert('Review posted successfully!');
    } catch (err: any) {
      alert(`Failed to add review: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header card with action buttons */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-4 border border-gray-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-[#3C6CA8] dark:text-[#6A9BE0]" />
          Testimonials & Reviews Panel
        </h3>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#274873] text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Manual Review
        </button>
      </div>

      {/* manual review form */}
      {isAdding && (
        <form onSubmit={handleAddReview} className="bg-white rounded-2xl shadow border border-slate-150 p-6 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">New Customer Testimonial</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Peptide Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                required
              >
                <option value="">-- Choose --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Beatrice Gomez"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rating (1 to 5 Stars) *</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                required
              >
                <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                <option value="3">⭐⭐⭐ (3 Stars)</option>
                <option value="2">⭐⭐ (2 Stars)</option>
                <option value="1">⭐ (1 Star)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Optional Profile Image URL</label>
              <input
                type="url"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review Description *</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                placeholder="Write the testimonial narrative here..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">Verified Purchase Badge</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Post Review
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews Table */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-slate-150 p-12 text-center">
          <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-slate-800">No Reviews Yet</h4>
          <p className="text-slate-400 text-xs mt-1">Testimonials posted by customers will appear here for verification.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow border border-slate-150 p-5 flex flex-col justify-between hover:border-slate-350 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-550 border border-slate-200 overflow-hidden">
                      {r.profile_image_url ? (
                        <img src={r.profile_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs leading-tight">{r.customer_name}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Product: <span className="font-semibold text-slate-600">{r.products?.name || 'Unknown'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-650 leading-relaxed mb-4 italic">
                  "{r.review_text}"
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2 text-[10px]">
                <div className="flex gap-2">
                  {r.is_approved ? (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded-full border border-green-200">
                      Approved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      Pending Approval
                    </span>
                  )}

                  {r.is_verified_purchase && (
                    <span className="px-2.5 py-0.5 bg-[#3C6CA8]/15 text-[#3C6CA8] font-extrabold rounded-full border border-[#3C6CA8]/30 dark:bg-[#3C6CA8]/25 dark:text-[#94BBE9] dark:border-[#3C6CA8]/50">
                      Verified Purchase
                    </span>
                  )}
                </div>

                <div className="flex gap-1">
                  {!r.is_approved && (
                    <button
                      onClick={() => handleApprove(r.id)}
                      className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
