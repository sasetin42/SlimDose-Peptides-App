/*
  # Create function to fetch order details for tracking

  1. New Function
    - `get_order_details`: Securely fetches order details by ID (partial match supported)
  
  2. Security
    - Function is accessible to public
    - Only returns limited fields
    - SECURITY DEFINER: Runs with privileges of creator (allows bypassing RLS if enabled)
*/

CREATE OR REPLACE FUNCTION get_order_details(order_id_input TEXT)
RETURNS TABLE (
  id UUID,
  order_status TEXT,
  payment_status TEXT,
  tracking_number TEXT,
  shipping_note TEXT,
  total_price DECIMAL(10,2),
  shipping_fee DECIMAL(10,2),
  order_items JSONB,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_status,
    o.payment_status,
    o.tracking_number,
    o.shipping_note,
    o.total_price,
    o.shipping_fee,
    o.order_items,
    o.created_at
  FROM orders o
  WHERE 
    o.id::text ILIKE order_id_input || '%'
  LIMIT 1;
END;
$$;

-- Grant access to public (anonymous users)
GRANT EXECUTE ON FUNCTION get_order_details(TEXT) TO public;
