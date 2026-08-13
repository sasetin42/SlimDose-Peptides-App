-- Create COA (Certificate of Analysis) table
-- image_url can store base64 images (no external storage needed!)
CREATE TABLE IF NOT EXISTS coa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  batch TEXT,
  test_date DATE NOT NULL,
  purity_percentage DECIMAL(5,3) NOT NULL,
  quantity TEXT NOT NULL,
  task_number TEXT NOT NULL,
  verification_key TEXT NOT NULL,
  image_url TEXT NOT NULL, -- Can store base64 images or URLs
  featured BOOLEAN DEFAULT false,
  manufacturer TEXT DEFAULT 'Peptivate.ph',
  laboratory TEXT DEFAULT 'Janoshik Analytical',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_coa_reports_product_name ON coa_reports(product_name);
CREATE INDEX IF NOT EXISTS idx_coa_reports_featured ON coa_reports(featured);

-- Add updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_coa_reports_updated_at ON coa_reports;
CREATE TRIGGER update_coa_reports_updated_at BEFORE UPDATE ON coa_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert existing COA reports (only if they don't exist)
INSERT INTO coa_reports (
  product_name,
  batch,
  test_date,
  purity_percentage,
  quantity,
  task_number,
  verification_key,
  image_url,
  featured
) 
SELECT * FROM (VALUES
  ('Tirzepatide 15mg', 'Unknown', '2025-06-20'::date, 99.658, '16.80 mg', '#68396', '9AUYT3EZV9Y9', '/coa/tirzepatide-15mg-coa.jpg', true),
  ('Tirzepatide 30mg', 'Unknown', '2025-06-19'::date, 99.683, '31.21 mg', '#68397', 'ZW6YWJ55MXK9', '/coa/tirzepatide-30mg-coa.jpg', true)
) AS v(product_name, batch, test_date, purity_percentage, quantity, task_number, verification_key, image_url, featured)
WHERE NOT EXISTS (
  SELECT 1 FROM coa_reports WHERE task_number = v.task_number
);

