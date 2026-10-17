# shellcheck shell=bash
# 测试用例。由 run.sh source 进来,可用 expect / expect_not / $SU / $BACK 及各 UUID 变量。

echo "── 无递归:基本读取 ──"
expect "A 读 crew_members 不再递归报错" A "select count(*) from crew_members;" "1"
expect_not "A 读 crew_members 无 recursion" A "select count(*) from crew_members;" "recursion"
expect_not "B 读 outings 无 recursion" B "select count(*) from outings;" "recursion"
expect_not "A 读 outing_members 无 recursion" A "select count(*) from outing_members;" "recursion"

echo "── Crew ──"
expect "create_crew 返回 6 位邀请码" A "select length(invite_code) from create_crew('New Crew','d','golf-outline');" "6"
expect "创建者在同一事务内能读到自己的 crew 和 owner 成员行" A \
  "select count(*) from create_crew('N2'); select (select count(*) from crews where creator_id=auth.uid() and name='N2') || '/' || (select count(*) from crew_members cm join crews c on c.id=cm.crew_id where c.name='N2' and cm.role='owner' and cm.user_id=auth.uid());" "1/1"
expect "create_crew 拒绝空名字" A "select create_crew('   ');" "invalid_name"
expect "B 用小写邀请码加入" B "select join_crew('abc123') = '$CREW' as joined;" "t"
expect "无效邀请码" B "select join_crew('NOPE00');" "invalid_code"
expect "重复加入" A "select join_crew('ABC123');" "already_member"
expect "满员拒绝" C "$SU update crews set max_members=2 where id='$CREW'; insert into crew_members(crew_id,user_id) values ('$CREW','$B'); $BACK select join_crew('ABC123');" "crew_full"
expect "局外人看不到别人的 crew / 成员" C "select (select count(*) from crews) || '/' || (select count(*) from crew_members);" "0/0"
expect "不能绕过邀请码直接 insert crew_members" B "insert into crew_members(crew_id,user_id) values ('$CREW','$B');" "row-level security"
expect "成员可以自己退出" B "$SU insert into crew_members(crew_id,user_id) values ('$CREW','$B'); $BACK delete from crew_members where crew_id='$CREW' and user_id=auth.uid() returning 1;" "1"
expect "匿名/PUBLIC 不能执行 RPC,登录用户可以" A \
  "select has_function_privilege('anon','public.join_crew(text)','execute') || '|' || has_function_privilege('anon','public.create_crew(text,text,text)','execute') || '|' || has_function_privilege('authenticated','public.join_crew(text)','execute');" "false|false|true"

echo "── Buddies ──"
expect "同城用户看得到局" B "select count(*) from outings;" "1"
expect "异地用户看不到局" C "select count(*) from outings;" "0"
expect "异地用户看不到成员列表" C "select count(*) from outing_members;" "0"
expect "approve 局不能自插 joined(绕过审批)" B "insert into outing_members(outing_id,user_id,status) values ('$O','$B','joined');" "approval_required"
expect "approve 局可以 pending 申请" B "insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending') returning status;" "pending"
expect "异地用户不能申请加入" C "insert into outing_members(outing_id,user_id,status) values ('$O','$C','pending');" "row-level security"
expect "pending 成员不能给自己审批通过(0 行被更新)" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'); $BACK with u as (update outing_members set status='joined' where user_id=auth.uid() returning 1) select count(*) from u;" "0"
expect "发起人审批通过,局随之变 full" A \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'); $BACK update outing_members set status='joined' where user_id='$B'; reset role; select status from outings where id='$O';" "full"
expect "审批不能超过名额" A \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$C','joined'),('$O','$B','pending'); $BACK update outing_members set status='joined' where user_id='$B';" "outing_full"
expect "满员的局不能再申请" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$C','joined'); update outings set status='full' where id='$O'; $BACK insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending');" "outing_not_open"
expect "已取消的局不能再申请" B \
  "reset role; update outings set status='cancelled' where id='$O'; set local role authenticated; insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending');" "outing_not_open"
