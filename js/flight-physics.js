/**
 * Flight Physics Engine
 * Simulates aerodynamic forces, control surfaces, and aircraft state.
 */

class FlightPhysics {
  constructor() {
    this.state = {
      // Position
      lat: 0, lon: 0,
      altitude: 1000,     // feet MSL
      // Attitude
      heading: 90,        // degrees 0-360
      pitch: 0,           // degrees (+ = nose up)
      bank: 0,            // degrees (+ = right wing down)
      // Velocity
      speed: 200,         // knots IAS
      verticalSpeed: 0,   // feet per minute
      // Controls
      throttle: 0.5,      // 0-1
      flapDeg: 0,         // 0, 10, 20, 30, 40
      gearDown: true,
      // Derived
      groundSpeed: 200,
      mach: 0,
      onGround: false,
      stalling: false,
      overSpeed: false,
      gForce: 1.0,
    };

    this.aircraft = null;  // Current aircraft definition
    this.dt = 1 / 60;      // Simulation timestep
    this._prevVSpeed = 0;
  }

  setAircraft(aircraftDef) {
    this.aircraft = aircraftDef;
  }

  setState(partialState) {
    Object.assign(this.state, partialState);
  }

  /* ── MAIN UPDATE ─────────────────────────────── */
  update(dt) {
    if (!this.aircraft) return;
    this.dt = dt;
    const ac = this.aircraft;
    const s = this.state;

    // ── Atmosphere ──
    const altFt = s.altitude;
    const altM  = altFt * 0.3048;
    const airDensity = this._airDensity(altM);
    const speedMs = s.speed * 0.514444;

    // ── Stall / Overspeed checks ──
    const effectiveStall = ac.stallSpeed * (1 - (s.flapDeg / 40) * 0.2);
    s.stalling  = s.speed < effectiveStall && altFt > 50;
    s.overSpeed = s.speed > ac.maxSpeed * 1.15;

    // ── Gear drag ──
    const gearDrag = s.gearDown ? 0.008 : 0;
    const flapDrag = (s.flapDeg / 40) * 0.010;
    const totalDrag = ac.dragCoeff + gearDrag + flapDrag;

    // ── Lift coefficient adjusted for AoA and flaps ──
    const pitchRad  = s.pitch * Math.PI / 180;
    const flapLift  = (s.flapDeg / 40) * 0.4;
    const effectiveLift = (ac.liftCoeff + flapLift) * Math.sin(pitchRad + 0.1);

    // ── Thrust ──
    const thrust = s.throttle * ac.thrustMax;

    // ── Drag force ──
    const drag = 0.5 * airDensity * speedMs * speedMs * totalDrag;

    // ── Acceleration along flight path ──
    const accelMs2 = (thrust - drag) / (ac.mass * 5000);
    const accelKts = accelMs2 / 0.514444;
    s.speed = Math.max(0, s.speed + accelKts * dt);

    // ── Vertical dynamics ──
    const liftForce  = 0.5 * airDensity * speedMs * speedMs * effectiveLift;
    const gravAccel  = 9.81;  // m/s²
    const climbAccel = (liftForce / (ac.mass * 5000)) - Math.cos(pitchRad) * gravAccel;
    // Convert to fpm
    const vsFpm = climbAccel * 196.85;
    // Blend for smoothness
    s.verticalSpeed = s.verticalSpeed * 0.85 + vsFpm * 0.15;

    // Stall → fall
    if (s.stalling) {
      s.verticalSpeed -= 500 * dt;
      s.pitch = Math.max(s.pitch - 5 * dt, -30);
    }

    // ── Altitude integration ──
    s.altitude += (s.verticalSpeed / 60) * dt;
    s.altitude = Math.max(s.altitude, 0);

    // ── On-ground check ──
    if (s.altitude <= 0) {
      s.altitude = 0;
      s.verticalSpeed = 0;
      s.onGround = true;
      if (s.speed > 0) {
        // Ground roll friction
        s.speed = Math.max(0, s.speed - 3 * dt);
      }
      s.pitch = 0;
    } else {
      s.onGround = false;
    }

    // ── Turn rate ──
    // Standard rate turn: 3°/s, modified by bank angle
    if (s.speed > effectiveStall) {
      const bankRad = s.bank * Math.PI / 180;
      const turnRate = (9.81 * Math.tan(bankRad)) / (speedMs || 1) * (180 / Math.PI);
      s.heading = (s.heading + turnRate * dt + 360) % 360;
    }

    // ── Pitch gravity ──
    // Nose drops if not enough lift
    if (!s.onGround && !s.stalling) {
      const pitchGravity = -s.pitch * 0.1 * dt * Math.max(0, 1 - s.speed / ac.stallSpeed);
      s.pitch = Math.max(-90, Math.min(90, s.pitch + pitchGravity));
    }

    // ── G-force ──
    const vsDelta = s.verticalSpeed - this._prevVSpeed;
    s.gForce = 1.0 + (vsDelta / 60) / 9.81 * dt;
    this._prevVSpeed = s.verticalSpeed;

    // ── Position update ──
    const speedMs2 = s.speed * 0.514444;
    const headingRad = s.heading * Math.PI / 180;
    const pitchRad2 = s.pitch * Math.PI / 180;
    const horzSpeed = speedMs2 * Math.cos(pitchRad2);
    const earthRadius = 6371000;
    const latDelta = (horzSpeed * Math.cos(headingRad) * dt) / earthRadius * (180 / Math.PI);
    const lonDelta = (horzSpeed * Math.sin(headingRad) * dt) / (earthRadius * Math.cos(s.lat * Math.PI / 180)) * (180 / Math.PI);

    s.lat += latDelta;
    s.lon += lonDelta;

    // Wrap longitude
    if (s.lon > 180)  s.lon -= 360;
    if (s.lon < -180) s.lon += 360;
    // Clamp latitude
    s.lat = Math.max(-89.9, Math.min(89.9, s.lat));

    // Mach number
    const speedOfSound = 340 - altFt * 0.002;  // rough approximation
    s.mach = s.speed * 0.514444 / speedOfSound;
  }

