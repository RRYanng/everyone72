# 搭子/约局(Golf Buddies & Outings)实现计划

> **For agentic workers:** 本计划交给具备完整仓库访问权限的实现方(用户的"写代码页面")执行,逐 Phase 推进。每个 Task 用 `- [ ]` 勾选跟踪。
> **配套设计文档:** `docs/superpowers/specs/2026-06-08-golf-buddies-outings-design.md`

**Goal:** 给 Everyone 72 加一个"搭子"板块 v1 —— 高尔夫档案(B) + 约局(C) + 局内留言板,帮用户在本地找人一起打球。

**Architecture:** 在现有 Supabase(PostgreSQL + RLS)上加 3 张表并扩 `profiles`;React Native(Expo)+ TypeScript 前端;留言板用 Supabase Realtime;复用现有 `friendships`/`courses` 表与日式极简设计系统。

**Tech Stack:** React Native (Expo), TypeScript, Supabase (Postgres, RLS, Realtime), React Navigation。

**验证方式说明:** 本项目**没有 Jest 测试套件**,沿用既有验证手段:SQL 改动用 Supabase SQL Editor 查询自检;TS 用 `npx tsc --noEmit`;整体用 `npx expo export --platform web` 构建;UI 用本地/线上手动走查。因此下面的"验证"步骤是查询/构建/手动走查,而非单测。

---

## Phase 1 — 数据地基(★ 今天就能跑,免审批)

纯增量迁移:扩 `profiles` + 建 3 张表 + RLS + 状态同步触发器 + Realtime 发布。不动任何现有表数据。

### Task 1.1: 执行地基迁移 SQL

**Files:**
- Create: `supabase/buddies_schema.sql`(把下面整段存成文件,提交进仓库留档)

- [ ] **Step 1: 新建 `supabase/buddies_schema.sql`,内容如下**

```sql
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
```

- [ ] **Step 2: 在 Supabase Dashboard > SQL Editor 执行该文件全文**

预期:`Success. No rows returned`。若 `alter publication ... add table` 报 "already member" 可忽略。

- [ ] **Step 3: 自检查询(在 SQL Editor 跑,确认表与字段就位)**

```sql
select column_name from information_schema.columns
  where table_name='profiles' and column_name in ('city','home_course_id','availability','bio');
-- 预期返回 4 行

select tablename from pg_tables where schemaname='public'
  and tablename in ('outings','outing_members','outing_comments');
-- 预期返回 3 行

select tablename, policyname from pg_policies where schemaname='public'
  and tablename in ('outings','outing_members','outing_comments');
-- 预期看到上面定义的各条 policy
```

- [ ] **Step 4: 提交 SQL 文件留档**

```bash
git add supabase/buddies_schema.sql
git commit -m "feat(buddies): data foundation — profiles fields + outings/members/comments + RLS"
```

---

## Phase 2 — 高尔夫档案(B)

**File Structure:**
- Create: `src/types/buddies.ts` —— 本功能所有 TS 类型集中放这
- Create: `src/lib/profileExtras.ts` —— 读写 profile 扩展字段的数据层
- Create: `src/screens/buddies/EditProfileExtrasScreen.tsx` —— 档案补全表单
- Modify: 现有 profile/设置入口,增加"完善球友档案"入口

### Task 2.1: 类型定义

**Files:** Create `src/types/buddies.ts`

- [ ] **Step 1: 定义类型**

```ts
export type Availability = '工作日早' | '工作日晚' | '周末早' | '周末午';

export interface ProfileExtras {
  city: string | null;
  home_course_id: string | null;
  availability: Availability[] | null;
  bio: string | null;
}

export type JoinMode = 'instant' | 'approve';
export type OutingStatus = 'open' | 'full' | 'cancelled' | 'done';
export type MemberStatus = 'joined' | 'pending';

export interface Outing {
  id: string;
  organizer_id: string;
  course_id: string;
  city: string;
  play_date: string;   // YYYY-MM-DD
  tee_time: string | null;
  slots_total: number;
  skill_pref: string;
  note: string | null;
  join_mode: JoinMode;
  status: OutingStatus;
  created_at: string;
}

export interface OutingMember {
  id: string;
  outing_id: string;
  user_id: string;
  status: MemberStatus;
  joined_at: string;
}

export interface OutingComment {
  id: string;
  outing_id: string;
  user_id: string;
  body: string;
  created_at: string;
}
```

