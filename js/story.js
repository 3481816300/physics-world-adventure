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
  { type: "text", scene: "earth", speaker: "牛顿", text: "苹果坠向地面。是什么看不见的手，把它拉向地面？", frame: "apple-smell" },
  { type: "choice", scene: "earth", speaker: "玩家", text: "你认为，是什么让苹果落向地面的？", frame: "point-sky", options: ["它成熟了，所以掉下来", "地球在吸引它", "它自己想下去"], answer: null },
  { type: "text", scene: "earth", speaker: "牛顿", text: "假设是地球在作祟。那我们把苹果带到月球，它会怎样？", frame: "walk-1" },
  { type: "text", scene: "moon", speaker: "牛顿", text: "月球表面。松手吧，看看月亮女神如何对待苹果。", frame: "space-idle" },
  { type: "choice", scene: "moon", speaker: "玩家", text: "苹果缓慢落下。月球上的苹果说明力量发生了什么变化？", frame: "moon-jump", options: ["力量消失了", "力量变小了", "力量变大了"], answer: 1 },
  { type: "choice", scene: "moon", speaker: "玩家", text: "月球的拉之力大约是地球的几分之一？", frame: "yellow-planet", options: ["二分之一", "六分之一", "十分之一"], answer: 1 },
  { type: "text", scene: "moon", speaker: "牛顿", text: "把每单位质量受到的拉之力命名为重力系数 g。地球 g≈9.8，月球 g≈1.63。", frame: "clipboard" },
  { type: "text", scene: "mars", speaker: "牛顿", text: "为什么地球的 g 这么大？我们去更稳重的火星看看。", frame: "rocket-fire" },
  { type: "choice", scene: "mars", speaker: "玩家", text: "三颗铁球手感相同，如何找出最重的那颗？", frame: "space-walk", options: ["逐一捡起，掂量最沉的", "踢得最远的就是", "先生锈的就是"], answer: 0 },
  { type: "formula", scene: "mars", speaker: "牛顿", text: "把质量 m 和星球 g 拼成重量 G。", frame: "think", slots: ["G", "=", "__", "×", "__"], options: ["m", "g", "+", "−"], answers: ["m", "g"] },
  { type: "text", scene: "earth", speaker: "牛顿", text: "G = mg！现在解决最后一个问题：这个 g 到底是谁定的？", frame: "clipboard" },
  { type: "choice", scene: "earth", speaker: "玩家", text: "两个物体间的万有引力大小，和什么有关？", frame: "point-sky", options: ["和颜色有关", "和质量与距离有关", "只和距离有关"], answer: 1 },
  { type: "formula", scene: "earth", speaker: "牛顿", text: "把宇宙密码拼出来。F = [?] × (m₁×m₂) / [??]", frame: "rocket-up", slots: ["F", "=", "__", "×", "(m₁×m₂)", "/", "__"], options: ["G", "g", "r", "r²", "+"], answers: ["G", "r²"] },
  { type: "text", scene: "earth", speaker: "牛顿", text: "F = G×m₁×m₂/r²。质量越大，引力越猛；距离越近，引力越狂。再会，我的搭档。", frame: "idle-dress" }
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
