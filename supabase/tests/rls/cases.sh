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
expect "无效邀请码返回 NULL(不 raise:失败记录要提交才能限频)" B "select join_crew('NOPE00') is null;" "t"
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
expect "匿名读 user_stats 被拒绝" ANON "select count(*) from user_stats;" "permission denied"
expect "登录用户能读 user_stats(排行榜)" B "select count(*) from user_stats;" "1"
expect "匿名无权读 streak_leaderboard" A "select has_table_privilege('anon','public.streak_leaderboard','select');" "f"

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
expect "球场不在库里 → unknown_course(客户端不能再靠保存成绩创建球场)" A \
  "select save_round(jsonb_build_object('id','new-course','name','New','course_rating',70.1,'slope_rating',120,'total_par',72),'Blue',current_date,$H9);" "unknown_course"
expect "被拒绝的保存没有创建球场" A \
  "do \$\$ begin perform save_round(jsonb_build_object('id','new-course','name','New'),'Blue',current_date,$H9); exception when others then null; end \$\$; reset role; select count(*) from courses where id='new-course';" "0"
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

echo "── update_round / delete_round ──"
MK="select save_round($COURSE,'White',current_date,$H9) as rid \\gset
"     # 注意:\\gset 之后必须换行,否则同一行后面的 SQL 会被当成它的参数吞掉。9 洞,标准杆 4,每洞 5 杆 2 推 [bunker] → 45 / 18 / +9
HNEW="(select jsonb_agg(jsonb_build_object('hole_number',g,'strokes',case when g=3 then 6 else 4 end,'putts',case when g=3 then 3 else 2 end,'troubles',case when g=3 then '[\"water\"]'::jsonb else '[]'::jsonb end) order by g) from generate_series(1,9) g)"   # 38 杆 / 19 推 / 标准杆 36 → +2
expect "编辑后总杆/推杆/相对标准杆由服务端重新汇总,发球台更新(38/19/+2/Blue)" A \
  "$MK select update_round(:'rid','Blue',$HNEW); select total_strokes||'/'||total_putts||'/'||score_vs_par||'/'||tee_box from rounds where id=:'rid';" "38/19/2/Blue"
expect "逐洞数据真的被改了(第 3 洞 6 杆,其余 4 杆)" A \
  "$MK select update_round(:'rid','Blue',$HNEW); select string_agg(strokes::text, ',' order by hole_number) from hole_scores where round_id=:'rid';" "4,4,6,4,4,4,4,4,4"
expect "障碍也更新(第 3 洞 {water},第 1 洞的 bunker 被清掉)" A \
  "$MK select update_round(:'rid','Blue',$HNEW); select (select troubles::text from hole_scores where round_id=:'rid' and hole_number=3) || '/' || (select troubles::text from hole_scores where round_id=:'rid' and hole_number=1);" "{water}/{}"
expect "编辑后清空过期的 AI 分析(ai_feedback 变 null)" A \
  "$MK update rounds set ai_feedback='old analysis' where id=:'rid'; select update_round(:'rid','White',$HNEW); select ai_feedback is null from rounds where id=:'rid';" "t"
expect "标准杆用库里的,不能通过编辑改洞数 / 洞号" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',g,'strokes',4,'putts',2)) from generate_series(1,8) g));" "invalid_holes"
expect "洞号不属于这一轮(第 10 洞)被拒绝" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',case when g=9 then 10 else g end,'strokes',4,'putts',2)) from generate_series(1,9) g));" "invalid_holes"
expect "洞号重复被拒绝" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',1,'strokes',4,'putts',2)) from generate_series(1,9) g));" "invalid_holes"
expect "0 杆被拒绝" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',g,'strokes',case when g=2 then 0 else 4 end,'putts',0)) from generate_series(1,9) g));" "invalid_holes"
expect "推杆多于杆数被拒绝" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',g,'strokes',2,'putts',3)) from generate_series(1,9) g));" "invalid_holes"
expect "缺字段(strokes 为 null)被拒绝" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(case when g=4 then jsonb_build_object('hole_number',g,'putts',2) else jsonb_build_object('hole_number',g,'strokes',4,'putts',2) end) from generate_series(1,9) g));" "invalid_holes"
expect "非法障碍值被拒绝" A \
  "$MK select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',g,'strokes',4,'putts',2,'troubles','[\"lava\"]'::jsonb)) from generate_series(1,9) g));" "invalid_holes"
