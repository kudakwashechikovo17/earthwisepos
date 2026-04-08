-- ============================================================
-- EARTHWISE BUTCHER POS — Image Storage & Product Update
-- Run this carefully in the Supabase SQL Editor.
-- ============================================================

-- 1. Add image_url to products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='products' AND column_name='image_url'
  ) THEN
    ALTER TABLE public.products ADD COLUMN image_url text;
  END IF;
END $$;

-- 2. Create the Storage Bucket for Product Images
-- This creates a public bucket named 'product-images'
insert into storage.buckets (id, name, public) 
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 3. Security Policies for the Bucket
-- Allow everyone to view the images
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'product-images' );

-- Allow authenticated users (Admin/Cashiers) to upload images
create policy "Authenticated users can upload" 
on storage.objects for insert 
with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Allow authenticated users to update/delete images (optional but good for editing)
create policy "Authenticated users can update"
on storage.objects for update
using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

create policy "Authenticated users can delete"
on storage.objects for delete
using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
