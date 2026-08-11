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

- 注册账号
- 登录账号
- 唯一昵称校验
- 30 分钟内修改昵称
- 修改密码
- 保存/读取存档
- 退出登录
- 1000 个随机昵称池

## 注意事项

- 数据库函数由 Supabase 数据库端处理，密码使用 `crypt` 哈希保存
- 前端只使用 anon key，不暴露数据库密钥
- 免费版足够当前游戏使用
