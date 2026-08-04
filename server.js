const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data");
const accountsFile = path.join(dataDir, "accounts.json");
const namesFile = path.join(dataDir, "name_pool.json");
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || "0.0.0.0";
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const pendingNameTtlMs = 30 * 60 * 1000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(accountsFile)) {
    fs.writeFileSync(accountsFile, JSON.stringify({ accounts: {} }, null, 2), "utf8");
  }
  if (!fs.existsSync(namesFile)) {
    fs.writeFileSync(namesFile, "[]", "utf8");
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function getAccounts() {
  const data = readJson(accountsFile) || { accounts: {} };
  return data.accounts;
}

function saveAccounts(accounts) {
  writeJson(accountsFile, { accounts });
}

function getAllNames() {
  const names = readJson(namesFile);
  return Array.isArray(names) ? names : [];
}

function nameKey(name) {
  return String(name || "").normalize("NFKC").trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    request.on("error", reject);
  });
}

const sessions = new Map();
const pendingNames = new Map();

function createSession(nickname) {
  const token = makeToken();
  sessions.set(token, { nickname, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > sessionTtlMs) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function getAvailableNames() {
  const now = Date.now();
  const accounts = getAccounts();
  const used = new Set();
  for (const name of Object.keys(accounts)) {
    used.add(nameKey(name));
  }
  for (const [name, time] of pendingNames) {
    if (now - time < pendingNameTtlMs) {
      used.add(nameKey(name));
    } else {
      pendingNames.delete(name);
    }
  }
  return getAllNames().filter((name) => !used.has(nameKey(name)));
}

function normalizeSaveData(raw) {
  return raw && typeof raw === "object" ? raw : {};
}

ensureDataFiles();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const urlPath = decodeURIComponent(url.pathname);

  if (urlPath.startsWith("/api/")) {
    try {
      if (request.method === "POST" && urlPath === "/api/register") {
        const body = await readBody(request);
        const nickname = String(body.nickname || "").trim();
        const password = String(body.password || "");
        if (!nickname || nickname.length > 16 || password.length < 4) {
          return sendJson(response, 400, { error: "昵称不能为空，密码至少 4 位" });
        }
        const accounts = getAccounts();
        const key = nameKey(nickname);
        if (accounts[key]) {
          return sendJson(response, 409, { error: "该账号已存在，请重新输入" });
        }
        const wasPending = pendingNames.has(key);
        if (wasPending) {
          const reservedAt = pendingNames.get(key);
          if (Date.now() - reservedAt < pendingNameTtlMs) {
            return sendJson(response, 409, { error: "该账号已存在，请重新输入" });
          }
          pendingNames.delete(key);
        }
        const salt = crypto.randomBytes(12).toString("hex");
        accounts[key] = {
          nickname,
          salt,
          passwordHash: hashPassword(password, salt),
          createdAt: Date.now(),
          defaultName: wasPending ? nickname : null,
          assignedAt: wasPending ? Date.now() : null,
          saveData: {}
        };
        saveAccounts(accounts);
        const token = createSession(nickname);
        return sendJson(response, 200, { token, nickname, saveData: {} });
      }

      if (request.method === "POST" && urlPath === "/api/login") {
        const body = await readBody(request);
        const nickname = String(body.nickname || "").trim();
        const password = String(body.password || "");
        const accounts = getAccounts();
        const account = accounts[nameKey(nickname)];
        if (!account || account.passwordHash !== hashPassword(password, account.salt)) {
          return sendJson(response, 401, { error: "昵称或密码不正确" });
        }
        const token = createSession(account.nickname);
        return sendJson(response, 200, { token, nickname: account.nickname, saveData: account.saveData || {} });
      }

      if (request.method === "POST" && urlPath === "/api/logout") {
        const body = await readBody(request);
        if (body.token) sessions.delete(body.token);
        return sendJson(response, 200, { ok: true });
      }

      if (request.method === "POST" && urlPath === "/api/rename") {
        const body = await readBody(request);
        const session = getSession(body.token);
        if (!session) return sendJson(response, 401, { error: "登录已失效" });
        const nickname = String(body.nickname || "").trim();
        if (!nickname || nickname.length > 16) {
          return sendJson(response, 400, { error: "昵称不能为空，最多 16 字" });
        }
        const accounts = getAccounts();
        const account = accounts[nameKey(session.nickname)];
        if (!account) return sendJson(response, 404, { error: "账号不存在" });
        const key = nameKey(nickname);
        const now = Date.now();
        const renameWindowMs = 30 * 60 * 1000;
        if (now - account.createdAt > renameWindowMs) {
          return sendJson(response, 409, { error: "注册超过30分钟，无法修改昵称" });
        }
        if (accounts[key] && key !== nameKey(session.nickname)) {
          return sendJson(response, 409, { error: "该账号已存在，请重新输入" });
        }
        const oldKey = nameKey(account.nickname);
        delete accounts[oldKey];
        account.nickname = nickname;
        accounts[key] = account;
        saveAccounts(accounts);
        session.nickname = nickname;
        return sendJson(response, 200, { nickname });
      }

      if (request.method === "POST" && urlPath === "/api/change-password") {
        const body = await readBody(request);
        const session = getSession(body.token);
        if (!session) return sendJson(response, 401, { error: "登录已失效" });
        const accounts = getAccounts();
        const account = accounts[nameKey(session.nickname)];
        if (!account) return sendJson(response, 404, { error: "账号不存在" });
        const oldPassword = String(body.oldPassword || "");
        const newPassword = String(body.newPassword || "");
        if (account.passwordHash !== hashPassword(oldPassword, account.salt)) {
          return sendJson(response, 400, { error: "原密码不正确" });
        }
        if (newPassword.length < 4) {
          return sendJson(response, 400, { error: "新密码至少 4 位" });
        }
        account.salt = crypto.randomBytes(12).toString("hex");
        account.passwordHash = hashPassword(newPassword, account.salt);
        saveAccounts(accounts);
        return sendJson(response, 200, { ok: true });
      }

      if (request.method === "GET" && urlPath === "/api/random-name") {
        const available = getAvailableNames();
        if (!available.length) {
          return sendJson(response, 503, { error: "昵称池已用尽，请联系管理员扩充" });
        }
        const chosen = available[Math.floor(Math.random() * available.length)];
        pendingNames.set(nameKey(chosen), Date.now());
        return sendJson(response, 200, { nickname: chosen });
      }

      if (request.method === "GET" && urlPath === "/api/save") {
        const session = getSession(url.searchParams.get("token"));
        if (!session) return sendJson(response, 401, { error: "登录已失效" });
        const account = getAccounts()[nameKey(session.nickname)];
        if (!account) return sendJson(response, 404, { error: "账号不存在" });
        return sendJson(response, 200, { saveData: account.saveData || {} });
      }

      if (request.method === "POST" && urlPath === "/api/save") {
        const body = await readBody(request);
        const session = getSession(body.token);
        if (!session) return sendJson(response, 401, { error: "登录已失效" });
        const accounts = getAccounts();
        const account = accounts[nameKey(session.nickname)];
        if (!account) return sendJson(response, 404, { error: "账号不存在" });
        account.saveData = normalizeSaveData(body.saveData);
        saveAccounts(accounts);
        return sendJson(response, 200, { ok: true });
      }
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "请求失败" });
    }
  }

  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let finalPath = filePath;
  if (!fs.existsSync(finalPath) || fs.statSync(finalPath).isDirectory()) {
    if (urlPath === "/") {
      finalPath = path.join(root, "index.html");
    } else {
      response.writeHead(404);
      response.end("Not Found");
      return;
    }
  }

  const ext = path.extname(finalPath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(finalPath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Physics Adventure dev server: http://127.0.0.1:${port}`);
  const interfaces = require("os").networkInterfaces();
  for (const list of Object.values(interfaces)) {
    for (const info of list || []) {
      if (info.family === "IPv4" && !info.internal) {
        console.log(`LAN: http://${info.address}:${port}`);
      }
    }
  }
});
