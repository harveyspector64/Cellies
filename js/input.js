// YARD — Input System
// ============================================================
const input = {
  keys: {},
  justPressed: {},
  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  },
  isDown(code) { return !!this.keys[code]; },
  wasPressed(code) { return !!this.justPressed[code]; },
  clearFrame() { this.justPressed = {}; }
};
