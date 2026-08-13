-- AUTO INVENTORY DEDUCTION TRIGGER
-- This migration adds a trigger to automatically decrement stock when an order is created.

CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_variation_id UUID;
  v_quantity INTEGER;
BEGIN
  -- Determine validity of the order status if needed (optional)
  -- For now, we deduct as soon as the order is placed (inserted), regardless of payment status.
  -- This reserves the stock.

  -- Loop through each item in the order_items JSON array
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_variation_id := (item->>'variation_id')::UUID;
    v_quantity := (item->>'quantity')::INTEGER;

    IF v_variation_id IS NOT NULL THEN
      -- Deduct from product_variations
      UPDATE product_variations
      SET stock_quantity = stock_quantity - v_quantity
      WHERE id = v_variation_id;
    ELSE
      -- Deduct from products (if no variation)
      UPDATE products
      SET stock_quantity = stock_quantity - v_quantity
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow re-running script safely
DROP TRIGGER IF EXISTS trigger_decrement_stock ON orders;

-- Create the trigger
CREATE TRIGGER trigger_decrement_stock
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION decrement_stock_on_order();