- [ ] **Step 2: 验证** `npx tsc --noEmit` 不报新错。
- [ ] **Step 3: 提交** `git commit -m "feat(buddies): shared types"`

### Task 2.2: 档案数据层

**Files:** Create `src/lib/profileExtras.ts`

- [ ] **Step 1: 实现读写函数**

```ts
import { supabase } from './supabase';
import { ProfileExtras } from '../types/buddies';

export async function getProfileExtras(userId: string): Promise<ProfileExtras | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('city, home_course_id, availability, bio')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileExtras;
}

export async function saveProfileExtras(userId: string, extras: ProfileExtras): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      city: extras.city,
      home_course_id: extras.home_course_id,
      availability: extras.availability,
      bio: extras.bio,
    })
    .eq('id', userId);
  return !error;
}

/** 城市是约局/看局的硬门槛 */
export async function hasCity(userId: string): Promise<boolean> {
  const e = await getProfileExtras(userId);
  return !!e?.city && e.city.trim().length > 0;
}
```

- [ ] **Step 2: 验证** `npx tsc --noEmit`。
- [ ] **Step 3: 提交** `git commit -m "feat(buddies): profile extras data layer"`

### Task 2.3: 档案补全界面

**Files:** Create `src/screens/buddies/EditProfileExtrasScreen.tsx`

- [ ] **Step 1: 实现表单**,遵循现有屏幕模式(复用 `ScreenHeader`/`Card`/`PrimaryButton`/`SecondaryButton`,日式极简配色)。字段:
  - 城市(必填,文本框)
  - 主场球场(从 `COURSES` 选,可选)
  - 常打时段(`Availability` 多选标签)
  - 一句话简介(可选,文本框)
  - mount 时 `getProfileExtras` 预填;保存调 `saveProfileExtras`;城市为空时禁用保存并提示。
- [ ] **Step 2: 验证** `npx expo export --platform web` 构建通过;本地走查:填城市→保存→重进数据还在。
- [ ] **Step 3: 提交** `git commit -m "feat(buddies): edit profile extras screen"`

---

## Phase 3 — 约局数据层(C 核心逻辑)

**Files:** Create `src/lib/outings.ts`

> **备注 · 城市匹配规则(2026-06-09 补充,实现时落地)**
> 城市是发局方与看局方能否匹配上的唯一连接键,必须保证两端来源一致、且不因大小写/输入差异而错过。
> - **`createOuting` 的 `outing.city` 直接取用户 `profile.city`**,不让用户在发局表单里重新输入城市,确保发局方与看局方用的是同一来源(都来自各自 profile.city)。
> - **`listCityOutings` 的城市过滤改用大小写不敏感匹配**:用 `.ilike('city', city)`,或在写入时存一份归一化小写副本(如 `city_normalized`)后用 `.eq` 比对。二选一,实现时定。
> - 上述同样适用于 `outing_comments`/`outings` 的 RLS 里 `city = (select p.city ...)` 比较 —— 若采用归一化副本方案,RLS 也要相应改用归一化列(实现时一并评估)。

### Task 3.1: 约局 CRUD + 加入/退出/审批/移除

- [ ] **Step 1: 实现数据层**