expect "不能把成员行改指给别人" A \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'); $BACK update outing_members set user_id='$C' where user_id='$B';" "member_keys_immutable"
expect "pending 成员不能发留言" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'); $BACK insert into outing_comments(outing_id,user_id,body) values ('$O','$B','hi');" "row-level security"
expect "joined 成员可以发留言" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','joined'); $BACK insert into outing_comments(outing_id,user_id,body) values ('$O','$B','hi') returning body;" "hi"
expect "同城非成员能读留言" B \
  "reset role; insert into outing_comments(outing_id,user_id,body) values ('$O','$A','welcome'); set local role authenticated; select count(*) from outing_comments;" "1"
expect "异地用户读不到留言" C \
  "reset role; insert into outing_comments(outing_id,user_id,body) values ('$O','$A','welcome'); set local role authenticated; select count(*) from outing_comments;" "0"
expect "别的局的成员不能在这个局留言(旧版恒真 bug)" B \
  "$SU insert into outings(id,organizer_id,course_id,city,play_date,slots_total) values ('22222222-0000-0000-0000-0000000000f2','$C','c1','Irvine',current_date+1,4); insert into outing_members(outing_id,user_id,status) values ('$O','$B','joined'); $BACK insert into outing_comments(outing_id,user_id,body) values ('22222222-0000-0000-0000-0000000000f2','$B','spam');" "row-level security"

echo "── friendships ──"
LOG=44444444-0000-0000-0000-000000000001
expect "不能给自己伪造 accepted 好友关系" C "insert into friendships(user_id,friend_id,status) values ('$C','$A','accepted');" "row-level security"
expect "不能加自己为好友" C "insert into friendships(user_id,friend_id,status) values ('$C','$C','pending');" "row-level security"
expect "正常发好友请求(pending)" C "insert into friendships(user_id,friend_id,status) values ('$C','$A','pending') returning status;" "pending"
expect "非好友读不到对方的打卡" C "select count(*) from practice_logs where user_id='$A';" "0"
expect "已接受的好友读得到打卡" B "select count(*) from practice_logs where user_id='$A';" "1"
expect "被请求方可以接受" A "$SU insert into friendships(user_id,friend_id,status) values ('$C','$A','pending'); $BACK update friendships set status='accepted' where user_id='$C' and friend_id=auth.uid() returning status;" "accepted"
expect "请求方不能自己接受(0 行)" C "$SU insert into friendships(user_id,friend_id,status) values ('$C','$A','pending'); $BACK with u as (update friendships set status='accepted' where user_id=auth.uid() returning 1) select count(*) from u;" "0"
expect "不能改 friend 关系的主体" A "$SU insert into friendships(user_id,friend_id,status) values ('$C','$A','pending'); $BACK update friendships set user_id='$B', status='accepted' where friend_id=auth.uid() and user_id='$C';" "friendship_keys_immutable"
expect "好友关系双方都能删除" B "delete from friendships where id='$F' returning id;" "$F"
expect "无关的人删不掉(0 行)" C "with d as (delete from friendships where id='$F' returning 1) select count(*) from d;" "0"

echo "── reactions ──"
expect "好友能看到打卡上的反应" B "select count(*) from reactions where practice_log_id='$LOG';" "1"
expect "非好友看不到反应" C "select count(*) from reactions where practice_log_id='$LOG';" "0"
expect "非好友不能对看不到的打卡点赞" C "insert into reactions(practice_log_id,user_id,type) values ('$LOG','$C','like');" "row-level security"
expect "好友可以评论" B "insert into reactions(practice_log_id,user_id,type,content) values ('$LOG','$B','comment','nice') returning type;" "comment"

