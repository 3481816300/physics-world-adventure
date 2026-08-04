const LEVEL_DEFS = {
  "1:1-1": {
    id: "1-1",
    name: "初见 · 风起之地",
    role: "教学关",
    width: 1800,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 850, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 680, h: 100, kind: "ground" },
      { x: 700, y: 820, w: 1100, h: 100, kind: "ground" },
      { x: 250, y: 700, w: 120, h: 24, kind: "platform" },
      { x: 520, y: 650, w: 100, h: 24, kind: "platform" },
      { x: 920, y: 680, w: 120, h: 24, kind: "platform" },
      { x: 1200, y: 590, w: 100, h: 24, kind: "platform" },
      { x: 1200, y: 750, w: 100, h: 24, kind: "platform" },
      { x: 1550, y: 710, w: 120, h: 24, kind: "platform" }
    ],
    boxes: [{ x: 430, y: 790, w: 34, h: 30, kind: "wood" }],
    switches: [{ x: 560, y: 790, w: 44, h: 30, target: "door1", latch: true }],
    doors: [{ id: "door1", x: 690, y: 700, w: 24, h: 120, open: false }],
    stars: [
      { x: 285, y: 655 },
      { x: 950, y: 635 },
      { x: 1590, y: 665 }
    ],
    fragment: { x: 565, y: 600 },
    core: { x: 1670, y: 760 },
    spikes: [],
    enemies: [],
    springs: [],
    launchPads: [],
    gravityZones: [],
    movingPlatforms: []
  },

  "1:1-2": {
    id: "1-2",
    name: "向地而生",
    role: "知识关 · 重力",
    width: 2200,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 800, y: 790 }, { x: 1550, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 720, h: 100, kind: "ground" },
      { x: 700, y: 820, w: 620, h: 100, kind: "ground" },
      { x: 1380, y: 820, w: 920, h: 100, kind: "ground" },
      { x: 280, y: 680, w: 120, h: 24, kind: "platform" },
      { x: 460, y: 580, w: 100, h: 24, kind: "platform" },
      { x: 680, y: 500, w: 130, h: 24, kind: "platform" },
      { x: 920, y: 420, w: 140, h: 24, kind: "platform" },
      { x: 1180, y: 500, w: 120, h: 24, kind: "platform" },
      { x: 1460, y: 640, w: 140, h: 24, kind: "platform" },
      { x: 1760, y: 560, w: 120, h: 24, kind: "platform" },
      { x: 1980, y: 700, w: 120, h: 24, kind: "platform" }
    ],
    gravityZones: [
      { x: 700, y: 360, w: 640, h: 460, scale: 0.42 },
      { x: 1480, y: 360, w: 420, h: 460, scale: 1.65 }
    ],
    stars: [
      { x: 500, y: 535 },
      { x: 980, y: 375 },
      { x: 1820, y: 515 }
    ],
    fragment: { x: 1250, y: 455 },
    core: { x: 2060, y: 760 },
    spikes: [
      { x: 250, y: 782, w: 30, h: 38 },
      { x: 760, y: 782, w: 30, h: 38 }
    ],
    enemies: [{ x: 400, y: 780, w: 30, h: 26, range: 160, type: "walker" }],
    springs: [],
    launchPads: [],
    movingPlatforms: []
  },

  "1:1-3": {
    id: "1-3",
    name: "冰与沙",
    role: "知识关 · 摩擦力",
    width: 2200,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 760, y: 790 }, { x: 1500, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 700, h: 100, kind: "ground" },
      { x: 700, y: 820, w: 420, h: 100, kind: "ice" },
      { x: 1180, y: 820, w: 300, h: 100, kind: "sand" },
      { x: 1500, y: 820, w: 780, h: 100, kind: "ice" },
      { x: 320, y: 680, w: 110, h: 24, kind: "platform" },
      { x: 520, y: 600, w: 100, h: 24, kind: "ice" },
      { x: 820, y: 640, w: 140, h: 24, kind: "sand" },
      { x: 1080, y: 560, w: 100, h: 24, kind: "ice" },
      { x: 1400, y: 650, w: 130, h: 24, kind: "sand" },
      { x: 1750, y: 580, w: 110, h: 24, kind: "ice" },
      { x: 1980, y: 700, w: 120, h: 24, kind: "platform" }
    ],
    stars: [
      { x: 560, y: 555 },
      { x: 1120, y: 515 },
      { x: 1810, y: 535 }
    ],
    fragment: { x: 860, y: 595 },
    core: { x: 2080, y: 760 },
    spikes: [
      { x: 350, y: 782, w: 30, h: 38 },
      { x: 900, y: 782, w: 30, h: 38 },
      { x: 1700, y: 782, w: 30, h: 38 }
    ],
    enemies: [{ x: 520, y: 780, w: 30, h: 26, range: 200, type: "walker" }],
    springs: [],
    launchPads: [],
    movingPlatforms: []
  },

  "1:1-4": {
    id: "1-4",
    name: "蓄势而跃",
    role: "知识关 · 弹力",
    width: 2200,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 750, y: 790 }, { x: 1450, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 760, h: 100, kind: "ground" },
      { x: 760, y: 820, w: 600, h: 100, kind: "ground" },
      { x: 1420, y: 820, w: 860, h: 100, kind: "ground" },
      { x: 280, y: 680, w: 110, h: 24, kind: "platform" },
      { x: 480, y: 540, w: 120, h: 24, kind: "platform" },
      { x: 700, y: 400, w: 130, h: 24, kind: "platform" },
      { x: 980, y: 480, w: 120, h: 24, kind: "platform" },
      { x: 1280, y: 360, w: 130, h: 24, kind: "platform" },
      { x: 1560, y: 460, w: 120, h: 24, kind: "platform" },
      { x: 1840, y: 600, w: 120, h: 24, kind: "platform" },
      { x: 2050, y: 700, w: 100, h: 24, kind: "platform" }
    ],
    springs: [
      { x: 240, y: 790, w: 64, h: 30, strength: 720 },
      { x: 460, y: 790, w: 64, h: 30, strength: 760 },
      { x: 920, y: 790, w: 64, h: 30, strength: 840 },
      { x: 1350, y: 790, w: 64, h: 30, strength: 860 },
      { x: 1800, y: 790, w: 64, h: 30, strength: 900 }
    ],
    stars: [
      { x: 315, y: 635 },
      { x: 1030, y: 435 },
      { x: 1600, y: 415 }
    ],
    fragment: { x: 740, y: 355 },
    core: { x: 2090, y: 760 },
    spikes: [
      { x: 370, y: 782, w: 30, h: 38 },
      { x: 1120, y: 782, w: 30, h: 38 },
      { x: 1640, y: 782, w: 30, h: 38 }
    ],
    enemies: [{ x: 700, y: 780, w: 30, h: 26, range: 220, type: "walker" }],
    launchPads: [],
    gravityZones: [],
    movingPlatforms: []
  },

  "1:1-5": {
    id: "1-5",
    name: "倾斜的天平",
    role: "知识关 · 斜面",
    width: 2200,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 800, y: 790 }, { x: 1500, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 640, h: 100, kind: "ground" },
      { x: 640, y: 820, w: 480, h: 100, kind: "ground" },
      { x: 1180, y: 820, w: 500, h: 100, kind: "ground" },
      { x: 1720, y: 820, w: 560, h: 100, kind: "ground" },
      { x: 300, y: 700, w: 120, h: 24, kind: "slope", dir: 1 },
      { x: 470, y: 620, w: 140, h: 80, kind: "slope", dir: -1 },
      { x: 700, y: 560, w: 120, h: 24, kind: "platform" },
      { x: 900, y: 620, w: 140, h: 80, kind: "slope", dir: 1 },
      { x: 1200, y: 560, w: 120, h: 24, kind: "platform" },
      { x: 1480, y: 640, w: 160, h: 80, kind: "slope", dir: -1 },
      { x: 1800, y: 580, w: 120, h: 24, kind: "platform" },
      { x: 2000, y: 700, w: 120, h: 24, kind: "platform" }
    ],
    stars: [
      { x: 360, y: 655 },
      { x: 980, y: 575 },
      { x: 1840, y: 535 }
    ],
    fragment: { x: 540, y: 575 },
    core: { x: 2080, y: 760 },
    spikes: [
      { x: 280, y: 782, w: 30, h: 38 },
      { x: 1050, y: 782, w: 30, h: 38 },
      { x: 1660, y: 782, w: 30, h: 38 }
    ],
    enemies: [
      { x: 600, y: 780, w: 32, h: 28, range: 200, type: "walker" },
      { x: 1300, y: 780, w: 32, h: 28, range: 200, type: "walker" }
    ],
    springs: [],
    launchPads: [],
    gravityZones: [],
    movingPlatforms: []
  },

  "1:1-6": {
    id: "1-6",
    name: "弧线之上",
    role: "知识关 · 抛体运动",
    width: 2400,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 800, y: 790 }, { x: 1650, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 760, h: 100, kind: "ground" },
      { x: 760, y: 820, w: 560, h: 100, kind: "ground" },
      { x: 1380, y: 820, w: 640, h: 100, kind: "ground" },
      { x: 2120, y: 820, w: 360, h: 100, kind: "ground" },
      { x: 420, y: 650, w: 110, h: 24, kind: "platform" },
      { x: 620, y: 500, w: 120, h: 24, kind: "platform" },
      { x: 1000, y: 460, w: 130, h: 24, kind: "platform" },
      { x: 1220, y: 600, w: 120, h: 24, kind: "platform" },
      { x: 1600, y: 520, w: 120, h: 24, kind: "platform" },
      { x: 1840, y: 640, w: 110, h: 24, kind: "platform" },
      { x: 2250, y: 700, w: 120, h: 24, kind: "platform" }
    ],
    launchPads: [
      { x: 260, y: 790, w: 90, h: 30, angle: -Math.PI / 3.1, speed: 980 },
      { x: 880, y: 790, w: 90, h: 30, angle: -Math.PI / 4, speed: 1050 },
      { x: 1980, y: 790, w: 90, h: 30, angle: -Math.PI / 3, speed: 920 }
    ],
    stars: [
      { x: 500, y: 420 },
      { x: 1120, y: 520 },
      { x: 1760, y: 530 }
    ],
    fragment: { x: 690, y: 455 },
    core: { x: 2320, y: 760 },
    spikes: [
      { x: 320, y: 782, w: 30, h: 38 },
      { x: 1500, y: 782, w: 30, h: 38 },
      { x: 2050, y: 782, w: 30, h: 38 }
    ],
    enemies: [
      { x: 900, y: 520, w: 32, h: 26, range: 260, axis: "y", type: "flyer" },
      { x: 1700, y: 560, w: 32, h: 26, range: 260, axis: "y", type: "flyer" }
    ],
    springs: [],
    gravityZones: [],
    movingPlatforms: []
  },

  "1:1-7": {
    id: "1-7",
    name: "刹不住的风",
    role: "知识关 · 惯性",
    width: 2400,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 800, y: 790 }, { x: 1750, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 700, h: 100, kind: "ground" },
      { x: 680, y: 820, w: 680, h: 100, kind: "ice" },
      { x: 1420, y: 820, w: 280, h: 100, kind: "sand" },
      { x: 1760, y: 820, w: 720, h: 100, kind: "ice" },
      { x: 350, y: 680, w: 110, h: 24, kind: "platform" },
      { x: 600, y: 600, w: 120, h: 24, kind: "ice" },
      { x: 920, y: 640, w: 140, h: 24, kind: "ice" },
      { x: 1220, y: 560, w: 120, h: 24, kind: "ice" },
      { x: 1560, y: 640, w: 130, h: 24, kind: "sand" },
      { x: 1900, y: 580, w: 120, h: 24, kind: "ice" },
      { x: 2150, y: 680, w: 120, h: 24, kind: "platform" }
    ],
    movingPlatforms: [
      { x: 240, y: 500, w: 90, h: 22, startX: 240, endX: 480, speed: 90, axis: "x" },
      { x: 980, y: 480, w: 90, h: 22, startX: 980, endX: 1220, speed: 110, axis: "x" },
      { x: 1960, y: 480, w: 90, h: 22, startX: 1960, endX: 2200, speed: 100, axis: "x" }
    ],
    stars: [
      { x: 420, y: 455 },
      { x: 1100, y: 435 },
      { x: 2070, y: 435 }
    ],
    fragment: { x: 720, y: 555 },
    core: { x: 2280, y: 760 },
    spikes: [
      { x: 260, y: 782, w: 30, h: 38 },
      { x: 960, y: 782, w: 30, h: 38 },
      { x: 2020, y: 782, w: 30, h: 38 }
    ],
    enemies: [{ x: 720, y: 780, w: 32, h: 28, range: 300, type: "walker" }],
    springs: [],
    launchPads: [],
    gravityZones: []
  },

  "1:1-8": {
    id: "1-8",
    name: "力之交响",
    role: "组合关",
    width: 2800,
    height: 900,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 800, y: 790 }, { x: 1800, y: 790 }, { x: 2400, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 680, h: 100, kind: "ground" },
      { x: 680, y: 820, w: 500, h: 100, kind: "ice" },
      { x: 1240, y: 820, w: 600, h: 100, kind: "sand" },
      { x: 1840, y: 820, w: 1060, h: 100, kind: "ground" },
      { x: 260, y: 700, w: 120, h: 24, kind: "platform" },
      { x: 480, y: 580, w: 110, h: 24, kind: "ice" },
      { x: 760, y: 520, w: 130, h: 24, kind: "platform" },
      { x: 1020, y: 600, w: 120, h: 24, kind: "ice" },
      { x: 1380, y: 560, w: 130, h: 24, kind: "slope", dir: 1 },
      { x: 1660, y: 500, w: 120, h: 24, kind: "platform" },
      { x: 1960, y: 580, w: 130, h: 24, kind: "platform" },
      { x: 2260, y: 520, w: 120, h: 24, kind: "platform" },
      { x: 2520, y: 660, w: 120, h: 24, kind: "platform" }
    ],
    springs: [
      { x: 320, y: 790, w: 64, h: 30, strength: 740 },
      { x: 880, y: 790, w: 64, h: 30, strength: 820 },
      { x: 2050, y: 790, w: 64, h: 30, strength: 880 }
    ],
    launchPads: [
      { x: 1480, y: 790, w: 90, h: 30, angle: -Math.PI / 3.2, speed: 950 }
    ],
    boxes: [{ x: 1350, y: 790, w: 34, h: 30, kind: "wood" }],
    switches: [{ x: 1460, y: 790, w: 44, h: 30, target: "door1", latch: true }],
    doors: [{ id: "door1", x: 1580, y: 700, w: 24, h: 120, open: false }],
    gravityZones: [
      { x: 1840, y: 360, w: 500, h: 460, scale: 0.55 }
    ],
    movingPlatforms: [
      { x: 2400, y: 460, w: 90, h: 22, startX: 2400, endX: 2580, speed: 90, axis: "x" }
    ],
    stars: [
      { x: 520, y: 535 },
      { x: 1430, y: 515 },
      { x: 2300, y: 475 }
    ],
    fragment: { x: 760, y: 475 },
    core: { x: 2680, y: 760 },
    spikes: [
      { x: 300, y: 782, w: 30, h: 38 },
      { x: 1100, y: 782, w: 30, h: 38 },
      { x: 2200, y: 782, w: 30, h: 38 }
    ],
    enemies: [
      { x: 720, y: 780, w: 30, h: 26, range: 220, type: "walker" },
      { x: 2100, y: 780, w: 30, h: 26, range: 220, type: "walker" },
      { x: 2350, y: 520, w: 32, h: 26, range: 220, axis: "y", type: "flyer" }
    ]
  },

  "1:1-9": {
    id: "1-9",
    name: "失衡巨像",
    role: "章节 Boss",
    width: 1600,
    height: 900,
    playerStart: { x: 160, y: 760 },
    checkpoints: [{ x: 160, y: 760 }],
    platforms: [
      { x: -80, y: 820, w: 1760, h: 100, kind: "ground" },
      { x: 260, y: 680, w: 110, h: 24, kind: "platform" },
      { x: 520, y: 580, w: 120, h: 24, kind: "platform" },
      { x: 800, y: 520, w: 130, h: 24, kind: "platform" },
      { x: 1080, y: 580, w: 120, h: 24, kind: "platform" },
      { x: 1320, y: 680, w: 110, h: 24, kind: "platform" }
    ],
    springs: [
      { x: 420, y: 790, w: 64, h: 30, strength: 820 },
      { x: 1120, y: 790, w: 64, h: 30, strength: 820 }
    ],
    stars: [
      { x: 560, y: 535 },
      { x: 840, y: 475 },
      { x: 1130, y: 535 }
    ],
    fragment: { x: 930, y: 420 },
    core: { x: 1500, y: 760 },
    spikes: [],
    enemies: [
      {
        x: 760,
        y: 740,
        w: 72,
        h: 80,
        spriteId: "stone-golem",
        range: 420,
        type: "boss",
        hp: 3,
        speed: 120
      }
    ],
    launchPads: [],
    gravityZones: [],
    movingPlatforms: []
  }
};