```ts
import { supabase } from './supabase';
import { Outing, OutingMember, JoinMode } from '../types/buddies';

export interface NewOutingInput {
  course_id: string;
  city: string;
  play_date: string;
  tee_time: string | null;
  slots_total: number;
  skill_pref: string;
  note: string | null;
  join_mode: JoinMode;
}

/** 发起一个局:建 outing + 把发起人写为 joined 成员 */
export async function createOuting(organizerId: string, input: NewOutingInput): Promise<Outing | null> {
  const { data, error } = await supabase
    .from('outings')
    .insert({ ...input, organizer_id: organizerId })
    .select().single();
  if (error || !data) return null;
  await supabase.from('outing_members').insert({
    outing_id: data.id, user_id: organizerId, status: 'joined',
  });
  return data as Outing;
}

/** 同城开放的局(open/full),按开球日升序 */
export async function listCityOutings(city: string): Promise<Outing[]> {
  const { data } = await supabase
    .from('outings')
    .select('*')
    .eq('city', city)
    .in('status', ['open', 'full'])
    .gte('play_date', new Date().toISOString().split('T')[0])
    .order('play_date', { ascending: true });
  return (data ?? []) as Outing[];
}

export async function getOuting(id: string): Promise<Outing | null> {
  const { data } = await supabase.from('outings').select('*').eq('id', id).maybeSingle();
  return (data as Outing) ?? null;
}

export async function listMembers(outingId: string): Promise<OutingMember[]> {
  const { data } = await supabase
    .from('outing_members').select('*').eq('outing_id', outingId)
    .order('joined_at', { ascending: true });
  return (data ?? []) as OutingMember[];
}

/** 加入:instant→joined,approve→pending(状态由 outing.join_mode 决定) */
export async function joinOuting(outingId: string, userId: string, joinMode: JoinMode): Promise<boolean> {
  const { error } = await supabase.from('outing_members').insert({
    outing_id: outingId, user_id: userId,
    status: joinMode === 'approve' ? 'pending' : 'joined',
  });
  return !error;
}

export async function leaveOuting(outingId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('outing_members')
    .delete().eq('outing_id', outingId).eq('user_id', userId);
  return !error;
}

/** 组织者审批 pending→joined */
export async function approveMember(memberId: string): Promise<boolean> {
  const { error } = await supabase.from('outing_members')
    .update({ status: 'joined' }).eq('id', memberId);
  return !error;
}

/** 组织者移除成员 / 拒绝申请 = 删行 */
export async function removeMember(memberId: string): Promise<boolean> {
  const { error } = await supabase.from('outing_members').delete().eq('id', memberId);
  return !error;
}

export async function cancelOuting(outingId: string): Promise<boolean> {
  const { error } = await supabase.from('outings')
    .update({ status: 'cancelled' }).eq('id', outingId);
  return !error;
}
```

- [ ] **Step 2: 验证** `npx tsc --noEmit`。
- [ ] **Step 3: 数据层手动验证**(临时脚本或 Supabase Table Editor):创建一个局→listCityOutings 能查到→另一账号 join→满员后 outing.status 自动变 `full`(触发器生效)。
- [ ] **Step 4: 提交** `git commit -m "feat(buddies): outings data layer"`

---

## Phase 4 — 约局界面(逛 / 发 / 详情)

**Files:**
- Create: `src/screens/buddies/OutingsListScreen.tsx`(同城列表 + "发一个局"入口;无城市则引导去 Phase 2 档案页)
- Create: `src/screens/buddies/CreateOutingScreen.tsx`(发局表单:选球场/日期/时间/人数/差点偏好/加入方式/备注 → `createOuting`)
- Create: `src/screens/buddies/OutingDetailScreen.tsx`(发起人档案、成员列表、加入/退出按钮;组织者看到审批/移除/取消)

### Task 4.1 / 4.2 / 4.3:三个屏幕
- [ ] 各屏遵循现有屏幕模式与设计系统,卡片样式参考 spec 中确认的 C 方案 mockup(`.superpowers/brainstorm/` 里有)。
- [ ] 每屏:实现 → `npx tsc --noEmit` → 构建走查 → 单独 commit。
- [ ] 加入按钮逻辑:读 `outing.join_mode` 传给 `joinOuting`;instant 即时进、approve 显示"申请已发送"。

---

## Phase 5 — 局内留言板(Realtime)