echo "── user_stats / waitlist ──"
expect "匿名读 user_stats 得不到数据" ANON "select count(*) from user_stats;" "0"
expect "登录用户能读 user_stats(排行榜)" B "select count(*) from user_stats;" "1"
expect "匿名无权读 streak_leaderboard" A "select has_table_privilege('anon','public.streak_leaderboard','select');" "f"
expect "匿名可以加入候补(不带 user_id;应用端不带 returning)" ANON "insert into coach_waitlist(email) values ('x@y.com'); reset role; select count(*) from coach_waitlist where email='x@y.com';" "1"
expect "匿名不能冒用 user_id 加入候补" ANON "insert into coach_waitlist(email,user_id) values ('x@y.com','$A');" "row-level security"
expect "登录用户不能冒用别人的 user_id" B "insert into coach_waitlist(email,user_id) values ('b@y.com','$A');" "row-level security"
expect "登录用户可以用自己的 user_id" B "insert into coach_waitlist(email,user_id) values ('b@y.com','$B') returning email;" "b@y.com"

echo "── public_profiles ──"
expect "登录用户能读到别人的 username" B "select username from public_profiles where id='$A';" "alice"
expect "视图里没有 email 列" B "select email from public_profiles limit 1;" "does not exist"
expect "profiles 本表仍然只能看自己" B "select count(*) from profiles where id='$A';" "0"
expect "匿名无权读 public_profiles,登录用户有权" A \
  "select has_table_privilege('anon','public.public_profiles','select') || '|' || has_table_privilege('authenticated','public.public_profiles','select');" "false|true"
expect "登录用户不能通过视图写 profiles" B "update public_profiles set username='hax' where id='$B';" "permission denied"

echo "── save_round ──"
COURSE="jsonb_build_object('id','c1','name','Test GC','city','Irvine','state','CA','course_rating',99.9,'slope_rating',999,'total_par',72)"
H9="(select jsonb_agg(jsonb_build_object('hole_number',g,'par',4,'strokes',5,'putts',2,'troubles','[\"bunker\"]'::jsonb) order by g) from generate_series(1,9) g)"
expect "9 洞合法成绩保存成功,总杆/推杆/相对标准杆由服务端汇总" A \
  "select save_round($COURSE,'White',current_date,$H9) as id \\gset
   select total_strokes||'/'||total_putts||'/'||score_vs_par||'/'||total_holes from rounds where id = :'id';" "45/18/9/9"
expect "逐洞数据和 troubles 一并写入" A \
  "select save_round($COURSE,'White',current_date,$H9) as id \\gset
   select count(*)||'/'||(select count(*) from hole_scores where round_id=:'id' and troubles = '{bunker}') from hole_scores where round_id = :'id';" "9/9"
expect "已存在的球场不会被覆盖(评分仍是 72.0)" A \
  "select save_round($COURSE,'White',current_date,$H9); select course_rating from courses where id='c1';" "72.0"
expect "新球场会被插入" A \
  "select save_round(jsonb_build_object('id','new-course','name','New','course_rating',70.1,'slope_rating',120,'total_par',72),'Blue',current_date,$H9); select name from courses where id='new-course';" "New"
expect "非法杆数(0)被拒绝,且不留下半成品 round" A \
  "select save_round($COURSE,'White',current_date,(select jsonb_agg(jsonb_build_object('hole_number',g,'par',4,'strokes',case when g=3 then 0 else 5 end,'putts',2,'troubles','[]'::jsonb)) from generate_series(1,9) g));" "invalid_holes"
expect "推杆多于杆数被拒绝" A \
  "select save_round($COURSE,'White',current_date,(select jsonb_agg(jsonb_build_object('hole_number',g,'par',4,'strokes',2,'putts',3,'troubles','[]'::jsonb)) from generate_series(1,9) g));" "invalid_holes"
expect "洞数不是 9/18 被拒绝" A \
  "select save_round($COURSE,'White',current_date,(select jsonb_agg(jsonb_build_object('hole_number',g,'par',4,'strokes',5,'putts',2)) from generate_series(1,10) g));" "invalid_holes"