expect "校验失败是原子的:原成绩一分不动(仍是 45)" A \
  "$MK \\set ON_ERROR_STOP off
savepoint s1;
select update_round(:'rid','White',(select jsonb_agg(jsonb_build_object('hole_number',g,'strokes',case when g=9 then 99 else 4 end,'putts',2)) from generate_series(1,9) g));
rollback to s1;
select total_strokes from rounds where id=:'rid';" "45"

OTHER_R=cccccccc-1000-0000-0000-000000000001
MK_OTHER="insert into rounds(id,user_id,course_id,total_holes,total_strokes,total_putts,score_vs_par,ai_feedback) values ('$OTHER_R','$A','c1',9,45,18,9,'keep me'); insert into hole_scores(round_id,hole_number,par,strokes,putts) select '$OTHER_R',g,4,5,2 from generate_series(1,9) g;"
expect "别人的成绩不能编辑(round_not_found)" B \
  "$SU $MK_OTHER $BACK select update_round('$OTHER_R','White',$HNEW);" "round_not_found"
expect "别人的成绩不能删除(round_not_found)" B \
  "$SU $MK_OTHER $BACK select delete_round('$OTHER_R');" "round_not_found"
expect "不存在的成绩 → round_not_found" A "select delete_round('cccccccc-9999-0000-0000-000000000009');" "round_not_found"

PLAN_SETUP="insert into practice_plans(id,user_id,round_id,plan_text,is_active,created_at) values
  ('dddddddd-0000-0000-0000-000000000001','$A',null,'OLD plan',false, now()-interval '5 days'),
  ('dddddddd-0000-0000-0000-000000000002','$A','$OTHER_R','PLAN FROM THIS ROUND',true, now()-interval '1 day');"
expect "删除成绩:成绩、逐洞数据、它生成的计划都被清掉" A \
  "$SU $MK_OTHER $PLAN_SETUP $BACK select delete_round('$OTHER_R'); select (select count(*) from rounds where id='$OTHER_R') || '/' || (select count(*) from hole_scores where round_id='$OTHER_R') || '/' || (select count(*) from practice_plans where plan_text='PLAN FROM THIS ROUND');" "0/0/0"
expect "被删成绩的计划原本是当前生效的 → 之前那份旧计划恢复生效" A \
  "$SU $MK_OTHER $PLAN_SETUP $BACK select delete_round('$OTHER_R'); select is_active from practice_plans where plan_text='OLD plan';" "t"
expect "被删成绩的计划不是当前生效的 → 当前生效的计划不受影响" A \
  "$SU $MK_OTHER insert into practice_plans(id,user_id,round_id,plan_text,is_active,created_at) values
     ('dddddddd-0000-0000-0000-000000000003','$A',null,'OLD plan',false, now()-interval '9 days'),
     ('dddddddd-0000-0000-0000-000000000004','$A','$OTHER_R','PLAN FROM THIS ROUND',false, now()-interval '3 days'),
     ('dddddddd-0000-0000-0000-000000000005','$A',null,'NEWER ACTIVE plan',true, now()-interval '1 day');
   $BACK select delete_round('$OTHER_R'); select string_agg(plan_text||'='||is_active, ', ' order by plan_text) from practice_plans where user_id='$A';" "NEWER ACTIVE plan=true, OLD plan=false"
expect "重复删除:第二次返回 round_not_found,不会误伤别的数据" A \
  "$SU $MK_OTHER $BACK select delete_round('$OTHER_R'); select delete_round('$OTHER_R');" "round_not_found"
expect "其他用户的计划不受影响" A \
  "$SU $MK_OTHER insert into practice_plans(user_id,round_id,plan_text,is_active) values ('$B',null,'B plan',true); $BACK select delete_round('$OTHER_R'); reset role; select is_active from practice_plans where plan_text='B plan';" "t"
expect "客户端仍可直接更新 ai_feedback(保存 AI 分析)" A \
  "update rounds set ai_feedback='fresh analysis' where id='55555555-0000-0000-0000-000000000001' returning ai_feedback;" "fresh analysis"
