-- Track the Telegram message that announced this order so the webhook
-- can edit it when an admin confirms/cancels.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;
