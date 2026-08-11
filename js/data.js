function makePlaceholderLevels(chapterId, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${chapterId}-${index + 1}`,
    name: `待设计关卡 ${index + 1}`,
    role: "待设计",
    placeholder: true
  }));
}

const CHAPTERS = [
  {
    id: 1,
    artName: "风起 · 万物初动",
    subject: "运动与力",
    accent: "#ff6b57",
    expert: {
      name: "牛顿",
      title: "经典力学奠基人",
      quote: "如果我看得更远，那是因为我站在巨人的肩膀上。",
      lines: [
        "运动不是需要被维持的。没有外力时，物体会保持静止或匀速直线运动。",
        "力不是让东西动起来的原因，而是改变运动状态的原因。"
      ],
      quiz: {
        question: "牛顿第一定律告诉我们什么？",
        options: ["物体不受力时仍可能保持匀速直线运动", "物体不受力时一定会停下来", "力是维持运动的原因"],
        answer: 0
      }
    },
    levels: [
      { id: "1-1", name: "地月之间", role: "知识关 · 重力" },
      { id: "1-2", name: "向地而生", role: "知识关 · 重力" },
      { id: "1-3", name: "冰与沙", role: "知识关 · 摩擦力" },
      { id: "1-4", name: "蓄势而跃", role: "知识关 · 弹力" },
      { id: "1-5", name: "倾斜的天平", role: "知识关 · 斜面" },
      { id: "1-6", name: "弧线之上", role: "知识关 · 抛体运动" },
      { id: "1-7", name: "刹不住的风", role: "知识关 · 惯性" },
      { id: "1-8", name: "力之交响", role: "组合关" },
      { id: "1-9", name: "失衡巨像", role: "章节 Boss" }
    ]
  },
  {
    id: 2,
    artName: "余响 · 涟漪成歌",
    subject: "波动与声学",
    accent: "#2fd6c3",
    expert: {
      name: "亥姆霍兹",
      title: "声学与波动大师",
      quote: "声音不是远方的事物，它是振动穿过空气，轻轻碰到你的耳朵。",
      lines: [
        "声波是振动的传播，它需要介质才能前进。",
        "频率决定了音调，振幅决定了响度。"
      ],
      quiz: {
        question: "声音在空气中传播依靠什么？",
        options: ["空气分子振动传播", "光传播", "电磁波"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(2, 4)
  },
  {
    id: 3,
    artName: "余温 · 万物知冷暖",
    subject: "热学与统计",
    accent: "#ffd166",
    expert: {
      name: "玻尔兹曼",
      title: "统计物理先驱",
      quote: "熵，是宇宙隐藏的时间之箭。",
      lines: [
        "温度来自大量粒子的无规则运动。",
        "热量不会自发地从低温流向高温，这是熵增的方向。"
      ],
      quiz: {
        question: "热会自然从哪边流向哪边？",
        options: ["高温物体到低温物体", "低温到高温", "不会流动"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(3, 4)
  },
  {
    id: 4,
    artName: "流光 · 镜里山河",
    subject: "光学",
    accent: "#8fd3ff",
    expert: {
      name: "菲涅耳",
      title: "波动光学大师",
      quote: "光既能笔直前进，也能绕过障碍留下波纹。",
      lines: [
        "平面镜成像是光的反射。",
        "光进入不同介质时会改变方向，这就是折射。"
      ],
      quiz: {
        question: "平面镜成像是利用光的什么？",
        options: ["反射", "折射", "色散"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(4, 4)
  },
  {
    id: 5,
    artName: "浮沉 · 一苇可航",
    subject: "流体力学",
    accent: "#4cc9f0",
    expert: {
      name: "伯努利",
      title: "流体力学奠基人",
      quote: "流得快的地方，压力反而更小。",
      lines: [
        "流体流动时，速度越快，压强越小。",
        "这就是机翼能升起的原因之一。"
      ],
      quiz: {
        question: "飞机机翼上方空气流速更快，压强更？",
        options: ["更小", "更大", "一样"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(5, 4)
  },
  {
    id: 6,
    artName: "守恒 · 天地有衡",
    subject: "功与机械能",
    accent: "#7bd88f",
    expert: {
      name: "焦耳",
      title: "能量守恒大师",
      quote: "能量不会消失，它只是换了一副模样。",
      lines: [
        "做功是能量从一个形式转化到另一个形式的过程。",
        "压缩的弹簧储存了弹性势能。"
      ],
      quiz: {
        question: "弹簧压缩后储存的是？",
        options: ["弹性势能", "动能", "内能"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(6, 4)
  },
  {
    id: 7,
    artName: "巧构 · 四两拨千斤",
    subject: "简单机械与机构",
    accent: "#d9a066",
    expert: {
      name: "阿基米德",
      title: "杠杆与机械之王",
      quote: "给我一个支点，我能撬动地球。",
      lines: [
        "杠杆通过改变力臂来放大力量。",
        "动力臂越长，越省力。"
      ],
      quiz: {
        question: "杠杆省力的关键是？",
        options: ["动力臂更长", "阻力臂更长", "支点更低"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(7, 5)
  },
  {
    id: 8,
    artName: "灵犀 · 电引万物",
    subject: "电磁学",
    accent: "#8f7bff",
    expert: {
      name: "麦克斯韦",
      title: "电磁统一者",
      quote: "电与磁，本是同一种现象的两张面孔。",
      lines: [
        "电流会在周围产生磁场。",
        "变化的磁场又会产生电场，这就是电磁感应。"
      ],
      quiz: {
        question: "电流周围会产生？",
        options: ["磁场", "引力", "声波"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(8, 4)
  },
  {
    id: 9,
    artName: "不期 · 一撞惊鸿",
    subject: "碰撞与动量",
    accent: "#ff8f5e",
    expert: {
      name: "惠更斯",
      title: "碰撞与摆钟大师",
      quote: "碰撞前后，系统的总动量保持不变。",
      lines: [
        "动量是质量与速度的乘积。",
        "在没有外力介入的系统中，总动量守恒。"
      ],
      quiz: {
        question: "两个小球碰撞，系统总动量？",
        options: ["守恒", "越来越大", "越来越小"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(9, 4)
  },
  {
    id: 10,
    artName: "星河 · 众星有约",
    subject: "天体物理",
    accent: "#9be7ff",
    expert: {
      name: "开普勒",
      title: "星空立法者",
      quote: "行星沿着椭圆轨道，围绕恒星运行。",
      lines: [
        "轨道不是完美的圆，而是椭圆。",
        "行星离恒星越近，运行得越快。"
      ],
      quiz: {
        question: "行星轨道是？",
        options: ["椭圆", "正圆", "直线"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(10, 4)
  },
  {
    id: 11,
    artName: "聚散 · 微尘有光",
    subject: "核物理",
    accent: "#7fd8be",
    expert: {
      name: "居里夫人",
      title: "放射学先驱",
      quote: "辐射是原子内部发出的信号。",
      lines: [
        "放射性原子核会自发衰变。",
        "衰变后，一种元素可能变成另一种元素。"
      ],
      quiz: {
        question: "放射性原子核衰变后可能变成？",
        options: ["另一种元素", "永不改变", "只有能量"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(11, 4)
  },
  {
    id: 12,
    artName: "未定 · 万物皆可能",
    subject: "量子力学",
    accent: "#b8a4ff",
    expert: {
      name: "薛定谔",
      title: "量子叠加与波动方程",
      quote: "在测量之前，粒子的状态是叠加的。",
      lines: [
        "量子系统在被观察前可以处于多种状态叠加。",
        "测量会让叠加态坍缩成一个确定结果。"
      ],
      quiz: {
        question: "量子叠加态说明？",
        options: ["测量前状态不确定", "测量前一定是确定的", "粒子不存在"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(12, 4)
  },
  {
    id: 13,
    artName: "永恒 · 刹那之间",
    subject: "相对论",
    accent: "#ffd166",
    expert: {
      name: "爱因斯坦",
      title: "时空与光速的立法者",
      quote: "时间与空间会因速度和引力而弯曲。",
      lines: [
        "接近光速时，时间会变慢。",
        "质量会弯曲时空，这就是引力。"
      ],
      quiz: {
        question: "接近光速旅行时，时间会？",
        options: ["变慢", "变快", "不变"],
        answer: 0
      }
    },
    levels: makePlaceholderLevels(13, 4)
  }
];

const FINAL_CHAPTER = {
  id: "final",
  artName: "熵之终章",
  subject: "最终试炼",
  accent: "#ff5f6d",
  levels: [
    { id: "final-1", name: "熵之终章", role: "最终 Boss" }
  ]
};

const DIFFICULTY_MODES = [
  { id: "simple", label: "简单模式" },
  { id: "normal", label: "完整模式" },
  { id: "hell", label: "炼狱模式" }
];

function getChapterById(chapterId) {
  return CHAPTERS.find((chapter) => chapter.id === chapterId) || null;
}

function getLevelByKey(chapterId, levelId) {
  const chapter = getChapterById(chapterId);
  if (!chapter) return null;
  return chapter.levels.find((level) => level.id === levelId) || null;
}

function getFinalLevel() {
  return FINAL_CHAPTER.levels[0];
}
