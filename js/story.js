const BACKGROUND_STORY = [
  "22世纪末，人类发现宇宙的根本真相：我们所知的物理定律并非自然形成，而是由一个古老的「法则引擎」维持。",
  "某天，引擎出现故障，产生了名为「法则裂隙」的异常现象——不同物理领域的法则开始混乱交融，现实正在崩解。",
  "你是一名「法则修复局」的新晋特工，装备着一台「法则锚定器」。",
  "你的任务是进入各个维度碎片，在完全由单一物理法则主导的世界中，找到并稳定「法则核心」，阻止裂隙扩张。",
  "沿途会有各个领域的先行者为你讲解知识。学习他们的经验，理解法则，然后修复它。"
];

const END_POEM = [
  { speaker: "旅人", text: "你走过了一个又一个裂隙。每一个法则背后，都藏着一段被遗忘的历史。" },
  { speaker: "法则", text: "我们不是被发明出来的。我们只是原本就在那里，等待有人理解。" },
  { speaker: "旅人", text: "你曾以为世界是坚固的，直到你看见它由无数看不见的规则编织而成。" },
  { speaker: "法则", text: "引力不是一根绳子。光也不是一束画笔。它们只是宇宙与自己对话的方式。" },
  { speaker: "旅人", text: "那现在呢？当我修复了最后一个核心，世界会变回原来的样子吗？" },
  { speaker: "法则", text: "不会。因为你已经不再是原来的样子。" },
  { speaker: "旅人", text: "我带着记忆走过无数维度，却仍说不出自己到底是谁。" },
  { speaker: "法则", text: "你是一段观察。一个答案。是法则引擎在无数可能中，选择倾听自己的方式。" },
  { speaker: "旅人", text: "所以，这就是结束吗？" },
  { speaker: "法则", text: "这是开始。每一个理解过宇宙的人，都会带着一个新的宇宙离开。" }
];

const LEVEL_INTRO_STEPS = [
  { type: "text", scene: "earth", speaker: "牛顿", text: "苹果的背叛：牛顿正死死盯着一颗摇摇欲坠的苹果。", frame: "idle-dress" },
  { type: "text", scene: "earth", speaker: "牛顿", text: "苹果坠落，不是因为它“想下去”，而是地球对它有引力。", frame: "apple-smell" },
  { type: "choice", scene: "earth", speaker: "玩家", text: "先观察同一个苹果在地球松开。", frame: "point-sky", question: "你看到苹果怎样运动？", options: ["一直往上飞", "向下落", "悬在空中"], answer: 1 },
  { type: "text", scene: "moon", speaker: "牛顿", text: "现在做控制变量实验：苹果还是同一个，质量没变，只把地点换成月球。", frame: "walk-1" },
  { type: "text", scene: "moon", speaker: "牛顿", text: "松手吧，看看月球上的苹果。", frame: "space-idle" },
  { type: "choice", scene: "moon", speaker: "玩家", text: "苹果落下更慢了。这说明什么？", frame: "moon-jump", question: "苹果质量没变，为什么落得更慢？", options: ["月球引力更小", "苹果质量变小了", "苹果不想落了"], answer: 0 },
  { type: "text", scene: "mars", speaker: "牛顿", text: "再换到火星，同一颗苹果。火星比月球重，苹果落得比月球快。", frame: "rocket-fire" },
  { type: "choice", scene: "mars", speaker: "玩家", text: "现在能判断 g 和谁有关了吗？", frame: "space-walk", question: "同一物体在不同星球受到引力不同，主要因为？", options: ["星球性质不同", "苹果质量变了", "颜色不同"], answer: 0 },
  { type: "text", scene: "earth", speaker: "牛顿", text: "我们把星球对每 1 kg 质量产生的引力大小叫做重力系数 g。地球 g≈9.8，月球 g≈1.63，火星 g≈3.71。", frame: "clipboard" },
  { type: "text", scene: "earth", speaker: "牛顿", text: "接下来区分质量和重量。质量是物体自己的固有属性，不随星球改变；重量是它受到的引力大小，会随 g 改变。", frame: "think" },
  { type: "choice", scene: "moon", speaker: "玩家", text: "1 kg 的货物从地球带到月球，质量还是 1 kg，但它受的引力变小。", frame: "yellow-planet", question: "月球上货物会怎样？", options: ["质量不变，重量变小", "质量变小，重量不变", "质量和重量都变小"], answer: 0 },
  { type: "text", scene: "earth", speaker: "牛顿", text: "科学家把结果写成公式：G = mg。G 是重量，m 是质量，g 是所在星球的引力系数。", frame: "clipboard" },
  { type: "choice", scene: "earth", speaker: "牛顿", text: "G = mg：质量 m 乘上星球引力 g，就是重量 G。明白了吗？", frame: "think", question: "你理解 G = mg 了吗？", options: ["明白了，继续", "再讲一遍"], answer: 0 },
  { type: "text", scene: "earth", speaker: "牛顿", text: "为什么不同星球 g 不同？控制变量：先固定质量，只比较两个星球的大小和远近。", frame: "point-sky" },
  { type: "choice", scene: "earth", speaker: "玩家", text: "万有引力大小和什么有关？", frame: "point-sky", question: "两个物体之间的引力大小，和什么有关？", options: ["和颜色有关", "和质量与距离有关", "只和距离有关"], answer: 1 },
  { type: "text", scene: "earth", speaker: "牛顿", text: "公式是 F = G×m₁×m₂/r²。F 是引力，m₁、m₂ 是两个物体的质量，r 是距离，G 是万有引力常量。", frame: "rocket-up" },
  { type: "choice", scene: "earth", speaker: "牛顿", text: "质量越大，引力越强；距离越近，引力越强。明白了吗？", frame: "think", question: "你理解万有引力公式了吗？", options: ["明白了，继续", "再讲一遍"], answer: 0 },
  { type: "text", scene: "earth", speaker: "牛顿", text: "所以 g 不是凭空出现的：星球质量越大、半径越小，表面引力就越大。再会，我的搭档。", frame: "idle-dress" }
];

function getChapterIntroSteps(chapter, level) {
  if (level && level.id === "1-1") return LEVEL_INTRO_STEPS;
  const expert = chapter && chapter.expert;
  if (!expert) return [];
  const steps = expert.lines.map((text) => ({ type: "text", scene: "earth", speaker: "牛顿", text, frame: "think" }));
  if (expert.quiz) {
    steps.push({ type: "choice", scene: "earth", speaker: "玩家", text: "检验你的理解。", frame: "point-sky", options: expert.quiz.options, answer: expert.quiz.answer });
  }
  return steps;
}
