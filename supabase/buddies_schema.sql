-- ============================================================
-- Everyone 72 — 搭子/约局 v1 数据地基
-- profiles 扩字段 + outings + outing_members + outing_comments
-- + RLS + 状态同步触发器 + Realtime 发布
-- 在 Supabase Dashboard > SQL Editor 执行。纯增量,不动现有数据。
-- ============================================================

-- 1) profiles 扩字段(全部可空,不破坏现有行)
alter table public.profiles
  add column if not exists city            text,
  add column if not exists home_course_id  text references public.courses(id),
  add column if not exists availability    text[],
  add column if not exists bio             text;

-- 2) outings(一次球局)
create table if not exists public.outings (
  id           uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  course_id    text not null references public.courses(id),
  city         text not null,
  play_date    date not null,
  tee_time     time,
  slots_total  int  not null check (slots_total between 2 and 4),
  skill_pref   text not null default 'any',
  note         text,
  join_mode    text not null default 'instant' check (join_mode in ('instant','approve')),
  status       text not null default 'open'    check (status in ('open','full','cancelled','done')),
  created_at   timestamptz not null default now()
);
create index if not exists outings_city_status_idx on public.outings (city, status, play_date);
create index if not exists outings_organizer_idx    on public.outings (organizer_id);

-- 3) outing_members(谁加入了哪个局)
create table if not exists public.outing_members (
  id         uuid primary key default gen_random_uuid(),
  outing_id  uuid not null references public.outings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'joined' check (status in ('joined','pending')),
  joined_at  timestamptz not null default now(),
  unique (outing_id, user_id)
);
create index if not exists outing_members_outing_idx on public.outing_members (outing_id);
create index if not exists outing_members_user_idx   on public.outing_members (user_id);

-- 4) outing_comments(局内留言板)
create table if not exists public.outing_comments (
  id         uuid primary key default gen_random_uuid(),
  outing_id  uuid not null references public.outings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists outing_comments_outing_idx on public.outing_comments (outing_id, created_at);

-- ============================================================
-- 状态同步触发器:joined 人数达到 slots_total → full,否则 open
-- (cancelled/done 不被覆盖)。security definer 以绕过 RLS 写 outings。
-- ============================================================
create or replace function public.sync_outing_status() returns trigger as $$
declare
  v_outing uuid := coalesce(NEW.outing_id, OLD.outing_id);
  v_total  int;
  v_status text;
  v_cnt    int;
begin
  select slots_total, status into v_total, v_status from public.outings where id = v_outing;
  if v_status in ('cancelled','done') then return coalesce(NEW, OLD); end if;
  select count(*) into v_cnt from public.outing_members
    where outing_id = v_outing and status = 'joined';
  update public.outings
    set status = case when v_cnt >= v_total then 'full' else 'open' end
    where id = v_outing and status in ('open','full');
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

drop trigger if exists outing_members_status_sync on public.outing_members;
create trigger outing_members_status_sync
  after insert or update or delete on public.outing_members
  for each row execute function public.sync_outing_status();

-- ============================================================
-- RLS
-- ============================================================
alter table public.outings          enable row level security;
alter table public.outing_members   enable row level security;
alter table public.outing_comments  enable row level security;

-- outings:本人发的 / 加入过的 / 同城的 可读;仅发起人可增删改
create policy "read outings (own/joined/same-city)" on public.outings for select
  using (
    auth.uid() = organizer_id
    or exists (select 1 from public.outing_members m where m.outing_id = id and m.user_id = auth.uid())
    or city = (select p.city from public.profiles p where p.id = auth.uid())
  );
create policy "organizer inserts outing" on public.outings for insert
  with check (auth.uid() = organizer_id);
create policy "organizer updates outing" on public.outings for update
  using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);
create policy "organizer deletes outing" on public.outings for delete
  using (auth.uid() = organizer_id);

-- outing_members:发起人或该局成员可读;用户加自己;组织者可改状态(审批);本人退出或组织者移除可删
create policy "read members (organizer or member)" on public.outing_members for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.outings o where o.id = outing_id and o.organizer_id = auth.uid())
    or exists (select 1 from public.outing_members m2 where m2.outing_id = outing_id and m2.user_id = auth.uid())
  );
create policy "user joins (insert self)" on public.outing_members for insert
  with check (user_id = auth.uid());
create policy "organizer approves (update)" on public.outing_members for update
  using (exists (select 1 from public.outings o where o.id = outing_id and o.organizer_id = auth.uid()));
create policy "self-leave or organizer-remove (delete)" on public.outing_members for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.outings o where o.id = outing_id and o.organizer_id = auth.uid())
  );

-- outing_comments:能看到该局的人可读;仅 joined 成员或发起人可发
create policy "read comments (can see outing)" on public.outing_comments for select
  using (
    exists (select 1 from public.outings o where o.id = outing_id and (
      o.organizer_id = auth.uid()
      or o.city = (select p.city from public.profiles p where p.id = auth.uid())
      or exists (select 1 from public.outing_members m where m.outing_id = o.id and m.user_id = auth.uid())
    ))
  );
create policy "joined member posts comment" on public.outing_comments for insert
  with check (
    user_id = auth.uid() and (
      exists (select 1 from public.outing_members m
              where m.outing_id = outing_id and m.user_id = auth.uid() and m.status = 'joined')
      or exists (select 1 from public.outings o where o.id = outing_id and o.organizer_id = auth.uid())
    )
  );

-- ============================================================
-- Realtime:留言板订阅
-- ============================================================
alter publication supabase_realtime add table public.outing_comments;