  /* ── CONTROL INPUTS ──────────────────────────── */

  adjustThrottle(delta) {
    this.state.throttle = Math.max(0, Math.min(1, this.state.throttle + delta));
  }

  adjustPitch(delta) {
    if (!this.aircraft) return;
    const maxP = this.aircraft.maxPitch;
    this.state.pitch = Math.max(-maxP, Math.min(maxP, this.state.pitch + delta));
  }

  adjustBank(delta) {
    if (!this.aircraft) return;
    const maxB = this.aircraft.maxBank;
    this.state.bank = Math.max(-maxB, Math.min(maxB, this.state.bank + delta));
  }

  adjustRudder(delta) {
    // Rudder affects heading directly (simplified)
    this.state.heading = (this.state.heading + delta + 360) % 360;
  }

  cycleFlaps(up) {
    const steps = [0, 10, 20, 30, 40];
    const idx = steps.indexOf(this.state.flapDeg);
    if (up && idx > 0) this.state.flapDeg = steps[idx - 1];
    if (!up && idx < steps.length - 1) this.state.flapDeg = steps[idx + 1];
  }

  toggleGear() {
    if (this.state.altitude < 100) return; // Safety: can't retract on ground
    this.state.gearDown = !this.state.gearDown;
  }

  /* ── HELPERS ─────────────────────────────────── */

  _airDensity(altM) {
    // International Standard Atmosphere approximation
    const T0 = 288.15, L = 0.0065, R = 287, g = 9.81;
    const T = T0 - L * altM;
    const P = 101325 * Math.pow(T / T0, g / (L * R));
    return P / (R * T);
  }

  getCesiumPosition() {
    const s = this.state;
    return Cesium.Cartesian3.fromDegrees(s.lon, s.lat, s.altitude * 0.3048);
  }

  getCesiumOrientation() {
    const s = this.state;
    const headingRad = Cesium.Math.toRadians(s.heading);
    const pitchRad   = Cesium.Math.toRadians(-s.pitch);  // Cesium pitch inverted
    const rollRad    = Cesium.Math.toRadians(s.bank);

    const hpr = new Cesium.HeadingPitchRoll(headingRad, pitchRad, rollRad);
    const pos = this.getCesiumPosition();
    return Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
  }
}
