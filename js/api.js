const Api = {
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
      const message = data.code === "PGRST202"
        ? "云端功能尚未启用，请稍后再试或联系开发者"
        : data.message || (data.error && data.error.message) || "Supabase 请求失败";
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
  },

  ownerListAccounts(token) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("owner_list_accounts", { p_token: token });
    }
    return this.request(`/api/owner/list?token=${encodeURIComponent(token)}`);
  },

  ownerCreateAccount(token, planName) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("owner_create_account", {
        p_token: token,
        p_plan: planName
      });
    }
    return this.request("/api/owner/create", {
      method: "POST",
      body: { token, plan: planName }
    });
  },

  ownerDeleteAccount(token, nickname) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("owner_delete_account", {
        p_token: token,
        p_nickname: nickname
      });
    }
    return this.request("/api/owner/delete", {
      method: "POST",
      body: { token, nickname }
    });
  },

  ownerUpdateNote(token, nickname, note) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("owner_update_note", {
        p_token: token,
        p_nickname: nickname,
        p_note: note
      });
    }
    return this.request("/api/owner/note", {
      method: "POST",
      body: { token, nickname, note }
    });
  },

  feedbackAccess(token) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("feedback_access", { p_token: token || null });
    }
    return this.request("/api/feedback/access", {
      method: "POST",
      body: { token: token || null }
    });
  },

  submitFeedback(data) {
    if (this.isSupabaseReady()) {
      return this.supabaseRpc("submit_feedback", {
        p_token: data.token,
        p_kind: data.kind,
        p_title: data.title,
        p_content: data.content,
        p_page: data.page,
        p_contact: data.contact
      });
    }
    return this.request("/api/feedback/submit", {
      method: "POST",
      body: data
    });
  },

  listMyFeedback(token) {
    return this.supabaseRpc("list_my_feedback", { p_token: token });
  },

  markFeedbackSeen(token) {
    return this.supabaseRpc("mark_feedback_seen", { p_token: token });
  },

  ownerListFeedback(token) {
    return this.supabaseRpc("owner_list_feedback", { p_token: token });
  },

  ownerReplyFeedback(token, id, reply) {
    return this.supabaseRpc("owner_reply_feedback", {
      p_token: token,
      p_feedback_id: id,
      p_reply: reply
    });
  }
};