expect "洞号重复被拒绝" A \
  "select save_round($COURSE,'White',current_date,(select jsonb_agg(jsonb_build_object('hole_number',1,'par',4,'strokes',5,'putts',2)) from generate_series(1,9) g));" "invalid_holes"
expect "缺字段(strokes 为 null)被拒绝" A \
  "select save_round($COURSE,'White',current_date,(select jsonb_agg(case when g=2 then jsonb_build_object('hole_number',g,'par',4,'putts',2) else jsonb_build_object('hole_number',g,'par',4,'strokes',5,'putts',2) end) from generate_series(1,9) g));" "invalid_holes"
expect "非法 troubles 值被拒绝" A \
  "select save_round($COURSE,'White',current_date,(select jsonb_agg(jsonb_build_object('hole_number',g,'par',4,'strokes',5,'putts',2,'troubles','[\"lava\"]'::jsonb)) from generate_series(1,9) g));" "invalid_holes"
expect "失败的保存不留下 round(原子性):前后 round 数量不变" A \
  "reset role; select count(*) as before from rounds \\gset
   set local role authenticated;
   do \$\$ begin perform save_round($COURSE,'White',current_date,(select jsonb_agg(jsonb_build_object('hole_number',g,'par',4,'strokes',case when g=9 then 99 else 5 end,'putts',2)) from generate_series(1,9) g)); exception when others then null; end \$\$;
   reset role; select count(*) = :before from rounds;" "t"
expect "用户看不到别人的成绩" B \
  "reset role; insert into rounds(user_id,course_id,total_strokes) values ('$A','c1',80); set local role authenticated; select count(*) from rounds;" "0"
expect "保存的 round 属于调用者" B \
  "select save_round($COURSE,'White',current_date,$H9) as id \\gset
   reset role; select user_id = '$B' from rounds where id = :'id';" "t"
expect "匿名/PUBLIC 不能执行 save_round" A "select has_function_privilege('anon','public.save_round(jsonb,text,date,jsonb)','execute') || '|' || has_function_privilege('authenticated','public.save_round(jsonb,text,date,jsonb)','execute');" "false|true"

echo "── ai_usage / consume_ai_quota ──"
expect "额度内返回 true,用满后返回 false 且不再累加" A \
  "reset role; select consume_ai_quota('$A',2) || ',' || consume_ai_quota('$A',2) || ',' || consume_ai_quota('$A',2) || ',' || consume_ai_quota('$A',2); select calls from ai_usage where user_id='$A';" "true,true,false,false"
expect "用满后计数停在上限(2)" A \
  "reset role; select consume_ai_quota('$A',2), consume_ai_quota('$A',2), consume_ai_quota('$A',2); select calls from ai_usage where user_id='$A';" "2"
expect "不同用户额度互不影响" B "reset role; select consume_ai_quota('$A',1), consume_ai_quota('$A',1), consume_ai_quota('$B',1);" "t|f|t"
expect "登录用户不能直接读 ai_usage" A "select count(*) from ai_usage;" "permission denied"
expect "登录用户不能直接改 ai_usage" A "update ai_usage set calls = 0;" "permission denied"
expect "只有 service_role 能执行 consume_ai_quota" A \
  "select has_function_privilege('anon','public.consume_ai_quota(uuid,int)','execute') || '|' || has_function_privilege('authenticated','public.consume_ai_quota(uuid,int)','execute') || '|' || has_function_privilege('service_role','public.consume_ai_quota(uuid,int)','execute');" "false|false|true"

echo "── 数据清理:离线兜底文案 ──"
expect "带 web preview mode 标记的 ai_feedback 被清空" A "reset role; select ai_feedback is null from rounds where id='55555555-0000-0000-0000-000000000001';" "t"
expect "真实的 AI 分析保持不变" A "reset role; select ai_feedback from rounds where id='55555555-0000-0000-0000-000000000002';" "putting cost you"

