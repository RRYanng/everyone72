-- ============================================================
-- 基础埋点:app_events + track_event()
--
-- 目的:回答"有多少人在用、做完了哪些关键动作、AI 成功率多少",不是用户画像。
--
-- 设计:
--  * 表本身对客户端完全关闭(开 RLS、不建任何策略、收回全部权限):
--    客户端既不能直接写、也读不到任何事件(包括自己的)。你用 SQL Editor / service_role 查。
--  * 唯一的写入口是 track_event():
--      - 事件名必须在白名单内,否则静默忽略(客户端 bug 或恶意调用都不会往表里塞任意内容);
--      - props 必须是 JSON 对象且序列化后 ≤ 1000 字符;
--      - platform 只接受 ios / android / web;
--      - 每个用户每 24 小时最多 300 条,超出静默丢弃(防刷表),返回 false。
--  * 只记录登录用户;user_id 外键 ON DELETE CASCADE,账号一删,该用户的全部事件随之删除。
--  * 不记录邮箱、IP、成绩内容或任何自由文本 —— props 只放枚举/数字(见 src/lib/analytics.ts)。
-- ============================================================
create table if not exists public.app_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  platform    text,
  created_at  timestamptz not null default now()
);

create index if not exists app_events_name_time_idx on public.app_events (name, created_at desc);
create index if not exists app_events_user_time_idx on public.app_events (user_id, created_at desc);

alter table public.app_events enable row level security;
revoke all on public.app_events from public, anon, authenticated;

create or replace function public.track_event(
  p_name     text,
  p_props    jsonb default '{}'::jsonb,
  p_platform text  default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_allowed constant text[] := array[
    'app_open', 'sign_up', 'login',
    'round_saved', 'round_edited', 'round_deleted', 'ai_result',
    'practice_checkin', 'crew_created', 'crew_joined',
    'outing_created', 'outing_joined'
  ];
begin
  if v_uid is null then return false; end if;
  if p_name is null or not (p_name = any (v_allowed)) then return false; end if;

  p_props := coalesce(p_props, '{}'::jsonb);
  if jsonb_typeof(p_props) <> 'object' or length(p_props::text) > 1000 then return false; end if;
  if p_platform is not null and p_platform not in ('ios', 'android', 'web') then p_platform := null; end if;

  if (select count(*) from public.app_events
       where user_id = v_uid and created_at > now() - interval '24 hours') >= 300 then
    return false;
  end if;

  insert into public.app_events (user_id, name, props, platform)
  values (v_uid, p_name, p_props, p_platform);
  return true;
end $$;

revoke execute on function public.track_event(text, jsonb, text) from public, anon;
grant  execute on function public.track_event(text, jsonb, text) to authenticated;
