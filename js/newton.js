const NEWTON_SPRITE = "assets/newton.png";
const NEWTON_FRAME_COLS = 24;
const NEWTON_FRAME_ROWS = 6;
const NEWTON_FRAME_W = 128;
const NEWTON_FRAME_H = 208;

const NEWTON_FRAMES = [
  { id: "idle-dress", index: 1, name: "礼服待机站立" },
  { id: "idle-dress-2", index: 2, name: "礼服待机站立（重复帧）" },
  { id: "walk-1", index: 3, name: "礼服行走帧 1" },
  { id: "walk-2", index: 4, name: "礼服行走帧 2" },
  { id: "walk-3", index: 5, name: "礼服行走帧 3" },
  { id: "apple-hold", index: 6, name: "手持红苹果" },
  { id: "apple-smell", index: 7, name: "举苹果嗅闻" },
  { id: "point-sky", index: 8, name: "抬手指向天空" },
  { id: "think", index: 9, name: "抬手思索讲解" },
  { id: "space-idle", index: 11, name: "宇航服原地待机" },
  { id: "wave-1", index: 12, name: "宇航服挥手 1" },
  { id: "wave-2", index: 13, name: "宇航服挥手 2" },
  { id: "moon-jump", index: 14, name: "宇航服低重力跳" },
  { id: "yellow-planet", index: 15, name: "手持黄色星球" },
  { id: "space-walk", index: 17, name: "宇航服摆臂行走" },
  { id: "clipboard", index: 18, name: "手持记录板" },
  { id: "sunglasses", index: 19, name: "墨镜佩戴动作" },
  { id: "sunglasses-2", index: 20, name: "调整墨镜姿态" },
  { id: "apple-item", index: 21, name: "红苹果道具" },
  { id: "run-board", index: 27, name: "持板奔跑姿态" },
  { id: "stand-board", index: 28, name: "持板站立姿态" },
  { id: "rocket-fire", index: 29, name: "火箭点火起飞" },
  { id: "rocket-up", index: 30, name: "火箭完整升空" }
];

class NewtonAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.image = null;
    this.loaded = false;
    this.frameIndex = 1;
    this.loopFrames = null;
    this.loopTimer = 0;
    this.loopDuration = 0.24;
    this.frame = null;
  }

  load() {
    const image = new Image();
    image.onload = () => {
      this.image = image;
      this.loaded = true;
      this.drawFrame(this.frameIndex);
    };
    image.onerror = () => {
      this.loaded = false;
    };
    image.src = NEWTON_SPRITE;
  }

  setFrame(idOrIndex) {
    const frame = typeof idOrIndex === "string"
      ? NEWTON_FRAMES.find((item) => item.id === idOrIndex)
      : NEWTON_FRAMES.find((item) => item.index === idOrIndex);
    if (!frame) return;
    this.frame = frame;
    this.frameIndex = frame.index;
    this.loopFrames = null;
    this.loopTimer = 0;
    this.drawFrame(frame.index);
  }

  loop(ids, duration = 0.24) {
    const frames = ids.map((id) => NEWTON_FRAMES.find((item) => item.id === id)).filter(Boolean);
    if (!frames.length) return;
    this.loopFrames = frames;
    this.loopDuration = duration;
    this.loopTimer = 0;
    this.drawFrame(frames[0].index);
  }

  update(dt) {
    if (!this.loopFrames || !this.loopFrames.length) return;
    this.loopTimer += dt;
    if (this.loopTimer >= this.loopDuration * this.loopFrames.length) {
      this.loopTimer = 0;
    }
    const index = Math.floor(this.loopTimer / this.loopDuration) % this.loopFrames.length;
    this.drawFrame(this.loopFrames[index].index);
  }

  drawFrame(index) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.loaded || !this.image) return;
    const col = (index - 1) % NEWTON_FRAME_COLS;
    const row = Math.floor((index - 1) / NEWTON_FRAME_COLS);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      this.image,
      col * NEWTON_FRAME_W,
      row * NEWTON_FRAME_H,
      NEWTON_FRAME_W,
      NEWTON_FRAME_H,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  dispose() {
    this.image = null;
    this.loopFrames = null;
  }
}