function makeGenericLevel(chapterId, levelId) {
  const seed = hashString(`${chapterId}:${levelId}`);
  const width = 1800;
  const height = 900;
  return {
    id: levelId,
    name: getLevelByKey(chapterId, levelId)?.name || "待设计关卡",
    role: getLevelByKey(chapterId, levelId)?.role || "待设计",
    width,
    height,
    playerStart: { x: 120, y: 760 },
    checkpoints: [{ x: 800, y: 790 }],
    platforms: [
      { x: -80, y: 820, w: 700, h: 100, kind: "ground" },
      { x: 700, y: 820, w: 1180, h: 100, kind: "ground" },
      { x: 280, y: 680, w: 110, h: 24, kind: "platform" },
      { x: 500, y: 580, w: 110, h: 24, kind: "platform" },
      { x: 780, y: 640, w: 130, h: 24, kind: "platform" },
      { x: 1080, y: 540, w: 110, h: 24, kind: "platform" },
      { x: 1350, y: 660, w: 130, h: 24, kind: "platform" }
    ],
    stars: [
      { x: 330, y: 635 },
      { x: 830, y: 595 },
      { x: 1130, y: 495 }
    ],
    fragment: { x: 1450, y: 615 },
    core: { x: 1650, y: 760 },
    spikes: seed % 3 === 0 ? [{ x: 640, y: 782, w: 30, h: 38 }] : [],
    enemies: seed % 2 === 0 ? [{ x: 820, y: 780, w: 30, h: 26, range: 220, type: "walker" }] : [],
    springs: seed % 4 === 0 ? [{ x: 300, y: 790, w: 64, h: 30, strength: 760 }] : [],
    launchPads: [],
    gravityZones: [],
    movingPlatforms: []
  };
}

function getLevelDef(chapterId, levelId) {
  const key = `${chapterId}:${levelId}`;
  return LEVEL_DEFS[key] || makeGenericLevel(chapterId, levelId);
}