echo "── outing_members 可见性(e2e 发现的回归) ──"
expect "同城非成员能数到已加入的成员(发起人 A)" B "select count(*) from outing_members where outing_id='$O' and status='joined';" "1"
expect "异地用户仍然看不到成员" C "select count(*) from outing_members where outing_id='$O';" "0"
expect "别人的 pending 申请,同城非成员看不到" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$C','pending'); $BACK select count(*) from outing_members where outing_id='$O' and status='pending';" "0"
expect "发起人能看到 pending 申请" A \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'); $BACK select count(*) from outing_members where outing_id='$O' and status='pending';" "1"
expect "申请人本人能看到自己的 pending" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'); $BACK select count(*) from outing_members where user_id=auth.uid() and status='pending';" "1"
expect "另一个 pending 申请人看不到别人的 pending" B \
  "$SU insert into outing_members(outing_id,user_id,status) values ('$O','$B','pending'),('$O','$C','pending'); $BACK select count(*) from outing_members where outing_id='$O' and status='pending';" "1"

echo "── realtime 发布 ──"
expect "outing_comments 在 supabase_realtime 发布里" A \
  "reset role; select exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='outing_comments');" "t"
expect "只加了这一张业务表(不会把 profiles 等意外加进去)" A \
  "reset role; select string_agg(tablename, ',' order by tablename) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public';" "outing_comments"
expect "发布里恰好一行 outing_comments(没有重复加入)" A \
  "reset role; select count(*) from pg_publication_tables where pubname='supabase_realtime' and tablename='outing_comments';" "1"

echo "── crew_member_handicaps ──"
# 夹具与 tests/roundStats.test.cjs 对齐:[18 洞 +6, 9 洞 +2, 18 洞 +5] → 4.5;vs-par 0..19 的 20 轮 → 3.5
HCP_B3="insert into rounds(user_id,course_id,total_holes,total_strokes,total_putts,score_vs_par,created_at) values
  ('$B','c1',18,78,30,6, now()-interval '3 days'), ('$B','c1',9,38,15,2, now()-interval '2 days'), ('$B','c1',18,77,30,5, now()-interval '1 day');"
JOIN_B="insert into crew_members(crew_id,user_id) values ('$CREW','$B');"
expect "成员能看到同 Crew 成员的 HCP,9 洞按 18 洞折算(+2→+4,结果 4.5)" A \
  "$SU $JOIN_B $HCP_B3 $BACK select handicap from crew_member_handicaps('$CREW') where user_id='$B';" "4.5"
expect "不折算会得到 3.5:确认返回的不是原始 vs-par 平均" A \
  "$SU $JOIN_B $HCP_B3 $BACK select handicap <> 3.5 from crew_member_handicaps('$CREW') where user_id='$B';" "t"
expect "别人成绩不足 3 轮时对其他成员隐藏(A 只有 2 轮)" B \
  "$SU $JOIN_B $HCP_B3 $BACK select count(*) from crew_member_handicaps('$CREW') where user_id='$A';" "0"
expect "自己的 HCP 即使不足 3 轮也看得到(A 的两轮 +18/+13 → 最好一半 = 13)" A \
  "$SU $JOIN_B $HCP_B3 $BACK select handicap from crew_member_handicaps('$CREW') where user_id='$A';" "13"
expect "非成员拿不到任何结果(也不报错)" C \
  "$SU $JOIN_B $HCP_B3 $BACK select count(*) from crew_member_handicaps('$CREW');" "0"
expect "只返回当前成员:没加入的 B 不在结果里" A \
  "$SU $HCP_B3 $BACK select count(*) from crew_member_handicaps('$CREW') where user_id='$B';" "0"
expect "只看最近 20 轮:更早的 5 轮 -10 不参与,vs-par 0..19 → 3.5" A \
  "$SU $JOIN_B insert into rounds(user_id,course_id,total_holes,total_strokes,total_putts,score_vs_par,created_at) select '$B','c1',18,72+g,30,g, now()-(g||' hours')::interval from generate_series(0,19) g;
   insert into rounds(user_id,course_id,total_holes,total_strokes,total_putts,score_vs_par,created_at) select '$B','c1',18,62,30,-10, now()-interval '100 days' - (g||' days')::interval from generate_series(1,5) g;
   $BACK select handicap from crew_member_handicaps('$CREW') where user_id='$B';" "3.5"
