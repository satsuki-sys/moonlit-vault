// Moonlit Vault — keyboard and mouse. One job: turn keys and clicks into the
// small structs the player and the game loop read each frame.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.clicks = []; // {x, y} in canvas pixels, consumed by the game loop
    this.anyKey = false; // set on any fresh keydown, for title-screen advance
    this.onKeyDown = (event) => {
      const k = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        event.preventDefault();
      }
      if (!this.keys.has(k)) this.anyKey = true;
      this.keys.add(k);
    };
    this.onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };
    this.onMouseDown = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.clicks.push({
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      });
    };
    this.onBlur = () => {
      this.keys.clear();
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  // -1..1 movement vector from WASD or the arrow keys.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  get runHeld() {
    return this.keys.has('shift');
  }

  get sneakHeld() {
    return this.keys.has('c') || this.keys.has('control');
  }

  takeClicks() {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }

  takeAnyKey() {
    const out = this.anyKey;
    this.anyKey = false;
    return out;
  }
}
