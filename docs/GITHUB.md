# 使用 GitHub 部署

## 能做什么

GitHub 可以免费托管游戏前端：

- 打开网页直接玩
- 游客模式可以玩
- 前端所有角色、关卡、商店界面都能显示

## 不能做什么

GitHub Pages 只能托管静态文件，不能运行 `server.js`，也不能保存 `accounts.json`。

所以：

- 注册账号
- 登录账号
- 跨设备同步存档
- 修改密码

这些功能在纯 GitHub Pages 上无法使用。

## 部署前端到 GitHub Pages

1. 在 GitHub 上创建仓库
2. 把项目推送到 `main` 分支
3. 仓库设置里打开 GitHub Pages，并选择“GitHub Actions”作为部署来源
4. 推送后会自动运行 `.github/workflows/pages.yml`
5. 部署完成后会得到一个 `https://用户名.github.io/仓库名/` 地址

项目里已经包含：

- `deploy-static.js`：生成静态 `dist`
- `.github/workflows/pages.yml`：自动部署

## 要让账号系统也在 GitHub 上可用

需要把账号数据从本机 `accounts.json` 迁移到云数据库，例如：

- Supabase（PostgreSQL）
- Firebase
- 或国内云数据库

然后把前端里的 `js/api.js` 改成请求云数据库，而不是请求本机 `server.js`。

目前这一步还没有做。如果继续做，我会把注册、登录、存档同步、修改密码全部接到 Supabase。

完整步骤见 [SUPABASE.md](SUPABASE.md)。
