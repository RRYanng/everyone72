-- 修复 practice-photos bucket 公开访问权限
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

-- 1. 确保 bucket 存在且设为 public
INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-photos', 'practice-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. 允许已登录用户上传到自己的文件夹
CREATE POLICY IF NOT EXISTS "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. 允许所有人查看照片（公开读取）
CREATE POLICY IF NOT EXISTS "Public can view practice photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'practice-photos');

-- 4. 允许用户删除自己的照片
CREATE POLICY IF NOT EXISTS "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'practice-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