expect "四舍五入与 JS 一致:7 轮 [-1,0,0,0,5,5,5] → 最好 4 轮平均 -0.25 → -0.2(不是 -0.3)" A \
  "$SU $JOIN_B insert into rounds(user_id,course_id,total_holes,total_strokes,total_putts,score_vs_par,created_at) select '$B','c1',18,72+v,30,v, now()-(i||' days')::interval from unnest(array[-1,0,0,0,5,5,5]) with ordinality as t(v,i);
   $BACK select handicap from crew_member_handicaps('$CREW') where user_id='$B';" "-0.2"
expect "返回的列只有 user_id 和 handicap(看不到任何一轮的成绩)" A \
  "select pg_get_function_result('public.crew_member_handicaps(uuid)'::regprocedure);" "TABLE(user_id uuid, handicap numeric)"
expect "匿名/PUBLIC 不能执行,登录用户可以" A \
  "select has_function_privilege('anon','public.crew_member_handicaps(uuid)','execute') || '|' || has_function_privilege('authenticated','public.crew_member_handicaps(uuid)','execute');" "false|true"
expect "仍然读不到别人的成绩本身(rounds 的 RLS 没被放开)" A \
  "$SU $JOIN_B $HCP_B3 $BACK select count(*) from rounds where user_id='$B';" "0"

echo "── prepare_account_deletion / 账号级联删除 ──"
# 这组用例不能用 $SU(session_replication_role=replica 会关掉外键级联触发器),只用 reset role。
SVC="reset role;"
CH=66666666-0000-0000-0000-000000000001
# B 先加入(joined_at 更早),C 后加入
CREW_AB="insert into crew_members(crew_id,user_id,joined_at) values ('$CREW','$B', now()-interval '2 days'), ('$CREW','$C', now()-interval '1 day');"
expect "有其他成员的 Crew:所有权转给加入最早的成员(B)" A \
  "$SVC $CREW_AB create temp table _r as select prepare_account_deletion('$A')->>'crews_transferred' as n; select (select n from _r) || '|' || (select creator_id = '$B' from crews where id='$CREW');" "1|true"
expect "新所有者在 crew_members 里的角色变成 owner" A \
  "$SVC $CREW_AB select prepare_account_deletion('$A') is not null; select role from crew_members where crew_id='$CREW' and user_id='$B';" "owner"
expect "转让后删掉 A 的账号,Crew 和其他成员还在" A \
  "$SVC $CREW_AB select prepare_account_deletion('$A') is not null; delete from auth.users where id='$A'; select (select count(*) from crews where id='$CREW') || '/' || (select count(*) from crew_members where crew_id='$CREW');" "1/2"
expect "对照:不做 prepare 直接删账号,整个 Crew 连同 B、C 一起消失(这就是需要它的原因)" A \
  "$SVC $CREW_AB delete from auth.users where id='$A'; select (select count(*) from crews where id='$CREW') || '/' || (select count(*) from crew_members where crew_id='$CREW');" "0/0"
expect "A 发起的挑战跟着 Crew 留下,改挂到新所有者" A \
  "$SVC $CREW_AB insert into crew_challenges(id,crew_id,created_by,title) values ('$CH','$CREW','$A','Break 80'); select prepare_account_deletion('$A') is not null; delete from auth.users where id='$A'; select created_by = '$B' from crew_challenges where id='$CH';" "t"
expect "成员(非所有者)删号:他在别人 Crew 里发起的挑战改挂给所有者,不会消失" B \
  "$SVC insert into crew_members(crew_id,user_id) values ('$CREW','$B'); insert into crew_challenges(id,crew_id,created_by,title) values ('$CH','$CREW','$B','Putt-off'); select prepare_account_deletion('$B') is not null; delete from auth.users where id='$B'; select created_by = '$A' from crew_challenges where id='$CH';" "t"
