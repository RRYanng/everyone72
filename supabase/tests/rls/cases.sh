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
