-- Function to get sales overview (total orders, revenue, average order value)
-- Returns specific metrics for a given period
create or replace function get_sales_overview(
  period text, -- 'daily', 'weekly', 'monthly', 'all_time'
  timezone text default 'UTC'
)
returns json
language plpgsql
security definer
as $$
declare
  start_date timestamptz;
  total_orders bigint;
  total_revenue decimal(10,2);
  avg_order_value decimal(10,2);
begin
  -- Determine start date based on period
  if period = 'daily' then
    start_date := date_trunc('day', now() at time zone timezone);
  elsif period = 'weekly' then
    start_date := date_trunc('week', now() at time zone timezone);
  elsif period = 'monthly' then
    start_date := date_trunc('month', now() at time zone timezone);
  else
    -- all_time or default
    start_date := '1970-01-01'::timestamptz;
  end if;

  -- Calculate metrics
  select 
    count(*),
    coalesce(sum(total_price), 0)
  into 
    total_orders,
    total_revenue
  from orders
  where created_at >= start_date
  and order_status != 'cancelled'
  and payment_status = 'paid'; 
  -- Note: Depending on business logic, we might want to include pending orders or just paid ones.
  -- For "Sales", typically only paid/confirmed counts. 
  -- But "new" orders might be relevant if manual payment.
  -- Let's stick to paid for "Revenue" to be accurate, or maybe include all non-cancelled for "Activity".
  -- Re-evaluating based on typical ecommerce: "Revenue" is usually money in. "Orders" is volume.
  -- Given common manual flows (GCash etc), 'paid' is best for revenue.
  -- BUT, if theyマーク 'paid' manually, we rely on that.
  
  -- Let's try to be broader for a dashboard: All non-cancelled orders count for "Orders", 
  -- but only paid orders count for "Revenue" might be confusing if they don't match.
  -- Let's stick to simple: Valid orders are those not cancelled.
  
  -- Recalculating query to be safer
  select 
    count(*),
    coalesce(sum(case when payment_status = 'paid' then total_price else 0 end), 0)
  into 
    total_orders,
    total_revenue
  from orders
  where created_at >= start_date
  and order_status != 'cancelled';

  if total_orders > 0 then
    avg_order_value := total_revenue / total_orders;
  else
    avg_order_value := 0;
  end if;

  return json_build_object(
    'total_orders', total_orders,
    'total_revenue', total_revenue,
    'average_order_value', avg_order_value,
    'period', period
  );
end;
$$;

-- Function to get top selling products
create or replace function get_top_products(
  period text, -- 'daily', 'weekly', 'monthly', 'all_time'
  limit_count int default 10,
  timezone text default 'UTC'
)
returns table (
  product_name text,
  total_sold bigint,
  total_revenue decimal(10,2)
)
language plpgsql
security definer
as $$
declare
  start_date timestamptz;
begin
  -- Determine start date based on period
  if period = 'daily' then
    start_date := date_trunc('day', now() at time zone timezone);
  elsif period = 'weekly' then
    start_date := date_trunc('week', now() at time zone timezone);
  elsif period = 'monthly' then
    start_date := date_trunc('month', now() at time zone timezone);
  else
    start_date := '1970-01-01'::timestamptz;
  end if;

  return query
  with expanded_items as (
    select
      (item->>'product_name')::text as p_name,
      (item->>'quantity')::int as quantity,
      (item->>'price')::decimal(10,2) * (item->>'quantity')::int as row_total
    from orders,
    jsonb_array_elements(order_items) as item
    where created_at >= start_date
    and order_status != 'cancelled'
    -- For top products, we probably want to confirm the order is valid/paid, 
    -- but usually "Trending" includes everything placed. 
    -- Let's filter by non-cancelled to be safe.
  )
  select
    p_name as product_name,
    sum(quantity)::bigint as total_sold,
    sum(row_total)::decimal(10,2) as total_revenue
  from expanded_items
  group by p_name
  order by total_sold desc, total_revenue desc
  limit limit_count;
end;
$$;
