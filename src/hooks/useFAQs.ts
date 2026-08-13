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

const defaultFAQs: FAQItem[] = [
    // Product & Usage
    {
        id: '1',
        question: 'Can I use Tirzepatide?',
        answer: 'Before purchasing, please check if Tirzepatide is suitable for you.\n✔️ View the checklist here — Contact us for more details.',
        category: 'PRODUCT & USAGE',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '2',
        question: 'Do you reconstitute (recon) Tirzepatide?',
        answer: 'Yes — for Metro Manila orders only.\nI provide free reconstitution when you purchase the complete set.\nI use pharma-grade bacteriostatic water, and I ship it with an ice pack + insulated pouch to maintain stability.',
        category: 'PRODUCT & USAGE',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        question: 'What size needles and cartridges do you offer?',
        answer: '• Needles: Compatible with all insulin-style pens (standard pen needle sizes).\n• Cartridges: Standard 3mL capacity.',
        category: 'PRODUCT & USAGE',
        order_index: 3,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        question: 'Can the pen pusher be retracted?',
        answer: '• Reusable pens: Yes, the pusher can be retracted.\n• Disposable pens: The pusher cannot be retracted and will stay forward once pushed.',
        category: 'PRODUCT & USAGE',
        order_index: 4,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '5',
        question: 'How should peptides be stored?',
        answer: 'Peptides must be stored in the refrigerator, especially once reconstituted.',
        category: 'PRODUCT & USAGE',
        order_index: 5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // Ordering & Packaging
    {
        id: '6',
        question: "What's included in my order?",
        answer: 'Depending on your chosen items:\n• 3mL cartridge\n• Pen needles\n• Optional: alcohol swabs\n• Free Tirzepatide reconstitution for Metro Manila set orders',
        category: 'ORDERING & PACKAGING',
        order_index: 6,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '7',
        question: 'Do you offer bundles or discounts?',
        answer: 'Yes — I offer curated bundles and custom sets.\nMessage me for personalized bundle options.',
        category: 'ORDERING & PACKAGING',
        order_index: 7,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '8',
        question: 'Can I return items?',
        answer: '• Pens: Returnable within 1 week if defective.\n• Needles and syringes: Not returnable for hygiene and safety.',
        category: 'ORDERING & PACKAGING',
        order_index: 8,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // Payment Methods
    {
        id: '9',
        question: 'What payment options do you accept?',
        answer: '• GCash\n• Security Bank\n• BDO\n\n❌ COD is not accepted, except for Lalamove\n→ You can pay the rider directly or have the rider pay upfront on your behalf.',
        category: 'PAYMENT METHODS',
        order_index: 9,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // Shipping & Delivery
    {
        id: '10',
        question: 'Where are you located?',
        answer: '📍 Merville, Parañaque City',
        category: 'SHIPPING & DELIVERY',
        order_index: 10,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '11',
        question: 'How long is shipping?',
        answer: '📦 J&T Express: Usually 2–3 days\n(Transit time may vary by location and sorting)',
        category: 'SHIPPING & DELIVERY',
        order_index: 11,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '12',
        question: 'When do orders ship out?',
        answer: 'Orders placed before 11:00 AM ship out on the next J&T schedule (Tuesday & Thursday)\n→ Subject to order volume.',
        category: 'SHIPPING & DELIVERY',
        order_index: 12,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '13',
        question: 'Do you ship nationwide?',
        answer: 'Yes —\n• J&T Express (nationwide)\n• Lalamove (Metro Manila & nearby areas)',
        category: 'SHIPPING & DELIVERY',
        order_index: 13,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

export const useFAQs = () => {
    const [faqs, setFaqs] = useState<FAQItem[]>(defaultFAQs);
    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);

    const fetchFAQs = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('faqs')
                .select('*')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('FAQs table not found, using defaults:', fetchError.message);
                setFaqs(defaultFAQs);
            } else if (data && data.length > 0) {
                setFaqs(data);
            } else {
                setFaqs(defaultFAQs);
            }
        } catch (err) {
            console.error('Error fetching FAQs:', err);
            setFaqs(defaultFAQs);
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

    const fetchAllFAQs = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('faqs')
                .select('*')
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('FAQs table not found:', fetchError.message);
                setFaqs([]);
            } else {
                setFaqs(data || []);
            }
        } catch (err) {
            console.error('Error fetching FAQs:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const addFAQ = async (faq: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('faqs')
            .insert([faq])
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

    return { faqs, loading, error, addFAQ, updateFAQ, deleteFAQ, refetch: fetchAllFAQs };
};
