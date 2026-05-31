/**
 * Camera Controller
 * Manages chase cam, cockpit, orbit, and tower views.
 */

class CameraController {
  constructor(viewer) {
    this.viewer = viewer;
    this.mode = 0; // 0=chase, 1=cockpit, 2=external orbit, 3=tower
    this.modes = ['CHASE CAM', 'COCKPIT', 'ORBIT', 'TOWER'];

    // Chase cam offsets (meters, in aircraft body frame)
    this._chaseDist = 40;
    this._chaseElev = 10;

    // Orbit state
    this._orbitAngle  = 0;
    this._orbitRadius = 100;
    this._orbitElev   = 20;

    // Smooth interpolation
    this._smoothPos  = null;
    this._smoothDir  = null;
  }

  cycle() {
    this.mode = (this.mode + 1) % this.modes.length;
    return this.modes[this.mode];
  }

  setMode(index) {
    this.mode = Math.max(0, Math.min(this.modes.length - 1, index));
    return this.modes[this.mode];
  }

  getCurrentModeName() {
    return this.modes[this.mode];
  }

  update(physics, dt) {
    if (!physics.aircraft) return;
    const s = physics.state;
    const viewer = this.viewer;

    const pos = physics.getCesiumPosition();
    const headingRad = Cesium.Math.toRadians(s.heading);
    const pitchRad   = Cesium.Math.toRadians(s.pitch);

    switch (this.mode) {
      case 0: this._updateChase(pos, headingRad, pitchRad, s, dt); break;
      case 1: this._updateCockpit(pos, headingRad, pitchRad, s, dt); break;
      case 2: this._updateOrbit(pos, dt); break;
      case 3: this._updateTower(pos, dt); break;
    }
  }

  _updateChase(pos, headingRad, pitchRad, state, dt) {
    // Position camera behind and above aircraft
    const dist = this._chaseDist;
    const elev = this._chaseElev;

    const behind = new Cesium.Cartesian3(
      -Math.sin(headingRad) * dist,
      -Math.cos(headingRad) * dist,
      elev
    );

    // Transform to globe surface frame
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
    const camPos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint(transform, behind, camPos);
    Cesium.Cartesian3.add(camPos, pos, camPos);

    // Look at aircraft with slight offset to include ground
    const target = new Cesium.Cartesian3();
    Cesium.Cartesian3.add(pos, new Cesium.Cartesian3(0, 0, -2), target);

    this.viewer.camera.lookAt(pos, new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(state.heading),
      Cesium.Math.toRadians(-10 - Math.abs(state.pitch) * 0.3),
      dist
    ));
  }

  _updateCockpit(pos, headingRad, pitchRad, state, dt) {
    const ac = { dimensions: { length: 15 } }; // Generic

    // Place camera slightly forward and above CG
    const fwdOffset = new Cesium.Cartesian3(
      Math.sin(headingRad) * 3,
      Math.cos(headingRad) * 3,
      2.0
    );
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
    const camPos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint(transform, fwdOffset, camPos);
    Cesium.Cartesian3.add(camPos, pos, camPos);

    this.viewer.camera.setView({
      destination: pos,
      orientation: {
        heading: Cesium.Math.toRadians(state.heading),
        pitch:   Cesium.Math.toRadians(state.pitch - 5),
        roll:    Cesium.Math.toRadians(state.bank),
      }
    });
  }

  _updateOrbit(pos, dt) {
    this._orbitAngle += 20 * dt; // degrees/s

    this.viewer.camera.lookAt(pos, new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(this._orbitAngle),
      Cesium.Math.toRadians(-20),
      this._orbitRadius
    ));
  }

  _updateTower(pos, dt) {
    // Static elevated look-down from near spawned position
    this.viewer.camera.lookAt(pos, new Cesium.HeadingPitchRange(
      0,
      Cesium.Math.toRadians(-45),
      500
    ));
  }

  zoomIn()  { this._chaseDist = Math.max(10, this._chaseDist - 5); this._orbitRadius = Math.max(20, this._orbitRadius - 20); }
  zoomOut() { this._chaseDist = Math.min(200, this._chaseDist + 5); this._orbitRadius = Math.min(5000, this._orbitRadius + 20); }
}
