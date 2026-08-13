-- Create guide_topics table for Smart Guide articles
CREATE TABLE IF NOT EXISTS guide_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  preview TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT NOT NULL DEFAULT 'SlimDose Team',
  published_date DATE NOT NULL DEFAULT CURRENT_DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE guide_topics IS 'Educational articles for the Smart Guide section';
COMMENT ON COLUMN guide_topics.title IS 'Article title displayed in cards and detail page';
COMMENT ON COLUMN guide_topics.preview IS 'Short preview text shown on article cards (max 150 chars)';
COMMENT ON COLUMN guide_topics.content IS 'Full article content with preserved line breaks';
COMMENT ON COLUMN guide_topics.cover_image IS 'URL to cover/hero image stored in article-covers bucket';
COMMENT ON COLUMN guide_topics.author IS 'Author name displayed on article';
COMMENT ON COLUMN guide_topics.published_date IS 'Date shown to users as publication date';
COMMENT ON COLUMN guide_topics.display_order IS 'Sort order (lower numbers appear first)';
COMMENT ON COLUMN guide_topics.is_enabled IS 'Whether article is published and visible to customers';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_guide_topics_display_order ON guide_topics(display_order);
CREATE INDEX IF NOT EXISTS idx_guide_topics_enabled ON guide_topics(is_enabled) WHERE is_enabled = true;

-- Enable Row Level Security
ALTER TABLE guide_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow public read access to enabled articles
CREATE POLICY "Public can view enabled articles"
  ON guide_topics
  FOR SELECT
  USING (is_enabled = true);

-- Allow all access for authenticated users (admins)
CREATE POLICY "Authenticated users can do everything"
  ON guide_topics
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
