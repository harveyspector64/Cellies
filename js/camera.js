// YARD — Camera System
// ============================================================
class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.zoom = 1;
    this.targetX = 0; this.targetY = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeDirX = 0; this.shakeDirY = 0; // Phase 2: directional shake
    this.followFast = false;
    this.worldW = CANVAS_W; this.worldH = CANVAS_H;

    // Phase 2: Zoom punch
    this.zoomPunchAmount = 0;
    this.zoomPunchTimer = 0;
    this.zoomPunchDuration = 0;
  }
  shake(intensity, duration, dirX = 0, dirY = 0) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTimer = 0;
    // Phase 2: Store hit direction for directional bias
    if (dirX !== 0 || dirY !== 0) {
      const len = Math.hypot(dirX, dirY) || 1;
      this.shakeDirX = dirX / len;
      this.shakeDirY = dirY / len;
    }
  }
  zoomPunch(amount, duration) {
    this.zoomPunchAmount = amount;
    this.zoomPunchTimer = 0;
    this.zoomPunchDuration = duration;
  }
  setTarget(x, y) { this.targetX = x; this.targetY = y; }
  update(dt) {
    // Smooth follow
    const followSpeed = this.followFast ? 0.2 : T('CAMERA_FOLLOW_SPEED', 0.08);
    this.x = lerp(this.x, this.targetX - CANVAS_W / (2 * this.zoom), followSpeed);
    this.y = lerp(this.y, this.targetY - CANVAS_H / (2 * this.zoom), followSpeed);
    // Clamp to world - center if view exceeds world
    const viewW = CANVAS_W / this.zoom;
    const viewH = CANVAS_H / this.zoom;
    if (viewW >= this.worldW) {
      this.x = -(viewW - this.worldW) / 2;
    } else {
      this.x = clamp(this.x, 0, this.worldW - viewW);
    }
    if (viewH >= this.worldH) {
      this.y = -(viewH - this.worldH) / 2;
    } else {
      this.y = clamp(this.y, 0, this.worldH - viewH);
    }
    // Shake — Phase 2: directional bias
    if (this.shakeDuration > 0) {
      this.shakeTimer += dt;
      if (this.shakeTimer >= this.shakeDuration) {
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeX = 0; this.shakeY = 0;
        this.shakeDirX = 0; this.shakeDirY = 0;
      } else {
        const decay = 1 - this.shakeTimer / this.shakeDuration;
        const int = this.shakeIntensity * decay;
        // 65% directional, 35% random noise
        const dirBias = 0.65;
        const randX = randRange(-int, int);
        const randY = randRange(-int, int);
        this.shakeX = this.shakeDirX * int * dirBias + randX * (1 - dirBias);
        this.shakeY = this.shakeDirY * int * dirBias + randY * (1 - dirBias);
      }
    }
    // Phase 2: Zoom punch decay
    if (this.zoomPunchDuration > 0) {
      this.zoomPunchTimer += dt;
      if (this.zoomPunchTimer >= this.zoomPunchDuration) {
        this.zoomPunchDuration = 0;
        this.zoomPunchAmount = 0;
      }
    }
  }
  get effectiveZoom() {
    let z = this.zoom;
    if (this.zoomPunchDuration > 0) {
      const t = this.zoomPunchTimer / this.zoomPunchDuration;
      const punch = this.zoomPunchAmount * (1 - t * t); // quadratic decay
      z += punch;
    }
    return z;
  }
  apply(ctx) {
    const ez = this.effectiveZoom;
    ctx.save();
    ctx.translate(Math.floor(this.shakeX), Math.floor(this.shakeY));
    ctx.scale(ez, ez);
    ctx.translate(Math.floor(-this.x), Math.floor(-this.y));
  }
  restore(ctx) { ctx.restore(); }
  screenToWorld(sx, sy) {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  }
}