expect "客户端不能再直接改总杆(列级权限)" A \
  "update rounds set total_strokes=1 where id='55555555-0000-0000-0000-000000000001';" "permission denied"
expect "客户端不能直接删成绩(没有 DELETE 策略/权限路径之外的口子)" A \
  "with d as (delete from rounds where id='55555555-0000-0000-0000-000000000001' returning 1) select count(*) from d;" "0"
expect "匿名/PUBLIC 不能执行,登录用户可以" A \
  "select has_function_privilege('anon','public.update_round(uuid,text,jsonb)','execute') || '|' || has_function_privilege('anon','public.delete_round(uuid)','execute') || '|' || has_function_privilege('authenticated','public.update_round(uuid,text,jsonb)','execute') || '|' || has_function_privilege('authenticated','public.delete_round(uuid)','execute');" "false|false|true|true"

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

echo "── app_events / track_event ──"
expect "登录用户可以记录白名单事件" A "select track_event('round_saved','{\"holes\":18}'::jsonb,'web');" "t"
expect "事件真的写入,props 和 platform 保存正确" A \
  "select track_event('ai_result','{\"kind\":\"analysis\",\"ok\":false,\"code\":\"quota_exceeded\"}'::jsonb,'ios'); reset role; select name || '|' || (props->>'code') || '|' || platform from app_events;" "ai_result|quota_exceeded|ios"
expect "不在白名单的事件名被拒绝(返回 false,不写表)" A "select track_event('drop_table');" "f"
expect "被拒绝的事件没有写入" A "select track_event('drop_table'); select track_event(null); reset role; select count(*) from app_events;" "0"
expect "props 不是对象(数组/字符串)被拒绝" A "select track_event('login','[1,2]'::jsonb) || '|' || track_event('login','\"x\"'::jsonb);" "false|false"
expect "props 过大(>1000 字符)被拒绝" A "select track_event('login', jsonb_build_object('k', repeat('x',1200)));" "f"
expect "props 为 null 按空对象处理" A "select track_event('login', null);" "t"
expect "非法 platform 被置空而不是报错" A "select track_event('login','{}'::jsonb,'toaster'); reset role; select coalesce(platform,'NULL') from app_events;" "NULL"
expect "匿名用户不能记录(没有 EXECUTE 权限)" A \
  "select has_function_privilege('anon','public.track_event(text,jsonb,text)','execute') || '|' || has_function_privilege('authenticated','public.track_event(text,jsonb,text)','execute');" "false|true"
expect "客户端不能直接读表(权限被收回)" A "select count(*) from app_events;" "permission denied"
expect "客户端不能直接写表" A "insert into app_events(user_id,name) values (auth.uid(),'login');" "permission denied"
expect "每用户 24 小时 300 条上限:超出返回 false" A \
  "reset role; insert into app_events(user_id,name) select '$A','login' from generate_series(1,300); set local role authenticated; select track_event('login');" "f"
expect "上限只统计 24 小时内的事件:更早的不算" A \
  "reset role; insert into app_events(user_id,name,created_at) select '$A','login', now()-interval '2 days' from generate_series(1,300); set local role authenticated; select track_event('login');" "t"
expect "上限按用户隔离:A 满额不影响 B" B \
  "reset role; insert into app_events(user_id,name) select '$A','login' from generate_series(1,300); set local role authenticated; select track_event('login');" "t"
expect "账号删除时该用户的事件随之删除" A \
  "reset role; insert into app_events(user_id,name) values ('$A','login'),('$B','login'); delete from auth.users where id='$A'; select count(*) || '|' || (select count(*) from app_events where user_id='$B') from app_events where user_id='$A';" "0|1"

# ============================================================
# P2 加固
# ============================================================
UTC_TODAY="(now() at time zone 'utc')::date"

echo "── 照片 bucket 私有 ──"
expect "bucket 已私有,限制 5MB 和图片类型" A \
  "select public::text || '|' || file_size_limit || '|' || array_to_string(allowed_mime_types, ',') from storage.buckets where id='practice-photos';" \
  "false|5242880|image/jpeg,image/png,image/webp,image/heic,image/heif"
expect "旧的\"任何人可读\"策略已删除" A \
  "select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public can view practice photos';" "0"
