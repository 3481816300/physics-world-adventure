# 使用 GitHub + Supabase 免费托管

## 思路

- GitHub Pages：免费托管游戏前端
- Supabase：免费云数据库，保存账号、密码、存档

GitHub 本身不能运行 Node 服务器，所以“服务器”由 Supabase 代替。

## 第一步：创建 GitHub 仓库

1. 打开 https://github.com/new
2. 创建一个公开仓库
3. 把项目推送到仓库的 `main` 分支

如果没有安装 GitHub CLI，可以在网页上手动上传文件，或者安装 GitHub Desktop。

安装 GitHub CLI 后可以用命令登录：

```bash
gh auth login
```

## 第二步：开启 GitHub Pages

1. 进入仓库的 `Settings`
2. 左侧选择 `Pages`
3. Source 选择 `GitHub Actions`
4. 推送代码后，`.github/workflows/pages.yml` 会自动部署

部署完成后会得到：

```text
https://用户名.github.io/仓库名/
```

## 第三步：创建 Supabase 项目

1. 打开 https://supabase.com
2. 注册并创建一个免费项目
3. 进入项目的 `SQL Editor`
4. 运行项目里的 `supabase/schema.sql`
5. 在 `Project Settings -> API` 中复制：
   - Project URL
   - anon public key

## 第四步：把游戏对接 Supabase

现在 `js/api.js` 还在请求本机 `server.js`。对接 Supabase 时需要改成调用 Supabase REST API 或 Edge Function。

建议方案：

- 注册账号：把 `nickname`、`password_hash`、`save_data` 写入 `players` 表
- 登录账号：查询昵称并校验密码哈希
- 保存存档：更新 `save_data`
- 修改密码：更新 `password_hash`
- 查看密码：不建议从数据库恢复明文，继续使用“当前会话记住密码”的方式

前端不要直接使用 `service_role` 密钥。正式方案是创建一个 Supabase Edge Function 处理注册/登录/改密，前端只使用 anon key 调用它。

## 第五步：部署

完成 Supabase 对接后，把代码推送到 GitHub `main` 分支：

```bash
git add .
git commit -m "connect supabase"
git push origin main
```

GitHub Actions 会自动重新部署。

## 需要注意

- GitHub Pages 只能托管前端
- Supabase 免费版有数据库容量和请求次数限制，当前体量足够
- 如果以后玩家很多，可以升级 Supabase 或改用其他云数据库
