const SERVER_TOKEN_KEY = "physics-server-token";
const SERVER_ACCOUNTS_KEY = "physics-server-accounts";
const SERVER_CACHE_KEY = "physics-server-cache";
const SERVER_NICKNAME_KEY = "physics-server-nickname";
const GUEST_SAVE_KEY = "physics-guest-save-v1";
const ONBOARD_KEY = "physics-onboarded";
const ADMIN_PASSWORD = "HarryLI@20120622";

function normalizeAdminInput(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

const Save = {
  data: null,
  mode: "guest",
  serverToken: null,
  serverNickname: "游客",
  serverPassword: null,
  serverAccounts: {},

  load() {
    this.mode = "guest";
    this.serverToken = null;
    this.serverNickname = "游客";
    this.serverAccounts = {};
    try {
      this.serverAccounts = JSON.parse(localStorage.getItem(SERVER_ACCOUNTS_KEY) || "{}");
    } catch {
      this.serverAccounts = {};
    }

    try {
      const token = localStorage.getItem(SERVER_TOKEN_KEY);
      if (token) {
        const cached = localStorage.getItem(SERVER_CACHE_KEY);
        this.mode = "server";
        this.serverToken = token;
        this.serverNickname = localStorage.getItem(SERVER_NICKNAME_KEY) || "玩家1";
        this.data = Object.assign(this.defaultData(), cached ? JSON.parse(cached) : {});
        return;
      }
    } catch {
      this.mode = "guest";
      this.serverToken = null;
    }

    try {
      const guestRaw = sessionStorage.getItem(GUEST_SAVE_KEY);
      this.data = Object.assign(this.defaultData(), guestRaw ? JSON.parse(guestRaw) : {});
    } catch {
      this.data = this.defaultData();
    }
  },

  defaultData() {
    return {
      difficulty: null,
      difficultyChosen: false,
      backgroundSeen: false,
      adminUnlocked: false,
      completedLevels: {},
      levelRecords: {},
      collectedShards: {},
      collectedFragments: {},
      currency: 0,
      purchasedSouvenirs: [],
      activeSkin: "default",
      equippedSouvenirs: [],
      pausedRun: null,
      lastChapter: 1,
      lastLevel: "1-1"
    };
  },

  save() {
    if (this.mode === "server") {
      try {
        localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(this.data));
        localStorage.setItem(SERVER_NICKNAME_KEY, this.serverNickname);
        this.persistServerAccounts();
      } catch {
        // storage unavailable
      }
      if (this.serverToken && window.Api) {
        Api.saveSave(this.serverToken, this.data).catch(() => {});
      }
      return;
    }

    try {
      sessionStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // storage unavailable
    }
  },

  persistServerAccounts() {
    try {
      localStorage.setItem(SERVER_ACCOUNTS_KEY, JSON.stringify(this.serverAccounts || {}));
    } catch {
      // storage unavailable
    }
  },

  reset() {
    this.data = this.defaultData();
    this.save();
  },

  setServerSession(nickname, token, saveData, password = null) {
    this.mode = "server";
    this.serverToken = token;
    this.serverNickname = nickname;
    this.serverPassword = password;
    this.data = Object.assign(this.defaultData(), saveData || {});
    this.serverAccounts[token] = {
      nickname,
      token,
      saveData: this.data,
      addedAt: Date.now()
    };
    try {
      localStorage.setItem(SERVER_TOKEN_KEY, token);
      localStorage.setItem(SERVER_NICKNAME_KEY, nickname);
      localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(this.data));
      this.persistServerAccounts();
    } catch {
      // storage unavailable
    }
  },

  clearServerSession() {
    if (this.serverToken && this.serverAccounts) {
      delete this.serverAccounts[this.serverToken];
      this.persistServerAccounts();
    }
    this.mode = "guest";
    this.serverToken = null;
    this.serverNickname = "游客";
    this.serverPassword = null;
    this.serverAccounts = this.serverAccounts || {};
    this.data = this.defaultData();
    try {
      localStorage.removeItem(SERVER_TOKEN_KEY);
      localStorage.removeItem(SERVER_NICKNAME_KEY);
      localStorage.removeItem(SERVER_CACHE_KEY);
      sessionStorage.removeItem(GUEST_SAVE_KEY);
    } catch {
      // storage unavailable
    }
  },

  getServerAccounts() {
    return Object.values(this.serverAccounts || {});
  },

  switchServerAccount(token) {
    const account = this.serverAccounts[token];
    if (!account) return false;
    this.mode = "server";
    this.serverToken = account.token;
    this.serverNickname = account.nickname;
    this.data = Object.assign(this.defaultData(), account.saveData || {});
    try {
      localStorage.setItem(SERVER_TOKEN_KEY, account.token);
      localStorage.setItem(SERVER_NICKNAME_KEY, account.nickname);
      localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(this.data));
    } catch {
      // storage unavailable
    }
    return true;
  },

  isGuest() {
    return this.mode !== "server";
  },

  getAccountName() {
    return this.isGuest() ? "游客" : this.serverNickname || "玩家1";
  },

  getActiveAccountId() {
    return this.isGuest() ? "guest" : this.serverToken || "guest";
  },

  renameActiveAccount(name) {
    const normalized = String(name || "").trim().slice(0, 16) || "玩家1";
    this.serverNickname = normalized;
    if (this.serverToken && this.serverAccounts[this.serverToken]) {
      this.serverAccounts[this.serverToken].nickname = normalized;
      this.persistServerAccounts();
    }
    this.save();
    return normalized;
  },

  hasOnboarded() {
    try {
      return sessionStorage.getItem(ONBOARD_KEY) === "1";
    } catch {
      return false;
    }
  },

  setOnboarded() {
    try {
      sessionStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      // storage unavailable
    }
  },

  clearOnboarded() {
    try {
      sessionStorage.removeItem(ONBOARD_KEY);
    } catch {
      // storage unavailable
    }
  },

  setDifficulty(difficultyId, chosen = false) {
    if (DIFFICULTY_MODES.some((mode) => mode.id === difficultyId)) {
      this.data.difficulty = difficultyId;
      if (chosen) {
        this.data.difficultyChosen = true;
      }
      this.save();
    }
  },

  isDifficultyLocked() {
    return Boolean(this.data.difficultyChosen);
  },

  isAdmin() {
    return Boolean(this.data && this.data.adminUnlocked);
  },

  unlockAdmin(password) {
    const ok = normalizeAdminInput(password) === normalizeAdminInput(ADMIN_PASSWORD);
    if (ok) {
      this.data.adminUnlocked = true;
      this.save();
    }
    return ok;
  },

  disableAdmin() {
    this.data.adminUnlocked = false;
    this.save();
  },

  getVisibleChapters() {
    if (this.isAdmin()) return CHAPTERS;
    if (this.data.difficulty === "simple") {
      return CHAPTERS.filter((chapter) => chapter.id <= 9);
    }
    return CHAPTERS;
  },

  getVisibleChapterCount() {
    return this.getVisibleChapters().length;
  },

  isLevelCompleted(levelId) {
    return Boolean(this.data.completedLevels[levelId]);
  },

  completeLevel(levelId) {
    this.data.completedLevels[levelId] = true;
    this.save();
  },

  recordLevelResult(levelId, result) {
    this.data.levelRecords[levelId] = {
      deaths: Number(result.deaths) || 0,
      elapsed: Number(result.elapsed) || 0,
      shards: Number(result.collected) || 0,
      fragment: Boolean(result.fragmentFound),
      parTime: Number(result.parTime) || 300,
      width: Number(result.width) || 1800
    };
    this.save();
  },

  getLevelRecord(levelId) {
    return this.data.levelRecords[levelId] || null;
  },

  getStarCount(levelId) {
    if (!this.isLevelCompleted(levelId)) return 0;
    const record = this.getLevelRecord(levelId);
    if (!record) return 1;

    let stars = 1;
    if (record.shards >= 3) stars += 1;
    if (record.deaths <= 3) stars += 1;
    if (record.fragment) stars += 1;
    if (record.elapsed <= record.parTime) stars += 1;
    return Math.min(5, stars);
  },

  getEstimatedTime(levelId) {
    const record = this.getLevelRecord(levelId);
    const width = record && record.width ? record.width : 1800;
    const baseTime = Math.max(120, Math.round(width / 8));
    const records = Object.values(this.data.levelRecords);

    if (records.length < 5) {
      return Math.max(240, Math.round(width / 6));
    }

    const averageRatio = records.reduce((sum, item) => {
      const par = Number(item.parTime) || baseTime;
      return sum + (Number(item.elapsed) || 0) / par;
    }, 0) / records.length;

    return Math.round(baseTime * Math.max(0.8, Math.min(2.2, averageRatio)));
  },

  isChapterCompleted(chapter) {
    return chapter.levels.every((level) => this.isLevelCompleted(level.id));
  },

  isChapterUnlocked(chapter) {
    if (this.isAdmin()) return true;
    if (chapter.id === 1) return true;

    const previousIndex = CHAPTERS.findIndex((item) => item.id === chapter.id) - 1;
    if (previousIndex < 0) return false;

    const previousChapter = CHAPTERS[previousIndex];
    const bossLevel = previousChapter.levels[previousChapter.levels.length - 1];
    return this.isLevelCompleted(bossLevel.id);
  },

  isFinalUnlocked() {
    if (this.isAdmin()) return true;
    const relativity = CHAPTERS.find((chapter) => chapter.id === 13);
    return Boolean(relativity) && this.isChapterCompleted(relativity);
  },

  isLevelUnlocked(chapter, level) {
    if (this.isAdmin()) return true;
    if (this.data.difficulty === "hell" && level.role === "教学关") return false;
    if (chapter.id === FINAL_CHAPTER.id) {
      return this.isFinalUnlocked();
    }
    if (!this.isChapterUnlocked(chapter)) return false;

    const index = chapter.levels.findIndex((item) => item.id === level.id);
    if (index <= 0) return true;

    const previousLevel = chapter.levels[index - 1];
    return this.isLevelCompleted(previousLevel.id);
  },

  getCompletedChapterCount() {
    return CHAPTERS.filter((chapter) => this.isChapterCompleted(chapter)).length;
  },

  getCompletedLevelCount() {
    return Object.keys(this.data.completedLevels).length;
  },

  getShardCount(levelId) {
    const record = this.data.collectedShards[levelId];
    return record ? record.count : 0;
  },

  recordShards(levelId, count) {
    this.data.collectedShards[levelId] = {
      count: Math.max(0, Math.min(3, count))
    };
    this.save();
  },

  recordFragment(levelId, found) {
    this.data.collectedFragments[levelId] = Boolean(found);
    this.save();
  },

  hasFragment(levelId) {
    return Boolean(this.data.collectedFragments[levelId]);
  },

  addCurrency(amount) {
    this.data.currency += Math.max(0, Math.floor(Number(amount) || 0));
    this.save();
  },

  getCurrency() {
    return Number(this.data.currency) || 0;
  },

  isSouvenirOwned(souvenirId) {
    return Array.isArray(this.data.purchasedSouvenirs) && this.data.purchasedSouvenirs.includes(souvenirId);
  },

  purchaseSouvenir(souvenirId) {
    const souvenir = SOUVENIRS.find((item) => item.id === souvenirId);
    if (!souvenir || this.isSouvenirOwned(souvenirId)) return false;
    if (this.getCurrency() < souvenir.cost) return false;

    this.data.currency -= souvenir.cost;
    this.data.purchasedSouvenirs.push(souvenirId);
    if (souvenir.type === "skin" && souvenir.skinId) {
      this.setActiveSkin(souvenir.skinId);
    }
    this.save();
    return true;
  },

  setActiveSkin(skinId) {
    if (SKINS.some((skin) => skin.id === skinId)) {
      this.data.activeSkin = skinId;
      this.save();
    }
  },

  getActiveSkin() {
    return getSkinById(this.data.activeSkin);
  },

  getActiveCharacter() {
    return getCharacterForSkin(this.data.activeSkin);
  },

  isSkinOwned(skinId) {
    if (skinId === "default") return true;
    const skin = getSkinById(skinId);
    if (!skin || !skin.souvenirId) return false;
    return this.isSouvenirOwned(skin.souvenirId);
  },

  isSouvenirEquipped(souvenirId) {
    return Array.isArray(this.data.equippedSouvenirs) && this.data.equippedSouvenirs.includes(souvenirId);
  },

  toggleEquippedSouvenir(souvenirId) {
    if (!this.isSouvenirOwned(souvenirId)) return false;
    const equipped = Array.isArray(this.data.equippedSouvenirs) ? this.data.equippedSouvenirs.slice() : [];
    const index = equipped.indexOf(souvenirId);
    if (index >= 0) {
      equipped.splice(index, 1);
    } else {
      if (equipped.length >= 3) return false;
      equipped.push(souvenirId);
    }
    this.data.equippedSouvenirs = equipped;
    this.save();
    return true;
  },

  setPausedRun(run) {
    this.data.pausedRun = run;
    this.save();
  },

  getPausedRun() {
    return this.data.pausedRun || null;
  },

  clearPausedRun() {
    this.data.pausedRun = null;
    this.save();
  }
};
