-- Migrate guide_topics from simple FAQ to article system
-- Add article-specific fields to existing guide_topics table

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add preview column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guide_topics' AND column_name = 'preview') THEN
        ALTER TABLE guide_topics ADD COLUMN preview TEXT;
    END IF;

    -- Add cover_image column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guide_topics' AND column_name = 'cover_image') THEN
        ALTER TABLE guide_topics ADD COLUMN cover_image TEXT;
    END IF;

    -- Add author column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guide_topics' AND column_name = 'author') THEN
        ALTER TABLE guide_topics ADD COLUMN author TEXT DEFAULT 'SlimDose Team';
    END IF;

    -- Add published_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guide_topics' AND column_name = 'published_date') THEN
        ALTER TABLE guide_topics ADD COLUMN published_date TEXT DEFAULT CURRENT_DATE::TEXT;
    END IF;

    -- Rename answer to content if answer exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'guide_topics' AND column_name = 'answer') THEN
        ALTER TABLE guide_topics RENAME COLUMN answer TO content;
    END IF;

    -- Rename description to content if description exists and content doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'guide_topics' AND column_name = 'description') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'guide_topics' AND column_name = 'content') THEN
        ALTER TABLE guide_topics RENAME COLUMN description TO content;
    END IF;
END $$;

-- Insert sample article
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
)
ON CONFLICT DO NOTHING;
