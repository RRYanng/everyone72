#!/usr/bin/env bash
# RLS 回归测试:在一次性 Postgres(Supabase 官方镜像)里复现线上 schema,
# 依次应用 supabase/migrations/*.sql,再以不同用户身份逐条断言。
#
#   用法:  bash supabase/tests/rls/run.sh
#   依赖:  docker
#
# baseline_live_public.sql 是 2026-10-16 用 `supabase db dump --linked -s public`
# 导出的线上 schema 快照(无数据)。迁移上线后可重新导出覆盖它。
#
# 注意:本地 aarch64 镜像上,"无 EXECUTE 权限的函数被调用"会让 Postgres 段错误,
# 与本项目 SQL 无关(内置函数 pg_read_file 同样触发)。所以函数权限用
# has_function_privilege() 断言,不要真的去调。
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../migrations"
NAME=e72-rls-test
IMAGE=public.ecr.aws/supabase/postgres:17.6.1.104
PORT=${PORT:-54329}

A=aaaaaaaa-0000-0000-0000-000000000001   # alice  Irvine,  organizer
B=bbbbbbbb-0000-0000-0000-000000000002   # bob    Irvine
C=cccccccc-0000-0000-0000-000000000003   # carol  Seattle
CREW=11111111-0000-0000-0000-000000000001
O=22222222-0000-0000-0000-000000000001   # approve-mode outing, 2 slots, organizer A
F=33333333-0000-0000-0000-000000000001   # accepted friendship A<->B

PASS=0; FAIL=0
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1; }
trap cleanup EXIT

psql_su() { docker exec -i "$NAME" psql -U postgres -qtA -v ON_ERROR_STOP=1 "$@" 2>&1; }

echo "▶ 启动一次性 Postgres …"
cleanup
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw -p "$PORT":5432 "$IMAGE" >/dev/null || exit 2
for _ in $(seq 1 60); do
  docker exec "$NAME" psql -U postgres -tAc "select 1" >/dev/null 2>&1 && break; sleep 2
done
docker exec -i "$NAME" psql -U postgres -q < "$HERE/baseline_live_public.sql" 2>&1 | grep -E "ERROR" && { echo "基线加载失败"; exit 2; }
psql_su < "$HERE/seed.sql" >/dev/null || { echo "seed 失败"; exit 2; }
for f in "$MIG"/*.sql; do
  echo "▶ 应用 $(basename "$f")"
  out=$(psql_su < "$f") || { echo "$out" | grep -E "ERROR|错误" ; echo "迁移失败: $f"; exit 2; }
done

# 幂等性:发布迁移必须能重复执行而不报错
for f in "$MIG"/*_realtime_outing_comments.sql; do
  echo "▶ 二次应用 $(basename "$f")(幂等性检查)"
  psql_su < "$f" >/dev/null || { echo "二次应用失败,迁移不是幂等的: $f"; exit 2; }
done

# as <A|B|C|ANON> "<sql>"  → 以该身份在一个回滚事务里执行,输出结果或错误
as() {
  local who=$1 sql=$2 uid role=authenticated
  case $who in A) uid=$A;; B) uid=$B;; C) uid=$C;; ANON) uid=""; role=anon;; esac
  docker exec -i "$NAME" psql -U postgres -qtA -v ON_ERROR_STOP=1 <<SQL 2>&1 | sed 's/^psql:<stdin>:[0-9]*: //' | grep -vE '^(CONTEXT:|HINT:|$)'
begin;
set local role $role;
do \$\$ begin
  perform set_config('request.jwt.claims','{"sub":"$uid","role":"$role"}',true);
  perform set_config('request.jwt.claim.sub','$uid',true);
  perform set_config('request.jwt.claim.role','$role',true);
end \$\$;
$sql
rollback;
SQL
}
SU="reset role; set local session_replication_role = replica;"   # 超级用户预置数据(跳过触发器)
BACK="set local session_replication_role = origin; set local role authenticated;"

# expect "<描述>" <用户> "<sql>" "<输出必须包含的文本>"
expect() {
  local desc=$1 who=$2 sql=$3 want=$4 got
  got=$(as "$who" "$sql")
  # 短期望值(t / 0 / 1 …)要求"整行精确匹配",否则任何含该字符的报错都会误判通过
  local mode=-F; [ "${#want}" -le 3 ] && mode=-xF
  if grep -q $mode -- "$want" <<<"$got"; then PASS=$((PASS+1)); printf "  ✅ %s\n" "$desc"
  else FAIL=$((FAIL+1)); printf "  ❌ %s\n       想要包含: %s\n       实际输出: %s\n" "$desc" "$want" "$(head -3 <<<"$got")"; fi
}
# expect_not: 输出不得包含
expect_not() {
  local desc=$1 who=$2 sql=$3 bad=$4 got
  got=$(as "$who" "$sql")
  if grep -qF -- "$bad" <<<"$got"; then FAIL=$((FAIL+1)); printf "  ❌ %s\n       不应包含: %s\n       实际输出: %s\n" "$desc" "$bad" "$(head -3 <<<"$got")"
  else PASS=$((PASS+1)); printf "  ✅ %s\n" "$desc"; fi
}

source "$HERE/cases.sh"

echo
echo "结果: $PASS 通过, $FAIL 失败"
[ "$FAIL" -eq 0 ]
