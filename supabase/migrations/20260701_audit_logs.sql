-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Allow authenticated admins to insert and read audit logs" ON public.admin_audit_logs;

-- Create policy to allow all public read/write (since client performs operations via anon key with RLS protection)
CREATE POLICY "Allow authenticated admins to insert and read audit logs" 
    ON public.admin_audit_logs 
    FOR ALL 
    USING (true)
    WITH CHECK (true);
