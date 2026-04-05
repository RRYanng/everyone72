# Everyone 72 — 设置指南

## 第一步：安装开发工具

在终端（Mac 的 Terminal 应用）中运行以下命令：

```bash
# 安装 Node.js（如果还没有）
# 先去 https://nodejs.org 下载 LTS 版本安装

# 安装 Expo CLI
npm install -g expo-cli

# 验证安装
node --version   # 应该显示 v18 或更高
npm --version
```

---

## 第二步：注册 Supabase（免费）

1. 打开 https://supabase.com，点击 "Start your project"
2. 用 GitHub 账号或邮箱注册
3. 点击 "New project"，填写：
   - Project name: `everyone72`
   - Database password: 设置一个强密码（记住它！）
   - Region: 选 `West US (North California)` 或离你最近的
4. 等待项目创建（约 1 分钟）
5. 进入项目后，点击左侧 **SQL Editor**
6. 粘贴 `supabase/schema.sql` 的全部内容，点击 **RUN**
7. 进入左侧 **Settings → API**，复制：
   - `Project URL`（类似 https://xxxxx.supabase.co）
   - `anon public` key

---

## 第三步：注册 Anthropic API（Claude）

1. 打开 https://console.anthropic.com
2. 注册账号，进入 **API Keys**
3. 点击 "Create Key"，复制 key（只显示一次！）
4. 需要充值才能调用：最低 $5，按 token 计费

---

## 第四步：配置环境变量

在项目根目录创建 `.env` 文件：

```bash
cd ~/Desktop/everyone72
cp .env.example .env
```

用文本编辑器打开 `.env`，填入你的密钥：

```
EXPO_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-你的key
```

---

## 第五步：安装依赖并启动

```bash
# 进入项目目录
cd ~/Desktop/everyone72

# 安装所有依赖
npm install

# 启动开发服务器
npx expo start
```

---

## 第六步：在手机上预览

### 方法 A（推荐）：用真机扫码
1. 在 App Store / Google Play 下载 **Expo Go** 应用
2. 确保手机和电脑在同一 WiFi 网络
3. 用 Expo Go 扫描终端显示的二维码

### 方法 B：用模拟器
- **iOS**：需要 Mac + Xcode，终端按 `i`
- **Android**：需要 Android Studio，终端按 `a`

---

## 测试清单（Phase 1 验证）

- [ ] 注册新账号（会收到验证邮件，点击确认后再登录）
- [ ] 用邮箱+密码登录
- [ ] 首页显示欢迎信息和统计
- [ ] 点击 "Start New Round"，搜索球场（如 "Pebble"）
- [ ] 选择球场、Tee Box、洞数，进入记分卡
- [ ] 用 +/- 按钮记录每洞杆数和推杆数
- [ ] 完成 18 洞，提交成绩
- [ ] 等待 AI 分析（约 5-10 秒）
- [ ] 查看 History 标签，看到刚打的成绩
- [ ] 点击历史记录，重新查看 AI 分析

---

## 常见问题

**Q: npm install 报错**
A: 删除 node_modules 目录后重试：`rm -rf node_modules && npm install`

**Q: Supabase 连接失败**
A: 检查 .env 文件里的 URL 和 Key 是否正确，注意不要有多余空格

**Q: AI 分析显示错误**
A: 检查 Claude API Key 是否正确，账户是否有余额

**Q: 注册后无法登录**
A: 需要先验证邮箱（查收邮件点击链接）
