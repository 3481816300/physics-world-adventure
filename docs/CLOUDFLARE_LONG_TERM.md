# 长期部署状态

当前已切换为 GitHub Pages + Cloudflare DNS，不再依赖本机：

- 公网地址：https://wulvyuanzheng.dpdns.org/
- GitHub Pages：https://3481816300.github.io/physics-world-adventure/
- Cloudflare DNS：CNAME `wulvyuanzheng` → `3481816300.github.io`

本地 Cloudflare Tunnel 配置已保留在 `.cloudflare-tunnel/wulv.yml`，但不再是站点访问路径。

当前版本已推送到 GitHub `main`，GitHub Actions 已成功构建 Pages。

- GitHub Pages：https://3481816300.github.io/physics-world-adventure/
- GitHub Pages 自定义域名：`wulvyuanzheng.dpdns.org` 已设置
- 仓库内已包含 `CNAME`，构建产物也会带上 `CNAME`

## Cloudflare DNS

还需要在 Cloudflare 里把 `wulvyuanzheng.dpdns.org` 指向 GitHub Pages：

- 类型：CNAME
- 名称：`wulvyuanzheng`
- 目标：`3481816300.github.io`
- 代理状态：建议先选 DNS only

这条 CNAME 已通过 Cloudflare API 创建。

## 一键启动

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-long-term.ps1
```

脚本会检查并启动：

1. 本地 Node 服务 `node server.js`
2. `cloudflared tunnel run 47d7ad0d-753b-4d45-9d1f-60a3b314f3e6`

## 开机自动启动

在项目目录运行一次：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-long-term.ps1 -RegisterTask
```

会优先注册计划任务 `PhysicsAdventureLongTerm`；如果没有管理员权限，会自动改写到当前用户 Startup 文件夹。Windows 登录后都会自动恢复本地服务和 Cloudflare Tunnel。

## 停止

```powershell
Stop-Process -Name node -Force
Stop-Process -Name cloudflared -Force
```

或删除计划任务：

```powershell
Unregister-ScheduledTask -TaskName PhysicsAdventureLongTerm -Confirm:$false
```

如果使用的是 Startup 快捷方式，删除：

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PhysicsAdventureLongTerm.lnk
```

## 重要限制

Cloudflare Tunnel 是把本机服务暴露到公网，不是真正的云服务器。它仍然依赖：

- 这台电脑开机
- 电脑联网
- 本地 `server.js` 和 `cloudflared` 没有退出
- Windows 没有休眠

要做到电脑关机后仍可访问，需要：

1. 把前端推到 GitHub Pages。
2. 账号和存档继续使用 Supabase。
3. 用 Cloudflare DNS 把 `wulvyuanzheng.dpdns.org` 解析到 GitHub Pages。

前端和 Supabase 已经接通，项目也带有 `.github/workflows/pages.yml`。真正长期部署只需要把当前代码推送到 GitHub，再在 Cloudflare 配置 CNAME。
