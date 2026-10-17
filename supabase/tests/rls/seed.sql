-- throwaway seed (superuser). Users: A(organizer, Irvine), B(Irvine), C(Seattle)
insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-000000000001','a@test.local'),
 ('bbbbbbbb-0000-0000-0000-000000000002','b@test.local'),
 ('cccccccc-0000-0000-0000-000000000003','c@test.local') on conflict do nothing;
insert into public.profiles (id, username, email, city) values
 ('aaaaaaaa-0000-0000-0000-000000000001','alice','a@test.local','Irvine'),
 ('bbbbbbbb-0000-0000-0000-000000000002','bob','b@test.local','Irvine'),
 ('cccccccc-0000-0000-0000-000000000003','carol','c@test.local','Seattle') on conflict do nothing;
insert into public.courses (id,name,city,state,course_rating,slope_rating,total_par) values ('c1','Test GC','Irvine','CA',72.0,130,72) on conflict do nothing;
insert into public.crews (id,name,creator_id,invite_code) values ('11111111-0000-0000-0000-000000000001','Alice Crew','aaaaaaaa-0000-0000-0000-000000000001','ABC123') on conflict do nothing;
insert into public.crew_members (crew_id,user_id,role) values ('11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','owner') on conflict do nothing;
insert into public.outings (id,organizer_id,course_id,city,play_date,slots_total,join_mode) values ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','c1','Irvine',current_date+3,2,'approve') on conflict do nothing;
insert into public.outing_members (outing_id,user_id,status) values ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','joined') on conflict do nothing;
insert into public.friendships (id,user_id,friend_id,status) values ('33333333-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','accepted') on conflict do nothing;
insert into public.practice_logs (id,user_id,note) values ('44444444-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','range day') on conflict do nothing;
insert into public.reactions (practice_log_id,user_id,type) values ('44444444-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','like') on conflict do nothing;
insert into public.user_stats (user_id,current_streak) values ('aaaaaaaa-0000-0000-0000-000000000001',3) on conflict (user_id) do update set current_streak = 3;
insert into public.rounds (id,user_id,course_id,total_strokes,total_putts,score_vs_par,ai_feedback) values
 ('55555555-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','c1',90,36,18,E'Solid round.\n\n⚠️ AI Coach (web preview mode) — Install on your phone for full Claude-powered analysis.'),
 ('55555555-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','c1',85,33,13,'Your putting cost you 4 strokes today.')
on conflict do nothing;

