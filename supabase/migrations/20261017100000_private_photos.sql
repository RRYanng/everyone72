-- ============================================================
-- P2: 练习照片 bucket 改为私有,并加上大小 / 类型限制
--
-- 之前:bucket 是 public,SELECT 策略对所有人开放。照片 URL 一旦被转发,
-- 任何人(包括没登录的人)都能看,而隐私政策写的是"只有你和好友可见"。
--
-- 现在:
--   * bucket 私有:不能再用 /object/public/... 直链访问
--   * 读取走签名 URL(createSignedUrl,有效期 1 小时),而生成签名 URL 需要对
--     storage.objects 有 SELECT 权限 —— 只有本人和已接受的好友有(和 practice_logs 可见性一致)
--   * 单文件 ≤ 5 MB,只允许图片类型(由 Storage 服务端强制,不是客户端自觉)
--   * 上传仍限制在自己的 <uid>/ 目录下
--
-- 已有的 photo_url 是完整的公开 URL,不需要改数据:客户端会从里面取出路径再签名。
-- 删号时 Edge Function 用 service_role 清理 <uid>/ 下的文件,不受这些策略影响。
-- ============================================================
update storage.buckets
   set public             = false,
       file_size_limit    = 5242880,                                 -- 5 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
 where id = 'practice-photos';

-- 不再允许任何人直接读
drop policy if exists "Public can view practice photos" on storage.objects;

drop policy if exists "Owner and friends can view practice photos" on storage.objects;
create policy "Owner and friends can view practice photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'practice-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.friendships f
         where f.status = 'accepted'
           and ((f.user_id = auth.uid()   and f.friend_id::text = (storage.foldername(name))[1])
             or (f.friend_id = auth.uid() and f.user_id::text   = (storage.foldername(name))[1]))
      )
    )
  );

-- 上传:只能传到自己的目录,且路径必须正好是 <uid>/<文件名>(不能再嵌套子目录)
drop policy if exists "Users can upload their own photos" on storage.objects;
create policy "Users can upload their own photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'practice-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and array_length(storage.foldername(name), 1) = 1
  );
