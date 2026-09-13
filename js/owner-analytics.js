const OwnerAnalytics = {
  render(accounts = [], options = {}) {
    const root = document.getElementById("ownerAnalytics");
    if (!root) return;
    root.replaceChildren();

    if (options.loading) {
      root.appendChild(this.make("p", "analytics-empty", "正在加载用户数据..."));
      return;
    }
    if (options.error) {
      root.appendChild(this.make("p", "analytics-empty analytics-error", options.error));
      return;
    }

    const users = accounts
      .filter((account) => !account.is_owner)
      .map((account) => this.enrich(account))
      .sort((a, b) => b.completed - a.completed || b.stars - a.stars);

    if (!users.length) {
      root.appendChild(this.make("p", "analytics-empty", "暂无普通用户数据"));
      return;
    }

    const metrics = this.summarize(users);
    root.appendChild(this.buildMetrics(metrics));
    root.appendChild(this.buildCharts(users, metrics));
    root.appendChild(this.buildUsersTable(users));
  },

  enrich(account) {
    const data = account.save_data && typeof account.save_data === "object" ? account.save_data : {};
    const completedIds = Object.keys(data.completedLevels || {}).filter((id) => data.completedLevels[id]);
    const records = data.levelRecords || {};
    const shards = data.collectedShards || {};
    const fragments = data.collectedFragments || {};
    const stars = completedIds.reduce((total, id) => {
      let value = 1;
      if (Number(shards[id] && shards[id].count) >= 3) value += 1;
      const record = records[id] || {};
      if (Number(record.deaths) <= 3) value += 1;
      if (fragments[id]) value += 1;
      if (Number(record.elapsed) > 0 && Number(record.parTime) > 0 && Number(record.elapsed) <= Number(record.parTime)) value += 1;
      return total + Math.min(5, value);
    }, 0);
    const note = String(account.owner_note || "");
    const planMatch = note.match(/爱发电档位：([^；;\n]+)/);

    return {
      nickname: account.nickname,
      plan: planMatch ? planMatch[1].trim() : "未标记",
      premium: Boolean(account.premium),
      createdAt: account.created_at || null,
      updatedAt: account.updated_at || account.created_at || null,
      completed: completedIds.length,
      stars,
      shards: completedIds.reduce((total, id) => total + Number(shards[id] && shards[id].count || 0), 0),
      fragments: Object.values(fragments).filter(Boolean).length,
      current: data.lastLevel || "未开始"
    };
  },

  summarize(users) {
    const premium = users.filter((user) => user.premium).length;
    const active = users.filter((user) => this.daysSince(user.updatedAt) <= 7).length;
    const totalCompleted = users.reduce((total, user) => total + user.completed, 0);
    const totalStars = users.reduce((total, user) => total + user.stars, 0);
    const totalFragments = users.reduce((total, user) => total + user.fragments, 0);
    return {
      total: users.length,
      premium,
      free: users.length - premium,
      active,
      averageCompleted: users.length ? totalCompleted / users.length : 0,
      totalStars,
      totalFragments
    };
  },

  buildMetrics(metrics) {
    const section = this.make("section", "analytics-metrics");
    [
      ["普通用户", metrics.total, "总账号数"],
      ["完整版用户", metrics.premium, `${metrics.free} 个试玩账号`],
      ["近 7 日活跃", metrics.active, "按最近存档时间"],
      ["平均通关", metrics.averageCompleted.toFixed(1), "人均关卡数"],
      ["累计星数", metrics.totalStars, "全部用户合计"],
      ["隐藏残片", metrics.totalFragments, "全部用户合计"]
    ].forEach(([label, value, hint]) => {
      const card = this.make("article", "analytics-metric");
      card.appendChild(this.make("span", "analytics-metric-label", label));
      card.appendChild(this.make("strong", "", String(value)));
      card.appendChild(this.make("small", "", hint));
      section.appendChild(card);
    });
    return section;
  },

  buildCharts(users, metrics) {
    const wrap = this.make("section", "analytics-chart-grid");
    wrap.appendChild(this.buildDistribution("爱发电档位分布", this.groupCounts(users, (user) => user.plan)));
    const buckets = [
      ["未开始", users.filter((user) => user.completed === 0).length],
      ["1-3 关", users.filter((user) => user.completed >= 1 && user.completed <= 3).length],
      ["4-6 关", users.filter((user) => user.completed >= 4 && user.completed <= 6).length],
      ["7-9 关", users.filter((user) => user.completed >= 7 && user.completed <= 9).length],
      ["10 关以上", users.filter((user) => user.completed >= 10).length]
    ];
    wrap.appendChild(this.buildDistribution("用户进度分布", buckets));

    const ranking = this.make("section", "analytics-ranking");
    ranking.appendChild(this.make("h3", "", "进度排行"));
    users.slice(0, 8).forEach((user, index) => {
      const row = this.make("div", "analytics-ranking-row");
      row.appendChild(this.make("span", "analytics-rank", String(index + 1)));
      row.appendChild(this.make("strong", "", user.nickname));
      row.appendChild(this.make("span", "", `${user.completed} 关 · ${user.stars} 星`));
      ranking.appendChild(row);
    });
    wrap.appendChild(ranking);
    return wrap;
  },

  buildDistribution(title, items) {
    const section = this.make("section", "analytics-chart");
    section.appendChild(this.make("h3", "", title));
    const max = Math.max(1, ...items.map((item) => item[1]));
    items.forEach(([label, count]) => {
      const row = this.make("div", "analytics-bar-row");
      row.appendChild(this.make("span", "analytics-bar-label", label));
      const track = this.make("div", "analytics-bar-track");
      const bar = this.make("i", "analytics-bar-fill");
      bar.style.width = `${Math.round((count / max) * 100)}%`;
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(this.make("strong", "", String(count)));
      section.appendChild(row);
    });
    return section;
  },

  buildUsersTable(users) {
    const section = this.make("section", "analytics-table-section");
    const head = this.make("div", "analytics-table-head");
    head.appendChild(this.make("h3", "", "用户明细"));
    head.appendChild(this.make("span", "", `共 ${users.length} 个普通账号`));
    section.appendChild(head);

    const wrap = this.make("div", "analytics-table-wrap");
    const table = this.make("table", "analytics-table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["账号", "爱发电档位", "状态", "注册时间", "最近活跃", "通关", "星数", "残片", "当前进度"].forEach((label) => {
      headRow.appendChild(this.make("th", "", label));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    users.forEach((user) => {
      const row = document.createElement("tr");
      [
        user.nickname,
        user.plan,
        user.premium ? "完整版" : "试玩",
        this.formatDate(user.createdAt),
        this.formatDate(user.updatedAt),
        `${user.completed} 关`,
        `${user.stars} 星`,
        String(user.fragments),
        user.current
      ].forEach((value) => row.appendChild(this.make("td", "", value)));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    section.appendChild(wrap);
    return section;
  },

  groupCounts(users, keyFn) {
    const counts = new Map();
    users.forEach((user) => {
      const key = keyFn(user);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  },

  formatDate(value) {
    if (!value) return "未知";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "未知";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  daysSince(value) {
    if (!value) return Infinity;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return Infinity;
    return (Date.now() - time) / (24 * 60 * 60 * 1000);
  },

  make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
};