const CHARACTERS = [
  {
    id: "bolo",
    name: "波尔",
    title: "均衡型法则特工",
    desc: "全面均衡，适合标准跳跃、推箱与探索。",
    ability: "平衡：移动、跳跃与推箱能力均为标准值。",
    color: "#ff6b57",
    skinIds: ["default", "stardust", "lava"]
  },
  {
    id: "yingying",
    name: "荧荧",
    title: "轻盈型能量精灵",
    desc: "擅长借光与能量行动，在跳跃场景更灵活。",
    ability: "轻盈：跳跃更高，下落更慢，空中控制更好。",
    color: "#8fd3ff",
    skinIds: ["deep", "aurora", "dawn"]
  },
  {
    id: "paopao",
    name: "泡泡",
    title: "亲水型流体特工",
    desc: "为流体与自然环境设计，更适应浮力和水域。",
    ability: "亲水：跳跃略高，整体重力更轻，便于浮空与探索。",
    color: "#2fd6c3",
    skinIds: ["night", "meadow", "candy"]
  }
];

const SKINS = [
  {
    id: "default",
    name: "波尔",
    souvenirId: null,
    image: "assets/sprites/characters/boluo.png",
    sheet: "assets/sprites/characters/boluo.png",
    characterId: "bolo",
    palette: {
      body: "#ff6b57",
      dark: "#c8432f",
      light: "#ff9b85",
      eye: "#ffffff",
      pupil: "#16202b",
      accent: "#ffd166"
    }
  },
  {
    id: "stardust",
    name: "星尘波尔",
    souvenirId: "skin-stardust",
    image: "assets/sprites/characters/stardust.png",
    sheet: "assets/sprites/characters/stardust.png",
    characterId: "bolo",
    palette: {
      body: "#6c5ce7",
      dark: "#3e2f8f",
      light: "#9d8fff",
      eye: "#f4f8ff",
      pupil: "#141b33",
      accent: "#7fd8ff"
    }
  },
  {
    id: "lava",
    name: "熔岩波尔",
    souvenirId: "skin-lava",
    image: "assets/sprites/characters/lava.png",
    sheet: "assets/sprites/characters/lava.png",
    characterId: "bolo",
    palette: {
      body: "#ff8c42",
      dark: "#b23c16",
      light: "#ffb26b",
      eye: "#fff4e2",
      pupil: "#24150d",
      accent: "#ffe066"
    }
  },
  {
    id: "deep",
    name: "深海波尔",
    souvenirId: "skin-deep",
    image: "assets/sprites/characters/deep.png",
    sheet: "assets/sprites/characters/deep.png",
    characterId: "yingying",
    palette: {
      body: "#2fa7c9",
      dark: "#135c78",
      light: "#6fd7ec",
      eye: "#eafcff",
      pupil: "#0a2233",
      accent: "#b9f3ff"
    }
  },
  {
    id: "aurora",
    name: "极光波尔",
    souvenirId: "skin-aurora",
    image: "assets/sprites/characters/aurora.png",
    sheet: "assets/sprites/characters/aurora.png",
    characterId: "yingying",
    palette: {
      body: "#4f6ef7",
      dark: "#27337f",
      light: "#8fb0ff",
      eye: "#f4f8ff",
      pupil: "#141b33",
      accent: "#7fffe0"
    }
  },
  {
    id: "dawn",
    name: "晨曦波尔",
    souvenirId: "skin-dawn",
    image: "assets/sprites/characters/dawn.png",
    sheet: "assets/sprites/characters/dawn.png",
    characterId: "yingying",
    palette: {
      body: "#ffb37a",
      dark: "#b45d31",
      light: "#ffd4a8",
      eye: "#fff7ea",
      pupil: "#2b1a10",
      accent: "#ffe066"
    }
  },
  {
    id: "night",
    name: "夜幕波尔",
    souvenirId: "skin-night",
    image: "assets/sprites/characters/night.png",
    sheet: "assets/sprites/characters/night.png",
    characterId: "paopao",
    palette: {
      body: "#3b4668",
      dark: "#1b2136",
      light: "#7684ad",
      eye: "#eef4ff",
      pupil: "#0d1220",
      accent: "#9be7ff"
    }
  },
  {
    id: "meadow",
    name: "青野波尔",
    souvenirId: "skin-meadow",
    image: "assets/sprites/characters/meadow.png",
    sheet: "assets/sprites/characters/meadow.png",
    characterId: "paopao",
    palette: {
      body: "#5fbf6a",
      dark: "#2f6f3d",
      light: "#93e39a",
      eye: "#f4fff5",
      pupil: "#122417",
      accent: "#ffe066"
    }
  },
  {
    id: "candy",
    name: "糖霜波尔",
    souvenirId: "skin-candy",
    image: "assets/sprites/characters/candy.png",
    sheet: "assets/sprites/characters/candy.png",
    characterId: "paopao",
    palette: {
      body: "#ff8fae",
      dark: "#b84a6b",
      light: "#ffc1d2",
      eye: "#fff8fa",
      pupil: "#2b121c",
      accent: "#fff3a0"
    }
  }
];

