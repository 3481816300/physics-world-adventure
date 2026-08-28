# Cloudflare Tunnel 长期部署

当前项目使用 named tunnel 固定域名：

- 公网地址：https://wulvyuanzheng.dpdns.org/
- 本地服务：http://127.0.0.1:8000
- Tunnel ID：47d7ad0d-753b-4d45-9d1f-60a3b314f3e6
- 配置文件：`.cloudflare-tunnel/wulv.yml`

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
