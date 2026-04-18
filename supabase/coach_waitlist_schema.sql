-- ============================================================
-- coach_waitlist — stores emails for the "Get matched with a
-- local pro" waitlist feature in the My Diagnosis tab.
-- Run this in Supabase SQL editor.
-- ============================================================

create table if not exists public.coach_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Prevent duplicate emails
create unique index if not exists coach_waitlist_email_idx
  on public.coach_waitlist (email);

-- RLS
alter table public.coach_waitlist enable row level security;

-- Anyone (authenticated or not) can insert their own email
create policy "Insert own waitlist entry"
  on public.coach_waitlist
  for insert
  with check (true);

-- Users can read only their own entry
create policy "Read own waitlist entry"
  on public.coach_waitlist
  for select
  using (auth.uid() = user_id);

-- Service role (admin) can read all entries
-- (no additional policy needed; service role bypasses RLS)
