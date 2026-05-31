/**
 * Input Handler
 * Manages keyboard inputs, hold-to-repeat, and bindings.
 */

class InputHandler {
  constructor(physics, autopilot) {
    this.physics   = physics;
    this.autopilot = autopilot;

    this._held  = new Set();
    this._justPressed = new Set();

    // Callbacks for actions that need simulator context
    this.callbacks = {};

    this._bindEvents();
    this._startHoldLoop();
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  _trigger(event) {
    if (this.callbacks[event]) this.callbacks[event]();
  }

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.code;
      if (!this._held.has(key)) {
        this._justPressed.add(key);
        this._handleSinglePress(key);
      }
      this._held.add(key);
      e.preventDefault();
    });

    document.addEventListener('keyup', (e) => {
      this._held.delete(e.code);
    });

    // Mouse wheel = zoom
    document.addEventListener('wheel', (e) => {
      this._trigger(e.deltaY > 0 ? 'zoomOut' : 'zoomIn');
    });
  }

  _handleSinglePress(key) {
    switch (key) {
      case 'KeyG': this.physics.toggleGear();       this._trigger('gear'); break;
      case 'KeyF': this.physics.cycleFlaps(false);  this._trigger('flaps'); break;
      case 'ShiftKeyF': this.physics.cycleFlaps(true); this._trigger('flaps'); break;
      case 'KeyC': this._trigger('cameraChange'); break;
      case 'KeyP': this._trigger('toggleAutopilot'); break;
      case 'KeyM': this._trigger('toggleMenu'); break;
      case 'KeyA': this._trigger('toggleAPPanel'); break;
      case 'Escape': this._trigger('escape'); break;
      case 'BracketLeft':  this._trigger('zoomIn');  break;
      case 'BracketRight': this._trigger('zoomOut'); break;
    }
  }

  _startHoldLoop() {
    const HOLD_RATE = 60; // Hz
    const dt = 1 / HOLD_RATE;

    setInterval(() => {
      this._justPressed.clear();
      const h = this._held;

      // Throttle: W/S
      if (h.has('KeyW'))     this.physics.adjustThrottle(+0.4 * dt);
      if (h.has('KeyS'))     this.physics.adjustThrottle(-0.4 * dt);

      // Pitch: Up/Down arrow
      if (h.has('ArrowUp'))   this.physics.adjustPitch(+15 * dt);
      if (h.has('ArrowDown')) this.physics.adjustPitch(-15 * dt);

      // Bank: Left/Right arrow
      if (h.has('ArrowLeft'))  this.physics.adjustBank(-20 * dt);
      if (h.has('ArrowRight')) this.physics.adjustBank(+20 * dt);

      // Auto-center bank when no input
      if (!h.has('ArrowLeft') && !h.has('ArrowRight')) {
        const bank = this.physics.state.bank;
        if (Math.abs(bank) > 0.5) {
          const centerRate = 5 * dt;
          this.physics.state.bank -= Math.sign(bank) * Math.min(centerRate, Math.abs(bank));
        }
      }

      // Rudder: Q/E
      if (h.has('KeyQ')) this.physics.adjustRudder(-20 * dt);
      if (h.has('KeyE')) this.physics.adjustRudder(+20 * dt);

      // Pitch centering
      if (!h.has('ArrowUp') && !h.has('ArrowDown')) {
        // Gentle nose-down tendency (can be overridden by AP)
      }

    }, 1000 / HOLD_RATE);
  }

  isHeld(key) { return this._held.has(key); }
}
