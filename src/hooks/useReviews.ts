import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getProductReviewsFallback } from '../data/liveScrapedProductReviews';

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
  const [reviews, setReviews] = useState<Review[]>(() => {
    if (!adminView && productId) {
      return getProductReviewsFallback(productId) as Review[];
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviewsInternal = useCallback(async (isMountedCheck?: () => boolean, silent = false) => {
    try {
      if (!silent && (!isMountedCheck || isMountedCheck())) setLoading(true);
      if (!isMountedCheck || isMountedCheck()) setError(null);

      let query = supabase.from('product_reviews').select('*');

      if (productId) {
        query = query.eq('product_id', productId);
      }

      if (!adminView) {
        query = query.eq('approved', true);
      }

      const { data, error: err } = await query.order('review_date', { ascending: false });

      if (err) throw err;

      let resultData: Review[] = (data || []).map((r: any) => ({
        ...r,
        approved: r.approved !== undefined ? Boolean(r.approved) : Boolean(r.is_approved),
      }));

      // If viewing a product on storefront and no reviews in DB yet, load fallback seed reviews
      if (!adminView && productId && resultData.length === 0) {
        resultData = getProductReviewsFallback(productId) as Review[];
      }

      if (!isMountedCheck || isMountedCheck()) {
        setReviews(resultData);
      }
    } catch (err: any) {
      console.warn('Error fetching reviews, using fallback dataset:', err);
      if (productId && (!isMountedCheck || isMountedCheck())) {
        setReviews(getProductReviewsFallback(productId) as Review[]);
      }
      if (!isMountedCheck || isMountedCheck()) {
        setError(err?.message || 'Failed to load reviews');
      }
    } finally {
      if (!silent && (!isMountedCheck || isMountedCheck())) {
        setLoading(false);
      }
    }
  }, [productId, adminView]);

  useEffect(() => {
    let isMounted = true;
    const isMountedCheck = () => isMounted;

    fetchReviewsInternal(isMountedCheck, false);

    // Setup Realtime Live Feed for Product Reviews
    const channel = supabase
      .channel(`product_reviews_${productId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_reviews' },
        () => {
          if (isMounted) {
            fetchReviewsInternal(isMountedCheck, true);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchReviewsInternal, productId]);

  const refreshReviews = useCallback(() => {
    return fetchReviewsInternal(undefined, false);
  }, [fetchReviewsInternal]);

  const addReview = async (review: Omit<Review, 'id' | 'approved' | 'review_date' | 'created_at'>) => {
    try {
      const newReviewPayload = {
        product_id: review.product_id,
        customer_name: review.customer_name,
        rating: Number(review.rating),
        review_text: review.review_text,
        profile_image_url: review.profile_image_url || null,
        is_verified_purchase: Boolean(review.is_verified_purchase),
        approved: false,
        review_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { data, error: err } = await supabase
        .from('product_reviews')
        .insert([newReviewPayload])
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
        .update({ approved: true, is_approved: true })
        .eq('id', id);

      if (err) throw err;
      
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

      setReviews(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting review:', err);
      return { success: false, error: err.message || 'Failed to delete review' };
    }
  };

  // Compute rating statistics
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    const average = Number((sum / total).toFixed(1));

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = (Math.min(5, Math.max(1, Math.round(r.rating || 5)))) as 1 | 2 | 3 | 4 | 5;
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    });

    return { average, total, distribution };
  }, [reviews]);

  return {
    reviews,
    loading,
    error,
    refreshReviews,
    addReview,
    approveReview,
    deleteReview,
    stats,
  };
}
