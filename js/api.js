const Api = {
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
    return this.request("/api/random-name");
  },

  register(nickname, password) {
    return this.request("/api/register", {
      method: "POST",
      body: { nickname, password }
    });
  },

  login(nickname, password) {
    return this.request("/api/login", {
      method: "POST",
      body: { nickname, password }
    });
  },

  logout(token) {
    return this.request("/api/logout", {
      method: "POST",
      body: { token }
    });
  },

  rename(token, nickname) {
    return this.request("/api/rename", {
      method: "POST",
      body: { token, nickname }
    });
  },

  changePassword(token, oldPassword, newPassword) {
    return this.request("/api/change-password", {
      method: "POST",
      body: { token, oldPassword, newPassword }
    });
  },

  loadSave(token) {
    return this.request(`/api/save?token=${encodeURIComponent(token)}`);
  },

  saveSave(token, saveData) {
    return this.request("/api/save", {
      method: "POST",
      body: { token, saveData }
    });
  }
};