const SOUVENIRS = [
  {
    id: "badge",
    name: "波尔徽章",
    desc: "法则修复局新晋特工的第一枚纪念徽章。",
    cost: 3,
    type: "souvenir",
    image: "assets/souvenirs/badge.png",
    icon: "徽"
  },
  {
    id: "pendant",
    name: "法则碎片吊坠",
    desc: "由碎裂的法则核心边角打磨而成。",
    cost: 5,
    type: "souvenir",
    image: "assets/souvenirs/pendant.png",
    icon: "坠"
  },
  {
    id: "bookmark",
    name: "重力森林书签",
    desc: "记录着第一次越过浮空平台的路径。",
    cost: 6,
    type: "souvenir",
    image: "assets/souvenirs/bookmark.png",
    icon: "签"
  },
  {
    id: "sticker",
    name: "萤火贴纸",
    desc: "会发出微弱波动的纪念贴纸。",
    cost: 8,
    type: "souvenir",
    image: "assets/souvenirs/sticker.png",
    icon: "贴"
  },
  {
    id: "ember",
    name: "熵的余烬",
    desc: "从混乱裂隙中带出的一小块不稳定能量。",
    cost: 12,
    type: "souvenir",
    image: "assets/souvenirs/ember.png",
    icon: "烬"
  },
  {
    id: "hourglass",
    name: "时空沙漏",
    desc: "永远缓慢下落的细沙，像相对论留下的纪念。",
    cost: 15,
    type: "souvenir",
    image: "assets/souvenirs/hourglass.png",
    icon: "砂"
  },
  {
    id: "keychain",
    name: "管理员钥匙扣",
    desc: "只有真正穿过所有裂隙的特工才配拥有。",
    cost: 20,
    type: "souvenir",
    image: "assets/souvenirs/keychain.png",
    icon: "钥"
  },
  {
    id: "skin-stardust",
    name: "星尘波尔皮肤",
    desc: "让波尔换上星尘配色。",
    cost: 10,
    type: "skin",
    skinId: "stardust",
    icon: "星"
  },
  {
    id: "skin-lava",
    name: "熔岩波尔皮肤",
    desc: "让波尔换上熔岩配色。",
    cost: 15,
    type: "skin",
    skinId: "lava",
    icon: "焰"
  },
  {
    id: "skin-deep",
    name: "深海波尔皮肤",
    desc: "让波尔换上深海配色。",
    cost: 15,
    type: "skin",
    skinId: "deep",
    icon: "海"
  },
  {
    id: "skin-aurora",
    name: "极光波尔皮肤",
    desc: "让波尔换上极光配色。",
    cost: 18,
    type: "skin",
    skinId: "aurora",
    icon: "极"
  },
  {
    id: "skin-dawn",
    name: "晨曦波尔皮肤",
    desc: "让波尔换上晨曦配色。",
    cost: 18,
    type: "skin",
    skinId: "dawn",
    icon: "曦"
  },
  {
    id: "skin-night",
    name: "夜幕波尔皮肤",
    desc: "让波尔换上夜幕配色。",
    cost: 18,
    type: "skin",
    skinId: "night",
    icon: "夜"
  },
  {
    id: "skin-meadow",
    name: "青野波尔皮肤",
    desc: "让波尔换上青野配色。",
    cost: 18,
    type: "skin",
    skinId: "meadow",
    icon: "野"
  },
  {
    id: "skin-candy",
    name: "糖霜波尔皮肤",
    desc: "让波尔换上糖霜配色。",
    cost: 18,
    type: "skin",
    skinId: "candy",
    icon: "糖"
  }
];

function getSkinById(skinId) {
  return SKINS.find((skin) => skin.id === skinId) || SKINS[0];
}

function getCharacterById(characterId) {
  return CHARACTERS.find((character) => character.id === characterId) || CHARACTERS[0];
}

function getCharacterForSkin(skinId) {
  const skin = getSkinById(skinId);
  return getCharacterById(skin.characterId);
}
