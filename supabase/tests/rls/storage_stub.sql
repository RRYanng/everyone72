-- ── Storage 桩 ──────────────────────────────────────────────────
-- 测试用的 Postgres 里没有 Supabase Storage 服务,这里按线上结构放一个最小副本,
-- 连同线上"迁移之前"的那组策略,这样私有化迁移里的 drop / create 才是在真实起点上跑。
-- 镜像里的 storage schema 属于 supabase_admin,所以这个文件用 supabase_admin 执行(run.sh),
-- 建完把表的所有权交给 postgres,让后面的迁移(以 postgres 身份)能改策略。
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text, owner uuid, metadata jsonb, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
language plpgsql as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;
grant select on storage.buckets to anon, authenticated;
insert into storage.buckets (id, name, public) values ('practice-photos', 'practice-photos', true)
  on conflict (id) do nothing;
create policy "Public can view practice photos" on storage.objects for select using (bucket_id = 'practice-photos');
create policy "Users can upload their own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'practice-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their own photos" on storage.objects for update to authenticated
  using (bucket_id = 'practice-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'practice-photos' and (storage.foldername(name))[1] = auth.uid()::text);

alter table storage.buckets owner to postgres;
alter table storage.objects owner to postgres;
alter function storage.foldername(text) owner to postgres;