PH="reset role; insert into storage.objects(bucket_id,name) values ('practice-photos','$A/a.jpg'),('practice-photos','$B/b.jpg'),('practice-photos','$C/c.jpg');"
expect "本人能读自己的照片;已接受的好友(A↔B)能互相读;陌生人(C)的读不到" A \
  "$PH set local role authenticated; select string_agg(substr(name,1,1), ',' order by name) from storage.objects where bucket_id='practice-photos';" "a,b"
expect "好友关系是双向的:B 读得到 A 的" B \
  "$PH set local role authenticated; select string_agg(substr(name,1,1), ',' order by name) from storage.objects where bucket_id='practice-photos';" "a,b"
expect "C 只读得到自己的" C \
  "$PH set local role authenticated; select string_agg(substr(name,1,1), ',' order by name) from storage.objects where bucket_id='practice-photos';" "c"
expect "pending 的好友请求不算:A 向 C 发了请求,但 A 仍读不到 C 的" A \
  "$PH insert into friendships(user_id,friend_id,status) values ('$A','$C','pending'); set local role authenticated; select count(*) from storage.objects where name like '$C/%';" "0"
expect "匿名读不到任何照片" ANON \
  "$PH set local role anon; select count(*) from storage.objects;" "0"
expect "只能上传到自己的目录" A \
  "insert into storage.objects(bucket_id,name) values ('practice-photos','$A/new.jpg') returning name;" "$A/new.jpg"
expect "不能上传到别人的目录" A \
  "insert into storage.objects(bucket_id,name) values ('practice-photos','$B/evil.jpg');" "row-level security"
expect "不能再嵌套子目录" A \
  "insert into storage.objects(bucket_id,name) values ('practice-photos','$A/sub/x.jpg');" "row-level security"

echo "── user_stats / streak 由服务端计算 ──"
expect "迁移里的校正:种子里被写成 3 的 streak,按真实打卡记录重放后是 1" A \
  "select current_streak || '|' || total_practices from user_stats where user_id='$A';" "1|1"
expect "客户端不能改自己的 streak" A "update user_stats set current_streak = 9999 where user_id = auth.uid();" "permission denied"
expect "客户端不能插入 user_stats" B "insert into user_stats(user_id, current_streak) values ('$B', 9999);" "permission denied"
expect "客户端不能删除 user_stats" A "delete from user_stats where user_id = auth.uid();" "permission denied"
expect "apply_practice_day 客户端调不了" A \
  "select has_function_privilege('anon','public.apply_practice_day(uuid,date,timestamptz)','execute') || '|' || has_function_privilege('authenticated','public.apply_practice_day(uuid,date,timestamptz)','execute');" "false|false"
expect "第一次打卡:streak 1、总数 1、last = 今天" C \
  "insert into practice_logs(user_id, note) values ('$C','x'); select current_streak || '|' || total_practices || '|' || (last_practice_date = $UTC_TODAY) from user_stats where user_id='$C';" "1|1|true"
expect "同一天再打卡不重复计" C \
  "insert into practice_logs(user_id, note) values ('$C','x'),('$C','y'); select current_streak || '|' || total_practices from user_stats where user_id='$C';" "1|1"
expect "昨天打过 → 连续:2 → 3,并解锁 streak_3" C \
  "reset role; insert into user_stats(user_id,current_streak,longest_streak,total_practices,last_practice_date) values ('$C',2,2,2,$UTC_TODAY - 1); set local role authenticated; insert into practice_logs(user_id, note) values ('$C','x'); select current_streak || '|' || longest_streak || '|' || total_practices || '|' || (select string_agg(b->>'id', ',') from user_stats u, jsonb_array_elements(u.badges) b where u.user_id='$C') from user_stats where user_id='$C';" "3|3|3|streak_3"
expect "断了 → 重置为 1,最长保留" C \
  "reset role; insert into user_stats(user_id,current_streak,longest_streak,total_practices,last_practice_date) values ('$C',5,5,5,$UTC_TODAY - 3); set local role authenticated; insert into practice_logs(user_id, note) values ('$C','x'); select current_streak || '|' || longest_streak || '|' || total_practices from user_stats where user_id='$C';" "1|5|6"
