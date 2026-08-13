-- Improved Sales Analytics with Flexible Date Ranges
-- Updated: Fixed to include shipping_fee and align with inventory manager logic

-- 1. Get Dashboard Metrics (Revenue, Orders, Units, AOV)
-- Allows strict date ranges for accurate "vs previous" comparisons
create or replace function get_dashboard_metrics(
  date_start timestamptz,
  date_end timestamptz
)
returns json
language plpgsql
security definer
as $$
declare
  total_orders bigint;
  total_revenue decimal(10,2);
  total_units bigint;
  avg_order_value decimal(10,2);
begin
  -- Calculate core metrics (only confirmed/paid orders for accurate revenue)
  select 
    count(distinct id),
    coalesce(sum(total_price + coalesce(shipping_fee, 0)), 0)
  into 
    total_orders,
    total_revenue
  from orders
  where created_at >= date_start 
  and created_at <= date_end
  and order_status in ('confirmed', 'processing', 'shipped', 'delivered')
  and payment_status = 'paid';

  -- Calculate total units sold (from paid/confirmed orders)
  select 
    coalesce(sum((item->>'quantity')::int), 0)
  into 
    total_units
  from orders,
  jsonb_array_elements(order_items) as item
  where created_at >= date_start 
  and created_at <= date_end
  and order_status in ('confirmed', 'processing', 'shipped', 'delivered')
  and payment_status = 'paid';

  -- Calculate AOV
  if total_orders > 0 then
    avg_order_value := total_revenue / total_orders;
  else
    avg_order_value := 0;
  end if;

  return json_build_object(
    'total_orders', total_orders,
    'total_revenue', total_revenue,
    'total_units', total_units,
    'average_order_value', avg_order_value
  );
end;
$$;

-- 2. Get Top Selling Products (Leaderboard)
-- Flexible ranking by units sold or revenue
create or replace function get_product_rankings(
  date_start timestamptz,
  date_end timestamptz,
  limit_count int default 10
)
returns table (
  product_name text,
  units_sold bigint,
  revenue decimal(10,2)
)
language plpgsql
security definer
as $$
begin
  return query
  with expanded_items as (
    select
      (item->>'product_name')::text as p_name,
      (item->>'quantity')::int as quantity,
      ((item->>'price')::decimal(10,2) * (item->>'quantity')::int) as row_total
    from orders,
    jsonb_array_elements(order_items) as item
    where created_at >= date_start 
    and created_at <= date_end
    and order_status in ('confirmed', 'processing', 'shipped', 'delivered')
    and payment_status = 'paid'
  )
  select
    p_name,
    sum(quantity)::bigint as total_units,
    sum(row_total)::decimal(10,2) as total_rev
  from expanded_items
  group by p_name
  order by total_units desc, total_rev desc
  limit limit_count;
end;
$$;
