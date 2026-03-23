// YARD — Input System
// ============================================================
const input = {
  keys: {},
  justPressed: {},
  init() {
    window.addEventListener('keydown', e => {
      // Prevent browser default for game keys (arrows, tab, space)
      if (e.code.startsWith('Arrow') || e.code === 'Tab' || e.code === 'Space') {
        e.preventDefault();
      }
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
