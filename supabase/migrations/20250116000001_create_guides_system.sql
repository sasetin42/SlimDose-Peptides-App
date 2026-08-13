-- Create guides system tables (FAQ-style)
-- This migration creates tables for the Smart Guide System

-- Create guide_topics table with article fields
CREATE TABLE IF NOT EXISTS guide_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    preview TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    author TEXT DEFAULT 'SlimDose Team',
    published_date TEXT DEFAULT CURRENT_DATE::TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guide_topics_display_order ON guide_topics(display_order);
CREATE INDEX IF NOT EXISTS idx_guide_topics_enabled ON guide_topics(is_enabled);

-- Enable RLS
ALTER TABLE guide_topics ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled guides
CREATE POLICY "Anyone can view enabled guide topics"
    ON guide_topics FOR SELECT
    USING (is_enabled = true);

-- Admin full access (authenticated users can manage all guides)
CREATE POLICY "Authenticated users can manage all guide topics"
    ON guide_topics FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guide_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_guide_topics_timestamp
    BEFORE UPDATE ON guide_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_guide_topics_updated_at();

-- Insert sample article to demonstrate the system
INSERT INTO guide_topics (
    title,
    preview,
    content,
    cover_image,
    author,
    published_date,
    display_order,
    is_enabled
) VALUES (
    'Understanding Weight Loss Plateaus: Science and Solutions',
    'Learn why plateaus happen and evidence-based strategies to overcome them and continue your weight loss journey.',
    'Weight loss plateaus are a normal part of any weight management journey. Understanding the science behind them can help you overcome these temporary setbacks and continue progressing toward your goals.

What Causes a Weight Loss Plateau?

Your body is remarkably adaptive. When you reduce caloric intake and lose weight, your body responds by making several metabolic adjustments:

1. Lower Basal Metabolic Rate
As you lose weight, your body requires fewer calories to maintain basic functions. A smaller body simply needs less energy to operate.

2. Adaptive Thermogenesis
Your body becomes more efficient at using energy, burning fewer calories during the same activities you performed at a higher weight.

3. Reduced Non-Exercise Activity
Unconsciously, people often move less when in a caloric deficit, reducing their daily energy expenditure.

Evidence-Based Strategies to Break Through

1. Reassess Your Caloric Needs
Recalculate your daily caloric requirements based on your current weight. What worked at the start of your journey may need adjustment.

2. Increase Physical Activity
Add resistance training to build or maintain muscle mass. Muscle tissue burns more calories at rest than fat tissue, helping boost your metabolic rate.

3. Review Your Peptide Protocol
Consult with your healthcare provider about whether adjustments to your dosage or timing might be beneficial. Never adjust on your own.

4. Track Everything Accurately
Use a food scale and tracking app. Research shows people often underestimate caloric intake by 20-30%. Small inaccuracies add up.

5. Prioritize Sleep and Stress Management
Poor sleep and chronic stress increase cortisol levels, which can promote fat storage and make weight loss more difficult.

6. Be Patient and Consistent
Sustainable weight loss isn''t linear. Your body may be recomposing - losing fat while maintaining muscle - which won''t always show on the scale.

When to Seek Professional Help

If your plateau lasts longer than 4-6 weeks despite implementing these strategies, it''s time to consult your healthcare provider. They can:

- Review your complete health history
- Check for underlying metabolic issues
- Adjust your peptide protocol if needed
- Provide personalized guidance

Remember: You''re Not Failing

A plateau doesn''t mean your efforts are wasted. It means your body is adapting. With the right adjustments and patience, you can continue making progress toward your goals.

The key is to view this as a normal part of the process, not a failure. Stay consistent, make evidence-based adjustments, and trust that your body will respond.',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=600&fit=crop',
    'Dr. Sarah Mitchell',
    '2025-01-15',
    0,
    true
);