expect "streak 6 → 7:同时解锁 streak_3 和 streak_7" C \
  "reset role; insert into user_stats(user_id,current_streak,longest_streak,total_practices,last_practice_date) values ('$C',6,6,6,$UTC_TODAY - 1); set local role authenticated; insert into practice_logs(user_id, note) values ('$C','x'); select string_agg(b->>'id', ',' order by b->>'id') from user_stats u, jsonb_array_elements(u.badges) b where u.user_id='$C';" "streak_3,streak_7"
expect "第 100 次练习解锁 practices_100" C \
  "reset role; insert into user_stats(user_id,current_streak,longest_streak,total_practices,last_practice_date) values ('$C',1,1,99,$UTC_TODAY - 5); set local role authenticated; insert into practice_logs(user_id, note) values ('$C','x'); select string_agg(b->>'id', ',') from user_stats u, jsonb_array_elements(u.badges) b where u.user_id='$C';" "practices_100"
expect "已有的勋章不会重复发" C \
  "reset role; insert into user_stats(user_id,current_streak,longest_streak,total_practices,last_practice_date,badges) values ('$C',3,3,3,$UTC_TODAY - 1,'[{\"id\":\"streak_3\",\"emoji\":\"x\",\"label\":\"x\",\"earned_at\":\"2026-01-01T00:00:00Z\"}]'); set local role authenticated; insert into practice_logs(user_id, note) values ('$C','x'); select jsonb_array_length(badges) from user_stats where user_id='$C';" "1"
expect "客户端传的日期超出 UTC 日期 ±1 天 → 按服务端日期(伪造不了未来的天数)" C \
  "insert into practice_logs(user_id, note, local_date) values ('$C','x', $UTC_TODAY + 30) returning (local_date = $UTC_TODAY);" "t"
expect "明天(时区领先)在允许范围内" C \
  "insert into practice_logs(user_id, note, local_date) values ('$C','x', $UTC_TODAY + 1) returning (local_date = $UTC_TODAY + 1);" "t"
expect "不传日期默认用 UTC 今天" C "insert into practice_logs(user_id, note) values ('$C','x') returning (local_date = $UTC_TODAY);" "t"
expect "streak 排行榜读得到别人刚打的卡" B \
  "reset role; insert into practice_logs(user_id, note) values ('$C','x'); set local role authenticated; select current_streak from streak_leaderboard where user_id='$C';" "1"

echo "── courses 服务端权威 ──"
expect "客户端不能 insert courses" A "insert into courses(id,name) values ('evil','x');" "permission denied"
expect "客户端不能 update courses" A "update courses set course_rating = 1 where id='torrey-pines-south';" "permission denied"
expect "客户端不能 delete courses" A "delete from courses where id='torrey-pines-south';" "permission denied"
expect "匿名和登录用户仍然读得到球场" ANON "select count(*) >= 266 from courses;" "t"
expect "266 个种子球场都在,每个都有 18 个标准杆" A \
  "select count(*) from courses where holes_par is not null and array_length(holes_par,1) = 18;" "266"
expect "每个种子球场的 total_par 等于逐洞标准杆之和" A \
  "select count(*) from courses where holes_par is not null and (select sum(x) from unnest(holes_par) x) <> total_par;" "0"
TP="(select jsonb_agg(jsonb_build_object('hole_number', g, 'par', holes_par[g], 'strokes', holes_par[g] + 1, 'putts', 2) order by g) from courses, generate_series(1,18) g where id='torrey-pines-south')"
expect "标准杆和库里一致 → 保存成功" A "select save_round(jsonb_build_object('id','torrey-pines-south'),'White',current_date,$TP) is not null;" "t"
expect "有一洞的标准杆被改 → invalid_holes(不能靠改标准杆操纵相对标准杆)" A \
  "select save_round(jsonb_build_object('id','torrey-pines-south'),'White',current_date,(select jsonb_agg(case when e->>'hole_number' = '1' then jsonb_set(e,'{par}','5') else e end) from jsonb_array_elements($TP) e));" "invalid_holes"
expect "保存的成绩用的是库里的球场数据,相对标准杆按真实标准杆算" A \
  "select save_round(jsonb_build_object('id','torrey-pines-south','course_rating',1,'total_par',3),'White',current_date,$TP) as rid \\gset
   select score_vs_par from rounds where id = :'rid';" "18"
