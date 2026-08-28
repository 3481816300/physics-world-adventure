import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE_URL = "http://127.0.0.1:8000/index.html";
const DEBUG_PORT = 9333;
const LEVELS = process.argv[2]
  ? [process.argv[2]]
  : [
      "1-1",
      "1-2",
      "1-3",
      "1-4",
      "1-5",
      "1-6",
      "1-7",
      "1-8",
      "1-9"
    ];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEndpoint(url, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // target not ready yet
    }
    await sleep(250);
  }
  throw new Error(`CDP endpoint timeout: ${url}`);
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 0;
  const pending = new Map();
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (handler) {
      pending.delete(message.id);
      handler(message);
    }
  });

  async function send(method, params = {}) {
    const id = ++nextId;
    const result = new Promise((resolve) => pending.set(id, resolve));
    ws.send(JSON.stringify({ id, method, params }));
    return result;
  }

  return {
    opened,
    send,
    close() {
      ws.close();
    }
  };
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (response.result && response.result.exceptionDetails) {
    return { error: response.result.exceptionDetails.text || "evaluate error" };
  }
  return response.result ? response.result.result.value : null;
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "physics-adventure-cdp-"));
const browser = spawn(
  EDGE,
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank"
  ],
  { stdio: "ignore" }
);

try {
  await waitForEndpoint(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const page = list.find((item) => item.type === "page");
  if (!page) throw new Error("No CDP page target");

  const client = connectCdp(page.webSocketDebuggerUrl);
  await client.opened;
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  await client.send("Page.navigate", { url: `${BASE_URL}?run=${Date.now()}` });
  await sleep(900);
  const firstRunResult = await evaluate(
    client,
    `(() => {
      const before = Save.isDifficultyLocked();
      App.confirmFirstRun("normal");
      const after = Save.isDifficultyLocked();
      const disabled = Array.from(document.querySelectorAll(".difficulty-btn")).every((button) => button.disabled);
      return { before, after, disabled };
    })()`
  );
  console.log(`firstRun: ${JSON.stringify(firstRunResult)}`);

  const results = [];
  for (const levelId of LEVELS) {
    const url = `${BASE_URL}?run=${Date.now()}#level=1:${levelId}`;
    await client.send("Page.navigate", { url });
    await sleep(1200);
    await evaluate(client, `Save.unlockAdmin("HarryLI@20120622")`);
    const introRender = await evaluate(client, `(() => {
      const r = App.runtime;
      if (!r || !r.intro) return { hasIntro: false };
      const canvas = document.getElementById("gameCanvas");
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBg = 0;
      for (let i = 0; i < data.length; i += 400) {
        if (data[i] !== 28 || data[i + 1] !== 42 || data[i + 2] !== 50) nonBg += 1;
      }
      return { hasIntro: true, index: r.intro.index, player: !!r.player, nonBg };
    })()`);
    console.log(`introRender: ${JSON.stringify(introRender)}`);
    await evaluate(client, `(() => { const r = App.runtime; if (!r || !r.intro || !r.intro.steps.length) return; r.intro.index = Math.min(1, r.intro.steps.length - 1); App.togglePause(); document.getElementById("btn-restart").click(); })()`);
    await sleep(400);
    const restartIntro = await evaluate(client, `(() => { const r = App.runtime; return { hasIntro: !!r.intro, index: r.intro ? r.intro.index : -1, player: !!r.player, paused: App.paused }; })()`);
    console.log(`restartIntro: ${JSON.stringify(restartIntro)}`);
    await evaluate(client, `App.skipChapterIntro()`);
    await sleep(500);

    const started = await evaluate(client, `(() => { const r = App.runtime; return r ? { x: r.player.x, y: r.player.y } : null })()`);
    let bestX = started && started.x ? started.x : 0;
    let final = null;
    const startedAt = Date.now();
    let lastLog = startedAt;

    while (Date.now() - startedAt < 15000) {
      await evaluate(
        client,
        `(() => {
          const r = App.runtime;
          if (!r || !r.player) return;
          if (r.activeQuestion) {
            App.answerKnowledge(r.activeQuestion.answer);
          }
          const p = r.player;
          const lookAhead = 110;
          const solids = [...r.platforms, ...r.movingPlatforms];
          const probeX = p.x + p.w / 2 + lookAhead;
          const below = solids.some((s) =>
            probeX >= s.x && probeX <= s.x + s.w &&
            p.y + p.h > s.y - 28 && p.y + p.h <= s.y + 10
          );
          const ahead = solids.some((s) =>
            probeX >= s.x && probeX <= s.x + s.w &&
            p.y + p.h > s.y - 78 && p.y + p.h <= s.y + 10
          );
          const blockedDoor = r.doors.find((door) => !door.open);
          const relevantSwitch = r.switches[0];
          const pushBox = r.boxes.find(
            (box) => box.alive && relevantSwitch && !r.overlap(box, relevantSwitch)
          );
          const uncollected = r.stars.filter((star) => !star.collected);
          const targets = uncollected.map((star) => star).concat([r.core]);
          const centerX = p.x + p.w / 2;
          const centerY = p.y + p.h / 2;
          targets.sort((a, b) =>
            Math.hypot(a.x - centerX, a.y - centerY) - Math.hypot(b.x - centerX, b.y - centerY)
          );
          const target = targets[0];
          Input.keys.delete("KeyA");
          Input.keys.add("KeyD");
          if (blockedDoor && pushBox) {
            return;
          }
          if (p.onGround && !below) {
            Input.pressed.add("Space");
            Input.keys.add("Space");
          }
        })()`
      );

      final = await evaluate(
        client,
        `(() => {
          const r = App.runtime;
          if (!r || !r.player) return { state: "not-loaded" };
          return {
            x: r.player.x,
            y: r.player.y,
            onGround: r.player.onGround,
            hearts: r.hearts,
            vx: r.player.vx,
            keyD: Input.isDown("KeyD"),
            deaths: r.deaths,
            completed: r.completed,
            collected: r.collected,
            elapsed: r.elapsed
          };
        })()`
      );

      if (final && final.x > bestX) bestX = final.x;
      if (final && final.completed) break;
      if (process.argv[2] && Date.now() - lastLog > 1000) {
        console.log(JSON.stringify(final));
        lastLog = Date.now();
      }
      await sleep(120);
    }

    results.push({ level: levelId, bestX, final });
    console.log(`${levelId}: bestX=${bestX} completed=${final && final.completed} deaths=${final && final.deaths} hearts=${final && final.hearts} vx=${final && final.vx} keyD=${final && final.keyD}`);
    if (final && final.completed && process.argv[2]) {
      await sleep(1500);
      const overlayOpen = await evaluate(
        client,
        `document.getElementById("completionOverlay").classList.contains("is-open")`
      );
      console.log(`overlay: ${overlayOpen}`);
      if (overlayOpen) {
        const screenshot = await client.send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(
          "C:/Users/34818/.codex/visualizations/2026/07/30/019fb19b-2c89-7733-8b56-634789cca7ec/completion-overlay.png",
          Buffer.from(screenshot.result.data, "base64")
        );
      }
    }
  }

  await client.send("Page.navigate", { url: `${BASE_URL}?run=${Date.now()}#level=1:1-2` });
  await sleep(1000);
  await evaluate(client, `App.runtime.invulnerableTimer = 0; App.runtime.damagePlayer(10)`);
  await sleep(150);
  const deathStart = await evaluate(
    client,
    `(() => ({ dying: App.runtime.dying, particles: App.runtime.deathParticles.length, deaths: App.runtime.deaths }))()`
  );
  await sleep(1200);
  const deathEnd = await evaluate(
    client,
    `(() => ({ dying: App.runtime.dying, deaths: App.runtime.deaths, hearts: App.runtime.hearts }))()`
  );
  console.log(`death: ${JSON.stringify({ deathStart, deathEnd })}`);

  await client.send("Page.navigate", { url: `${BASE_URL}?run=${Date.now()}` });
  await sleep(900);
  const adminResult = await evaluate(
    client,
    `(() => {
      const unlocked = Save.unlockAdmin("HarryLI@20120622");
      App.showChapters();
      return {
        unlocked,
        isAdmin: Save.isAdmin(),
        lockedNodes: document.querySelectorAll(".map-node.is-locked").length,
        visibleNodes: document.querySelectorAll(".map-node").length
      };
    })()`
  );
  console.log(`admin: ${JSON.stringify(adminResult)}`);

  const shopResult = await evaluate(
    client,
    `(() => {
      Save.addCurrency(20);
      const purchased = Save.purchaseSouvenir("skin-stardust");
      App.openShop();
      return {
        currency: Save.getCurrency(),
        purchased,
        owned: Save.isSouvenirOwned("skin-stardust"),
        activeSkin: Save.data.activeSkin
      };
    })()`
  );
  console.log(`shop: ${JSON.stringify(shopResult)}`);

  await evaluate(client, `App.openCharacters()`);
  await sleep(1200);
  const characterResult = await evaluate(
    client,
    `(() => ({
        cards: document.querySelectorAll(".character-card").length,
        activeSkin: Save.data.activeSkin,
        previews: UI.characterPreviews.length,
        nonEmpty: Array.from(document.querySelectorAll(".character-preview")).some((canvas) => {
          const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return true;
          }
          return false;
        })
      }))()`
  );
  console.log(`characters: ${JSON.stringify(characterResult)}`);

  await evaluate(client, `UI.openChapterIntro(CHAPTERS[0], () => {})`);
  await sleep(300);
  const introState = await evaluate(
    client,
    `({
      visible: !document.getElementById("chapterIntroModal").hidden,
      expert: document.getElementById("expertName").textContent
    })`
  );
  await evaluate(client, `document.getElementById("btn-intro-continue").click()`);
  await sleep(200);
  const step2Text = await evaluate(
    client,
    `document.querySelector(".expert-line").textContent`
  );
  await evaluate(client, `document.getElementById("btn-intro-skip").click()`);
  console.log(`intro: ${JSON.stringify({ introState, step2Text })}`);

  const accountResult = await evaluate(
    client,
    `(async () => {
      const name = "T" + Math.floor(Math.random() * 100000);
      const registered = await Api.register(name, "1234");
      let duplicateError = "";
      try {
        await Api.register(name, "1234");
      } catch (error) {
        duplicateError = error.message;
      }
      const renamed = await Api.rename(registered.token, name + "R");
      const login = await Api.login(name + "R", "1234");
      Save.clearServerSession();
      return {
        registered: registered.nickname,
        duplicateError,
        renamed: renamed.nickname,
        login: login.nickname
      };
    })()`
  );
  console.log(`account: ${JSON.stringify(accountResult)}`);

  const multiAccountResult = await evaluate(
    client,
    `(() => {
      Save.setServerSession("AccountA", "tokenA", {});
      Save.setServerSession("AccountB", "tokenB", {});
      const currentBeforeSwitch = Save.getAccountName();
      Save.switchServerAccount("tokenA");
      const currentAfterSwitch = Save.getAccountName();
      Save.serverAccounts = {};
      localStorage.removeItem("physics-server-accounts");
      Save.clearServerSession();
      return { currentBeforeSwitch, currentAfterSwitch };
    })()`
  );
  console.log(`multiAccount: ${JSON.stringify(multiAccountResult)}`);

  await client.send("Page.navigate", { url: `${BASE_URL}?run=${Date.now()}#level=1:1-1` });
  await sleep(900);
  await evaluate(client, `document.getElementById("btn-pause").click()`);
  await sleep(300);
  const pauseState = await evaluate(
    client,
    `({
      hidden: document.getElementById("pauseOverlay").hidden,
      skinName: document.getElementById("pauseSkinName").textContent,
      hasSaveButton: Boolean(document.getElementById("btn-pause-save")),
      paused: App.paused,
      actionsOpacity: getComputedStyle(document.querySelector(".pause-actions")).opacity,
      hasAdminLine: document.getElementById("pauseUserInfo").textContent.includes("管理员")
    })`
  );
  await evaluate(client, `document.getElementById("btn-resume").click()`);
  await sleep(300);
  const resumeState = await evaluate(client, `({ hidden: document.getElementById("pauseOverlay").hidden, paused: App.paused })`);
  console.log(`pause: ${JSON.stringify({ pauseState, resumeState })}`);

  await evaluate(client, `document.getElementById("btn-pause").click()`);
  await sleep(150);
  await evaluate(client, `document.getElementById("btn-pause-save").click()`);
  await sleep(400);
  const savedState = await evaluate(
    client,
    `({
      screen: App.screen,
      hasRun: Boolean(Save.getPausedRun()),
      resumeVisible: !document.getElementById("btn-resume-save").hidden
    })`
  );
  await evaluate(client, `document.getElementById("btn-resume-save").click()`);
  await sleep(500);
  const resumedState = await evaluate(
    client,
    `({ screen: App.screen, hasRun: Boolean(Save.getPausedRun()) })`
  );
  console.log(`saveResume: ${JSON.stringify({ savedState, resumedState })}`);

  console.log(JSON.stringify(results, null, 2));
  client.close();
} finally {
  browser.kill();
}
