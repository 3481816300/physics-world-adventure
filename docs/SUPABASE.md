# 使用 GitHub + Supabase 免费托管

## 架构

- GitHub Pages：托管游戏前端
- Supabase：保存账号、密码、存档

账号系统使用 Supabase 数据库函数，不需要再运行本机 `server.js`。

## 你需要操作的内容

### 1. 创建 Supabase 项目

打开 https://supabase.com ，注册并创建一个免费项目。

### 2. 创建数据库表

进入 Supabase 项目的 `SQL Editor`，按顺序运行：

1. `supabase/schema.sql`
2. `supabase/seed_names.sql`

### 3. 获取密钥

进入：

```text
Project Settings -> API
```

复制：

- Project URL
- anon public key

### 4. 配置前端

把项目里的：

```text
js/supabase-config.js
```

改成：

```js
const SUPABASE_CONFIG = {
  url: "https://你的项目.supabase.co",
  anonKey: "你的anon-key"
};
```

不要把 `service_role` 密钥填进去。

### 5. 推送到 GitHub

```bash
git add .
git commit -m "connect supabase"
git push origin main
```

GitHub Actions 会自动部署到 GitHub Pages。

## 已经支持的功能

- 登录账号
- 唯一昵称校验
- 修改密码
- 保存/读取存档
- 退出普通账号
- 所有者查看、创建、注销账号
- 所有者注册时从昵称池随机分配昵称
- 所有者可为每个账号保存内部备注，普通账号不可见

## 注意事项

- 公开注册与兑换码 RPC 已从 anon 角色撤销，前端也不提供自助注册入口
- 所有者管理 SQL 见 `supabase/migrations/20260906_owner_management.sql`
- 账号内部备注 SQL 见 `supabase/migrations/20260906_owner_account_notes.sql`
- 数据库函数由 Supabase 数据库端处理，密码使用 `crypt` 哈希保存
- 前端只使用 anon key，不暴露数据库密钥
- 免费版足够当前游戏使用

## 用户反馈月报

反馈数据保存在 `feedback_entries`，前端通过 `feedback_access` 和 `submit_feedback` 提交。SQL 迁移见：

```text
supabase/migrations/20260917_feedback.sql
```

GitHub Actions 每月会创建一份反馈 Issue 并分配给仓库所有者：

- `SUPABASE_SERVICE_ROLE_KEY`：必填，用于读取和标记反馈
- `QQ_SMTP_AUTH_CODE`：可选，用于从 `3481816300@qq.com` 直接发送邮件