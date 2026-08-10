function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function cloneList(list) {
  return (list || []).map((item) => ({ ...item }));
}

class LevelRuntime {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.callbacks = callbacks;
    this.width = 960;
    this.height = 640;
    this.chapter = null;
    this.levelMeta = null;
    this.level = null;
    this.player = null;
    this.platforms = [];
    this.boxes = [];
    this.switches = [];
    this.doors = [];
    this.spikes = [];
    this.enemies = [];
    this.springs = [];
    this.launchPads = [];
    this.gravityZones = [];
    this.movingPlatforms = [];
    this.stars = [];
    this.fragment = null;
    this.core = null;
    this.checkpoints = [];
    this.cameraX = 0;
    this.cameraY = 0;
    this.elapsed = 0;
    this.celebrationTime = 0;
    this.dying = false;
    this.deathTimer = 0;
    this.deathParticles = [];
    this.shake = 0;
    this.hearts = 10;
    this.deaths = 0;
    this.completed = false;
    this.collected = 0;
    this.fragmentFound = false;
    this.invulnerableTimer = 0;
    this.currentCheckpoint = 0;
    this.characterSprite = null;
    this.characterSpriteLoaded = false;
    this.bossSprites = new Map();
    this.animation = {
      state: "idle",
      frame: 0,
      timer: 0
    };
  }

  load(chapter, levelMeta) {
    this.chapter = chapter;
    this.levelMeta = levelMeta;
    this.level = getLevelDef(chapter.id, levelMeta.id);
    this.completed = false;
    this.collected = 0;
    this.fragmentFound = false;
    this.deaths = 0;
    this.elapsed = 0;
    this.currentCheckpoint = 0;
    this.buildWorld();
    this.loadSprites();
    this.resetPlayer();
  }

  buildWorld() {
    const def = this.level;
    this.platforms = cloneList(def.platforms);
    this.boxes = cloneList(def.boxes).map((box) => ({
      ...box,
      vx: 0,
      vy: 0,
      onGround: false,
      alive: true
    }));
    this.switches = cloneList(def.switches).map((item) => ({ ...item, active: false, latched: false }));
    this.doors = cloneList(def.doors).map((item) => ({ ...item, open: item.open || false }));
    this.questionGates = cloneList(def.questionGates || []).map((gate) => ({ ...gate, solved: false }));
    this.activeQuestion = null;
    this.currentGravityLabel = "地球";
    this.currentGravityScale = 1;
    this.spikes = cloneList(def.spikes);
    this.springs = cloneList(def.springs);
    this.launchPads = cloneList(def.launchPads);
    this.gravityZones = cloneList(def.gravityZones);
    this.movingPlatforms = cloneList(def.movingPlatforms).map((item) => ({
      ...item,
      baseX: item.x,
      baseY: item.y,
      phase: hashString(`${def.id}:${item.x}:${item.y}`) % 100
    }));
    this.enemies = cloneList(def.enemies).map((enemy) => ({
      ...enemy,
      baseX: enemy.x,
      baseY: enemy.y,
      dir: 1,
      hp: enemy.hp || 1,
      alive: true,
      flash: 0,
      attackCooldown: 0,
      animTimer: 0,
      animFrame: 0
    }));
    this.stars = cloneList(def.stars).map((star) => ({ ...star, collected: false }));
    this.fragment = { ...def.fragment, found: false };
    this.core = { ...def.core };
    this.checkpoints = cloneList(def.checkpoints);
    if (this.checkpoints.length === 0) {
      this.checkpoints = [{ x: def.playerStart.x, y: def.playerStart.y }];
    }
  }

  loadSprites() {
    this.characterSprite = null;
    this.characterSpriteLoaded = false;
    this.bossSprites.clear();

    const skin = Save.getActiveSkin();
    if (skin && (skin.sheet || skin.image)) {
      const characterImage = new Image();
      characterImage.onload = () => {
        this.characterSprite = characterImage;
        this.characterSpriteLoaded = true;
      };
      characterImage.src = skin.sheet || skin.image;
    }

    for (const enemy of this.enemies) {
      if (enemy.type !== "boss" || !enemy.spriteId) continue;
      if (this.bossSprites.has(enemy.spriteId)) continue;
      const bossImage = new Image();
      bossImage.onload = () => {
        this.bossSprites.set(enemy.spriteId, bossImage);
      };
      bossImage.src = `assets/sprites/bosses/${enemy.spriteId}.png`;
    }
  }

  updateAnimation(frame) {
    if (!this.player || this.dying || this.completed) return;
    const player = this.player;
    let state = "idle";
    if (!player.onGround) {
      state = player.vy < -20 ? "jump" : "fall";
    } else if (Math.abs(player.vx) > 30) {
      state = "run";
    }
    if (player.attackTimer > 0) {
      state = "attack";
    }

    if (state !== this.animation.state) {
      this.animation.state = state;
      this.animation.frame = 0;
      this.animation.timer = 0;
    }

    this.animation.timer += frame;
    const durations = {
      idle: 0.16,
      run: 0.08,
      jump: 0.14,
      fall: 0.14,
      attack: 0.09
    };
    const counts = {
      idle: 4,
      run: 6,
      jump: 2,
      fall: 2,
      attack: 4
    };
    const duration = durations[state] || 0.16;
    if (this.animation.timer >= duration) {
      this.animation.timer = 0;
      this.animation.frame = (this.animation.frame + 1) % counts[state];
    }
  }

  getCharacterFrameIndex() {
    const state = this.animation.state;
    const frame = this.animation.frame;
    const offsets = {
      idle: 0,
      run: 4,
      jump: 10,
      fall: 12,
      attack: 14
    };
    return (offsets[state] || 0) + frame;
  }

  getBossFrameIndex(enemy) {
    if (!enemy.alive) return 10;
    if (enemy.flash > 0) return 8 + (enemy.animFrame % 2);
    return enemy.animFrame % 4;
  }

  resetPlayer() {
    const start = this.checkpoints[this.currentCheckpoint] || this.level.playerStart;
    this.dying = false;
    this.deathTimer = 0;
    this.deathParticles = [];
    this.shake = 0;
    this.activeQuestion = null;
    if (this.questionGates) {
      for (const gate of this.questionGates) {
        if (!gate.solved) gate.wrongCount = 0;
      }
    }
    this.player = {
      x: start.x,
      y: start.y,
      w: 26,
      h: 34,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      crouch: false,
      groundKind: "normal",
      groundPlatform: null,
      launchedAt: -1,
      attackTimer: 0
    };
    this.hearts = 10;
    this.invulnerableTimer = 1.2;
    this.callbacks.onHearts && this.callbacks.onHearts(this.hearts);
  }

  restoreRun(state) {
    if (!state) return;
    this.currentCheckpoint = Math.max(0, Math.min(this.checkpoints.length - 1, Number(state.checkpoint) || 0));
    this.collected = Math.max(0, Math.min(this.stars.length, Number(state.collected) || 0));
    this.fragmentFound = Boolean(state.fragmentFound);
    this.deaths = Number(state.deaths) || 0;
    this.elapsed = Number(state.elapsed) || 0;
    this.stars.forEach((star, index) => {
      star.collected = index < this.collected;
    });
    if (this.fragmentFound && this.fragment) {
      this.fragment.found = true;
    }
    this.resetPlayer();
    this.callbacks.onHearts && this.callbacks.onHearts(this.hearts);
  }

  teleportToCore() {
    if (!this.player || !this.core) return false;
    const player = this.player;
    const core = this.core;
    let targetX = core.x - player.w / 2;
    let targetY = core.y - player.h;

    for (const platform of this.platforms) {
      if (
        core.x > platform.x &&
        core.x < platform.x + platform.w &&
        platform.y >= core.y - 20 &&
        platform.y < core.y + 160
      ) {
        targetY = platform.y - player.h;
        targetX = Math.max(platform.x + 2, Math.min(core.x - player.w / 2, platform.x + platform.w - player.w - 2));
        break;
      }
    }

    player.x = targetX;
    player.y = targetY;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    this.invulnerableTimer = 0;
    return true;
  }

  update(dt, input) {
    const frame = Math.min(dt, 1 / 30);
    if (!this.player && !this.intro) return;
    if (this.intro) {
      this.updateIntro(frame, input);
      return;
    }

    if (this.completed) {
      this.celebrationTime += frame;
      this.shake = Math.max(0, this.shake - frame * 0.45);
      return;
    }

    if (this.dying) {
      this.updateDeath(frame);
      return;
    }

    this.elapsed += frame;
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - frame);
    this.updateMovingPlatforms(frame);

    const player = this.player;
    const left = input.isDown("KeyA") || input.isDown("ArrowLeft");
    const right = input.isDown("KeyD") || input.isDown("ArrowRight");
    const jump = input.wasPressed("Space") || input.wasPressed("KeyW") || input.wasPressed("ArrowUp");
    const crouch = input.isDown("KeyS") || input.isDown("ArrowDown");

    if (input.wasPressed("KeyR")) {
      this.respawn(false);
      this.callbacks.onToast && this.callbacks.onToast("已重置到检查点");
      return;
    }

    player.attackTimer = Math.max(0, (player.attackTimer || 0) - frame);
    if (input.wasPressed("KeyE")) {
      player.attackTimer = 0.42;
      this.animation.state = "attack";
      this.animation.frame = 0;
      this.animation.timer = 0;
      this.tryInteract();
    }
    if (input.wasPressed("KeyQ")) {
      this.callbacks.onToast && this.callbacks.onToast("道具系统已预留，当前版本未配置道具");
    }

    const moveDirection = (right ? 1 : 0) - (left ? 1 : 0);
    if (moveDirection !== 0) {
      const character = Save.getActiveCharacter();
      const airAccel = character.id === "yingying" ? 9 : 7;
      const accel = player.onGround ? 14 : airAccel;
      player.vx += (moveDirection * 260 - player.vx) * Math.min(1, accel * frame);
    }

    if (moveDirection !== 0) {
      player.facing = moveDirection;
    }

    const character = Save.getActiveCharacter();
    const gravityModifier = character.id === "yingying" ? 0.9 : character.id === "paopao" ? 0.95 : 1;
    let gravityScale = 1;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;
    for (const zone of this.gravityZones) {
      if (
        centerX > zone.x &&
        centerX < zone.x + zone.w &&
        centerY > zone.y &&
        centerY < zone.y + zone.h
      ) {
        gravityScale = zone.scale;
        this.currentGravityLabel = zone.label || "特殊区域";
        break;
      }
    }
    if (gravityScale === 1) {
      this.currentGravityLabel = "地球";
    }
    this.currentGravityScale = gravityScale;

    player.vy += 1500 * gravityScale * gravityModifier * frame;
    player.vy = Math.min(player.vy, 1000);

    if (jump && player.onGround) {
      player.vy = character.id === "yingying" ? -840 : character.id === "paopao" ? -790 : -760;
      player.onGround = false;
    }

    player.x += player.vx * frame;
    player.y += player.vy * frame;

    const nextHeight = crouch ? 22 : 34;
    if (nextHeight !== player.h) {
      player.y += player.h - nextHeight;
      player.h = nextHeight;
    }
    player.crouch = crouch;

    this.updateQuestionGates(input);
    this.collideWithPlatforms(frame, moveDirection);
    this.applySprings();
    this.applyLaunchPads();
    this.updateAnimation(frame);
    this.updateBoxes(frame);
    this.pushBoxes();
    this.updateSwitches();
    this.updateSpikes();
    this.updateEnemies(frame);
    this.updateCollectibles();
    this.updateCheckpoint();

    if (player.y > this.level.height + 120) {
      this.startDeath();
    }

    this.cameraX = Math.max(0, Math.min(player.x - this.width * 0.42, this.level.width - this.width));
    this.cameraY = Math.max(0, Math.min(player.y - this.height * 0.55, Math.max(0, this.level.height - this.height)));
  }

  updateMovingPlatforms(frame) {
    for (const platform of this.movingPlatforms) {
      const previousX = platform.x;
      const previousY = platform.y;
      const endY = platform.endY === undefined ? platform.baseY : platform.endY;
      const startY = platform.startY === undefined ? platform.baseY : platform.startY;
      const distance = Math.abs(platform.endX - platform.startX) + Math.abs(endY - startY);
      const period = Math.max(1, distance / platform.speed);
      const progress = (Math.sin((this.elapsed + platform.phase * 0.01) * Math.PI * 2 / period) + 1) / 2;
      platform.x = platform.baseX + (platform.endX - platform.startX) * progress;
      platform.y = platform.baseY + (endY - startY) * progress;
      platform.dx = platform.x - previousX;
      platform.dy = platform.y - previousY;
    }

    const player = this.player;
    if (player && player.onGround && player.groundPlatform && player.groundPlatform.moving) {
      player.x += player.groundPlatform.dx || 0;
      player.y += player.groundPlatform.dy || 0;
    }
  }

  collideWithPlatforms(frame, moveDirection) {
    const player = this.player;
    player.onGround = false;
    player.groundKind = "normal";
    player.groundPlatform = null;

    const solids = this.platforms.map((platform) => ({ ...platform, moving: false, dx: 0, dy: 0 }));
    for (const platform of this.movingPlatforms) {
      const current = { ...platform, moving: true };
      solids.push(current);
    }
    for (const door of this.doors) {
      if (!door.open) {
        solids.push({ ...door, kind: "door", moving: false, dx: 0, dy: 0 });
      }
    }

    for (const platform of solids) {
      if (platform.kind === "slope") {
        this.collideSlope(platform);
        continue;
      }

      if (
        player.x + player.w > platform.x &&
        player.x < platform.x + platform.w &&
        player.y + player.h > platform.y &&
        player.y < platform.y + platform.h
      ) {
        const fromTop = player.y + player.h - platform.y;
        const fromBottom = platform.y + platform.h - player.y;
        const fromLeft = player.x + player.w - platform.x;
        const fromRight = platform.x + platform.w - player.x;
        const minOverlap = Math.min(fromTop, fromBottom, fromLeft, fromRight);

        if (minOverlap === fromTop && player.vy >= 0) {
          player.y = platform.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.groundPlatform = platform;
          player.groundKind = platform.kind || "normal";
        } else if (minOverlap === fromBottom && player.vy < 0) {
          player.y = platform.y + platform.h;
          player.vy = 0;
        } else if (minOverlap === fromLeft) {
          player.x = platform.x - player.w;
          player.vx = 0;
        } else {
          player.x = platform.x + platform.w;
          player.vx = 0;
        }
      }
    }

    const friction = player.groundKind === "ice" ? 0.94 : player.groundKind === "sand" ? 0.68 : 0.8;
    if (player.onGround && moveDirection === 0) {
      player.vx *= Math.pow(friction, frame * 60);
    }
  }

  collideSlope(platform) {
    const player = this.player;
    const centerX = player.x + player.w / 2;
    const t = Math.max(0, Math.min(1, (centerX - platform.x) / platform.w));
    const surfaceY = platform.y + (platform.dir > 0 ? (1 - t) : t) * platform.h;

    if (
      centerX > platform.x &&
      centerX < platform.x + platform.w &&
      player.y + player.h > surfaceY - 8 &&
      player.y + player.h < surfaceY + 24 &&
      player.vy >= 0
    ) {
      player.y = surfaceY - player.h;
      player.vy = 0;
      player.onGround = true;
      player.groundKind = "normal";
    }
  }

  applySprings() {
    const player = this.player;
    for (const spring of this.springs) {
      if (this.overlap(player, spring)) {
        player.vy = -spring.strength;
        player.onGround = false;
      }
    }
  }

  applyLaunchPads() {
    const player = this.player;
    if (this.elapsed - (player.launchedAt || -10) < 0.35) return;
    for (const pad of this.launchPads) {
      if (this.overlap(player, pad)) {
        player.vx = Math.cos(pad.angle) * pad.speed;
        player.vy = Math.sin(pad.angle) * pad.speed;
        player.onGround = false;
        player.launchedAt = this.elapsed;
      }
    }
  }

  updateBoxes(frame) {
    for (const box of this.boxes) {
      if (!box.alive) continue;
      box.vy += 1500 * frame;
      box.vy = Math.min(box.vy, 900);
      box.x += box.vx * frame;
      box.y += box.vy * frame;
      box.onGround = false;

      for (const platform of this.platforms) {
        if (
          box.x + box.w > platform.x &&
          box.x < platform.x + platform.w &&
          box.y + box.h > platform.y &&
          box.y < platform.y + platform.h
        ) {
          const fromTop = box.y + box.h - platform.y;
          if (fromTop < 18 && box.vy >= 0) {
            box.y = platform.y - box.h;
            box.vy = 0;
            box.onGround = true;
          }
        }
      }

      if (box.onGround) {
        box.vx *= Math.pow(0.72, frame * 60);
        if (Math.abs(box.vx) < 8) {
          box.vx = 0;
        }
      }
    }
  }

  pushBoxes() {
    const player = this.player;
    for (const box of this.boxes) {
      if (!box.alive || !this.overlap(player, box)) continue;

      const pushFromLeft = player.x + player.w / 2 < box.x + box.w / 2;
      const pushX = pushFromLeft ? player.x + player.w - box.x : box.x + box.w - player.x;
      const pushY = player.y + player.h - box.y;
      if (pushY > 8) {
        box.x += pushX * 0.5;
        box.vx = player.facing * 190;
      }
    }
  }

  updateSwitches() {
    for (const sw of this.switches) {
      sw.active = this.overlap(this.player, sw) || this.boxes.some((box) => box.alive && this.overlap(box, sw));
      if (sw.latch && sw.active) {
        sw.latched = true;
      }
      sw.active = sw.active || sw.latched;
      const door = this.doors.find((item) => item.id === sw.target);
      if (door) {
        door.open = sw.active;
      }
    }
  }

  updateQuestionGates(input) {
    if (!this.activeQuestion) {
      for (const gate of this.questionGates) {
        if (!gate.solved && this.overlap(this.player, gate)) {
          this.activeQuestion = gate;
          this.callbacks.onQuestion && this.callbacks.onQuestion(gate);
          break;
        }
      }
    }

  }

  answerQuestion(selected) {
    const gate = this.activeQuestion;
    if (!gate) return false;
    if (selected === gate.answer) {
      gate.solved = true;
      const door = this.doors.find((item) => item.id === gate.doorId);
      if (door) door.open = true;
      this.activeQuestion = null;
      this.callbacks.onToast && this.callbacks.onToast("定律掌握，通路已开启");
      this.callbacks.onQuestionAnswered && this.callbacks.onQuestionAnswered(true);
      return true;
    }
    this.callbacks.onQuestionAnswered && this.callbacks.onQuestionAnswered(false);
    gate.wrongCount = (gate.wrongCount || 0) + 1;
    if (gate.wrongCount >= 2) {
      this.activeQuestion = null;
      this.startDeath();
    }
    return false;
  }

  updateSpikes() {
    for (const spike of this.spikes) {
      if (this.overlap(this.player, spike)) {
        this.damagePlayer(1, 220, 140);
      }
    }
  }

  updateEnemies(frame) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.flash = Math.max(0, enemy.flash - frame);
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - frame);

      if (enemy.type === "boss") {
        enemy.animTimer += frame;
        const duration = enemy.flash > 0 ? 0.16 : 0.22;
        if (enemy.animTimer >= duration) {
          enemy.animTimer = 0;
          enemy.animFrame = (enemy.animFrame + 1) % (enemy.flash > 0 ? 2 : 4);
        }
      }

      if (enemy.type === "flyer") {
        const range = enemy.range || 200;
        enemy.y = enemy.baseY + Math.sin(this.elapsed * 1.6) * range * 0.5;
      } else if (enemy.type === "boss") {
        enemy.x += enemy.dir * (enemy.speed || 110) * frame;
        if (enemy.x < enemy.baseX - (enemy.range || 300) || enemy.x > enemy.baseX + (enemy.range || 300)) {
          enemy.dir *= -1;
        }
      } else {
        enemy.x += enemy.dir * 90 * frame;
        if (enemy.x < enemy.baseX - enemy.range || enemy.x > enemy.baseX + enemy.range) {
          enemy.dir *= -1;
        }
      }

      if (!this.overlap(this.player, enemy)) continue;

      const stomp = enemy.type === "boss" && this.player.vy > 120 && this.player.y + this.player.h - enemy.y < 30;
      if (stomp) {
        enemy.hp -= 1;
        enemy.flash = 0.5;
        enemy.x += enemy.dir * -90;
        this.player.vy = -480;
        if (enemy.hp <= 0) {
          enemy.alive = false;
          this.callbacks.onBossDefeated && this.callbacks.onBossDefeated();
        }
      } else if (enemy.attackCooldown <= 0) {
        this.damagePlayer(1, enemy.type === "boss" ? 320 : 180, 160);
        enemy.attackCooldown = 0.8;
      }
    }
  }

  updateCollectibles() {
    const player = this.player;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    for (const star of this.stars) {
      if (!star.collected && Math.hypot(star.x - centerX, star.y - centerY) < 34) {
        star.collected = true;
        this.collected += 1;
        this.callbacks.onCollect && this.callbacks.onCollect(this.collected);
      }
    }

    if (!this.fragment.found && Math.hypot(this.fragment.x - centerX, this.fragment.y - centerY) < 36) {
      this.fragment.found = true;
      this.fragmentFound = true;
      this.callbacks.onFragment && this.callbacks.onFragment();
    }

    if (Math.hypot(this.core.x - centerX, this.core.y - centerY) < 46) {
      this.completeLevel();
    }
  }

  updateCheckpoint() {
    const player = this.player;
    for (let i = this.checkpoints.length - 1; i > this.currentCheckpoint; i -= 1) {
      const point = this.checkpoints[i];
      if (Math.hypot(player.x + player.w / 2 - point.x, player.y + player.h / 2 - point.y) < 48) {
        this.currentCheckpoint = i;
        this.callbacks.onToast && this.callbacks.onToast("检查点已更新");
        break;
      }
    }
  }

  tryInteract() {
    const player = this.player;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    for (const gate of this.questionGates) {
      if (!gate.solved && this.overlap(this.player, gate)) {
        this.activeQuestion = gate;
        this.callbacks.onToast && this.callbacks.onToast("按下 1/2/3 选择答案");
        return;
      }
    }

    if (Math.hypot(this.core.x - centerX, this.core.y - centerY) < 70) {
      this.completeLevel();
      return;
    }

    if (Math.hypot(this.fragment.x - centerX, this.fragment.y - centerY) < 70 && !this.fragment.found) {
      this.fragment.found = true;
      this.fragmentFound = true;
      this.callbacks.onFragment && this.callbacks.onFragment();
      return;
    }

    this.callbacks.onToast && this.callbacks.onToast("附近没有可互动机关");
  }

  completeLevel() {
    if (this.completed) return;
    this.completed = true;
    this.celebrationTime = 0;
    this.shake = 1.6;
    this.callbacks.onComplete && this.callbacks.onComplete({
      deaths: this.deaths,
      elapsed: this.elapsed,
      collected: this.collected,
      fragmentFound: this.fragmentFound
    });
  }

  damagePlayer(damage, knockX = 0, knockY = 0) {
    if (this.invulnerableTimer > 0) return;
    this.hearts = Math.max(0, this.hearts - damage);
    if (this.hearts <= 0) {
      this.startDeath();
      return;
    }
    this.invulnerableTimer = 1.1;
    this.player.vx = this.player.facing * -knockX;
    this.player.vy = -knockY;
    this.callbacks.onHearts && this.callbacks.onHearts(this.hearts);
  }

  startDeath() {
    if (this.dying || !this.player) return;
    this.dying = true;
    this.deathTimer = 0;
    this.deaths += 1;
    this.shake = 1;
    this.deathParticles = [];
    const colors = ["#ff6b57", "#ffd166", "#2fd6c3", "#ffffff", "#7bd88f"];
    for (let i = 0; i < 26; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 220;
      this.deathParticles.push({
        x: this.player.x + this.player.w / 2,
        y: this.player.y + this.player.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 140,
        size: 3 + Math.random() * 6,
        color: colors[i % colors.length],
        life: 0.65 + Math.random() * 0.35
      });
    }
    this.callbacks.onHearts && this.callbacks.onHearts(0);
    this.callbacks.onDeaths && this.callbacks.onDeaths(this.deaths);
  }

  updateDeath(frame) {
    this.deathTimer += frame;
    this.shake = Math.max(0, this.shake - frame * 2.2);
    for (const particle of this.deathParticles) {
      particle.x += particle.vx * frame;
      particle.y += particle.vy * frame;
      particle.vy += 900 * frame;
      particle.life -= frame;
    }
    if (this.deathTimer >= 0.9) {
      this.resetPlayer();
      this.callbacks.onToast && this.callbacks.onToast("已返回检查点");
    }
  }

  respawn(fromFall) {
    if (fromFall) {
      this.deaths += 1;
    }
    this.resetPlayer();
    if (fromFall) {
      this.callbacks.onDeaths && this.callbacks.onDeaths(this.deaths);
    }
  }

  overlap(a, b) {
    return (
      a.x + a.w > b.x &&
      a.x < b.x + b.w &&
      a.y + a.h > b.y &&
      a.y < b.y + b.h
    );
  }

  render() {
    const ctx = this.ctx;
    const accent = this.chapter ? this.chapter.accent : "#2fd6c3";
    if (this.intro) {
      this.renderIntro();
      return;
    }
    ctx.save();
    const scale = this.canvas.width / this.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#101820");
    sky.addColorStop(0.55, "#1b2d35");
    sky.addColorStop(1, "#2b3a40");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    const shakeX = (Math.random() - 0.5) * this.shake * 14;
    const shakeY = (Math.random() - 0.5) * this.shake * 10;
    ctx.translate(-this.cameraX + shakeX, -this.cameraY + shakeY);
    this.drawGrid();
    this.drawDecorations(accent);
    this.drawPlatforms(accent);
    this.drawSprings();
    this.drawLaunchPads();
    this.drawSwitches();
    this.drawQuestionGates();
    this.drawDoors(accent);
    this.drawSpikes();
    this.drawBoxes();
    this.drawEnemies();
    this.drawCheckpoints();
    this.drawStars();
    this.drawFragment();
    this.drawCore(accent);
    if (!this.dying) {
      this.drawPlayer(accent);
    } else {
      this.drawDeathParticles();
    }
    this.drawCompletionEffect(accent);
    ctx.restore();

    this.drawCompletionScreenEffect();
    this.drawTopStatus();
    ctx.restore();
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.level.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.level.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.level.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.level.width, y);
      ctx.stroke();
    }
  }

  drawDecorations(accent) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 10; i += 1) {
      const x = (i * 227 + 40) % this.level.width;
      const y = 420 + ((i * 73) % 300);
      ctx.fillRect(x, y, 34, 5);
    }
    ctx.fillStyle = accent + "22";
    ctx.fillRect(120, 220, 420, 10);
    ctx.fillRect(1100, 320, 520, 10);
  }

  drawPlatforms(accent) {
    const ctx = this.ctx;
    const drawPlatform = (platform) => {
      if (platform.kind === "slope") {
        ctx.fillStyle = "#9e8b6a";
        ctx.beginPath();
        if (platform.dir > 0) {
          ctx.moveTo(platform.x, platform.y + platform.h);
          ctx.lineTo(platform.x + platform.w, platform.y);
        } else {
          ctx.moveTo(platform.x, platform.y);
          ctx.lineTo(platform.x + platform.w, platform.y + platform.h);
        }
        ctx.lineTo(platform.x + platform.w, platform.y + platform.h);
        ctx.lineTo(platform.x, platform.y + platform.h);
        ctx.closePath();
        ctx.fill();
        return;
      }

      const color = platform.kind === "ice" ? "#aee9ff" : platform.kind === "sand" ? "#d7b878" : platform.kind === "moon" ? "#c8d3dc" : platform.kind === "mars" ? "#b96a4b" : platform.kind === "ceiling" ? "rgba(30,40,52,0.9)" : "#5d8f63";
      ctx.fillStyle = color;
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(platform.x, platform.y, platform.w, 6);
      ctx.strokeStyle = "rgba(10,14,18,0.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
    };

    this.platforms.forEach(drawPlatform);
    this.movingPlatforms.forEach(drawPlatform);
  }

  drawSprings() {
    const ctx = this.ctx;
    for (const spring of this.springs) {
      ctx.fillStyle = "#3f3a46";
      ctx.fillRect(spring.x, spring.y + 18, spring.w, spring.h - 18);
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 5; i += 1) {
        const y = spring.y + 2 + i * 3.2;
        ctx.lineTo(spring.x + (i % 2 === 0 ? 6 : spring.w - 6), y);
      }
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(spring.x, spring.y, spring.w, 8);
    }
  }

  drawLaunchPads() {
    const ctx = this.ctx;
    for (const pad of this.launchPads) {
      ctx.fillStyle = "#7bd88f";
      ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(pad.x + 6, pad.y + 4, pad.w - 12, 8);
      ctx.strokeStyle = "#2b6b3c";
      ctx.lineWidth = 2;
      ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
    }
  }

  drawSwitches() {
    const ctx = this.ctx;
    for (const sw of this.switches) {
      ctx.fillStyle = sw.active ? "#7bd88f" : "#b86464";
      ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(sw.x + 5, sw.y + 5, sw.w - 10, 7);
    }
  }

  drawQuestionGates() {
    const ctx = this.ctx;
    for (const gate of this.questionGates) {
      if (gate.solved) {
        ctx.strokeStyle = "rgba(123,216,143,0.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
        continue;
      }
      const cx = gate.x + gate.w / 2;
      const gradient = ctx.createLinearGradient(gate.x, gate.y, gate.x + gate.w, gate.y);
      gradient.addColorStop(0, "rgba(76,124,255,0.18)");
      gradient.addColorStop(0.5, "rgba(160,190,255,0.42)");
      gradient.addColorStop(1, "rgba(76,124,255,0.18)");
      ctx.fillStyle = gradient;
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      ctx.strokeStyle = "rgba(180,210,255,0.6)";
      ctx.lineWidth = 3;
      ctx.strokeRect(gate.x + 2, gate.y + 2, gate.w - 4, gate.h - 4);
      const waveY = gate.y + ((this.elapsed * 70 + gate.x) % gate.h);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(gate.x + 4, waveY, gate.w - 8, 26);
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(this.elapsed * 4) * 0.25;
      ctx.fillStyle = "#fff";
      ctx.font = "700 24px 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", cx, gate.y + 70);
      ctx.fillText("知识屏障", cx, gate.y + 106);
      ctx.restore();
      for (let i = 0; i < 4; i += 1) {
        const py = gate.y + ((i * 213 + this.elapsed * 36) % gate.h);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(gate.x + 8 + (i % 2) * 6, py, 3, 3);
      }
  }
  }

  drawQuestionPanel() {
    if (!this.activeQuestion) return;
    const ctx = this.ctx;
    const gate = this.activeQuestion;
    ctx.fillStyle = "rgba(10,14,18,0.78)";
    ctx.fillRect(0, 0, this.width, this.height);

    const panelX = this.width / 2 - 300;
    const panelY = this.height / 2 - 150;
    ctx.fillStyle = "#222a35";
    ctx.fillRect(panelX, panelY, 600, 300);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, 600, 300);

    ctx.fillStyle = "#ffd166";
    ctx.font = "700 18px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("知识校验：请用刚学到的定律作答", this.width / 2, panelY + 34);

    ctx.fillStyle = "#fff";
    ctx.font = "15px 'Microsoft YaHei', sans-serif";
    this.wrapText(ctx, gate.question, panelX + 30, panelY + 80, 540, 24);

    gate.options.forEach((option, index) => {
      const y = panelY + 140 + index * 42;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(panelX + 30, y, 540, 34);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.strokeRect(panelX + 30, y, 540, 34);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText(`${index + 1}. ${option}`, panelX + 44, y + 23);
    });

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "center";
    ctx.fillText("按数字键 1 / 2 / 3 选择答案", this.width / 2, panelY + 280);
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = Array.from(text);
    let line = "";
    let currentY = y;
    for (const char of chars) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = char;
        currentY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, currentY);
  }

  drawDoors(accent) {
    const ctx = this.ctx;
    for (const door of this.doors) {
      if (this.questionGates.some((gate) => gate.doorId === door.id)) continue;
      if (door.open) {
        ctx.strokeStyle = "rgba(123,216,143,0.75)";
        ctx.lineWidth = 3;
        ctx.strokeRect(door.x - 8, door.y, door.w + 16, door.h);
        continue;
      }
      ctx.fillStyle = "#435062";
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(door.x + 5, door.y + 5, door.w - 10, door.h - 10);
    }
  }

  drawSpikes() {
    const ctx = this.ctx;
    for (const spike of this.spikes) {
      ctx.fillStyle = "#d9d9d9";
      ctx.beginPath();
      ctx.moveTo(spike.x, spike.y + spike.h);
      ctx.lineTo(spike.x + spike.w / 2, spike.y);
      ctx.lineTo(spike.x + spike.w, spike.y + spike.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawBoxes() {
    const ctx = this.ctx;
    for (const box of this.boxes) {
      if (!box.alive) continue;
      ctx.fillStyle = box.kind === "metal" ? "#7d8794" : "#b9835a";
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = "rgba(10,14,18,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(box.x + 4, box.y + 4, box.w - 8, 5);
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.flash > 0) {
        ctx.globalAlpha = 0.4;
      }
      if (enemy.type === "boss") {
        const sprite = this.bossSprites.get(enemy.spriteId);
        if (sprite) {
          this.drawBossSprite(enemy, sprite);
        } else {
          ctx.fillStyle = "#4a5a72";
          ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
          ctx.fillStyle = "#ff6b57";
          ctx.fillRect(enemy.x + 10, enemy.y + 16, 16, 16);
          ctx.fillStyle = "#fff";
          ctx.fillRect(enemy.x + 14, enemy.y + 22, 5, 6);
          ctx.fillRect(enemy.x + 31, enemy.y + 22, 5, 6);
        }
        this.drawBossHealth(enemy);
      } else {
        ctx.fillStyle = "#c07bd8";
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
        ctx.fillStyle = "#fff";
        ctx.fillRect(enemy.x + 5, enemy.y + 6, 6, 6);
        ctx.fillRect(enemy.x + enemy.w - 11, enemy.y + 6, 6, 6);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawBossSprite(enemy, sprite) {
    const ctx = this.ctx;
    const frameIndex = this.getBossFrameIndex(enemy);
    const cell = 64;
    const columns = 8;
    const sx = (frameIndex % columns) * cell;
    const sy = Math.floor(frameIndex / columns) * cell;
    const centerX = enemy.x + enemy.w / 2;
    const bottom = enemy.y + enemy.h;
    const drawWidth = enemy.w * 2.3;
    const drawHeight = enemy.h * 2.3;
    ctx.drawImage(
      sprite,
      sx,
      sy,
      cell,
      cell,
      centerX - drawWidth / 2,
      bottom - drawHeight,
      drawWidth,
      drawHeight
    );
  }

  drawBossHealth(enemy) {
    const ctx = this.ctx;
    const barWidth = 90;
    const x = enemy.x + enemy.w / 2 - barWidth / 2;
    const y = enemy.y - 18;
    ctx.fillStyle = "rgba(10,14,18,0.6)";
    ctx.fillRect(x, y, barWidth, 9);
    ctx.fillStyle = "#ff5f6d";
    ctx.fillRect(x, y, barWidth * (enemy.hp / 3), 9);
  }

  drawCheckpoints() {
    const ctx = this.ctx;
    this.checkpoints.forEach((point, index) => {
      const active = index <= this.currentCheckpoint;
      ctx.fillStyle = active ? "#ffd166" : "rgba(255,255,255,0.3)";
      ctx.fillRect(point.x - 4, point.y - 34, 8, 34);
      ctx.beginPath();
      ctx.moveTo(point.x + 4, point.y - 34);
      ctx.lineTo(point.x + 34, point.y - 25);
      ctx.lineTo(point.x + 4, point.y - 16);
      ctx.closePath();
      ctx.fill();
    });
  }

  drawStars() {
    const ctx = this.ctx;
    for (const star of this.stars) {
      if (star.collected) continue;
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.fillStyle = "#ffd166";
      ctx.strokeStyle = "#a86f00";
      ctx.lineWidth = 2;
      this.starPath(0, 0, 14, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  starPath(cx, cy, outer, inner) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  drawFragment() {
    const ctx = this.ctx;
    if (this.fragment.found) return;
    ctx.save();
    ctx.translate(this.fragment.x, this.fragment.y);
    ctx.fillStyle = "#8fd3ff";
    ctx.strokeStyle = "#1b5f84";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawCore(accent) {
    const ctx = this.ctx;
    const core = this.core;
    const t = this.elapsed;
    const completed = this.completed;
    const gold = completed ? "#ffd166" : accent;

    const aura = ctx.createRadialGradient(core.x, core.y, 2, core.x, core.y, 92);
    aura.addColorStop(0, completed ? "rgba(255,232,150,0.95)" : "rgba(255,255,255,0.45)");
    aura.addColorStop(0.45, completed ? "rgba(255,209,102,0.34)" : `${accent}55`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(core.x, core.y);
    ctx.rotate(t * 0.55);
    ctx.strokeStyle = completed ? "rgba(255,224,130,0.95)" : `rgba(255,255,255,0.75)`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-t * 1.1);
    ctx.strokeStyle = completed ? "rgba(255,255,255,0.9)" : `${accent}aa`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2 + t * 0.8;
      const radius = 52 + Math.sin(t * 2 + i) * 5;
      const x = core.x + Math.cos(angle) * radius;
      const y = core.y + Math.sin(angle) * radius;
      ctx.fillStyle = completed ? "#fff7d6" : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const crystal = ctx.createLinearGradient(core.x, core.y - 26, core.x, core.y + 26);
    crystal.addColorStop(0, "#ffffff");
    crystal.addColorStop(0.5, gold);
    crystal.addColorStop(1, completed ? "#b8860b" : accent);
    ctx.fillStyle = crystal;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(core.x, core.y - 26);
    ctx.lineTo(core.x + 16, core.y);
    ctx.lineTo(core.x, core.y + 26);
    ctx.lineTo(core.x - 16, core.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = completed ? "#fff3b0" : "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(core.x, core.y - 12);
    ctx.lineTo(core.x + 7, core.y);
    ctx.lineTo(core.x, core.y + 12);
    ctx.lineTo(core.x - 7, core.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = completed ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(core.x - 24, core.y - 8);
    ctx.lineTo(core.x - 34, core.y);
    ctx.lineTo(core.x - 24, core.y + 8);
    ctx.moveTo(core.x + 24, core.y - 8);
    ctx.lineTo(core.x + 34, core.y);
    ctx.lineTo(core.x + 24, core.y + 8);
    ctx.stroke();
  }

  drawPlayer() {
    const ctx = this.ctx;
    const player = this.player;
    const palette = Save.getActiveSkin().palette;
    const x = player.x;
    const y = player.y;
    const w = player.w;
    const h = player.h;
    const centerX = x + w / 2;
    const bottom = y + h;
    const facing = player.facing || 1;
    const bob = player.onGround ? Math.sin(this.elapsed * 8) * 0.6 : 0;
    const capeDir = facing > 0 ? -1 : 1;

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.ellipse(centerX, bottom + 3, w * 0.78, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.invulnerableTimer > 0 && Math.floor(this.elapsed * 12) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    if (this.characterSpriteLoaded && this.characterSprite) {
      const index = this.getCharacterFrameIndex();
      const cell = 64;
      const columns = 8;
      const sx = (index % columns) * cell;
      const sy = Math.floor(index / columns) * cell;
      ctx.save();
      ctx.translate(centerX, bottom + 1);
      ctx.scale(player.facing, 1);
      ctx.drawImage(this.characterSprite, sx, sy, cell, cell, -w * 0.58, -h - 4, w * 1.16, h * 1.2);
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }

    const stretch = Math.min(0.2, Math.abs(player.vy || 0) / 900);
    const scaleY = player.onGround ? 0.94 + stretch * 0.35 : 1 + stretch;
    const scaleX = 1 / scaleY;

    ctx.save();
    ctx.translate(centerX, bottom + bob);
    ctx.scale(scaleX, scaleY);

    // Flowing cape/scarf behind the body.
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.moveTo(capeDir * w * 0.05, -h * 0.52);
    ctx.quadraticCurveTo(capeDir * w * 0.72, -h * 0.42, capeDir * w * 1.05, -h * 0.06);
    ctx.quadraticCurveTo(capeDir * w * 0.55, -h * 0.24, capeDir * w * 0.1, -h * 0.14);
    ctx.closePath();
    ctx.fill();

    // Feet.
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.roundRect(-w * 0.42, -4, w * 0.34, h * 0.13, 3);
    ctx.roundRect(w * 0.08, -4, w * 0.34, h * 0.13, 3);
    ctx.fill();

    // Body.
    const bodyGradient = ctx.createLinearGradient(0, -h + 8, 0, 0);
    bodyGradient.addColorStop(0, palette.light);
    bodyGradient.addColorStop(1, palette.dark);
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h + 9, w - 4, h - 8, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(16,20,28,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hood.
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h + 8);
    ctx.quadraticCurveTo(0, -h - 6, w / 2 - 2, -h + 8);
    ctx.lineTo(w / 2 - 3, -h + 15);
    ctx.quadraticCurveTo(0, -h + 20, -w / 2 + 3, -h + 15);
    ctx.closePath();
    ctx.fill();

    // Face shadow inside the hood.
    ctx.fillStyle = "#1b2430";
    ctx.beginPath();
    ctx.ellipse(0, -h + 16, w * 0.31, h * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Big expressive eyes.
    const eyeY = -h + 16;
    const eyeOffset = facing > 0 ? 2 : -2;
    ctx.fillStyle = palette.eye;
    ctx.beginPath();
    ctx.arc(-3.5 + eyeOffset, eyeY, 4.1, 0, Math.PI * 2);
    ctx.arc(3.5 + eyeOffset, eyeY, 4.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.pupil;
    ctx.beginPath();
    ctx.arc(-3 + eyeOffset, eyeY + 0.7, 2.1, 0, Math.PI * 2);
    ctx.arc(4 + eyeOffset, eyeY + 0.7, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(-2.2 + eyeOffset, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.arc(4.8 + eyeOffset, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Soft cheeks.
    ctx.fillStyle = "rgba(255,120,120,0.25)";
    ctx.beginPath();
    ctx.arc(-7, -h * 0.33, 2.1, 0, Math.PI * 2);
    ctx.arc(7, -h * 0.33, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Scarf stripe across the neck.
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 3, -h + 19, w - 6, 5, 3);
    ctx.fill();

    // Small badge on the chest.
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(0, -h * 0.4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.light;
    ctx.beginPath();
    ctx.arc(-1, -h * 0.4 - 1, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawDeathParticles() {
    const ctx = this.ctx;
    for (const particle of this.deathParticles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 1.6));
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  drawCompletionEffect(accent) {
    if (!this.completed || !this.core) return;
    const ctx = this.ctx;
    const core = this.core;
    const t = this.celebrationTime;

    for (let i = 0; i < 3; i += 1) {
      const radius = 18 + t * 150 + i * 52;
      const alpha = Math.max(0, 1 - t * 0.42 - i * 0.18);
      ctx.strokeStyle = `rgba(255,209,102,${alpha.toFixed(3)})`;
      ctx.lineWidth = 5 - i;
      ctx.beginPath();
      ctx.arc(core.x, core.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 32; i += 1) {
      const angle = (i / 32) * Math.PI * 2 + t * 0.9;
      const radius = 24 + (t * 230) + (i % 6) * 9;
      const x = core.x + Math.cos(angle) * radius;
      const y = core.y + Math.sin(angle) * radius;
      ctx.globalAlpha = Math.max(0, 0.85 - t * 0.26);
      ctx.fillStyle = i % 4 === 0 ? "#fff7d6" : "#ffd166";
      ctx.fillRect(x - 5, y - 5, 10, 10);
    }

    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2 + t * 1.4;
      const radius = 34 + Math.sin(t * 6 + i) * 8;
      const x = core.x + Math.cos(angle) * radius;
      const y = core.y + Math.sin(angle) * radius;
      ctx.globalAlpha = Math.max(0, 0.75 - t * 0.3);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawCompletionScreenEffect() {
    if (!this.completed || !this.core) return;
    const ctx = this.ctx;
    const t = this.celebrationTime;
    const coreX = this.core.x - this.cameraX;
    const coreY = this.core.y - this.cameraY;
    const flashAlpha = Math.max(0, 1 - t * 1.25);

    const flash = ctx.createRadialGradient(coreX, coreY, 10, coreX, coreY, Math.max(this.width, this.height) * 0.72);
    flash.addColorStop(0, `rgba(255,235,150,${(0.52 * flashAlpha).toFixed(3)})`);
    flash.addColorStop(1, "rgba(255,220,100,0)");
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(coreX, coreY);
    ctx.rotate(t * 1.1);
    ctx.globalAlpha = Math.max(0, flashAlpha * 0.65);
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i < 10; i += 1) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(34, -9);
      ctx.lineTo(26, 0);
      ctx.lineTo(34, 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawTopStatus() {
    const ctx = this.ctx;
    const player = this.player;
    ctx.fillStyle = "rgba(10,14,18,0.66)";
    ctx.fillRect(0, 0, this.width, 62);
    ctx.fillStyle = "#fff";
    ctx.font = "700 15px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${this.level.name} · ${this.level.role || "关卡"}`, this.width / 2, 20);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px 'Microsoft YaHei', sans-serif";
    ctx.fillText(`时间 ${Math.floor(this.elapsed)}s · 死亡 ${this.deaths} 次`, this.width / 2, 35);

    const currentG = this.currentGravityLabel === "月球" ? 1.63 : this.currentGravityLabel === "火星" ? 3.71 : 9.8;
    ctx.fillStyle = "#ffd166";
    ctx.font = "12px 'Microsoft YaHei', sans-serif";
    ctx.fillText(
      `当前区域：${this.currentGravityLabel} · g≈${currentG} N/kg · 质量 50kg · 重量 ${(50 * currentG).toFixed(1)}N`,
      this.width / 2,
      52
    );

    if (this.completed) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 22px 'Microsoft YaHei', sans-serif";
      ctx.fillText("法则核心已稳定", this.width / 2, 66);
    }

    if (this.dying) {
      ctx.fillStyle = "#ff5f6d";
      ctx.font = "800 18px 'Microsoft YaHei', sans-serif";
      ctx.fillText("重新锚定中...", this.width / 2, 66);
    }

    if (Input.isDown("F3")) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`POS ${Math.round(player.x)},${Math.round(player.y)}`, 12, 64);
      ctx.fillText(`HP ${this.hearts}/10`, 12, 80);
      ctx.fillText(`FRAGMENT ${this.fragmentFound}`, 12, 96);
    }
  }

  startIntro(chapter, levelMeta, steps, onDone) {
    this.chapter = chapter;
    this.levelMeta = levelMeta;
    this.level = getLevelDef(chapter.id, levelMeta.id);
    this.player = null;
    this.completed = false;
    this.loadSprites();
    if (!this.newtonImage) {
      this.newtonImage = new Image();
      this.newtonImage.src = NEWTON_SPRITE;
    }
    this.intro = { chapter, levelMeta, steps, index: 0, onDone, elapsed: 0, newtonX: 660, playerX: 420, playerY: 700, newtonY: 690, formulaIndex: 0, formulaWrong: 0, done: false };
  }
  finishIntro() {
    const intro = this.intro;
    if (!intro) return;
    this.intro = null;
    if (intro.onDone) intro.onDone();
  }
  updateIntro(frame, input) {
    const intro = this.intro;
    intro.elapsed += frame;
    const step = intro.steps[intro.index];
    if (!step) { this.finishIntro(); return; }
    if (step.type === "choice") {
      for (let i = 1; i <= 3; i += 1) {
        if (input.wasPressed(`Digit${i}`) || input.wasPressed(`Numpad${i}`)) {
          if (step.answer === null || i - 1 === step.answer) this.advanceIntro();
          else this.callbacks.onToast && this.callbacks.onToast("再想想看");
          return;
        }
      }
    } else if (step.type === "formula") {
      for (let i = 1; i <= 5; i += 1) {
        if (input.wasPressed(`Digit${i}`) || input.wasPressed(`Numpad${i}`)) {
          const selected = step.options[i - 1];
          if (selected === step.answers[intro.formulaIndex]) {
            intro.formulaIndex += 1; intro.formulaWrong = 0;
            if (intro.formulaIndex >= step.answers.length) this.advanceIntro();
          } else {
            intro.formulaWrong += 1;
            if (intro.formulaWrong >= 2) { intro.formulaIndex = 0; intro.formulaWrong = 0; this.callbacks.onToast && this.callbacks.onToast("符号错乱，法则重置"); }
            else this.callbacks.onToast && this.callbacks.onToast("符号位置不对");
          }
          return;
        }
      }
    } else {
      if (input.wasPressed("Space") || input.wasPressed("Enter")) this.advanceIntro();
    }
    intro.newtonX = 640 + Math.sin(intro.elapsed * 1.4) * 12;
    intro.playerX = 420 + Math.sin(intro.elapsed * 0.9) * 6;
  }
  advanceIntro() {
    const intro = this.intro;
    intro.index += 1; intro.formulaIndex = 0; intro.formulaWrong = 0;
    if (intro.index >= intro.steps.length) this.finishIntro();
  }
  renderIntro() {
    const ctx = this.ctx; const scale = this.canvas.width / this.width;
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,this.canvas.width,this.canvas.height); ctx.setTransform(scale,0,0,scale,0,0);
    const step = this.intro.steps[this.intro.index] || {}; const scene = step.scene || "earth";
    const sky = ctx.createLinearGradient(0,0,0,this.height);
    if (scene === "moon") { sky.addColorStop(0,"#0b1020"); sky.addColorStop(1,"#2d3542"); }
    else if (scene === "mars") { sky.addColorStop(0,"#2a0f12"); sky.addColorStop(1,"#6b3a2f"); }
    else { sky.addColorStop(0,"#7cc6e8"); sky.addColorStop(1,"#b7e0a3"); }
    ctx.fillStyle = sky; ctx.fillRect(0,0,this.width,this.height);
    ctx.fillStyle = scene === "moon" ? "#aeb6bd" : scene === "mars" ? "#a04b35" : "#5d8f63"; ctx.fillRect(0,780,this.width,120);
    this.drawIntroDecor(scene);
    this.drawIntroPerson(this.intro.playerX, this.intro.playerY, "player", step.frame);
    this.drawIntroPerson(this.intro.newtonX, this.intro.newtonY, "newton", step.frame);
    const speaker = step.speaker || "牛顿";
    const x = speaker === "玩家" ? this.intro.playerX : this.intro.newtonX;
    const y = speaker === "玩家" ? this.intro.playerY : this.intro.newtonY;
    this.drawIntroBubble(x, y, step.text || "", step);
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "12px 'Microsoft YaHei', sans-serif"; ctx.textAlign = "center";
    ctx.fillText(step.type === "choice" ? "按数字键 1/2/3 选择" : step.type === "formula" ? "按数字键选择符号" : "按空格继续", this.width / 2, this.height - 16);
    ctx.restore();
  }
  drawIntroDecor(scene) {
    const ctx = this.ctx;
    if (scene === "earth") { ctx.fillStyle = "#3d5a3f"; ctx.fillRect(80,600,140,180); ctx.fillStyle = "#d94f3d"; ctx.beginPath(); ctx.arc(140,590,16,0,Math.PI*2); ctx.fill(); ctx.fillStyle = "#7ec850"; ctx.beginPath(); ctx.arc(120,570,24,0,Math.PI*2); ctx.arc(180,580,20,0,Math.PI*2); ctx.fill(); }
    else if (scene === "moon") { ctx.fillStyle = "#87929b"; ctx.beginPath(); ctx.arc(760,560,70,0,Math.PI*2); ctx.fill(); ctx.fillStyle = "#626d76"; ctx.beginPath(); ctx.arc(740,540,14,0,Math.PI*2); ctx.arc(790,585,9,0,Math.PI*2); ctx.fill(); }
    else { ctx.fillStyle = "#7a4a36"; ctx.beginPath(); ctx.moveTo(180,800); ctx.lineTo(280,500); ctx.lineTo(380,800); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#b85a3d"; ctx.beginPath(); ctx.moveTo(520,800); ctx.lineTo(620,560); ctx.lineTo(720,800); ctx.closePath(); ctx.fill(); }
  }
  drawIntroPerson(x, y, who, frameId) {
    const ctx = this.ctx;
    if (who === "player" && this.characterSpriteLoaded) { ctx.drawImage(this.characterSprite, 0, 0, 64, 64, x - 60, y - 120, 120, 120); return; }
    if (who === "newton" && this.newtonImage && this.newtonImage.complete) {
      const frame = (NEWTON_FRAMES.find((item) => item.id === frameId) || NEWTON_FRAMES[0]).index;
      const col = (frame - 1) % NEWTON_FRAME_COLS; const row = Math.floor((frame - 1) / NEWTON_FRAME_COLS);
      ctx.drawImage(this.newtonImage, col * NEWTON_FRAME_W, row * NEWTON_FRAME_H, NEWTON_FRAME_W, NEWTON_FRAME_H, x - 80, y - 160, 160, 260);
    }
  }
  drawIntroBubble(x, y, text, step) {
    const ctx = this.ctx;
    const hasOptions = step.type === "choice" || step.type === "formula";
    const width = Math.min(480, this.width - 72);
    const height = hasOptions ? 172 : 116;
    const bx = Math.max(20, Math.min(x - width / 2, this.width - width - 20));
    const by = y - 320;
    ctx.fillStyle = "rgba(16, 22, 30, 0.94)";
    ctx.beginPath(); ctx.roundRect(bx, by, width, height, 18); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 9, by + height); ctx.lineTo(x, by + height + 13); ctx.lineTo(x + 9, by + height); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "15px 'Microsoft YaHei', sans-serif"; ctx.textAlign = "left";
    this.wrapIntroText(ctx, text, bx + 18, by + 32, width - 36, 24);
    this.wrapIntroText(ctx, text, bx + 18, by + 32, width - 36, 24, 2);
    if (step.type === "choice") {
      ctx.fillStyle = "#ffd166"; ctx.font = "13px 'Microsoft YaHei', sans-serif";
      step.options.forEach((option, i) => {
        ctx.fillText(`${i + 1}. ${option}`, bx + 20, by + height - 56 + i * 24);
      });
    } else if (step.type === "formula") {
      ctx.fillStyle = "#2fd6c3"; ctx.font = "15px 'Microsoft YaHei', sans-serif";
      ctx.fillText(step.slots.join(" "), bx + 20, by + height - 78);
      ctx.fillStyle = "#fff"; ctx.font = "12px 'Microsoft YaHei', sans-serif";
      const stepW = Math.min(56, (width - 40) / step.options.length);
      step.options.forEach((option, i) => ctx.fillText(`${i + 1}. ${option}`, bx + 20 + i * stepW, by + height - 42));
    }
  }
  wrapIntroText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = Array.from(text); let line = ""; let currentY = y;
    const maxLines = arguments[6] || 4;
    let lines = 0;
    for (const char of chars) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        lines += 1; line = char; currentY += lineHeight;
        if (lines >= maxLines) return;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, currentY);
  }

  dispose() {
    this.player = null;
  }
}

class AmbientBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.particles = [];
    this.init();
  }

  init() {
    const colors = ["#ff6b57", "#2fd6c3", "#ffd166", "#7bd88f", "#8fd3ff"];
    this.particles = [];
    for (let i = 0; i < 42; i += 1) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 26,
        vy: (Math.random() - 0.2) * 42,
        size: 3 + Math.random() * 7,
        color: colors[i % colors.length],
        type: i % 3 === 0 ? "box" : "dot"
      });
    }
  }

  update(dt) {
    const frame = Math.min(dt, 1 / 30);
    for (const particle of this.particles) {
      particle.x += particle.vx * frame;
      particle.y += particle.vy * frame + 18 * frame;
      if (particle.y > this.height + 20) {
        particle.y = -20;
        particle.x = Math.random() * this.width;
      }
      if (particle.x < -20) particle.x = this.width + 20;
      if (particle.x > this.width + 20) particle.x = -20;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "rgba(14,20,28,0.92)");
    gradient.addColorStop(0.5, "rgba(26,36,46,0.88)");
    gradient.addColorStop(1, "rgba(31,45,52,0.9)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x < this.width; x += 40) {
      ctx.fillRect(x, 0, 1, this.height);
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.fillRect(0, y, this.width, 1);
    }

    for (const particle of this.particles) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = particle.color;
      if (particle.type === "box") {
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
