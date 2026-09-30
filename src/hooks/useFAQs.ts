import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { mirrorFaqCreate, mirrorFaqDelete, mirrorFaqUpdate } from '../lib/convexMirror';

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FAQCategory {
    id: string;
    name: string;
    icon: string;
    order_index: number;
}

export const defaultFAQs: FAQItem[] = [];

export const useFAQs = () => {
    const [faqs, setFaqs] = useState<FAQItem[]>(() => {
        try {
            const cached = localStorage.getItem('slimdose_cached_faqs');
            if (cached) return JSON.parse(cached);
        } catch {}
        return [];
    });
    const [loading, setLoading] = useState(false);
    const [error] = useState<string | null>(null);

    const fetchFAQs = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('faqs')
                .select('*')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('Failed to load FAQs from database:', fetchError.message);
            } else if (data && data.length > 0) {
                setFaqs(data);
                try {
                    localStorage.setItem('slimdose_cached_faqs', JSON.stringify(data));
                } catch {}
            }
        } catch (err) {
            console.error('Error fetching FAQs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFAQs();
    }, []);

    const categories = [...new Set(faqs.map(faq => faq.category))];

    return { faqs, categories, loading, error, refetch: fetchFAQs };
};

export const useFAQsAdmin = () => {
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const seedDefaultFAQs = async () => {
        try {
            setLoading(true);
            for (const item of defaultFAQs) {
                await supabase.from('faqs').upsert({
                    id: item.id,
                    question: item.question,
                    answer: item.answer,
                    category: item.category,
                    order_index: item.order_index,
                    is_active: item.is_active,
                    created_at: item.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
            await fetchAllFAQs();
            return true;
        } catch (seedErr) {
            console.error('Error seeding default FAQs:', seedErr);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const fetchAllFAQs = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('faqs')
                .select('*')
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('Failed to load FAQs from database:', fetchError.message);
                setFaqs([]);
            } else if (!data || data.length === 0) {
                setFaqs([]);
            } else {
                setFaqs(data);
            }
        } catch (err) {
            console.error('Error fetching FAQs:', err);
            setFaqs([]);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const addFAQ = async (faq: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('faqs')
            .insert([{
                ...faq,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        mirrorFaqCreate(faq);
        await fetchAllFAQs();
        return data;
    };

    const updateFAQ = async (id: string, updates: Partial<FAQItem>) => {
        const { data, error } = await supabase
            .from('faqs')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        mirrorFaqUpdate(id, updates);
        await fetchAllFAQs();
        return data;
    };

    const deleteFAQ = async (id: string) => {
        const { error } = await supabase
            .from('faqs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        mirrorFaqDelete(id);
        await fetchAllFAQs();
    };

    useEffect(() => {
        fetchAllFAQs();
    }, []);

    return { faqs, loading, error, addFAQ, updateFAQ, deleteFAQ, refetch: fetchAllFAQs, seedDefaultFAQs };
};
