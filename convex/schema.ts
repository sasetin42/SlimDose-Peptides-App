import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One-to-one mirror of the Supabase tables exported on 2026-04-30.
// Original Postgres UUIDs are preserved as `id: string` (Convex's `_id` is
// auto-generated and not user-settable). Numeric `numeric` columns from
// Postgres come through as strings because pg_dump quotes them; we keep
// them as strings here to preserve fidelity (e.g. account_number leading
// zeros, and so the application can JSON.parse decimals as needed).
//
// All non-`id` fields are optional because SQL NULLs were stripped during
// import; absence of a field models NULL.

export default defineSchema({
  categories: defineTable({
    id: v.string(),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    sort_order: v.optional(v.number()),
    active: v.optional(v.boolean()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  shipping_locations: defineTable({
    id: v.string(),
    name: v.optional(v.string()),
    fee: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    order_index: v.optional(v.number()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  payment_methods: defineTable({
    id: v.string(),
    name: v.optional(v.string()),
    account_number: v.optional(v.string()),
    account_name: v.optional(v.string()),
    qr_code_url: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  site_settings: defineTable({
    id: v.string(),
    value: v.optional(v.string()),
    type: v.optional(v.string()),
    description: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  products: defineTable({
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    base_price: v.optional(v.string()),
    discount_price: v.optional(v.string()),
    discount_start_date: v.optional(v.string()),
    discount_end_date: v.optional(v.string()),
    discount_active: v.optional(v.boolean()),
    purity_percentage: v.optional(v.string()),
    molecular_weight: v.optional(v.string()),
    cas_number: v.optional(v.string()),
    sequence: v.optional(v.string()),
    storage_conditions: v.optional(v.string()),
    inclusions: v.optional(v.string()),
    stock_quantity: v.optional(v.number()),
    available: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    image_url: v.optional(v.string()),
    safety_sheet_url: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_uuid", ["id"])
    .index("by_category", ["category"]),

  product_variations: defineTable({
    id: v.string(),
    product_id: v.optional(v.string()),
    name: v.optional(v.string()),
    quantity_mg: v.optional(v.string()),
    price: v.optional(v.string()),
    discount_price: v.optional(v.string()),
    discount_active: v.optional(v.boolean()),
    stock_quantity: v.optional(v.number()),
    created_at: v.optional(v.string()),
  })
    .index("by_uuid", ["id"])
    .index("by_product", ["product_id"]),

  coa_reports: defineTable({
    id: v.string(),
    product_name: v.optional(v.string()),
    batch: v.optional(v.string()),
    test_date: v.optional(v.string()),
    purity_percentage: v.optional(v.string()),
    quantity: v.optional(v.string()),
    task_number: v.optional(v.string()),
    verification_key: v.optional(v.string()),
    image_url: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    manufacturer: v.optional(v.string()),
    laboratory: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  promo_codes: defineTable({
    id: v.string(),
    code: v.optional(v.string()),
    discount_type: v.optional(v.string()),
    discount_value: v.optional(v.string()),
    min_purchase_amount: v.optional(v.string()),
    max_discount_amount: v.optional(v.string()),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    usage_limit: v.optional(v.number()),
    usage_count: v.optional(v.number()),
    active: v.optional(v.boolean()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_uuid", ["id"])
    .index("by_code", ["code"]),

  faqs: defineTable({
    id: v.string(),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    category: v.optional(v.string()),
    order_index: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  orders: defineTable({
    id: v.string(),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    contact_method: v.optional(v.string()),
    shipping_address: v.optional(v.string()),
    shipping_city: v.optional(v.string()),
    shipping_state: v.optional(v.string()),
    shipping_zip_code: v.optional(v.string()),
    shipping_country: v.optional(v.string()),
    shipping_barangay: v.optional(v.string()),
    shipping_region: v.optional(v.string()),
    shipping_location: v.optional(v.string()),
    shipping_fee: v.optional(v.string()),
    shipping_note: v.optional(v.string()),
    // order_items is a JSON-encoded array of line items in the source dump;
    // kept as a string so the pg_dump payload round-trips losslessly.
    // Use JSON.parse in queries that need to read it.
    order_items: v.optional(v.string()),
    subtotal: v.optional(v.string()),
    total_price: v.optional(v.string()),
    pricing_mode: v.optional(v.string()),
    payment_method_id: v.optional(v.string()),
    payment_method_name: v.optional(v.string()),
    payment_status: v.optional(v.string()),
    payment_proof_url: v.optional(v.string()),
    promo_code_id: v.optional(v.string()),
    promo_code: v.optional(v.string()),
    discount_applied: v.optional(v.string()),
    order_status: v.optional(v.string()),
    notes: v.optional(v.string()),
    admin_notes: v.optional(v.string()),
    tracking_number: v.optional(v.string()),
    tracking_courier: v.optional(v.string()),
    shipped_at: v.optional(v.string()),
    shipping_provider: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_uuid", ["id"])
    .index("by_status", ["order_status"])
    .index("by_email", ["customer_email"]),

  guide_topics: defineTable({
    id: v.string(),
    title: v.optional(v.string()),
    preview: v.optional(v.string()),
    content: v.optional(v.string()),
    cover_image: v.optional(v.string()),
    author: v.optional(v.string()),
    published_date: v.optional(v.string()),
    display_order: v.optional(v.number()),
    is_enabled: v.optional(v.boolean()),
    related_product_ids: v.optional(v.array(v.string())),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),

  global_discounts: defineTable({
    id: v.string(),
    name: v.optional(v.string()),
    discount_type: v.optional(v.string()),
    discount_value: v.optional(v.string()),
    active: v.optional(v.boolean()),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    excluded_product_ids: v.optional(v.array(v.string())),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_uuid", ["id"]),
});
