/*
  # Create Payment Methods Management System

  1. New Tables
    - `payment_methods`
      - `id` (text, primary key) - method identifier (gcash, maya, bank-transfer)
      - `name` (text) - display name
      - `account_number` (text) - phone number or account number
      - `account_name` (text) - account holder name
      - `qr_code_url` (text) - QR code image URL
      - `active` (boolean) - whether method is active
      - `sort_order` (integer) - display order
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on payment_methods table
    - Add policies for public read access
    - Add policies for authenticated admin access

  3. Initial Data
    - Insert default payment methods
*/

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id text PRIMARY KEY,
  name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  qr_code_url text NOT NULL,
  active boolean DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can read active payment methods"
  ON payment_methods
  FOR SELECT
  TO public
  USING (active = true);

-- Create policies for authenticated admin access
CREATE POLICY "Authenticated users can manage payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger for payment_methods
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment methods
INSERT INTO payment_methods (id, name, account_number, account_name, qr_code_url, sort_order, active) VALUES
  ('gcash', 'GCash', '09XX XXX XXXX', 'M&C Bakehouse', 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 1, true),
  ('maya', 'Maya (PayMaya)', '09XX XXX XXXX', 'M&C Bakehouse', 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 2, true),
  ('bank-transfer', 'Bank Transfer', 'Account: 1234-5678-9012', 'M&C Bakehouse', 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 3, true)
ON CONFLICT (id) DO NOTHING;