import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const env = Deno.env.toObject();
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function makeToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function sessionExpiry() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

async function getPlayerBySession(token: string) {
  const { data: session } = await supabase
    .from("sessions")
    .select("player_id")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!session) return null;
  const { data: player } = await supabase
    .from("players")
    .select("id,nickname,salt,password_hash,save_data,created_at")
    .eq("id", session.player_id)
    .maybeSingle();
  return player || null;
}

async function createSession(playerId: string) {
  const token = makeToken();
  await supabase.from("sessions").insert({
    token,
    player_id: playerId,
    expires_at: sessionExpiry()
  });
  return token;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const action = body.action;

    if (action === "random-name") {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("name_pool")
        .select("nickname")
        .or(`reserved_until.is.null,reserved_until.lt.${now}`)
        .limit(1);
      if (error || !data || !data.length) {
        return json({ error: "昵称池已用尽，请联系管理员扩充" }, 503);
      }
      const nickname = data[0].nickname;
      const reservedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supabase.from("name_pool").update({ reserved_until: reservedUntil }).eq("nickname", nickname);
      return json({ nickname });
    }

    if (action === "register") {
      const nickname = String(body.nickname || "").trim();
      const password = String(body.password || "");
      if (!nickname || nickname.length > 16 || password.length < 4) {
        return json({ error: "昵称不能为空，密码至少 4 位" }, 400);
      }
      const { data: existing } = await supabase.from("players").select("id").eq("nickname", nickname).maybeSingle();
      if (existing) {
        return json({ error: "该账号已存在，请重新输入" }, 409);
      }
      const salt = crypto.randomUUID().replace(/-/g, "");
      const passwordHash = await hashPassword(password, salt);
      const { data: player, error } = await supabase
        .from("players")
        .insert({ nickname, salt, password_hash: passwordHash, save_data: {} })
        .select("id,nickname,save_data")
        .single();
      if (error || !player) {
        return json({ error: "注册失败" }, 500);
      }
      const token = await createSession(player.id);
      return json({ token, nickname: player.nickname, saveData: player.save_data || {} });
    }

    if (action === "login") {
      const nickname = String(body.nickname || "").trim();
      const password = String(body.password || "");
      const { data: player } = await supabase
        .from("players")
        .select("id,nickname,salt,password_hash,save_data")
        .eq("nickname", nickname)
        .maybeSingle();
      if (!player || (await hashPassword(password, player.salt)) !== player.password_hash) {
        return json({ error: "昵称或密码不正确" }, 401);
      }
      const token = await createSession(player.id);
      return json({ token, nickname: player.nickname, saveData: player.save_data || {} });
    }

    if (action === "logout") {
      await supabase.from("sessions").delete().eq("token", String(body.token || ""));
      return json({ ok: true });
    }

    if (action === "load-save") {
      const player = await getPlayerBySession(String(body.token || ""));
      if (!player) return json({ error: "登录已失效" }, 401);
      return json({ saveData: player.save_data || {} });
    }

    if (action === "save") {
      const player = await getPlayerBySession(String(body.token || ""));
      if (!player) return json({ error: "登录已失效" }, 401);
      await supabase.from("players").update({ save_data: body.saveData || {} }).eq("id", player.id);
      return json({ ok: true });
    }

    if (action === "rename") {
      const player = await getPlayerBySession(String(body.token || ""));
      if (!player) return json({ error: "登录已失效" }, 401);
      const nickname = String(body.nickname || "").trim();
      if (!nickname || nickname.length > 16) {
        return json({ error: "昵称不能为空，最多 16 字" }, 400);
      }
      if (Date.now() - new Date(player.created_at).getTime() > 30 * 60 * 1000) {
        return json({ error: "注册超过30分钟，无法修改昵称" }, 409);
      }
      const { data: existing } = await supabase.from("players").select("id").eq("nickname", nickname).maybeSingle();
      if (existing && existing.id !== player.id) {
        return json({ error: "该账号已存在，请重新输入" }, 409);
      }
      await supabase.from("players").update({ nickname }).eq("id", player.id);
      return json({ nickname });
    }

    if (action === "change-password") {
      const player = await getPlayerBySession(String(body.token || ""));
      if (!player) return json({ error: "登录已失效" }, 401);
      const oldPassword = String(body.oldPassword || "");
      const newPassword = String(body.newPassword || "");
      if ((await hashPassword(oldPassword, player.salt)) !== player.password_hash) {
        return json({ error: "原密码不正确" }, 400);
      }
      if (newPassword.length < 4) {
        return json({ error: "新密码至少 4 位" }, 400);
      }
      const salt = crypto.randomUUID().replace(/-/g, "");
      await supabase.from("players").update({
        salt,
        password_hash: await hashPassword(newPassword, salt)
      }).eq("id", player.id);
      return json({ ok: true });
    }

    return json({ error: "未知操作" }, 400);
  } catch {
    return json({ error: "请求失败" }, 400);
  }
});
