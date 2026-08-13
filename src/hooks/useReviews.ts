import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  profile_image_url: string | null;
  is_verified_purchase: boolean;
  approved: boolean;
  review_date: string;
  created_at: string;
}

export function useReviews(productId?: string, adminView: boolean = false) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [productId, adminView]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('product_reviews').select('*');

      if (productId) {
        query = query.eq('product_id', productId);
      }

      if (!adminView) {
        query = query.eq('approved', true);
      }

      const { data, error: err } = await query.order('review_date', { ascending: false });

      if (err) throw err;
      setReviews(data || []);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (review: Omit<Review, 'id' | 'approved' | 'review_date' | 'created_at'>) => {
    try {
      const { data, error: err } = await supabase
        .from('product_reviews')
        .insert([{ ...review, approved: false }])
        .select()
        .single();

      if (err) throw err;
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding review:', err);
      return { success: false, error: err.message || 'Failed to submit review' };
    }
  };

  const approveReview = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('product_reviews')
        .update({ approved: true })
        .eq('id', id);

      if (err) throw err;
      
      // Update local state if present
      setReviews(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r));
      return { success: true };
    } catch (err: any) {
      console.error('Error approving review:', err);
      return { success: false, error: err.message || 'Failed to approve review' };
    }
  };

  const deleteReview = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);

      if (err) throw err;

      // Update local state
      setReviews(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting review:', err);
      return { success: false, error: err.message || 'Failed to delete review' };
    }
  };

  // Compute rating statistics
  const stats = (() => {
    if (reviews.length === 0) {
      return { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = Number((sum / total).toFixed(1));

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = r.rating as 1 | 2 | 3 | 4 | 5;
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    });

    return { average, total, distribution };
  })();

  return {
    reviews,
    loading,
    error,
    refreshReviews: fetchReviews,
    addReview,
    approveReview,
    deleteReview,
    stats,
  };
}
