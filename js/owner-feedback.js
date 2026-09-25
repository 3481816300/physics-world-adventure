const OwnerFeedback = {
  render(entries = [], options = {}) {
    const root = document.getElementById("ownerFeedbackList");
    if (!root) return;
    root.replaceChildren();
    if (options.loading) {
      root.appendChild(this.make("p", "analytics-empty", "正在加载反馈..."));
      return;
    }
    if (options.error) {
      root.appendChild(this.make("p", "analytics-empty analytics-error", options.error));
      return;
    }
    if (!entries.length) {
      root.appendChild(this.make("p", "analytics-empty", "暂无用户反馈"));
      return;
    }
    entries.forEach((entry) => root.appendChild(this.buildItem(entry)));
  },

  buildItem(entry) {
    const item = this.make("article", "owner-feedback-item");
    const head = this.make("div", "owner-feedback-head");
    const title = this.make("strong", "", `[${entry.kind === "idea" ? "意见" : "Bug"}] ${entry.title}`);
    const status = this.make("span", entry.reply ? "owner-status is-premium" : "owner-status", entry.reply ? "已回复" : "待回复");
    head.appendChild(title);
    head.appendChild(status);
    item.appendChild(head);

    const meta = this.make("div", "owner-feedback-meta");
    [
      `用户：${entry.nickname}`,
      `时间：${this.formatDate(entry.created_at)}`,
      `页面：${entry.page || "未记录"}`,
      `档位：${entry.plan || "未标记"}`,
      `联系方式：${entry.contact || "未填写"}`
    ].forEach((text) => meta.appendChild(this.make("span", "", text)));
    item.appendChild(meta);

    item.appendChild(this.make("p", "owner-feedback-content", entry.content));

    const replyBox = this.make("textarea", "text-input owner-feedback-reply");
    replyBox.maxLength = 5000;
    replyBox.placeholder = "输入回复，用户可在“我的反馈”中看到";
    replyBox.value = entry.reply || "";
    item.appendChild(replyBox);
    const actions = this.make("div", "owner-feedback-actions");
    const button = this.make("button", "btn btn-primary", entry.reply ? "更新回复" : "发送回复");
    button.type = "button";
    button.addEventListener("click", () => this.submitReply(entry.id, replyBox, button));
    actions.appendChild(button);
    if (entry.issue_url) {
      const link = this.make("a", "support-link", "查看 GitHub Issue");
      link.href = entry.issue_url;
      link.target = "_blank";
      link.rel = "noopener";
      actions.appendChild(link);
    }
    item.appendChild(actions);
    if (entry.replied_at) item.appendChild(this.make("small", "owner-feedback-replied-at", `上次回复：${this.formatDate(entry.replied_at)}`));
    return item;
  },

  async submitReply(id, textarea, button) {
    const reply = textarea.value.trim();
    if (reply.length < 2) {
      UI.showToast("请填写回复内容");
      return;
    }
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "发送中...";
    try {
      await Api.ownerReplyFeedback(Save.serverToken, id, reply);
      UI.showToast("回复已发送到用户反馈页");
      await App.loadOwnerFeedback();
    } catch (error) {
      UI.showToast(error.message || "回复失败");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  },

  formatDate(value) {
    if (!value) return "未知";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "未知" : date.toLocaleString();
  },

  make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
};