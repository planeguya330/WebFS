/**
 * HUD Manager
 * Updates all HUD elements from flight physics state.
 */

class HUDManager {
  constructor() {
    // Cache element references
    this.els = {
      altitude:     document.getElementById('hudAltitude'),
      speed:        document.getElementById('hudSpeed'),
      vspeed:       document.getElementById('hudVSpeed'),
      heading:      document.getElementById('hudHeading'),
      throttle:     document.getElementById('hudThrottle'),
      throttleBar:  document.getElementById('throttleBar'),
      pitch:        document.getElementById('hudPitch'),
      bank:         document.getElementById('hudBank'),
      aircraftName: document.getElementById('hudAircraftName'),
      clock:        document.getElementById('hudClock'),
      apStatus:     document.getElementById('apStatus'),
      apPanel:      document.getElementById('apPanel'),
      apTargets:    document.getElementById('apTargets'),
      apHdgVal:     document.getElementById('apHdgVal'),
      apAltVal:     document.getElementById('apAltVal'),
      apSpdVal:     document.getElementById('apSpdVal'),
      warning:      document.getElementById('warningOverlay'),
      gearBadge:    document.getElementById('gearBadge'),
      flapsBadge:   document.getElementById('flapsBadge'),
      cameraBadge:  document.getElementById('cameraBadge'),
    };

    this._warnTimer = null;
    this._notifications = [];
  }

  update(physics, autopilot, cameraMode) {
    const s = physics.state;
    const ac = physics.aircraft;

    // ── Flight instruments ──
    this.els.altitude.textContent    = Math.round(s.altitude).toLocaleString();
    this.els.speed.textContent       = Math.round(s.speed);
    this.els.heading.textContent     = String(Math.round(s.heading) % 360).padStart(3, '0');
    this.els.pitch.textContent       = s.pitch.toFixed(1);
    this.els.bank.textContent        = s.bank.toFixed(1);

    // VS with sign
    const vs = Math.round(s.verticalSpeed);
    this.els.vspeed.textContent = (vs >= 0 ? '+' : '') + vs.toLocaleString();
    this.els.vspeed.style.color = vs > 100 ? 'var(--hud-green)' : vs < -500 ? 'var(--hud-red)' : '';

    // Throttle
    const tPct = Math.round(s.throttle * 100);
    this.els.throttle.textContent  = tPct;
    this.els.throttleBar.style.width = tPct + '%';

    // Aircraft name
    if (ac) this.els.aircraftName.textContent = ac.name;

    // ── Gear / Flaps badges ──
    this.els.gearBadge.textContent = s.gearDown ? 'GEAR DOWN' : 'GEAR UP';
    this.els.gearBadge.className   = 'status-badge' + (s.gearDown ? '' : ' warn');
    this.els.flapsBadge.textContent = `FLAPS ${s.flapDeg}`;
    this.els.flapsBadge.className   = 'status-badge' + (s.flapDeg > 0 ? ' warn' : '');

    // Camera mode
    this.els.cameraBadge.textContent = cameraMode || 'CHASE CAM';

    // ── Warnings ──
    let warn = '';
    if (s.stalling)   warn = '⚠ STALL';
    if (s.overSpeed)  warn = '⚠ OVERSPEED';
    if (s.altitude < 300 && !s.onGround) warn = '⚠ TERRAIN';
    this.els.warning.textContent = warn;

    // ── Autopilot panel ──
    const apStat = autopilot.getStatus();
    if (apStat.engaged) {
      this.els.apStatus.textContent = 'ENGAGED';
      this.els.apPanel.classList.add('active');
      this.els.apTargets.style.display = 'block';
    } else {
      this.els.apStatus.textContent = 'OFF';
      this.els.apPanel.classList.remove('active');
      this.els.apTargets.style.display = 'none';
    }

    const m = autopilot.modes;
    this.els.apHdgVal.textContent = m.heading.enabled  ? String(Math.round(m.heading.target)).padStart(3,'0') : '---';
    this.els.apAltVal.textContent = m.altitude.enabled ? Math.round(m.altitude.target).toLocaleString()      : '---';
    this.els.apSpdVal.textContent = m.speed.enabled    ? Math.round(m.speed.target)                          : '---';

    // ── UTC Clock ──
    const now = new Date();
    this.els.clock.textContent = now.toUTCString().split(' ')[4] + 'Z';
  }

  notify(message, type = 'info') {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    if (type === 'warn') el.style.borderColor = 'var(--hud-amber)';
    if (type === 'error') el.style.borderColor = 'var(--hud-red)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
}
