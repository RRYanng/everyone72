# 浏览器端到端测试(本地 Supabase 栈)

用一次性的本地 Supabase + 本地构建的 Web 客户端,在真实浏览器里跑完整流程。
**不要对线上项目做这件事**:这些测试会注册账号、写数据。

## 搭建(约 10 分钟,首次要拉 Docker 镜像)

```bash
# 1. 在仓库之外建一个 supabase 工作目录,放入线上 schema 快照 + 全部迁移
mkdir -p /tmp/e72-e2e && cd /tmp/e72-e2e && npx supabase init
mkdir -p supabase/migrations
cp <repo>/supabase/tests/rls/baseline_live_public.sql supabase/migrations/20200101000000_baseline.sql
cp <repo>/supabase/migrations/*.sql supabase/migrations/
echo "alter publication supabase_realtime add table public.outing_comments;" \
  > supabase/migrations/20261016109999_local_only_realtime.sql   # 线上需在 Dashboard 里确认已开启

# 2. 只启动需要的服务
npx supabase start -x studio,imgproxy,logflare,vector,mailpit,postgres-meta,storage-api,supavisor
npx supabase status -o env        # 取 API_URL / ANON_KEY

# 3. 本地 Edge Function:故意用假的 Anthropic key,绝不会请求真实 API
mkdir -p supabase/functions/analyze-round && cp <repo>/supabase/functions/analyze-round/{index,handler}.ts supabase/functions/analyze-round/
echo 'ANTHROPIC_API_KEY=local-test-not-a-real-key' > fn.env
npx supabase functions serve --env-file fn.env
```

## 构建客户端(⚠ 必须过护栏)

```bash
cd <repo>
EXPO_PUBLIC_SUPABASE_URL=$API_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY \
  CI=1 npx expo export --clear --platform web --output-dir /tmp/e72-e2e/web
```

**`--clear` 不能省。** Metro 会缓存内联后的 `EXPO_PUBLIC_*`,不清缓存时构建产物仍然指向
`.env` 里的线上项目,这时在浏览器里注册账号就是在线上注册。打开浏览器前先校验:

```bash
B=$(ls /tmp/e72-e2e/web/_expo/static/js/web/AppEntry-*.js)
test "$(grep -o '<线上项目 ref>' $B | wc -l)" = 0 && grep -q '127.0.0.1:54321' $B && echo GUARD OK
```

静态服务器要用 **8081** 端口(Edge Function 的 CORS 白名单里有 `http://localhost:8081`),
并对未知路径回退到 `index.html`。

## 测试要点(2026-10-16 实测通过)

保存成绩 → 草稿横幅 → Crew 创建/邀请码加入/重复加入/退出/解散 → 好友请求/接受/取消 →
练习打卡的好友可见性 → 约局(审批、满员、移除、留言)→ 排行榜 → 诊断页重试。
Realtime 用 Node 脚本以第二个账号订阅 `outing_comments` 验证。

## 已知限制

* 本地 Anthropic key 是假的:AI **成功**路径无法在本地验证,只验证了错误态和重试。
* 内置浏览器里 `window.confirm/alert` 需要用 `javascript_tool` 钩住才能观察。
