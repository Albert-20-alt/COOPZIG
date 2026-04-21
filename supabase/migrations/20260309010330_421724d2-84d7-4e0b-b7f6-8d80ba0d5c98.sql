-- RLS policies for site-assets storage bucket

-- Allow public read access to site assets
CREATE POLICY "Public read access for site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Allow superadmins to upload site assets
CREATE POLICY "Superadmins can upload site-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets' AND
  public.has_role(auth.uid(), 'superadmin')
);

-- Allow superadmins to update site assets
CREATE POLICY "Superadmins can update site-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'site-assets' AND
  public.has_role(auth.uid(), 'superadmin')
);

-- Allow superadmins to delete site assets
CREATE POLICY "Superadmins can delete site-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'site-assets' AND
  public.has_role(auth.uid(), 'superadmin')
);