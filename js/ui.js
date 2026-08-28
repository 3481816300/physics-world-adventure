const MAP_NODE_POSITIONS = [
  { x: 150, y: 850 },
  { x: 330, y: 640 },
  { x: 530, y: 820 },
  { x: 710, y: 560 },
  { x: 900, y: 760 },
  { x: 1080, y: 500 },
  { x: 1250, y: 700 },
  { x: 1430, y: 440 },
  { x: 1510, y: 820 },
  { x: 1300, y: 240 },
  { x: 1030, y: 180 },
  { x: 730, y: 210 },
  { x: 430, y: 280 },
  { x: 170, y: 160 }
];

const MAP_NODE_ICONS = ["力", "波", "热", "光", "流", "能", "机", "电", "撞", "星", "核", "量", "时", "熵"];

const UI = {
  refs: {},
  characterPreviews: [],
  previewGeneration: 0,
  pausePreview: null,
  confirmDeleteId: null,
  confirmDeleteTimer: null,

  init() {
    this.newtonAnimator = null;
    this.refs = {
      ambientCanvas: document.getElementById("ambientCanvas"),
      gameCanvas: document.getElementById("gameCanvas"),
      screens: document.querySelectorAll(".screen"),
      worldMapSvg: document.getElementById("worldMapSvg"),
      mapNodes: document.getElementById("mapNodes"),
      difficultySelector: document.getElementById("difficultySelector"),
      levelList: document.getElementById("levelList"),
      shopGrid: document.getElementById("shopGrid"),
      shopCurrency: document.getElementById("shopCurrency"),
      characterGrid: document.getElementById("characterGrid"),
      characterInfo: document.getElementById("characterInfo"),
      souvenirLoadout: document.getElementById("souvenirLoadout"),
      characterCurrency: document.getElementById("characterCurrency"),
      chapterProgressText: document.getElementById("chapterProgressText"),
      levelChapterName: document.getElementById("levelChapterName"),
      levelChapterSubject: document.getElementById("levelChapterSubject"),
      adminBadge: document.getElementById("adminBadge"),
      adminBadgeLevels: document.getElementById("adminBadgeLevels"),
      btnExitAdmin: document.getElementById("btn-exit-admin"),
      btnExitAdminLevels: document.getElementById("btn-exit-admin-levels"),
      btnAdmin: document.getElementById("btn-admin"),
      accountPanel: document.getElementById("accountPanel"),
      accountCurrentLabel: document.getElementById("accountCurrentLabel"),
      hudLevelName: document.getElementById("hudLevelName"),
      hudChapterName: document.getElementById("hudChapterName"),
      hudHearts: document.getElementById("hudHearts"),
      hudShards: document.getElementById("hudShards"),
      hotbar: document.getElementById("hotbar"),
      gameStatus: document.getElementById("gameStatus"),
      toast: document.getElementById("toast"),
      pauseOverlay: document.getElementById("pauseOverlay"),
      pauseSkinBox: document.getElementById("pauseSkinBox"),
      pauseSkinName: document.getElementById("pauseSkinName"),
      pauseUserInfo: document.getElementById("pauseUserInfo"),
      btnResumeSave: document.getElementById("btn-resume-save"),
      completionOverlay: document.getElementById("completionOverlay"),
      completionLevelName: document.getElementById("completionLevelName"),
      completionStars: document.getElementById("completionStars"),
      completionTime: document.getElementById("completionTime"),
      completionDeaths: document.getElementById("completionDeaths"),
      completionShards: document.getElementById("completionShards"),
      adminModal: document.getElementById("adminModal"),
      adminPassword: document.getElementById("adminPassword"),
      adminError: document.getElementById("adminError"),
      firstRunModal: document.getElementById("firstRunModal"),
      firstRunOptions: document.getElementById("firstRunOptions"),
      firstRunError: document.getElementById("firstRunError"),
      onboardingModal: document.getElementById("onboardingModal"),
      contactModal: document.getElementById("contactModal"),
      contactContent: document.getElementById("contactContent"),
      purchaseModal: document.getElementById("purchaseModal"),
      redeemModal: document.getElementById("redeemModal"),
      redeemCode: document.getElementById("redeemCode"),
      redeemError: document.getElementById("redeemError"),
      redeemBatchModal: document.getElementById("redeemBatchModal"),
      redeemBatchCount: document.getElementById("redeemBatchCount"),
      redeemBatchResult: document.getElementById("redeemBatchResult"),
      redeemBatchError: document.getElementById("redeemBatchError"),
      devSupportModal: document.getElementById("devSupportModal"),
      devSupportChapter: document.getElementById("devSupportChapter"),
      registerModal: document.getElementById("registerModal"),
      registerNickname: document.getElementById("registerNickname"),
      registerPassword: document.getElementById("registerPassword"),
      registerPasswordConfirm: document.getElementById("registerPasswordConfirm"),
      registerError: document.getElementById("registerError"),
      loginModal: document.getElementById("loginModal"),
      loginNickname: document.getElementById("loginNickname"),
      loginPassword: document.getElementById("loginPassword"),
      loginError: document.getElementById("loginError"),
      passwordModal: document.getElementById("passwordModal"),
      passwordOld: document.getElementById("passwordOld"),
      passwordNew: document.getElementById("passwordNew"),
      passwordConfirm: document.getElementById("passwordConfirm"),
      passwordModalError: document.getElementById("passwordModalError"),
      knowledgeModal: document.getElementById("knowledgeModal"),
      knowledgeQuestion: document.getElementById("knowledgeQuestion"),
      knowledgeOptions: document.getElementById("knowledgeOptions"),
      knowledgeNewtonCanvas: document.getElementById("knowledgeNewtonCanvas"),
      backgroundModal: document.getElementById("backgroundModal"),
      backgroundText: document.getElementById("backgroundText"),
      chapterIntroModal: document.getElementById("chapterIntroModal"),
      expertPortrait: document.getElementById("expertPortrait"),
      expertName: document.getElementById("expertName"),
      expertTitle: document.getElementById("expertTitle"),
      expertQuote: document.getElementById("expertQuote"),
      expertContent: document.getElementById("expertContent"),
      newtonCanvas: document.getElementById("newtonCanvas"),
      endPoemModal: document.getElementById("endPoemModal"),
      endPoemText: document.getElementById("endPoemText")
    };
    this.newtonAnimator = new NewtonAnimator(this.refs.newtonCanvas);
    this.newtonAnimator.load();
    this.knowledgeNewtonAnimator = new NewtonAnimator(this.refs.knowledgeNewtonCanvas);
    this.knowledgeNewtonAnimator.load();
  },

  show(screenName) {
    this.refs.screens.forEach((screen) => {
      screen.classList.toggle("is-active", screen.dataset.screen === screenName);
    });
  },

  renderDifficultySelector() {
    const container = this.refs.difficultySelector;
    container.innerHTML = "";
    const locked = Save.isDifficultyLocked();
    DIFFICULTY_MODES.forEach((mode, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `difficulty-btn${Save.data.difficulty === mode.id ? " is-active" : ""}`;
      button.textContent = mode.label;
      button.style.animationDelay = `${index * 50}ms`;
      if (locked) {
        button.disabled = true;
        button.classList.add("is-locked");
      }
      button.addEventListener("click", () => App.setDifficulty(mode.id));
      container.appendChild(button);
    });
  },

  renderChapters() {
    const svg = this.refs.worldMapSvg;
    const nodes = this.refs.mapNodes;
    svg.innerHTML = "";
    nodes.innerHTML = "";

    this.buildMapBase(svg);

    const visibleChapters = Save.getVisibleChapters().concat(
      Save.data.difficulty !== "simple" && Save.isFinalUnlocked() ? [FINAL_CHAPTER] : []
    );
    visibleChapters.forEach((chapter, index) => {
      const position = MAP_NODE_POSITIONS[index];
      const isFinal = index >= CHAPTERS.length;
      nodes.appendChild(this.buildMapNode(chapter, index, position, isFinal));
    });

    const completed = Save.getVisibleChapters().filter((chapter) => Save.isChapterCompleted(chapter)).length;
    this.refs.chapterProgressText.textContent = `${completed}/${Save.getVisibleChapterCount()}`;
    this.setAdminBadges(Save.isAdmin());
  },

  buildMapBase(svg) {
    const ns = "http://www.w3.org/2000/svg";
    const add = (tag, attrs) => {
      const element = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
      svg.appendChild(element);
      return element;
    };

    add("ellipse", { cx: 130, cy: 920, rx: 340, ry: 130, fill: "#79b8d9", opacity: "0.55" });
    add("ellipse", { cx: 1460, cy: 130, rx: 260, ry: 110, fill: "#8fa8bd", opacity: "0.42" });
    add("ellipse", { cx: 260, cy: 240, rx: 190, ry: 100, fill: "#a7d18b", opacity: "0.5" });
    add("ellipse", { cx: 780, cy: 980, rx: 420, ry: 150, fill: "#d9b979", opacity: "0.3" });
    add("ellipse", { cx: 1330, cy: 620, rx: 280, ry: 130, fill: "#b9d8a8", opacity: "0.38" });
    add("path", {
      d: MAP_NODE_POSITIONS.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
      fill: "none",
      stroke: "#31515c",
      "stroke-width": "9",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-dasharray": "2 18",
      opacity: "0.72"
    });
    add("path", {
      d: MAP_NODE_POSITIONS.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
      fill: "none",
      stroke: "#f7f2e4",
      "stroke-width": "3",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      opacity: "0.5"
    });
  },

  buildMapNode(chapter, index, position, isFinal = false) {
    const article = document.createElement("article");
    article.className = "map-node";
    article.style.left = `${position.x}px`;
    article.style.top = `${position.y}px`;

    const underDevelopment = !isFinal && chapter.levels.every((level) => level.placeholder);
    const unlocked = isFinal ? Save.isFinalUnlocked() : Save.isChapterUnlocked(chapter);
    const completed = isFinal ? Save.isChapterCompleted(FINAL_CHAPTER) : Save.isChapterCompleted(chapter);
    article.classList.toggle("is-unlocked", unlocked || underDevelopment);
    article.classList.toggle("is-completed", completed);
    article.classList.toggle("is-locked", !unlocked && !underDevelopment);

    const button = document.createElement("button");
    button.className = "map-node-button";
    button.type = "button";
    button.setAttribute("aria-label", isFinal ? "熵之终章" : chapter.artName);
    button.textContent = MAP_NODE_ICONS[index];

    const label = document.createElement("div");
    label.className = "map-node-label";
    label.innerHTML = isFinal
      ? "熵之终章——最终试炼"
      : `${chapter.id}. ${chapter.artName}——${chapter.subject}${underDevelopment ? "<br><b>开发中 · 请我喝咖啡</b>" : ""}`;

    article.appendChild(button);
    article.appendChild(label);

    article.addEventListener("click", () => {
      if (underDevelopment && !Save.isAdmin()) {
        UI.openDevSupport(chapter);
        return;
      }
      if (!unlocked) {
        if (!Save.isPremium() && chapter.id !== 1) {
          UI.openPurchase();
        } else {
          UI.showToast("请先完成上一章的章节 Boss");
        }
        return;
      }
      App.openLevels(chapter.id, isFinal);
    });

    return article;
  },

  renderLevels(chapter, isFinal = false) {
    const list = this.refs.levelList;
    list.innerHTML = "";
    this.refs.levelChapterName.textContent = isFinal ? "熵之终章" : `${chapter.artName}——${chapter.subject}`;
    this.refs.levelChapterSubject.textContent = isFinal ? "最终试炼" : `共 ${chapter.levels.length} 个关卡槽位`;

    chapter.levels.forEach((level, index) => {
      const card = document.createElement("article");
      card.className = "level-card";
      card.style.animationDelay = `${Math.min(index, 10) * 34}ms`;

      const unlocked = Save.isLevelUnlocked(chapter, level);
      const completed = Save.isLevelCompleted(level.id);
      card.classList.toggle("is-locked", !unlocked);
      card.classList.toggle("is-completed", completed);

      const title = document.createElement("h3");
      title.textContent = `${index + 1}. ${level.name}`;

      const role = document.createElement("p");
      role.textContent = level.role || "待设计";

      const meta = document.createElement("span");
      meta.className = "level-role";
      if (completed) {
        const record = Save.getLevelRecord(level.id);
        const actualTime = record ? record.elapsed : 0;
        const estimatedTime = Save.getEstimatedTime(level.id);
        const bestTime = record ? record.elapsed : 0;
        meta.textContent = `已稳定 · ${Save.getStarCount(level.id)}/5 星 · 最佳 ${this.formatTime(bestTime)}`;
      } else {
        meta.textContent = unlocked
          ? "可进入"
          : Save.data.difficulty === "hell" && level.role === "教学关"
            ? "炼狱模式已移除"
            : !Save.isPremium()
              ? "付费解锁"
              : "未解锁";
      }

      card.appendChild(title);
      card.appendChild(role);
      card.appendChild(meta);

      card.addEventListener("click", () => {
        if (!unlocked) {
          if (!Save.isPremium()) {
            UI.openPurchase();
          } else {
            UI.showToast("请先完成前一关");
          }
          return;
        }
        App.startLevel(chapter.id, level.id, isFinal);
      });

      list.appendChild(card);
    });

    this.setAdminBadges(Save.isAdmin());
  },

  formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    if (total < 60) return `${total}s`;
    return `${Math.floor(total / 60)}m${total % 60}s`;
  },

  renderShop() {
    const grid = this.refs.shopGrid;
    grid.innerHTML = "";
    this.previewGeneration += 1;
    this.characterPreviews = [];
    this.refs.shopCurrency.textContent = `法则能量 ${Save.getCurrency()}`;

    SOUVENIRS.forEach((souvenir, index) => {
      const card = document.createElement("article");
      card.className = "shop-card";
      card.style.animationDelay = `${Math.min(index, 10) * 40}ms`;

      const owned = Save.isSouvenirOwned(souvenir.id);
      const isActiveSkin = souvenir.type === "skin" && Save.data.activeSkin === souvenir.skinId;

      let visual;
      if (souvenir.type === "skin") {
        const skin = getSkinById(souvenir.skinId);
        visual = this.createCharacterPreview(skin);
        visual.className = "shop-canvas";
      } else if (souvenir.image) {
        visual = document.createElement("img");
        visual.className = "shop-image";
        visual.src = souvenir.image;
        visual.alt = souvenir.name;
      } else {
        visual = document.createElement("div");
        visual.className = "shop-icon";
        visual.textContent = souvenir.icon;
      }

      const name = document.createElement("h3");
      name.textContent = souvenir.name;

      const desc = document.createElement("p");
      desc.textContent = souvenir.desc;

      const footer = document.createElement("div");
      footer.className = "shop-footer";

      const price = document.createElement("span");
      price.className = "shop-price";
      price.textContent = owned ? (isActiveSkin ? "已装备" : "已拥有") : `${souvenir.cost} 能量`;

      footer.appendChild(price);

      if (!owned) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-primary shop-buy";
        button.textContent = Save.getCurrency() >= souvenir.cost ? "购买" : "能量不足";
        button.disabled = Save.getCurrency() < souvenir.cost;
        button.addEventListener("click", () => App.buySouvenir(souvenir.id));
        footer.appendChild(button);
      }

      card.appendChild(visual);
      card.appendChild(name);
      card.appendChild(desc);
      card.appendChild(footer);
      grid.appendChild(card);
    });
  },

  createCharacterPreview(skin) {
    const canvas = document.createElement("canvas");
    canvas.className = "character-preview";
    canvas.width = 78;
    canvas.height = 78;
    const image = new Image();
    const generation = this.previewGeneration;
    image.onload = () => {
      if (generation !== this.previewGeneration) return;
      this.characterPreviews.push({
        canvas,
        image,
        frame: 0,
        timer: 0,
        loaded: true
      });
      this.drawCharacterRunFrame(canvas, image, 0);
    };
    image.onerror = () => {
      canvas.textContent = skin.name.slice(0, 1);
    };
    image.src = skin.sheet || skin.image;
    return canvas;
  },

  drawCharacterRunFrame(canvas, image, frame) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const index = 4 + (frame % 6);
    const cell = 64;
    const columns = 8;
    const sx = (index % columns) * cell;
    const sy = Math.floor(index / columns) * cell;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sx, sy, cell, cell, 0, 0, canvas.width, canvas.height);
  },

  animateCharacterPreviews(dt) {
    if (this.newtonAnimator) {
      this.newtonAnimator.update(dt);
    }
    if (this.knowledgeNewtonAnimator) {
      this.knowledgeNewtonAnimator.update(dt);
    }
    for (const preview of this.characterPreviews) {
      if (!preview.loaded) continue;
      preview.timer += dt;
      if (preview.timer >= 1) {
        preview.timer = 0;
        preview.frame = (preview.frame + 1) % 6;
        this.drawCharacterRunFrame(preview.canvas, preview.image, preview.frame);
      }
    }
  },

  renderCharacters() {
    const grid = this.refs.characterGrid;
    grid.innerHTML = "";
    this.previewGeneration += 1;
    this.characterPreviews = [];
    this.refs.characterCurrency.textContent = `法则能量 ${Save.getCurrency()}`;

    const activeCharacter = Save.getActiveCharacter();
    this.refs.characterInfo.innerHTML = `
      <div class="character-identity">
        <div>
          <strong>${activeCharacter.name}</strong>
          <span>${activeCharacter.title}</span>
        </div>
        <p>${activeCharacter.desc}</p>
        <p class="ability-line">${activeCharacter.ability}</p>
      </div>
    `;

    SKINS.forEach((skin) => {
      const card = document.createElement("article");
      card.className = `character-card${Save.data.activeSkin === skin.id ? " is-equipped" : ""}`;
      const character = getCharacterForSkin(skin.id);

      const portrait = document.createElement("div");
      portrait.className = "character-portrait";
      portrait.appendChild(this.createCharacterPreview(skin));

      const title = document.createElement("h4");
      title.textContent = skin.name;

      const tag = document.createElement("span");
      tag.className = "character-tag";
      tag.textContent = character.name;

      const desc = document.createElement("p");
      desc.textContent = Save.isSkinOwned(skin.id) ? "已解锁角色皮肤" : "需要在商店解锁";

      const button = document.createElement("button");
      button.type = "button";
      const owned = Save.isSkinOwned(skin.id);
      const equipped = Save.data.activeSkin === skin.id;
      button.disabled = !owned;
      button.textContent = equipped ? "已装备" : owned ? "装备" : "未解锁";
      if (equipped) button.classList.add("is-armed");
      button.addEventListener("click", () => App.equipSkin(skin.id));

      card.appendChild(portrait);
      card.appendChild(title);
      card.appendChild(tag);
      card.appendChild(desc);
      card.appendChild(button);
      grid.appendChild(card);
    });

    this.renderSouvenirLoadout();
  },

  renderAccount() {
    const panel = this.refs.accountPanel;
    panel.innerHTML = "";
    if (Save.isGuest()) {
      this.refs.accountCurrentLabel.textContent = "游客模式";
      const card = document.createElement("section");
      card.className = "account-card";
      card.innerHTML = `
        <h3>游客模式</h3>
        <p class="modal-copy">第一关免费，后续关卡需要购买完整版。当前游客模式不会保存游戏记录。</p>
        <div class="account-actions">
          <button id="btn-account-purchase" class="btn btn-primary" type="button">购买完整版</button>
          <button id="btn-account-redeem" class="btn btn-ghost" type="button">兑换完整版</button>
          <button id="btn-account-login" class="btn btn-ghost" type="button">登录账号</button>
        </div>
      `;
      card.querySelector("#btn-account-purchase").addEventListener("click", () => UI.openPurchase());
      card.querySelector("#btn-account-redeem").addEventListener("click", () => UI.openRedeem());
      card.querySelector("#btn-account-login").addEventListener("click", () => UI.openLogin());
      panel.appendChild(card);
      this.renderSavedAccounts(panel);
      return;
    }

    this.refs.accountCurrentLabel.textContent = `当前账号：${Save.getAccountName()}`;
    const card = document.createElement("section");
    card.className = "account-card";
    card.innerHTML = `
      <h3>当前账号</h3>
      <div class="account-form">
        <input id="accountNickname" class="text-input" maxlength="16" value="${Save.getAccountName()}">
        <button id="btn-save-nickname" class="btn btn-primary" type="button">保存昵称</button>
      </div>
      <div class="account-actions" style="margin-top:14px">
        <strong>完整版：${Save.isAdmin() && !Save.data.premium ? "管理员模式" : Save.isPremium() ? "已购买" : "未购买"}</strong>
        ${!Save.isPremium() && !Save.isAdmin() ? '<button id="btn-account-purchase" class="btn btn-primary" type="button">购买完整版</button>' : ""}
        ${!Save.isPremium() && !Save.isAdmin() ? '<button id="btn-account-redeem" class="btn btn-ghost" type="button">兑换完整版</button>' : ""}
        ${Save.isAdmin() ? `<button id="btn-account-premium-toggle" class="btn btn-ghost" type="button">${Save.data.premium ? "撤销付费标记" : "标记为已付费"}</button>` : ""}
      </div>
      <div class="account-actions" style="margin-top:14px">
        <button id="btn-account-logout" class="btn btn-danger" type="button">退出登录</button>
        <button id="btn-account-switch" class="btn btn-ghost" type="button">登录另一个账号</button>
        ${Save.isAdmin() ? '<button id="btn-account-register-another" class="btn btn-ghost" type="button">注册另一个账号（管理员）</button>' : '<button id="btn-account-contact" class="btn btn-ghost" type="button">联系开发者获取账号</button>'}
      </div>
      <div class="account-actions" style="margin-top:14px">
        <button id="btn-open-password" class="btn btn-primary" type="button">修改密码</button>
        <button id="btn-view-password" class="btn btn-ghost" type="button">查看密码</button>
        ${Save.isAdmin() ? '<button id="btn-account-generate-codes" class="btn btn-ghost" type="button">生成兑换码</button>' : ""}
      </div>
    `;
    card.querySelector("#btn-save-nickname").addEventListener("click", () => {
      App.renameAccount(card.querySelector("#accountNickname").value);
    });
    const purchase = card.querySelector("#btn-account-purchase");
    if (purchase) {
      purchase.addEventListener("click", () => UI.openPurchase());
    }
    const redeem = card.querySelector("#btn-account-redeem");
    if (redeem) {
      redeem.addEventListener("click", () => UI.openRedeem());
    }
    const premiumToggle = card.querySelector("#btn-account-premium-toggle");
    if (premiumToggle) {
      premiumToggle.addEventListener("click", () => App.togglePremium());
    }
    card.querySelector("#btn-account-logout").addEventListener("click", () => App.logoutAccount());
    card.querySelector("#btn-account-switch").addEventListener("click", () => UI.openLogin());
    const registerAnother = card.querySelector("#btn-account-register-another");
    if (registerAnother) {
      registerAnother.addEventListener("click", () => UI.openRegister());
    }
    const contact = card.querySelector("#btn-account-contact");
    if (contact) {
      contact.addEventListener("click", () => UI.openContact());
    }
    const generateCodes = card.querySelector("#btn-account-generate-codes");
    if (generateCodes) {
      generateCodes.addEventListener("click", () => App.openRedeemBatch());
    }
    card.querySelector("#btn-open-password").addEventListener("click", () => UI.openPasswordModal());
    card.querySelector("#btn-view-password").addEventListener("click", () => App.viewPassword());
    panel.appendChild(card);
    this.renderSavedAccounts(panel);
  },

  renderSavedAccounts(panel) {
    const accounts = Save.getServerAccounts();
    if (!accounts.length) return;
    const card = document.createElement("section");
    card.className = "account-card";
    card.innerHTML = `<h3>本机已登录账号</h3><div class="account-list" id="savedAccountList"></div>`;
    const list = card.querySelector("#savedAccountList");
    accounts.forEach((account) => {
      const row = document.createElement("div");
      row.className = `account-row${account.token === Save.getActiveAccountId() ? " is-active" : ""}`;
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = account.nickname;
      const meta = document.createElement("span");
      meta.textContent = account.token === Save.getActiveAccountId() ? "当前账号" : "已登录";
      info.appendChild(name);
      info.appendChild(meta);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-ghost";
      button.textContent = account.token === Save.getActiveAccountId() ? "当前" : "切换";
      button.disabled = account.token === Save.getActiveAccountId();
      button.addEventListener("click", () => App.switchServerAccount(account.token));
      row.appendChild(info);
      row.appendChild(button);
      list.appendChild(row);
    });
    panel.appendChild(card);
  },

  updateAccountButton() {
    const button = document.getElementById("btn-account");
    if (button) {
      button.textContent = `账号：${Save.getAccountName()}`;
    }
  },

  renderSouvenirLoadout() {
    const container = this.refs.souvenirLoadout;
    container.innerHTML = "";
    const ownedSouvenirs = SOUVENIRS.filter((item) => item.type === "souvenir" && Save.isSouvenirOwned(item.id));

    if (ownedSouvenirs.length === 0) {
      const empty = document.createElement("p");
      empty.className = "modal-copy";
      empty.textContent = "还没有纪念品，先去纪念品商店看看吧。";
      container.appendChild(empty);
      return;
    }

    ownedSouvenirs.forEach((souvenir) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = `souvenir-slot${Save.isSouvenirEquipped(souvenir.id) ? " is-equipped" : ""}`;

      const icon = document.createElement("span");
      icon.className = "slot-icon";
      icon.textContent = souvenir.icon;

      const copy = document.createElement("span");
      copy.className = "slot-copy";
      const name = document.createElement("strong");
      name.textContent = souvenir.name;
      const state = document.createElement("span");
      state.textContent = Save.isSouvenirEquipped(souvenir.id) ? "已携带" : "点击携带";
      copy.appendChild(name);
      copy.appendChild(state);

      slot.appendChild(icon);
      slot.appendChild(copy);
      slot.addEventListener("click", () => App.toggleEquippedSouvenir(souvenir.id));
      container.appendChild(slot);
    });
  },

  openFirstRun() {
    const container = this.refs.firstRunOptions;
    container.innerHTML = "";
    this.refs.firstRunError.hidden = true;
    DIFFICULTY_MODES.forEach((mode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "first-run-option";
      button.textContent = mode.label;
      button.addEventListener("click", () => App.confirmFirstRun(mode.id));
      container.appendChild(button);
    });
    this.refs.firstRunModal.hidden = false;
    requestAnimationFrame(() => this.refs.firstRunModal.classList.add("is-open"));
  },

  hideFirstRun() {
    this.refs.firstRunModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.firstRunModal.hidden = true;
    }, 200);
  },

  openOnboarding() {
    this.refs.onboardingModal.hidden = false;
    requestAnimationFrame(() => this.refs.onboardingModal.classList.add("is-open"));
  },

  hideOnboarding() {
    this.refs.onboardingModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.onboardingModal.hidden = true;
    }, 200);
  },

  openPurchase() {
    this.refs.purchaseModal.hidden = false;
    requestAnimationFrame(() => this.refs.purchaseModal.classList.add("is-open"));
  },

  hidePurchase() {
    this.refs.purchaseModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.purchaseModal.hidden = true;
    }, 200);
  },

  openRedeem() {
    UI.hidePurchase();
    if (Save.isGuest()) {
      UI.openLogin();
      UI.showToast("请先登录账号后兑换");
      return;
    }
    this.refs.redeemCode.value = "";
    this.refs.redeemError.hidden = true;
    this.refs.redeemModal.hidden = false;
    requestAnimationFrame(() => this.refs.redeemModal.classList.add("is-open"));
    setTimeout(() => this.refs.redeemCode.focus(), 80);
  },

  hideRedeem() {
    this.refs.redeemModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.redeemModal.hidden = true;
    }, 200);
  },

  openRedeemBatch() {
    if (!Save.isAdmin()) return;
    this.refs.redeemBatchCount.value = "1";
    this.refs.redeemBatchResult.value = "";
    this.refs.redeemBatchError.hidden = true;
    this.refs.redeemBatchModal.hidden = false;
    requestAnimationFrame(() => this.refs.redeemBatchModal.classList.add("is-open"));
  },

  hideRedeemBatch() {
    this.refs.redeemBatchModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.redeemBatchModal.hidden = true;
    }, 200);
  },

  openContact(title = "联系开发者获取账号") {
    const channels = [
      "📩 咨询邮箱：3481816300@qq.com",
      "💬 咨询微信：15156525860",
      "💬 咨询QQ：3481816300",
      "暂不支持电话咨询，敬请谅解"
    ];
    document.getElementById("contactTitle").textContent = title;
    const intro = title === "购买完整版"
      ? "<p>第一关免费。解锁后续全部关卡需要购买完整版。</p><p>购买后请联系开发者，管理员会为你标记为已付费用户。</p>"
      : "<p>本游戏为商业付费游戏。如需获取完整版本、了解售价、购买流程或授权范围，请通过官方渠道咨询。</p>";
    this.refs.contactContent.innerHTML = `
      ${intro}
      ${channels.map((channel) => `<div class="contact-channel">${channel}</div>`).join("")}
      <p>请简要说明你的需求，例如：个人使用 / 团队使用、设备平台等，方便我快速为你解答。</p>
      <p>所有付费相关仅通过官方渠道沟通，不存在其他代理；请确认沟通对象为本人后再进行后续操作，谨防诈骗。</p>
    `;
    this.refs.contactModal.hidden = false;
    requestAnimationFrame(() => this.refs.contactModal.classList.add("is-open"));
  },

  hideContact() {
    this.refs.contactModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.contactModal.hidden = true;
    }, 200);
  },

  openDevSupport(chapter) {
    this.refs.devSupportChapter.textContent = `${chapter.artName}——${chapter.subject} 正在开发中`;
    this.refs.devSupportModal.hidden = false;
    requestAnimationFrame(() => this.refs.devSupportModal.classList.add("is-open"));
  },

  hideDevSupport() {
    this.refs.devSupportModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.devSupportModal.hidden = true;
    }, 200);
  },

  openRegister() {
    if (!Save.isAdmin()) {
      UI.openContact();
      return;
    }
    this.refs.registerModal.hidden = false;
    this.refs.registerError.hidden = true;
    this.refs.registerPassword.value = "";
    this.refs.registerPasswordConfirm.value = "";
    requestAnimationFrame(() => this.refs.registerModal.classList.add("is-open"));
    Api.getRandomName()
      .then((data) => {
        this.refs.registerNickname.value = data.nickname || "";
      })
      .catch(() => {
        this.refs.registerNickname.value = "";
      });
  },

  hideRegister() {
    this.refs.registerModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.registerModal.hidden = true;
    }, 200);
  },

  openLogin() {
    this.refs.loginModal.hidden = false;
    this.refs.loginError.hidden = true;
    this.refs.loginPassword.value = "";
    requestAnimationFrame(() => this.refs.loginModal.classList.add("is-open"));
  },

  hideLogin() {
    this.refs.loginModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.loginModal.hidden = true;
    }, 200);
  },

  openPasswordModal() {
    this.refs.passwordOld.value = "";
    this.refs.passwordNew.value = "";
    this.refs.passwordConfirm.value = "";
    this.refs.passwordModalError.hidden = true;
    this.refs.passwordModal.hidden = false;
    requestAnimationFrame(() => this.refs.passwordModal.classList.add("is-open"));
  },

  hidePasswordModal() {
    this.refs.passwordModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.passwordModal.hidden = true;
    }, 200);
  },

  openKnowledgeQuestion(gate) {
    this.refs.knowledgeQuestion.textContent = gate.question;
    if (this.knowledgeNewtonAnimator) {
      this.knowledgeNewtonAnimator.setFrame("space-idle");
    }
    const container = this.refs.knowledgeOptions;
    container.innerHTML = "";
    gate.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "knowledge-option";
      button.textContent = option;
      button.addEventListener("click", () => App.answerKnowledge(index));
      container.appendChild(button);
    });
    this.refs.knowledgeModal.hidden = false;
    requestAnimationFrame(() => this.refs.knowledgeModal.classList.add("is-open"));
  },

  closeKnowledgeQuestion() {
    this.refs.knowledgeModal.classList.remove("is-open");
    if (this.knowledgeNewtonAnimator) {
      this.knowledgeNewtonAnimator.setFrame("space-idle");
    }
    setTimeout(() => {
      this.refs.knowledgeModal.hidden = true;
    }, 200);
  },

  markKnowledgeAnswer(index, correct) {
    const button = this.refs.knowledgeOptions.children[index];
    if (!button) return;
    button.classList.toggle("is-correct", correct);
    button.classList.toggle("is-wrong", !correct);
  },

  lockKnowledgeOptions() {
    Array.from(this.refs.knowledgeOptions.children).forEach((button) => {
      button.disabled = true;
    });
  },

  openBackground() {
    this.refs.backgroundText.innerHTML = BACKGROUND_STORY
      .map((paragraph, index) => `<p style="animation-delay:${index * 120}ms">${paragraph}</p>`)
      .join("");
    this.refs.backgroundModal.hidden = false;
    requestAnimationFrame(() => this.refs.backgroundModal.classList.add("is-open"));
  },

  hideBackground() {
    this.refs.backgroundModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.backgroundModal.hidden = true;
    }, 200);
  },

  buildGenericSteps(chapter) {
    const expert = chapter.expert;
    if (!expert) return [];
    const steps = expert.lines.map((text) => ({ type: "text", text, frame: "think" }));
    if (expert.quiz) {
      steps.push({ type: "choice", text: "牛顿：检验你的理解。", frame: "point-sky", question: expert.quiz.question, options: expert.quiz.options, answer: expert.quiz.answer });
    }
    return steps;
  },

  openChapterIntro(chapter, onDone, level) {
    const expert = chapter.expert;
    if (!expert) {
      onDone && onDone();
      return;
    }
    this.chapterIntro = {
      chapter,
      onDone,
      step: 0,
      steps: level && level.id === "1-1"
        ? LEVEL_INTRO_STEPS.map((step) => {
            const mapped = { ...step, text: `${step.speaker === "玩家" ? "玩家" : "牛顿"}：${step.text}` };
            if (step.type === "choice") mapped.question = step.question || step.text;
            return mapped;
          })
        : this.buildGenericSteps(chapter),
    };
    this.refs.expertPortrait.textContent = expert.name.slice(0, 1);
    if (this.newtonAnimator) {
      this.newtonAnimator.setFrame("idle-dress");
    }
    this.refs.expertName.textContent = expert.name;
    this.refs.expertTitle.textContent = expert.title;
    this.refs.expertQuote.textContent = `“${expert.quote}”`;
    this.renderCurrentChapterStep(this.chapterIntro.steps[0]);
    document.getElementById("btn-intro-continue").textContent = "继续";
    document.getElementById("btn-intro-continue").disabled = false;
    document.getElementById("btn-intro-skip").hidden = !Save.isAdmin();
    this.refs.chapterIntroModal.hidden = false;
    requestAnimationFrame(() => this.refs.chapterIntroModal.classList.add("is-open"));
  },

  renderChapterQuiz() {
    const expert = this.chapterIntro.chapter.expert;
    if (this.newtonAnimator) {
      this.newtonAnimator.setFrame("point-sky");
    }
    this.refs.expertContent.innerHTML = `
      <div class="quiz-panel">
        <strong>${expert.quiz.question}</strong>
        ${expert.quiz.options.map((option, index) => `<button type="button" class="quiz-option" data-index="${index}">${option}</button>`).join("")}
      </div>
    `;
    const continueButton = document.getElementById("btn-intro-continue");
    continueButton.textContent = "进入关卡";
    continueButton.disabled = true;
    this.refs.expertContent.querySelectorAll(".quiz-option").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        if (index === expert.quiz.answer) {
          button.classList.add("is-correct");
          this.refs.expertContent.querySelectorAll(".quiz-option").forEach((item) => {
            item.disabled = true;
          });
          continueButton.disabled = false;
        } else {
          button.classList.add("is-wrong");
          button.disabled = true;
        }
      });
    });
  },

  advanceChapterIntro() {
    if (!this.chapterIntro) return;
    this.chapterIntro.step += 1;
    const step = this.chapterIntro.steps[this.chapterIntro.step];
    if (!step) {
      const callback = this.chapterIntro.onDone;
      this.hideChapterIntro();
      this.chapterIntro = null;
      callback && callback();
      return;
    }
    this.refs.expertContent.innerHTML = `<p class="expert-line">${step.text}</p>`;
    if (this.newtonAnimator) {
      this.newtonAnimator.setFrame(step.frame);
    }
    const button = document.getElementById("btn-intro-continue");
    button.textContent = this.chapterIntro.step === this.chapterIntro.steps.length - 1 ? "进入关卡" : "继续";
    this.renderCurrentChapterStep(step);
  },

  renderCurrentChapterStep(step) {
    if (!step) return;
    if (this.newtonAnimator) {
      this.newtonAnimator.setFrame(step.frame);
    }
    const button = document.getElementById("btn-intro-continue");
    button.textContent = this.chapterIntro.step === this.chapterIntro.steps.length - 1 ? "进入关卡" : "继续";
    button.disabled = false;

    if (step.type === "choice") {
      button.disabled = true;
      this.refs.expertContent.innerHTML = `
        <p class="expert-line">${step.text}</p>
        <div class="quiz-panel">
          <strong>${step.question}</strong>
          ${step.options.map((option, index) => `<button type="button" class="quiz-option" data-index="${index}">${option}</button>`).join("")}
        </div>
      `;
      this.refs.expertContent.querySelectorAll(".quiz-option").forEach((option) => {
        option.addEventListener("click", () => {
          const index = Number(option.dataset.index);
          if (step.answer === null || index === step.answer) {
            option.classList.add("is-correct");
            this.refs.expertContent.querySelectorAll(".quiz-option").forEach((item) => item.disabled = true);
            button.disabled = false;
          } else {
            option.classList.add("is-wrong");
            option.disabled = true;
          }
        });
      });
      return;
    }

    if (step.type === "formula") {
      button.disabled = true;
      const formula = step.formula;
      const filled = [];
      this.refs.expertContent.innerHTML = `
        <p class="expert-line">${step.text}</p>
        <div class="formula-bench">
          <div class="formula-line">${formula.slots.map((slot) => `<span class="formula-slot" data-slot="true">${slot}</span>`).join("")}</div>
          <div class="formula-parts">${formula.parts.map((part) => `<button type="button" class="formula-part" data-part="${part}">${part}</button>`).join("")}</div>
        </div>
      `;
      const slots = Array.from(this.refs.expertContent.querySelectorAll(".formula-slot"));
      this.refs.expertContent.querySelectorAll(".formula-part").forEach((partButton) => {
        partButton.addEventListener("click", () => {
          const index = slots.findIndex((slot) => slot.textContent === "__");
          if (index < 0) return;
          slots[index].textContent = partButton.dataset.part;
          filled[index] = partButton.dataset.part;
          partButton.disabled = true;
          const values = formula.slots.map((slot, i) => slots[i].textContent);
          if (values.every((value) => value !== "__")) {
            const answersCopy = [...formula.answers];
            const expected = formula.slots.map((slot) => slot === "__" ? answersCopy.shift() : slot);
            if (values.every((value, i) => value === expected[i])) {
              button.disabled = false;
              UI.showToast("公式成立，法则已铭刻");
            } else {
              UI.showToast("符号位置不对，法则仍在扰动");
              this.refs.expertContent.querySelectorAll(".formula-slot").forEach((slot, i) => slot.textContent = formula.slots[i]);
              this.refs.expertContent.querySelectorAll(".formula-part").forEach((part) => part.disabled = false);
              filled.length = 0;
            }
          }
        });
      });
      return;
    }

    this.refs.expertContent.innerHTML = `<p class="expert-line">${step.text}</p>`;
  },

  hideChapterIntro() {
    this.refs.chapterIntroModal.classList.remove("is-open");
    if (this.newtonAnimator) {
      this.newtonAnimator.setFrame("idle-dress");
    }
    setTimeout(() => {
      this.refs.chapterIntroModal.hidden = true;
    }, 200);
  },

  async openEndPoem() {
    this.endPoemCancelled = false;
    this.refs.endPoemText.textContent = "";
    this.refs.endPoemModal.hidden = false;
    requestAnimationFrame(() => this.refs.endPoemModal.classList.add("is-open"));

    for (const line of END_POEM) {
      if (this.endPoemCancelled) return;
      this.refs.endPoemText.textContent += `—— ${line.speaker}\n`;
      for (const char of line.text) {
        if (this.endPoemCancelled) return;
        this.refs.endPoemText.textContent += char;
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      this.refs.endPoemText.textContent += "\n\n";
      await new Promise((resolve) => setTimeout(resolve, 420));
    }
  },

  hideEndPoem() {
    this.endPoemCancelled = true;
    this.refs.endPoemModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.endPoemModal.hidden = true;
    }, 200);
  },

  updateHud(chapter, level, collected = 0) {
    this.refs.hudLevelName.textContent = level.name;
    this.refs.hudChapterName.textContent = `${chapter.artName}——${chapter.subject}`;
    this.refs.hudShards.textContent = `能量碎片 ${collected}/3`;
    this.renderHearts(10);
    this.renderHotbar();
  },

  renderHearts(hearts) {
    const container = this.refs.hudHearts;
    container.innerHTML = "";
    for (let i = 0; i < 10; i += 1) {
      const heart = document.createElement("span");
      heart.className = `heart${i < hearts ? "" : " empty"}`;
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.3-9.3-8.1C.6 9.9 2 5.9 5.6 5c2.1-.5 4.1.6 6.4 2.9C14.3 5.6 16.3 4.5 18.4 5c3.6.9 5 4.9 2.9 7.9C18.7 16.7 12 21 12 21z"/></svg>';
      container.appendChild(heart);
    }
  },

  renderHotbar() {
    const hotbar = this.refs.hotbar;
    hotbar.innerHTML = "";
    for (let i = 0; i < 6; i += 1) {
      const slot = document.createElement("div");
      slot.className = `hotbar-slot empty${i === 0 ? " selected" : ""}`;
      slot.innerHTML = `<span class="slot-key">${i + 1}</span><span class="slot-icon">·</span>`;
      hotbar.appendChild(slot);
    }
  },

  setGameStatus(text) {
    this.refs.gameStatus.textContent = text;
  },

  setAdminBadges(visible) {
    this.refs.adminBadge.hidden = !visible;
    this.refs.adminBadgeLevels.hidden = !visible;
    this.refs.btnExitAdmin.hidden = !visible;
    this.refs.btnExitAdminLevels.hidden = !visible;
    this.refs.btnAdmin.textContent = visible ? "退出管理员模式" : "管理员模式";
  },

  showToast(message) {
    const toast = this.refs.toast;
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => {
        toast.hidden = true;
      }, 260);
    }, 2400);
  },

  openAdminModal() {
    this.refs.adminModal.hidden = false;
    this.refs.adminError.hidden = true;
    this.refs.adminPassword.value = "";
    requestAnimationFrame(() => this.refs.adminModal.classList.add("is-open"));
    setTimeout(() => this.refs.adminPassword.focus(), 80);
  },

  closeAdminModal() {
    this.refs.adminModal.classList.remove("is-open");
    setTimeout(() => {
      this.refs.adminModal.hidden = true;
    }, 200);
  },

  showCompletion(result) {
    const overlay = this.refs.completionOverlay;
    this.refs.completionLevelName.textContent = result.levelName || "关卡完成";
    this.refs.completionTime.textContent = `${Math.floor(result.time || 0)}s`;
    this.refs.completionDeaths.textContent = String(result.deaths || 0);
    this.refs.completionShards.textContent = `${result.shards || 0}/3`;
    this.renderCompletionStars(result.stars || 0);
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  },

  hideCompletion() {
    const overlay = this.refs.completionOverlay;
    overlay.classList.remove("is-open");
    setTimeout(() => {
      overlay.hidden = true;
    }, 260);
  },

  renderCompletionStars(stars) {
    const container = this.refs.completionStars;
    container.innerHTML = "";
    for (let i = 0; i < 5; i += 1) {
      const star = document.createElement("span");
      star.className = `completion-star${i < stars ? "" : " missed"}`;
      star.style.animationDelay = `${i * 90}ms`;
      star.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.5 5.8 21l1.6-7L2 9.3l7.1-.7z"/></svg>';
      container.appendChild(star);
    }
  },

  showPause(show) {
    this.refs.pauseOverlay.hidden = !show;
    this.refs.pauseOverlay.classList.toggle("is-open", show);
    if (show) {
      this.renderPauseInfo();
    } else {
      this.clearPausePreview();
    }
  },

  renderPauseInfo() {
    const skin = Save.getActiveSkin();
    const character = Save.getActiveCharacter();
    this.refs.pauseSkinName.textContent = `${skin.name} · ${character.name}`;
    this.clearPausePreview();
    this.refs.pauseSkinBox.innerHTML = "";
    const canvas = this.createCharacterPreview(skin);
    this.pausePreview = canvas;
    this.refs.pauseSkinBox.appendChild(canvas);

    const difficulty = DIFFICULTY_MODES.find((mode) => mode.id === Save.data.difficulty) || { label: "未选择" };
    const completedChapters = Save.getCompletedChapterCount();
    const completedLevels = Object.keys(Save.data.completedLevels).length;
    this.refs.pauseUserInfo.innerHTML = `
      <div><span>难度</span><strong>${difficulty.label}</strong></div>
      <div><span>角色</span><strong>${character.name}</strong></div>
      <div><span>章节</span><strong>${completedChapters}/${Save.getVisibleChapterCount()}</strong></div>
      <div><span>通关</span><strong>${completedLevels} 关</strong></div>
      <div><span>能量</span><strong>${Save.getCurrency()}</strong></div>
    `;
  },

  clearPausePreview() {
    if (this.pausePreview) {
      this.characterPreviews = this.characterPreviews.filter((preview) => preview.canvas !== this.pausePreview);
      this.pausePreview = null;
    }
  },

  updateResumeSaveButton() {
    this.refs.btnResumeSave.hidden = !Save.getPausedRun();
  }
};