expect "只有自己一个人的 Crew:不转让,随账号一起删除" A \
  "$SVC select prepare_account_deletion('$A')->>'crews_deleted_with_account'; delete from auth.users where id='$A'; select count(*) from crews where id='$CREW';" "0"
expect "幂等:第二次调用不再转让、不报错" A \
  "$SVC $CREW_AB select prepare_account_deletion('$A') is not null; select prepare_account_deletion('$A')->>'crews_transferred';" "0"

expect "候补名单:按 user_id 和同一邮箱(不分大小写)都删,别人的保留" A \
  "$SVC insert into coach_waitlist(email,user_id) values ('a@test.local','$A'), ('A@Test.Local',null), ('c@test.local','$C'); select prepare_account_deletion('$A')->>'waitlist_rows_deleted'; select string_agg(email, ',') from coach_waitlist;" "c@test.local"
expect "候补名单删除条数正确(2)" A \
  "$SVC insert into coach_waitlist(email,user_id) values ('a@test.local','$A'), ('A@Test.Local',null), ('c@test.local','$C'); select prepare_account_deletion('$A')->>'waitlist_rows_deleted';" "2"

expect "整号级联:B 删号后他的成绩/逐洞/练习/计划/好友关系/Crew 成员行全部消失" B \
  "$SVC insert into crew_members(crew_id,user_id) values ('$CREW','$B');
   insert into rounds(id,user_id,course_id,total_strokes,total_putts,score_vs_par) values ('77777777-0000-0000-0000-000000000001','$B','c1',80,34,8);
   insert into hole_scores(round_id,hole_number,par,strokes,putts) values ('77777777-0000-0000-0000-000000000001',1,4,5,2);
   insert into practice_logs(user_id,note) values ('$B','b practice');
   insert into practice_plans(user_id,round_id,plan_text,is_active) values ('$B','77777777-0000-0000-0000-000000000001','plan',true);
   insert into friendships(user_id,friend_id,status) values ('$B','$C','pending');
   select prepare_account_deletion('$B') is not null; delete from auth.users where id='$B';
   select (select count(*) from rounds where user_id='$B') || '/' || (select count(*) from hole_scores where round_id='77777777-0000-0000-0000-000000000001') || '/' || (select count(*) from practice_logs where user_id='$B') || '/' || (select count(*) from practice_plans where user_id='$B') || '/' || (select count(*) from friendships where user_id='$B' or friend_id='$B') || '/' || (select count(*) from crew_members where user_id='$B') || '/' || (select count(*) from profiles where id='$B');" "0/0/0/0/0/0/0"
expect "整号级联:B 删号不影响 A 的数据" B \
  "$SVC select prepare_account_deletion('$B') is not null; delete from auth.users where id='$B'; select (select count(*) from rounds where user_id='$A') || '/' || (select count(*) from profiles where id='$A');" "2/1"
expect "B 删号后,B 在 A 的好友圈里不再有反应(reactions)" B \
  "$SVC select prepare_account_deletion('$B') is not null; delete from auth.users where id='$B'; select count(*) from reactions where user_id='$B';" "0"

expect "user_required:传 null 报错" A "$SVC select prepare_account_deletion(null);" "user_required"
expect "不存在的用户:不报错,什么都不做" A "$SVC select prepare_account_deletion('99999999-0000-0000-0000-000000000009')::text;" '"crews_transferred": 0'
expect "只有 service_role 能执行(anon / authenticated 都不行)" A \
  "select has_function_privilege('anon','public.prepare_account_deletion(uuid)','execute') || '|' || has_function_privilege('authenticated','public.prepare_account_deletion(uuid)','execute') || '|' || has_function_privilege('service_role','public.prepare_account_deletion(uuid)','execute');" "false|false|true"
