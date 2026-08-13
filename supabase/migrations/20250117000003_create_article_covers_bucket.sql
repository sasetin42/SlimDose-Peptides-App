-- Allow PUBLIC (non-logged in) users to manage files in article-covers bucket
-- WARNING: This allows anyone to upload/delete. Only use if your admin panel is password-protected at app level.

-- Allow anyone to SELECT (view/download) files
CREATE POLICY "Public can view article covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'article-covers');

-- Allow anyone to INSERT (upload) files
CREATE POLICY "Public can upload article covers"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'article-covers');

-- Allow anyone to UPDATE files
CREATE POLICY "Public can update article covers"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'article-covers');

-- Allow anyone to DELETE files
CREATE POLICY "Public can delete article covers"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'article-covers');
