const PLAN_FEEDBACK_GUIDES = {
  "裂隙勘探员": [
    "可反馈新章节内测版本的问题、关卡体验和机制建议。",
    "每月开发方向投票开放时，会在意见反馈界面同步说明。",
    "请尽量写明所在关卡、复现方式和期望效果。"
  ],
  "远征赞助人": [
    "包含裂隙勘探员的反馈与内测权益。",
    "可提交新角色、纪念品和关卡主题建议。",
    "涉及多个账号或纪念权益时，请备注主账号，方便集中回复。"
  ],
  "终章共创者": [
    "包含远征赞助人的全部反馈权益。",
    "可提交终章、角色、关卡和纪念品创意共创意见。",
    "阶段性会议或问卷开启时，会在这里显示参与说明。"
  ]
};

const FeedbackCenter = {
  refs: null,
  kind: "bug",
  access: { allowed: false, plan: "" },

  init() {
    this.refs = {
      bugButton: document.getElementById("btn-bug-feedback"),
      ideaButton: document.getElementById("btn-idea-feedback"),
      modal: document.getElementById("feedbackModal"),
      title: document.getElementById("feedbackTitle"),
      intro: document.getElementById("feedbackIntro"),
      guide: document.getElementById("feedbackGuide"),
      titleInput: document.getElementById("feedbackTitleInput"),
      content: document.getElementById("feedbackContent"),
      contact: document.getElementById("feedbackContact"),
      error: document.getElementById("feedbackError"),
      submit: document.getElementById("btn-feedback-submit"),
      close: document.getElementById("btn-feedback-close")
    };
    this.refs.bugButton.addEventListener("click", () => this.open("bug"));
    this.refs.ideaButton.addEventListener("click", () => this.open("idea"));
    this.refs.close.addEventListener("click", () => this.close());
    this.refs.submit.addEventListener("click", () => this.submit());
    this.refreshAccess();
  },

  async refreshAccess() {
    if (Save.isGuest()) {
      this.access = { allowed: false, plan: "" };
      this.refs.ideaButton.hidden = true;
      return;
    }
    try {
      const access = await Api.feedbackAccess(Save.serverToken);
      this.access = { allowed: Boolean(access.allowed), plan: access.plan || "" };
      this.refs.ideaButton.hidden = !this.access.allowed;
    } catch {
      this.access = { allowed: false, plan: "" };
      this.refs.ideaButton.hidden = true;
    }
  },

  open(kind) {
    if (kind === "idea" && !this.access.allowed) {
      UI.showToast("意见反馈仅向 12.34 元以上的爱发电档位开放");
      return;
    }
    this.kind = kind;
    this.refs.title.textContent = kind === "idea" ? "意见反馈" : "Bug 反馈";
    this.refs.intro.textContent = kind === "idea"
      ? "提交玩法、内容和开发方向建议。系统会附带当前账号与所在的游戏页面。"
      : "遇到报错、卡关、角色异常、按钮无反应等问题时，请按实际情况描述。系统会附带当前账号与所在的游戏页面。";
    this.refs.guide.replaceChildren();
    const guideItems = kind === "idea" ? PLAN_FEEDBACK_GUIDES[this.access.plan] || [] : [
      "请写明触发步骤、预期结果和实际结果。",
      "如果问题和特定关卡有关，请注明关卡名称或编号。",
      "可在联系方式中留下邮箱或 QQ，方便后续确认。"
    ];
    guideItems.forEach((item) => {
      const row = document.createElement("p");
      row.textContent = item;
      this.refs.guide.appendChild(row);
    });
    this.refs.error.hidden = true;
    this.refs.titleInput.value = "";
    this.refs.content.value = "";
    this.refs.contact.value = Save.isGuest() ? "" : Save.getAccountName();
    this.refs.modal.hidden = false;
    requestAnimationFrame(() => this.refs.modal.classList.add("is-open"));
    setTimeout(() => this.refs.titleInput.focus(), 60);
  },

  close() {
    this.refs.modal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.modal.hidden = true;
    }, 200);
  },

  async submit() {
    const title = this.refs.titleInput.value.trim();
    const content = this.refs.content.value.trim();
    if (title.length < 2 || content.length < 5) {
      this.refs.error.textContent = "请填写标题，并至少填写 5 个字的详细情况";
      this.refs.error.hidden = false;
      return;
    }
    const original = this.refs.submit.textContent;
    this.refs.submit.disabled = true;
    this.refs.submit.textContent = "提交中...";
    try {
      await Api.submitFeedback({
        token: Save.isGuest() ? null : Save.serverToken,
        kind: this.kind,
        title,
        content,
        page: this.getPage(),
        contact: this.refs.contact.value.trim()
      });
      this.close();
      UI.showToast(this.kind === "idea" ? "意见已提交，感谢反馈" : "Bug 已提交，感谢反馈");
    } catch (error) {
      this.refs.error.textContent = error.message || "提交失败，请稍后重试";
      this.refs.error.hidden = false;
    } finally {
      this.refs.submit.disabled = false;
      this.refs.submit.textContent = original;
    }
  },

  getPage() {
    if (App.currentChapter && App.currentLevel) {
      return `${App.currentChapter.artName}——${App.currentChapter.subject} / ${App.currentLevel.id} ${App.currentLevel.name}`;
    }
    return `界面：${App.screen || "未知"}`;
  }
};