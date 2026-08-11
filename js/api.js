const Api = {
  ADMIN_REGISTER_KEY: "HarryLI@20120622",

  isSupabaseReady() {
    return Boolean(SUPABASE_CONFIG && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  },

  async supabaseRpc(name, body) {
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_CONFIG.anonKey,
        Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
      },
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.message || (data.error && data.error.message) || "Supabase 请求失败";
      throw new Error(message);
    }
    return data;
  },

  async request(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json"
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "请求失败");
    }
    return data;
  },

  getRandomName() {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("get_random_name", {});
    }
    return this.request("/api/random-name");
  },

  register(nickname, password) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("register_player", {
        p_nickname: nickname,
        p_password: password,
        p_admin_password: this.ADMIN_REGISTER_KEY
      });
    }
    return this.request("/api/register", {
      method: "POST",
      body: { nickname, password }
    });
  },

  login(nickname, password) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("login_player", {
        p_nickname: nickname,
        p_password: password
      });
    }
    return this.request("/api/login", {
      method: "POST",
      body: { nickname, password }
    });
  },

  logout(token) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("logout_session", { p_token: token });
    }
    return this.request("/api/logout", {
      method: "POST",
      body: { token }
    });
  },

  rename(token, nickname) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("rename_player", {
        p_token: token,
        p_new_nickname: nickname
      });
    }
    return this.request("/api/rename", {
      method: "POST",
      body: { token, nickname }
    });
  },

  changePassword(token, oldPassword, newPassword) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("change_password", {
        p_token: token,
        p_old_password: oldPassword,
        p_new_password: newPassword
      });
    }
    return this.request("/api/change-password", {
      method: "POST",
      body: { token, oldPassword, newPassword }
    });
  },

  async loadSave(token) {
    if (this.isSupabaseReady()) {
      const data = await this.supabaseRpc("get_save", { p_token: token });
      return { saveData: data };
    }
    return this.request(`/api/save?token=${encodeURIComponent(token)}`);
  },

  saveSave(token, saveData) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("save_game", {
        p_token: token,
        p_save_data: saveData
      });
    }
    return this.request("/api/save", {
      method: "POST",
      body: { token, saveData }
    });
  }
};
