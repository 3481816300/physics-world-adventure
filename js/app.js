const App = {
  screen: "title",
  currentChapter: null,
  currentLevel: null,
  currentIsFinal: false,
  paused: false,
  runtime: null,
  ambient: null,
  lastTime: 0,

  init() {
    Save.load();
    Input.init();
    UI.init();
    this.bindEvents();

    this.ambient = new AmbientBackground(UI.refs.ambientCanvas);
    this.runtime = new LevelRuntime(UI.refs.gameCanvas, {
      onToast: (message) => UI.showToast(message),
      onHearts: (hearts) => UI.renderHearts(hearts),
      onDeaths: (deaths) => {
        UI.setGameStatus(`死亡 ${deaths} 次，已返回检查点`);
      },
      onCollect: (count) => {
        UI.refs.hudShards.textContent = `${count}/3`;
        if (this.currentLevel) {
          Save.recordShards(this.currentLevel.id, count);
        }
      },
      onFragment: () => {
        if (this.currentLevel) {
          Save.recordFragment(this.currentLevel.id, true);
          UI.showToast("发现隐藏法则残片");
        }
      },
      onBossDefeated: () => {
        UI.showToast("Boss 已击败，法则核心已可稳定");
      },
      onQuestion: (gate) => UI.openKnowledgeQuestion(gate),
      onQuestionAnswered: (correct) => {
        if (!correct) return;
      },
      onComplete: (result) => {
        if (this.currentLevel) {
          Save.completeLevel(this.currentLevel.id);
          Save.addCurrency(1 + (result.collected || 0) + (result.fragmentFound ? 2 : 0));
          const parTime = this.runtime.level
            ? Math.max(120, Math.round(this.runtime.level.width / 8))
            : 300;
          Save.recordLevelResult(this.currentLevel.id, {
            deaths: result.deaths,
            elapsed: result.elapsed,
            collected: result.collected,
            fragmentFound: result.fragmentFound,
            parTime,
            width: this.runtime.level ? this.runtime.level.width : 1800
          });
          const stars = Save.getStarCount(this.currentLevel.id);
          UI.showToast("法则核心已稳定");
          UI.setGameStatus("已稳定，可返回关卡列表");
          this.completionTimer = setTimeout(() => {
            UI.showCompletion({
              levelName: this.currentLevel.name,
              time: result.elapsed,
              deaths: result.deaths,
              shards: result.collected,
              stars
            });
          }, 1100);
        }
      }
    });

    this.resizeAmbient();
    window.addEventListener("resize", () => this.resizeAmbient());
    this.showTitle();
    this.maybeShowNextRequiredModal();

    if (!Save.isGuest()) {
      Api.loadSave(Save.serverToken)
        .then((data) => {
          Save.data = Object.assign(Save.data, data.saveData || {});
          UI.renderDifficultySelector();
          UI.updateResumeSaveButton();
          UI.updateAccountButton();
        })
        .catch(() => {
          Save.clearServerSession();
          UI.openOnboarding();
        });
    }

    const initialHash = window.location.hash.replace("#", "");
    if (initialHash === "chapters") {
      this.showChapters();
    } else if (initialHash === "shop") {
      this.openShop();
    } else if (initialHash === "characters") {
      this.openCharacters();
    } else if (initialHash.startsWith("level=")) {
      const key = initialHash.slice("level=".length);
      const [chapterId, levelId] = key.split(":");
      if (chapterId === "final") {
        this.startLevel("final", levelId, true);
      } else {
        const chapter = getChapterById(Number(chapterId));
        if (chapter) {
          this.startLevel(chapter.id, levelId, false);
        }
      }
    }

    requestAnimationFrame((time) => this.loop(time));
  },

  bindEvents() {
    document.getElementById("btn-start").addEventListener("click", () => this.showChapters());
    document.getElementById("btn-howto").addEventListener("click", () => {
      UI.show("howto");
      this.screen = "howto";
      Input.gameActive = false;
    });
    document.getElementById("btn-howto-back").addEventListener("click", () => this.showTitle());
    document.getElementById("btn-shop").addEventListener("click", () => this.openShop());
    document.getElementById("btn-shop-back").addEventListener("click", () => this.showTitle());
    document.getElementById("btn-characters").addEventListener("click", () => this.openCharacters());
    document.getElementById("btn-characters-back").addEventListener("click", () => this.showTitle());
    document.getElementById("btn-account").addEventListener("click", () => this.openAccount());
    document.getElementById("btn-account-back").addEventListener("click", () => this.showTitle());
    document.getElementById("btn-onboard-login").addEventListener("click", () => UI.openLogin());
    document.getElementById("btn-onboard-contact").addEventListener("click", () => UI.openPurchase());
    document.getElementById("btn-onboard-guest").addEventListener("click", () => this.enterGuest());
    document.getElementById("btn-random-name").addEventListener("click", () => this.refreshRandomName());
    document.getElementById("btn-register-submit").addEventListener("click", () => this.registerAccount());
    document.getElementById("btn-register-cancel").addEventListener("click", () => UI.hideRegister());
    document.getElementById("btn-login-submit").addEventListener("click", () => this.loginAccount());
    document.getElementById("btn-login-cancel").addEventListener("click", () => UI.hideLogin());
    document.getElementById("btn-password-submit").addEventListener("click", () => this.changePassword());
    document.getElementById("btn-password-cancel").addEventListener("click", () => UI.hidePasswordModal());
    document.getElementById("btn-login-to-contact").addEventListener("click", () => {
      UI.hideLogin();
      UI.openPurchase();
    });
    document.getElementById("btn-contact-close").addEventListener("click", () => UI.hideContact());
    document.getElementById("btn-purchase-close").addEventListener("click", () => UI.hidePurchase());
    document.getElementById("btn-purchase-contact").addEventListener("click", () => {
      UI.hidePurchase();
      UI.openContact();
    });
    document.getElementById("btn-open-redeem").addEventListener("click", () => UI.openRedeem());
    document.getElementById("btn-redeem-submit").addEventListener("click", () => this.redeemCode());
    document.getElementById("btn-redeem-cancel").addEventListener("click", () => UI.hideRedeem());
    document.getElementById("redeemCode").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.redeemCode();
      }
    });
    document.getElementById("btn-redeem-batch-submit").addEventListener("click", () => this.generateRedeemCodes());
    document.getElementById("btn-redeem-batch-close").addEventListener("click", () => UI.hideRedeemBatch());
    document.getElementById("btn-support-close").addEventListener("click", () => UI.hideDevSupport());
    document.getElementById("btn-background-continue").addEventListener("click", () => this.finishBackground());
    document.getElementById("btn-background-skip").addEventListener("click", () => this.finishBackground());
    document.getElementById("btn-intro-continue").addEventListener("click", () => this.continueChapterIntro());
    document.getElementById("btn-intro-skip").addEventListener("click", () => this.skipChapterIntro());
    document.getElementById("btn-poem-continue").addEventListener("click", () => this.finishEndPoem());
    document.getElementById("btn-poem-skip").addEventListener("click", () => this.finishEndPoem());
    document.getElementById("btn-chapters-back").addEventListener("click", () => this.showTitle());
    document.getElementById("btn-levels-back").addEventListener("click", () => this.showChapters());
    document.getElementById("btn-game-back").addEventListener("click", () => this.leaveLevel());
    document.getElementById("btn-pause").addEventListener("click", () => this.togglePause());
    document.getElementById("btn-resume").addEventListener("click", () => this.togglePause());
    document.getElementById("btn-pause-save").addEventListener("click", () => this.saveAndReturnMenu());
    document.getElementById("btn-resume-save").addEventListener("click", () => this.resumePausedLevel());
    document.getElementById("btn-restart").addEventListener("click", () => this.restartLevel());
    document.getElementById("btn-leave-level").addEventListener("click", () => {
      this.paused = false;
      UI.showPause(false);
      this.leaveLevel();
    });
    document.getElementById("btn-completion-restart").addEventListener("click", () => {
      UI.hideCompletion();
      this.restartLevel();
    });
    document.getElementById("btn-completion-back").addEventListener("click", () => {
      UI.hideCompletion();
      if (this.currentIsFinal || (this.currentChapter && this.currentChapter.id === 13)) {
        this.showEndPoem();
      } else {
        this.leaveLevel();
      }
    });
    document.getElementById("btn-admin").addEventListener("click", () => {
      if (Save.isAdmin()) {
        this.exitAdmin();
      } else {
        UI.openAdminModal();
      }
    });
    document.getElementById("btn-exit-admin").addEventListener("click", () => this.exitAdmin());
    document.getElementById("btn-exit-admin-levels").addEventListener("click", () => this.exitAdmin());
    document.getElementById("btn-clear-save").addEventListener("click", () => this.clearSave());
    document.getElementById("btn-admin-ok").addEventListener("click", () => this.verifyAdmin());
    document.getElementById("btn-admin-cancel").addEventListener("click", () => UI.closeAdminModal());
    document.getElementById("adminPassword").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.verifyAdmin();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (this.screen === "game" && !this.paused && (event.code === "Escape" || event.code === "KeyP")) {
        this.togglePause();
      }
      if (UI.refs.knowledgeModal && !UI.refs.knowledgeModal.hidden) {
        const index = ["1", "2", "3"].indexOf(event.key);
        if (index >= 0) {
          event.preventDefault();
          this.answerKnowledge(index);
        }
      }
    });
  },

  resizeAmbient() {
    const canvas = UI.refs.ambientCanvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (this.ambient) {
      this.ambient.width = canvas.width;
      this.ambient.height = canvas.height;
      this.ambient.init();
    }
  },

  showTitle() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    this.screen = "title";
    UI.show("title");
    UI.renderDifficultySelector();
    UI.setAdminBadges(Save.isAdmin());
    UI.updateResumeSaveButton();
    UI.updateAccountButton();
    Input.gameActive = false;
    this.paused = false;
    UI.showPause(false);
  },

  showChapters() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    this.screen = "chapters";
    UI.show("chapters");
    UI.renderChapters();
    Input.gameActive = false;
  },

  openLevels(chapterId, isFinal = false) {
    this.clearCompletionTimer();
    UI.hideCompletion();
    const chapter = isFinal ? FINAL_CHAPTER : getChapterById(chapterId);
    if (!chapter) return;
    this.finishOpenLevels(chapter, isFinal);
  },

  finishOpenLevels(chapter, isFinal = false) {
    this.screen = "levels";
    UI.show("levels");
    UI.renderLevels(chapter, isFinal);
    Input.gameActive = false;
  },

  openShop() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    this.screen = "shop";
    UI.show("shop");
    UI.renderShop();
    UI.setAdminBadges(Save.isAdmin());
    Input.gameActive = false;
  },

  buySouvenir(souvenirId) {
    const souvenir = SOUVENIRS.find((item) => item.id === souvenirId);
    if (!souvenir) return;
    if (Save.purchaseSouvenir(souvenirId)) {
      UI.renderShop();
      UI.showToast(souvenir.type === "skin" ? `已装备 ${souvenir.name}` : `已收藏 ${souvenir.name}`);
    } else {
      UI.showToast("法则能量不足或已拥有");
    }
  },

  openCharacters() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    this.screen = "characters";
    UI.show("characters");
    UI.renderCharacters();
    UI.setAdminBadges(Save.isAdmin());
    Input.gameActive = false;
  },

  openAccount() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    this.screen = "account";
    UI.show("account");
    UI.renderAccount();
    UI.setAdminBadges(Save.isAdmin());
    Input.gameActive = false;
  },

  switchServerAccount(token) {
    if (!Save.switchServerAccount(token)) return;
    UI.updateAccountButton();
    UI.renderDifficultySelector();
    UI.updateResumeSaveButton();
    UI.showToast(`已切换到 ${Save.getAccountName()}`);
    this.showTitle();
    this.maybeShowNextRequiredModal();
  },

  enterGuest() {
    Save.setOnboarded();
    UI.hideOnboarding();
    UI.updateAccountButton();
    UI.showToast("已进入游客模式，进度不会保存");
    this.showTitle();
    this.maybeShowNextRequiredModal();
  },

  refreshRandomName() {
    Api.getRandomName()
      .then((data) => {
        UI.refs.registerNickname.value = data.nickname || "";
      })
      .catch((error) => UI.showToast(error.message));
  },

  registerAccount() {
    const nickname = UI.refs.registerNickname.value.trim();
    const password = UI.refs.registerPassword.value;
    const confirm = UI.refs.registerPasswordConfirm.value;
    if (!nickname || password.length < 4) {
      UI.refs.registerError.textContent = "昵称不能为空，密码至少 4 位";
      UI.refs.registerError.hidden = false;
      return;
    }
    if (password !== confirm) {
      UI.refs.registerError.textContent = "两次密码不一致";
      UI.refs.registerError.hidden = false;
      return;
    }
    Api.register(nickname, password)
      .then((data) => {
        Save.setServerSession(data.nickname, data.token, data.saveData, password);
        Save.setOnboarded();
        UI.hideRegister();
        UI.hideOnboarding();
        UI.updateAccountButton();
        UI.renderDifficultySelector();
        UI.showToast(`注册成功，欢迎 ${data.nickname}`);
        this.showTitle();
        this.maybeShowNextRequiredModal();
      })
      .catch((error) => {
        UI.refs.registerError.textContent = error.message;
        UI.refs.registerError.hidden = false;
      });
  },

  loginAccount() {
    const nickname = UI.refs.loginNickname.value.trim();
    const password = UI.refs.loginPassword.value;
    Api.login(nickname, password)
      .then((data) => {
        Save.setServerSession(data.nickname, data.token, data.saveData, password);
        Save.setOnboarded();
        UI.hideLogin();
        UI.hideOnboarding();
        UI.updateAccountButton();
        UI.renderDifficultySelector();
        UI.showToast(`登录成功，欢迎 ${data.nickname}`);
        this.showTitle();
        this.maybeShowNextRequiredModal();
      })
      .catch((error) => {
        UI.refs.loginError.textContent = error.message;
        UI.refs.loginError.hidden = false;
      });
  },

  logoutAccount() {
    if (Save.serverToken) {
      Api.logout(Save.serverToken).catch(() => {});
    }
    Save.clearServerSession();
    Save.setOnboarded();
    UI.updateAccountButton();
    UI.renderDifficultySelector();
    UI.showToast("已退出登录，进入游客模式");
    this.showTitle();
  },

  switchAccount() {
    if (Save.serverToken) {
      Api.logout(Save.serverToken).catch(() => {});
    }
    Save.clearServerSession();
    Save.setOnboarded();
    UI.updateAccountButton();
    UI.renderDifficultySelector();
    UI.showToast("请登录其他账号");
    UI.openLogin();
    this.showTitle();
  },

  async changePassword() {
    if (Save.isGuest()) return;
    const oldPassword = UI.refs.passwordOld.value;
    const newPassword = UI.refs.passwordNew.value;
    const confirmPassword = UI.refs.passwordConfirm.value;
    const message = UI.refs.passwordModalError;
    if (!newPassword || newPassword.length < 4) {
      message.textContent = "新密码至少 4 位";
      message.hidden = false;
      return;
    }
    if (newPassword !== confirmPassword) {
      message.textContent = "两次新密码不一致";
      message.hidden = false;
      return;
    }
    try {
      await Api.changePassword(Save.serverToken, oldPassword, newPassword);
      Save.serverPassword = newPassword;
      UI.hidePasswordModal();
      UI.showToast("密码已修改");
      UI.renderAccount();
    } catch (error) {
      message.textContent = error.message;
      message.hidden = false;
    }
  },

  viewPassword() {
    if (Save.serverPassword) {
      UI.showToast(`当前密码：${Save.serverPassword}`);
    } else {
      UI.showToast("本会话未记录密码，请重新登录后查看");
    }
  },

  togglePremium() {
    if (!Save.isAdmin()) return;
    const next = !Save.data.premium;
    Save.setPremium(next, 12);
    UI.renderAccount();
    UI.showToast(next ? "已标记为付费用户" : "已撤销付费标记");
  },

  async redeemCode() {
    if (Save.isGuest()) {
      UI.hideRedeem();
      UI.openLogin();
      return;
    }
    const code = UI.refs.redeemCode.value.trim();
    const error = UI.refs.redeemError;
    if (!code) {
      error.textContent = "请输入兑换码";
      error.hidden = false;
      return;
    }

    const button = document.getElementById("btn-redeem-submit");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "验证中";
    try {
      const result = await Api.redeem(Save.serverToken, code);
      Save.applyPremium(result.premium_until || result.premiumUntil);
      UI.hideRedeem();
      UI.renderAccount();
      UI.showToast("兑换成功，完整版已解锁");
      if (this.screen === "chapters") {
        UI.renderChapters();
      }
      if (this.screen === "levels" && this.currentChapter) {
        UI.renderLevels(this.currentChapter, this.currentIsFinal);
      }
    } catch (err) {
      error.textContent = err.message || "兑换失败，请稍后再试";
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  },

  openRedeemBatch() {
    if (!Save.isAdmin()) return;
    UI.openRedeemBatch();
  },

  async generateRedeemCodes() {
    if (!Save.isAdmin()) return;
    const count = Math.min(50, Math.max(1, Number(UI.refs.redeemBatchCount.value) || 1));
    const error = UI.refs.redeemBatchError;
    const result = UI.refs.redeemBatchResult;
    const button = document.getElementById("btn-redeem-batch-submit");
    button.disabled = true;
    button.textContent = "生成中";
    try {
      const data = await Api.createRedeemCodes(count);
      const codes = Array.isArray(data.codes) ? data.codes : [];
      result.value = codes.join("\n");
      error.hidden = true;
      UI.showToast(`已生成 ${codes.length} 个兑换码`);
    } catch (err) {
      error.textContent = err.message || "生成失败";
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = "生成";
    }
  },

  async renameAccount(name) {
    if (Save.isGuest()) return;
    try {
      const data = await Api.rename(Save.serverToken, name);
      Save.renameActiveAccount(data.nickname);
      UI.renderAccount();
      UI.updateAccountButton();
      UI.showToast(`昵称已修改为 ${data.nickname}`);
    } catch (error) {
      UI.showToast(error.message);
    }
  },

  equipSkin(skinId) {
    if (!Save.isSkinOwned(skinId)) return;
    Save.setActiveSkin(skinId);
    UI.renderCharacters();
    const skin = getSkinById(skinId);
    UI.showToast(`已装备 ${skin.name}`);
  },

  toggleEquippedSouvenir(souvenirId) {
    const souvenir = SOUVENIRS.find((item) => item.id === souvenirId);
    if (!souvenir) return;
    const result = Save.toggleEquippedSouvenir(souvenirId);
    UI.renderCharacters();
    if (result) {
      UI.showToast(Save.isSouvenirEquipped(souvenirId) ? `已携带 ${souvenir.name}` : `已取下 ${souvenir.name}`);
    } else {
      UI.showToast("最多只能携带 3 个纪念品");
    }
  },

  maybeShowNextRequiredModal() {
    if (Save.isGuest() && !Save.hasOnboarded()) {
      UI.openOnboarding();
      return;
    }
    if (!Save.data.backgroundSeen) {
      UI.openBackground();
      return;
    }
    if (!Save.isDifficultyLocked()) {
      UI.openFirstRun();
    }
  },

  finishBackground() {
    Save.data.backgroundSeen = true;
    Save.save();
    UI.hideBackground();
    this.maybeShowNextRequiredModal();
  },

  continueChapterIntro() {
    if (!UI.chapterIntro) return;
    UI.advanceChapterIntro();
  },

  skipChapterIntro() {
    if (this.runtime) this.runtime.finishIntro();
  },

  finishEndPoem() {
    UI.hideEndPoem();
    this.showTitle();
  },

  showEndPoem() {
    UI.openEndPoem();
  },

  confirmFirstRun(difficultyId) {
    Save.setDifficulty(difficultyId, true);
    UI.hideFirstRun();
    UI.renderDifficultySelector();
    const mode = DIFFICULTY_MODES.find((item) => item.id === difficultyId);
    UI.showToast(`已选择${mode ? mode.label : difficultyId}，难度已锁定`);
  },

  startLevel(chapterId, levelId, isFinal = false) {
    this.clearCompletionTimer();
    UI.hideCompletion();
    const chapter = isFinal ? FINAL_CHAPTER : getChapterById(chapterId);
    if (!chapter) return;
    const level = chapter.levels.find((item) => item.id === levelId);
    if (!level) return;

    this.currentChapter = chapter;
    this.currentLevel = level;
    this.currentIsFinal = isFinal;
    this.paused = false;

    this.screen = "game";
    UI.show("game");
    UI.setAdminBadges(Save.isAdmin());
    UI.showPause(false);
    this.runtime.startIntro(chapter, level, getChapterIntroSteps(chapter, level), () => this.finishStartLevel(chapter, level));
  },

  finishStartLevel(chapter, level) {
    UI.updateHud(chapter, level, 0);
    UI.setGameStatus("已进入法则碎片，抵达法则核心即可稳定");
    this.runtime.load(chapter, level);
    Input.gameActive = true;
  },

  restartLevel() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    if (!this.currentChapter || !this.currentLevel) return;
    this.paused = false;
    UI.showPause(false);
    if (this.runtime && this.runtime.intro) {
      this.runtime.startIntro(
        this.currentChapter,
        this.currentLevel,
        getChapterIntroSteps(this.currentChapter, this.currentLevel),
        () => this.finishStartLevel(this.currentChapter, this.currentLevel)
      );
      UI.updateHud(this.currentChapter, this.currentLevel, 0);
      UI.setGameStatus("已重置到关卡起点");
      Input.gameActive = false;
      return;
    }
    this.runtime.load(this.currentChapter, this.currentLevel);
    UI.updateHud(this.currentChapter, this.currentLevel, 0);
    UI.setGameStatus("已重置到关卡起点");
    this.paused = false;
    UI.showPause(false);
    Input.gameActive = true;
  },

  leaveLevel() {
    this.clearCompletionTimer();
    UI.hideCompletion();
    this.runtime.dispose();
    Input.gameActive = false;
    this.paused = false;
    UI.showPause(false);

    if (this.currentIsFinal) {
      this.showChapters();
    } else if (this.currentChapter) {
      UI.show("levels");
      UI.renderLevels(this.currentChapter, false);
      this.screen = "levels";
    } else {
      this.showChapters();
    }
  },

  clearCompletionTimer() {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  },

  togglePause() {
    if (this.screen !== "game") return;
    this.paused = !this.paused;
    UI.showPause(this.paused);
    Input.gameActive = !this.paused;
  },

  answerKnowledge(index) {
    if (!this.runtime || !this.runtime.answerQuestion) return;
    const gate = this.runtime.activeQuestion;
    if (!gate) return;
    const correct = this.runtime.answerQuestion(index);
    if (correct) {
      UI.markKnowledgeAnswer(index, true);
      UI.lockKnowledgeOptions();
      setTimeout(() => UI.closeKnowledgeQuestion(), 900);
    } else {
      UI.markKnowledgeAnswer(index, false);
      if (this.runtime.dying) {
        UI.lockKnowledgeOptions();
        setTimeout(() => UI.closeKnowledgeQuestion(), 900);
      } else {
        const selected = UI.refs.knowledgeOptions.children[index];
        if (selected) selected.disabled = true;
      }
    }
  },

  saveAndReturnMenu() {
    if (!this.currentChapter || !this.currentLevel || !this.runtime || !this.runtime.player) return;
    Save.setPausedRun({
      chapterId: this.currentChapter.id,
      levelId: this.currentLevel.id,
      isFinal: this.currentIsFinal,
      checkpoint: this.runtime.currentCheckpoint,
      collected: this.runtime.collected,
      fragmentFound: this.runtime.fragmentFound,
      deaths: this.runtime.deaths,
      elapsed: this.runtime.elapsed
    });
    this.paused = false;
    UI.showPause(false);
    this.runtime.dispose();
    Input.gameActive = false;
    UI.updateResumeSaveButton();
    UI.showToast("已暂存本关进度");
    this.showTitle();
  },

  resumePausedLevel() {
    const run = Save.getPausedRun();
    if (!run) return;
    Save.clearPausedRun();
    UI.updateResumeSaveButton();

    if (run.isFinal) {
      this.startLevel("final", run.levelId, true);
    } else {
      const chapter = getChapterById(Number(run.chapterId));
      if (!chapter) return;
      this.startLevel(chapter.id, run.levelId, false);
    }

    this.runtime.restoreRun(run);
    if (this.currentChapter && this.currentLevel) {
      UI.updateHud(this.currentChapter, this.currentLevel, run.collected || 0);
    }
    UI.showToast("已继续暂存进度");
  },

  verifyAdmin() {
    const password = document.getElementById("adminPassword").value;
    if (Save.unlockAdmin(password)) {
      UI.closeAdminModal();
      UI.setAdminBadges(true);
      UI.showToast("管理员模式已开启，全部章节和关卡已解锁");
      if (this.screen === "chapters") {
        UI.renderChapters();
      }
      return;
    }

    const error = document.getElementById("adminError");
    error.hidden = false;
    document.getElementById("adminPassword").select();
    UI.showToast("密码不正确");
  },

  setDifficulty(difficultyId) {
    if (Save.isDifficultyLocked()) {
      UI.showToast("难度已锁定，清空记录后可重新选择");
      return;
    }
    Save.setDifficulty(difficultyId);
    UI.renderDifficultySelector();
    const label = DIFFICULTY_MODES.find((mode) => mode.id === difficultyId);
    UI.showToast(`已选择${label ? label.label : difficultyId}`);
  },

  exitAdmin() {
    Save.disableAdmin();
    UI.setAdminBadges(false);
    UI.renderDifficultySelector();
    UI.showToast("已退出管理员模式");
    if (this.screen === "chapters" || this.screen === "levels") {
      this.showChapters();
    }
  },

  clearSave() {
    if (!this.confirmClear) {
      this.confirmClear = true;
      UI.showToast("再次点击“清空记录”确认清空");
      clearTimeout(this.clearSaveTimer);
      this.clearSaveTimer = setTimeout(() => {
        this.confirmClear = false;
      }, 3000);
      return;
    }

    this.confirmClear = false;
    clearTimeout(this.clearSaveTimer);
    Save.reset();
    UI.renderDifficultySelector();
    UI.setAdminBadges(false);
    UI.showToast("游玩记录已清空");
    this.showTitle();
    this.maybeShowNextRequiredModal();
  },

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.05);
    this.lastTime = time;

    if (this.ambient) {
      this.ambient.update(dt);
      this.ambient.render();
    }
    UI.animateCharacterPreviews(dt);

    if (this.screen === "game" && !this.paused && this.runtime && (this.runtime.player || this.runtime.intro)) {
      this.runtime.update(dt, Input);
      this.runtime.render();
    }

    Input.endFrame();
    requestAnimationFrame((next) => this.loop(next));
  }
};

window.addEventListener("DOMContentLoaded", () => App.init());
