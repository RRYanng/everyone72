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
# (outing_comments 加入 supabase_realtime 发布已经在迁移 20261016120000 里,不用再手工加)

# 2. 只启动需要的服务
npx supabase start -x studio,imgproxy,logflare,vector,mailpit,postgres-meta,supavisor
npx supabase status -o env        # 取 API_URL / ANON_KEY

# 2b. 照片 bucket(线上是在迁移之前就存在的公开 bucket;迁移 20261017100000 会把它改成私有)。
#     要复现"线上升级"的过程:先只复制 2026101[0-6]* 的迁移启动,建 bucket 和旧策略,再复制剩下的迁移并
#     `npx supabase migration up --local`。这样验证的是真实的升级路径,以及 postgres 角色能否改 storage.objects 的策略。
curl -s -X POST $API_URL/storage/v1/bucket -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "apikey: $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' -d '{"id":"practice-photos","name":"practice-photos","public":true}'

# 3. 本地 Edge Function:故意用假的 Anthropic key,绝不会请求真实 API
mkdir -p supabase/functions/analyze-round supabase/functions/delete-account
cp <repo>/supabase/functions/analyze-round/{index,handler}.ts supabase/functions/analyze-round/
cp <repo>/supabase/functions/delete-account/{index,handler}.ts supabase/functions/delete-account/
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

## 2026-10-17 加固迁移的端到端验证(本地栈,真实 storage-api)

私有 bucket(旧公开 URL 变 400;本人和好友能签名、陌生人 404)、上传限制(6MB → 413、pdf → 415、传到别人目录或子目录 → 403)、
streak 不能被客户端改写(PATCH/POST/DELETE user_stats 全部 403,伪造的 9999 被迁移校正成真实的 3)、courses 只读、
`save_round` 拒绝未知球场和被改过的标准杆、邀请码第 9 次失败返回 429、候补名单第 4 个新邮箱返回 429。

## 已知限制

* 本地 Anthropic key 是假的:AI **成功**路径无法在本地验证,只验证了错误态和重试。
* 内置浏览器里 `window.confirm/alert` 需要用 `javascript_tool` 钩住才能观察。