expect "旧版客户端多传的球场字段被忽略,球场数据不变" A \
  "select save_round(jsonb_build_object('id','torrey-pines-south','name','HACKED','course_rating',1),'White',current_date,$TP) is not null; reset role; select name || '|' || course_rating from courses where id='torrey-pines-south';" "Torrey Pines Golf Course (South)|76.9"

echo "── Crew 邀请码限频 ──"
expect "失败的尝试被记下来(NULL 返回,事务提交)" B \
  "select join_crew('NOPE01') is null; reset role; select count(*) from crew_join_failures where user_id='$B';" "1"
expect "失败记录客户端读不到" B "select count(*) from crew_join_failures;" "permission denied"
expect "15 分钟内失败 8 次后,第 9 次被拒绝" B \
  "select count(*) from generate_series(1,8) g, lateral (select join_crew('NOPE' || g)) j; select join_crew('NOPE99');" "too_many_attempts"
expect "限频期间连正确的邀请码也不行" B \
  "select count(*) from generate_series(1,8) g, lateral (select join_crew('NOPE' || g)) j; select join_crew('ABC123');" "too_many_attempts"
expect "没到上限时,正确的邀请码仍然能加入" B \
  "select join_crew('NOPE01') is null; select join_crew('NOPE02') is null; select join_crew('abc123') = '$CREW';" "t"
expect "15 分钟之前的失败不挡路(8 次都在 20 分钟前)" B \
  "reset role; insert into crew_join_failures(user_id, created_at) select '$B', now() - interval '20 minutes' - g * interval '1 second' from generate_series(1,8) g; set local role authenticated; select join_crew('abc123') = '$CREW';" "t"
expect "24 小时内累计失败 30 次 → 拒绝(哪怕每次间隔很久)" B \
  "reset role; insert into crew_join_failures(user_id, created_at) select '$B', now() - interval '2 hours' - g * interval '10 minutes' from generate_series(1,30) g; set local role authenticated; select join_crew('abc123');" "too_many_attempts"
expect "限频按用户隔离:B 被限了,C 不受影响" C \
  "reset role; insert into crew_join_failures(user_id) select '$B' from generate_series(1,8); set local role authenticated; select join_crew('abc123') = '$CREW';" "t"

echo "── 候补名单 join_coach_waitlist ──"
expect "登录用户可以加入,邮箱被规范成小写并记录自己的 user_id" B \
  "select join_coach_waitlist('  Test@Example.COM '); reset role; select email || '|' || (user_id = '$B') from coach_waitlist;" "test@example.com|true"
expect "已在名单里(不分大小写)当作成功,不重复新增" B \
  "select join_coach_waitlist('a@b.co'); select join_coach_waitlist('A@B.CO'); reset role; select count(*) from coach_waitlist where lower(email)='a@b.co';" "1"
expect "邮箱格式不对被拒绝" B "select join_coach_waitlist('not-an-email');" "invalid_email"
expect "空邮箱被拒绝" B "select join_coach_waitlist('   ');" "invalid_email"
expect "超长邮箱被拒绝" B "select join_coach_waitlist(repeat('a',250) || '@b.co');" "invalid_email"
expect "每个用户 24 小时最多新增 3 条" B \
  "select join_coach_waitlist('a1@b.co'), join_coach_waitlist('a2@b.co'), join_coach_waitlist('a3@b.co'); select join_coach_waitlist('a4@b.co');" "too_many_requests"
expect "匿名不能调用" A \
  "select has_function_privilege('anon','public.join_coach_waitlist(text)','execute') || '|' || has_function_privilege('authenticated','public.join_coach_waitlist(text)','execute');" "false|true"
expect "登录用户不能绕过函数直接写表" B "insert into coach_waitlist(email,user_id) values ('x@y.com','$B');" "permission denied"
expect "匿名不能直接写表" ANON "insert into coach_waitlist(email) values ('x@y.com');" "permission denied"
expect "登录用户读得到自己登记的条目,看不到别人的" A \
  "reset role; insert into coach_waitlist(email,user_id) values ('mine@y.com','$A'),('other@y.com','$B'); set local role authenticated; select count(*) from coach_waitlist;" "1"
