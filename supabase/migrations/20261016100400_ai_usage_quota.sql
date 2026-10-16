-- ============================================================
-- P0: AI 调用的每日配额
--
-- analyze-round Edge Function 之前只检查 Authorization 头存在,没有任何用量限制:
-- 任何注册用户都能无限次调用 Claude(费用由项目承担)。
-- 配额由 Edge Function 用 service_role 调用 consume_ai_quota() 原子地扣减。
--
-- 表开了 RLS 且没有任何策略 → 客户端(anon / authenticated)完全读写不了,
-- 只有 service_role(绕过 RLS)可以。函数同理,只授权给 service_role。
-- ============================================================
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default ((now() at time zone 'utc')::date),
  calls   int  not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- 原子扣减:未达上限则 +1 并返回 true;已达上限返回 false(不增加)
create or replace function public.consume_ai_quota(p_user uuid, p_limit int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_calls int;
begin
  insert into public.ai_usage (user_id, day, calls)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
    do update set calls = public.ai_usage.calls + 1
    where public.ai_usage.calls < p_limit
  returning calls into v_calls;

  return v_calls is not null;   -- where 不成立时 RETURNING 无行 → null → false
end $$;

revoke execute on function public.consume_ai_quota(uuid, int) from public, anon, authenticated;
grant  execute on function public.consume_ai_quota(uuid, int) to service_role;
