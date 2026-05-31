/**
 * Autopilot System
 * Implements heading hold, altitude hold, and speed (autothrottle) modes.
 * Uses simple PID-like controllers.
 */

class Autopilot {
  constructor(physics) {
    this.physics = physics;

    this.engaged = false;
    this.modes = {
      heading:  { enabled: false, target: 90 },
      altitude: { enabled: false, target: 10000 },
      speed:    { enabled: false, target: 250 },
    };

    // PID state
    this._hdgErr_i  = 0;
    this._altErr_i  = 0;
    this._spdErr_i  = 0;
    this._prevHdgErr = 0;
    this._prevAltErr = 0;
    this._prevSpdErr = 0;
  }

  setMode(mode, enabled) {
    if (this.modes[mode]) this.modes[mode].enabled = enabled;
  }

  setTarget(mode, value) {
    if (this.modes[mode]) this.modes[mode].target = value;
  }

  engage() {
    this.engaged = true;
    // Capture current values as targets if not already set
    const s = this.physics.state;
    if (this.modes.heading.target === null)  this.modes.heading.target  = Math.round(s.heading);
    if (this.modes.altitude.target === null) this.modes.altitude.target = Math.round(s.altitude / 100) * 100;
    if (this.modes.speed.target === null)    this.modes.speed.target    = Math.round(s.speed);
    // Reset integrators
    this._hdgErr_i = 0;
    this._altErr_i = 0;
    this._spdErr_i = 0;
  }

  disengage() {
    this.engaged = false;
  }

  toggle() {
    if (this.engaged) this.disengage();
    else this.engage();
    return this.engaged;
  }

  /* ── MAIN UPDATE ─────────────────────────────── */
  update(dt) {
    if (!this.engaged) return;
    const s = this.physics.state;
    const ac = this.physics.aircraft;
    if (!ac) return;

    // ── Heading Hold ──────────────────────────────
    if (this.modes.heading.enabled) {
      const tgt = this.modes.heading.target;
      let err = tgt - s.heading;
      // Shortest angular path
      if (err > 180)  err -= 360;
      if (err < -180) err += 360;

      // PID
      this._hdgErr_i += err * dt;
      this._hdgErr_i  = Math.max(-30, Math.min(30, this._hdgErr_i));
      const d = (err - this._prevHdgErr) / dt;
      this._prevHdgErr = err;

      const Kp = 0.8, Ki = 0.02, Kd = 0.1;
      const bankCmd = Kp * err + Ki * this._hdgErr_i + Kd * d;
      const targetBank = Math.max(-ac.maxBank * 0.7, Math.min(ac.maxBank * 0.7, bankCmd));

      // Smoothly drive bank toward target
      const bankErr  = targetBank - s.bank;
      const bankRate = 5.0;  // °/s max AP bank rate
      const bankDelta = Math.max(-bankRate * dt, Math.min(bankRate * dt, bankErr));
      this.physics.adjustBank(bankDelta);
    }

    // ── Altitude Hold ─────────────────────────────
    if (this.modes.altitude.enabled) {
      const tgt = this.modes.altitude.target;
      const err = tgt - s.altitude;

      this._altErr_i += err * dt;
      this._altErr_i  = Math.max(-5000, Math.min(5000, this._altErr_i));
      const d = (err - this._prevAltErr) / dt;
      this._prevAltErr = err;

      const Kp = 0.003, Ki = 0.0001, Kd = 0.001;
      const vsCmdFpm = Kp * err + Ki * this._altErr_i + Kd * d;

      // Convert desired VS to pitch command
      const maxVsCmd = ac.climbRate * 0.8;
      const vsCmd = Math.max(-maxVsCmd, Math.min(maxVsCmd, vsCmdFpm));
      const targetPitch = (vsCmd / maxVsCmd) * ac.maxPitch * 0.6;

      const pitchErr   = targetPitch - s.pitch;
      const pitchRate  = 3.0;  // °/s
      const pitchDelta = Math.max(-pitchRate * dt, Math.min(pitchRate * dt, pitchErr));
      this.physics.adjustPitch(pitchDelta);
    }

    // ── Speed Hold (Autothrottle) ─────────────────
    if (this.modes.speed.enabled) {
      const tgt = this.modes.speed.target;
      const err = tgt - s.speed;

      this._spdErr_i += err * dt;
      this._spdErr_i  = Math.max(-100, Math.min(100, this._spdErr_i));
      const d = (err - this._prevSpdErr) / dt;
      this._prevSpdErr = err;

      const Kp = 0.005, Ki = 0.0005, Kd = 0.002;
      const throttleAdj = Kp * err + Ki * this._spdErr_i + Kd * d;
      this.physics.state.throttle = Math.max(0, Math.min(1,
        this.physics.state.throttle + throttleAdj * dt));
    }
  }

  getStatus() {
    const m = this.modes;
    const active = [];
    if (this.engaged) {
      if (m.heading.enabled)  active.push(`HDG ${Math.round(m.heading.target)}°`);
      if (m.altitude.enabled) active.push(`ALT ${Math.round(m.altitude.target)}ft`);
      if (m.speed.enabled)    active.push(`SPD ${Math.round(m.speed.target)}kts`);
    }
    return { engaged: this.engaged, active };
  }
}
