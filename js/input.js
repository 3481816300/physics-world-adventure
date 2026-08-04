const Input = {
  keys: new Set(),
  pressed: new Set(),
  released: new Set(),
  mouse: {
    x: 0,
    y: 0,
    down: false,
    clicked: false
  },
  gameActive: false,

  init() {
    window.addEventListener("keydown", (event) => {
      if (this.gameActive && this.isGameKey(event.code)) {
        event.preventDefault();
      }

      if (!event.repeat) {
        this.pressed.add(event.code);
      }
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      this.released.add(event.code);
    });

    window.addEventListener("mousemove", (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });

    window.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
      }
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.mouse.down = false;
        this.mouse.clicked = true;
      }
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pressed.clear();
      this.released.clear();
      this.mouse.down = false;
    });
  },

  isGameKey(code) {
    return [
      "KeyA",
      "KeyD",
      "KeyW",
      "KeyS",
      "KeyE",
      "KeyQ",
      "Space",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "KeyM",
      "KeyN",
      "KeyV",
      "KeyB",
      "KeyR"
    ].includes(code);
  },

  isDown(code) {
    return this.keys.has(code);
  },

  wasPressed(code) {
    return this.pressed.has(code);
  },

  wasReleased(code) {
    return this.released.has(code);
  },

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.clicked = false;
  }
};