**Files:** Create `src/lib/outingComments.ts` + 在 `OutingDetailScreen` 底部加留言区组件。

### Task 5.1: 留言数据层 + 实时订阅

- [ ] **Step 1: 实现**

```ts
import { supabase } from './supabase';
import { OutingComment } from '../types/buddies';

export async function listComments(outingId: string): Promise<OutingComment[]> {
  const { data } = await supabase
    .from('outing_comments').select('*')
    .eq('outing_id', outingId).order('created_at', { ascending: true });
  return (data ?? []) as OutingComment[];
}

export async function postComment(outingId: string, userId: string, body: string): Promise<boolean> {
  const { error } = await supabase.from('outing_comments')
    .insert({ outing_id: outingId, user_id: userId, body });
  return !error;
}

/** 订阅该局新留言;返回取消订阅函数 */
export function subscribeComments(outingId: string, onInsert: (c: OutingComment) => void): () => void {
  const channel = supabase
    .channel(`outing_comments:${outingId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'outing_comments', filter: `outing_id=eq.${outingId}` },
      payload => onInsert(payload.new as OutingComment))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
```

- [ ] **Step 2:** 留言区组件:mount 时 `listComments` + `subscribeComments`,卸载时取消订阅;仅 `joined` 成员/发起人可见输入框。
- [ ] **Step 3:** 验证:两个窗口进同一局,A 发留言 B 实时看到。
- [ ] **Step 4:** 提交 `git commit -m "feat(buddies): outing comments with realtime"`

---

## Phase 6 — 我的 / 审批 / 通知红点 / 导航接入

**Files:**
- Create: `src/screens/buddies/MyOutingsScreen.tsx`(我发起的[含待审批 pending 申请] + 我加入的)
- Create: `src/lib/buddiesNotifications.ts`(派生未读计数,不建表)
- Modify: `src/navigation/index.tsx`(新增"搭子"板块,子 tab:约局 / 我的)

### Task 6.1: 通知红点(派生计数)
- [ ] 实现"自上次查看以来的新动态"计数:基于 `outing_members`(我的局里新加入/新 pending)和 `outing_comments`(我加入的局里的新留言)与一个本地"上次查看时间"(localStorage/AsyncStorage,复用记分卡草稿那套存储抽象)对比派生。不建通知表。

### Task 6.2: 审批流
- [ ] MyOutingsScreen 中,组织者对 pending 成员展示"通过/拒绝",调 `approveMember`/`removeMember`。

### Task 6.3: 导航接入
- [ ] 在底部导航新增"搭子" tab(若导航过挤则收进现有入口);内含 约局(`OutingsListScreen`)/ 我的(`MyOutingsScreen`)。
- [ ] 整体 `npx expo export --platform web` 构建通过 → commit。

---

## 自检(写完计划后对照 spec)

- ✅ Spec 第 4 节数据模型 → Phase 1 全覆盖(profiles 扩字段 + 3 表 + RLS)
- ✅ Spec 第 5 节流程(建档案/发局/加入/留言)→ Phase 2/3/4/5
- ✅ Spec 第 6 节导航 → Phase 6.3
- ✅ Spec 第 7 节通知(app 内红点、派生计数)→ Phase 6.1
- ✅ Spec 第 8 节衡量指标 → 数据天然可查(outings/members/comments 计数),无需额外开发
- ✅ join_mode/status/member status 命名前后一致(types ↔ SQL ↔ 数据层)
- ⚠️ 已知 v1 取舍:approve 模式下,RLS 仅校验 `user_id=auth.uid()`,不强制 insert 时 status 必须为 pending(前端控制)。恶意用户理论上可自插 joined —— v1 接受,未来可加触发器强制。已在此标注。

---

## 部署提醒(沿用记分卡那次的流程)
1. Phase 1 SQL 在 Supabase 执行(直连数据库,立即生效)。
2. 前端代码每 Phase 提交后,需 `git push origin main` → Vercel 自动重建 → 线上才更新。
3. 测试线上前先 `Cmd+Shift+R` 强刷清缓存。
