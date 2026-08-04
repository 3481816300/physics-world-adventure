# 云端部署指南

当前账号数据默认保存在项目目录的 `data/accounts.json`。要让别人也能访问并让账号数据保存在云端，需要把 Node 服务器部署到一台云服务器或支持持久化磁盘的平台。

## 方案一：国内云服务器（推荐）

1. 购买一台轻量云服务器，例如阿里云、腾讯云或华为云。
2. 安装 Node.js 18 或更高版本。
3. 把项目上传到服务器。
4. 创建一个数据目录并启动：

```bash
mkdir -p /var/lib/physics-adventure
DATA_DIR=/var/lib/physics-adventure PORT=8000 HOST=0.0.0.0 node server.js
```

5. 用 PM2 保持运行：

```bash
npm install -g pm2
DATA_DIR=/var/lib/physics-adventure PORT=8000 pm2 start server.js --name physics-adventure
```

6. 在安全组开放 8000 端口，或使用 Nginx 反向代理并绑定域名。

这样账号数据会保存在服务器的 `/var/lib/physics-adventure/accounts.json`，不会因为部署重启而丢失。

## 方案二：Render / Railway / Fly.io

这些平台可以把项目部署成公开网址，但必须配置持久化磁盘，否则服务器重启后账号会丢失。

- Render：创建 Web Service，启动命令填 `node server.js`
- 环境变量填：
  - `HOST=0.0.0.0`
  - `DATA_DIR=/data`
- 挂载持久化磁盘到 `/data`
- 平台会提供公网 URL，所有玩家都能访问

## 方案三：使用数据库

如果以后玩家很多，`accounts.json` 文件会越来越慢，建议改用数据库：

- Supabase / PostgreSQL
- Firebase
- 腾讯云数据库 / 阿里云 RDS

数据库方案需要把当前 `server.js` 里的文件读写改成数据库读写。对于现在这个体量，方案一或方案二已经够用。

## 当前局域网地址

本机启动后，同一局域网的其他设备可以访问：

```text
http://192.168.1.14:8000
```

这个地址只有同一网络下能访问。要让全世界访问，必须使用上面的云端部署方案。

## 免费临时公网访问：Cloudflare Tunnel

如果只是临时让别人玩，不需要买服务器，可以用 Cloudflare Tunnel 把本机服务暴露到公网：

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

运行后会得到一个类似 `https://xxxx.trycloudflare.com` 的网址，任何人打开这个网址都能访问。

限制：
- 你的电脑必须保持开机并运行 Cloudflare Tunnel
- 免费临时网址是随机的，重启后会变化
- 如果电脑关机，网址会失效

## 免费长期方案

要做到“电脑关机也能访问”，需要把服务和数据都放到云端。免费长期方案通常需要：

- 免费静态托管：GitHub Pages / Vercel / Netlify
- 免费云数据库：Supabase / Firebase
- 把当前 Node 服务器改成调用云数据库，而不是读写 `accounts.json`

这套方案免费，但需要额外改造代码，适合正式公开上线时使用。
