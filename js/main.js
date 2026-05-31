/**
 * AEROCRAFT Flight Simulator — Main Controller
 * Initializes CesiumJS, manages the game loop, and wires all systems.
 */

// ── Config ──────────────────────────────────────────
const DEFAULT_TOKEN = 'YOUR_CESIUM_ION_TOKEN_HERE'; // ← Replace or use the menu

// ── Globals ──────────────────────────────────────────
let viewer, physics, autopilot, camera, hud, input;
let aircraftEntity = null;
let selectedAircraftId = 'cessna172';
let selectedLocation = 'kennedy';
let simulationRunning = false;
let lastFrameTime = 0;

// ── Saved token from localStorage ────────────────────
const savedToken = localStorage.getItem('cesiumToken') || DEFAULT_TOKEN;

/* ════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════ */

function initCesium(token) {
  Cesium.Ion.defaultAccessToken = token;

  viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: Cesium.createWorldTerrain({
      requestWaterMask: true,
      requestVertexNormals: true,
    }),
    imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
    baseLayerPicker:       false,
    geocoder:              false,
    homeButton:            false,
    sceneModePicker:       false,
    navigationHelpButton:  false,
    animation:             false,
    timeline:              false,
    fullscreenButton:      false,
    vrButton:              false,
    selectionIndicator:    false,
    infoBox:               false,
    shadows:               true,
    atmosphere:            true,
  });

  // Enable high-quality terrain/atmosphere
  viewer.scene.globe.enableLighting = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.sun = new Cesium.Sun();

  // Smooth rendering
  viewer.scene.postProcessStages.fxaa.enabled = true;
  viewer.resolutionScale = window.devicePixelRatio || 1;

  // Depth test so aircraft doesn't clip through terrain
  viewer.scene.globe.depthTestAgainstTerrain = false;
}

function initSystems() {
  physics   = new FlightPhysics();
  autopilot = new Autopilot(physics);
  camera    = new CameraController(viewer);
  hud       = new HUDManager();
  input     = new InputHandler(physics, autopilot);

  // Wire input callbacks
  input.on('gear',   () => hud.notify(physics.state.gearDown ? 'GEAR DOWN' : 'GEAR UP'));
  input.on('flaps',  () => hud.notify(`FLAPS ${physics.state.flapDeg}`));
  input.on('zoomIn',  () => camera.zoomIn());
  input.on('zoomOut', () => camera.zoomOut());
  input.on('cameraChange', () => {
    const mode = camera.cycle();
    hud.notify(mode);
  });
  input.on('toggleAutopilot', () => {
    const engaged = autopilot.toggle();
    hud.notify(engaged ? 'AUTOPILOT ENGAGED' : 'AUTOPILOT DISENGAGED');
    updateAPModalState();
  });
  input.on('toggleMenu', () => toggleSpawnMenu());
  input.on('toggleAPPanel', () => toggleAPModal());
  input.on('escape', () => {
    closeSpawnMenu();
    closeAPModal();
  });
}

/* ════════════════════════════════════════════════════
   AIRCRAFT ENTITY
════════════════════════════════════════════════════ */

function createAircraftEntity(aircraftDef) {
  // Remove existing
  if (aircraftEntity) {
    viewer.entities.remove(aircraftEntity);
    aircraftEntity = null;
  }

  const dim = aircraftDef.dimensions;

  // Check if model file exists (custom)
  if (aircraftDef.model) {
    aircraftEntity = viewer.entities.add({
      position: new Cesium.CallbackProperty(() => physics.getCesiumPosition(), false),
      orientation: new Cesium.CallbackProperty(() => physics.getCesiumOrientation(), false),
      model: {
        uri: aircraftDef.model,
        scale: aircraftDef.scale,
        minimumPixelSize: 32,
        maximumScale: 100000,
        runAnimations: true,
        shadows: Cesium.ShadowMode.ENABLED,
      },
    });
  } else {
    // Primitive aircraft built from Cesium shapes
    aircraftEntity = buildPrimitiveAircraft(aircraftDef);
  }

  return aircraftEntity;
}

function buildPrimitiveAircraft(ac) {
  const dim = ac.dimensions;
  const color = ac.color || Cesium.Color.WHITE;
  const group = [];

  // Fuselage (box)
  group.push(viewer.entities.add({
    position: new Cesium.CallbackProperty(() => physics.getCesiumPosition(), false),
    orientation: new Cesium.CallbackProperty(() => physics.getCesiumOrientation(), false),
    box: {
      dimensions: new Cesium.Cartesian3(dim.span * 0.12, dim.length, dim.height * 0.6),
      material: color.withAlpha(1.0),
      shadows: Cesium.ShadowMode.ENABLED,
    }
  }));

  // Wings (flat box)
  group.push(viewer.entities.add({
    position: new Cesium.CallbackProperty(() => physics.getCesiumPosition(), false),
    orientation: new Cesium.CallbackProperty(() => physics.getCesiumOrientation(), false),
    box: {
      dimensions: new Cesium.Cartesian3(dim.span, dim.length * 0.2, dim.height * 0.06),
      material: color.withAlpha(0.9),
      shadows: Cesium.ShadowMode.ENABLED,
    }
  }));

  // Tail horizontal stab
  group.push(viewer.entities.add({
    position: new Cesium.CallbackProperty(() => {
      const pos = physics.getCesiumPosition();
      // Offset back along aircraft axis
      const headingRad = Cesium.Math.toRadians(physics.state.heading);
      const transform  = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
      const offset = new Cesium.Cartesian3(
        -Math.sin(headingRad) * dim.length * 0.4,
        -Math.cos(headingRad) * dim.length * 0.4,
        dim.height * 0.3
      );
      const outPos = new Cesium.Cartesian3();
      Cesium.Matrix4.multiplyByPoint(transform, offset, outPos);
      Cesium.Cartesian3.add(outPos, pos, outPos);
      return outPos;
    }, false),
    orientation: new Cesium.CallbackProperty(() => physics.getCesiumOrientation(), false),
    box: {
      dimensions: new Cesium.Cartesian3(dim.span * 0.35, dim.length * 0.12, dim.height * 0.04),
      material: color.withAlpha(0.9),
    }
  }));

  // Return the main entity as the representative
  aircraftEntity = group[0];
  return group[0];
}

/* ════════════════════════════════════════════════════
   SPAWN
════════════════════════════════════════════════════ */

function spawnAircraft() {
  const acDef = AIRCRAFT_REGISTRY.find(a => a.id === selectedAircraftId);
  if (!acDef) { hud.notify('NO AIRCRAFT SELECTED', 'error'); return; }

  // Get location
  let lat, lon;
  if (selectedLocation === 'custom') {
    lat = parseFloat(document.getElementById('customLat').value);
    lon = parseFloat(document.getElementById('customLon').value);
  } else {
    const loc = SPAWN_LOCATIONS[selectedLocation];
    lat = loc.lat;
    lon = loc.lon;
  }

  const alt     = parseFloat(document.getElementById('spawnAltitude').value) || 10000;
  const speed   = parseFloat(document.getElementById('spawnSpeed').value)    || 200;
  const heading = parseFloat(document.getElementById('spawnHeading').value)  || 90;

  // Initialize physics
  physics.setAircraft(acDef);
  physics.setState({
    lat, lon,
    altitude: alt,
    speed: speed,
    heading: heading,
    pitch: 0,
    bank: 0,
    throttle: 0.5,
    gearDown: alt < 200,
    flapDeg: 0,
    verticalSpeed: 0,
  });

  // Create entity
  createAircraftEntity(acDef);

  // Start simulation
  simulationRunning = true;

  // Fly to location
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt * 0.3048 + 200),
    duration: 1.5,
  });

  hud.notify(`${acDef.name} SPAWNED`);
  closeSpawnMenu();
}

/* ════════════════════════════════════════════════════
   GAME LOOP
════════════════════════════════════════════════════ */

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.05); // cap at 50ms
  lastFrameTime = timestamp;

  if (simulationRunning && physics.aircraft) {
    autopilot.update(dt);
    physics.update(dt);
    camera.update(physics, dt);
    hud.update(physics, autopilot, camera.getCurrentModeName());
  }

  requestAnimationFrame(gameLoop);
}

/* ════════════════════════════════════════════════════
   MENUS
════════════════════════════════════════════════════ */

function buildAircraftGrid() {
  const grid = document.getElementById('aircraftGrid');
  grid.innerHTML = '';

  AIRCRAFT_REGISTRY.forEach(ac => {
    const card = document.createElement('div');
    card.className = 'aircraft-card' + (ac.id === selectedAircraftId ? ' selected' : '');
    if (ac.model) card.classList.add('custom-model');
    card.innerHTML = `
      <span class="ac-icon">${ac.icon}</span>
      <div class="ac-name">${ac.name}</div>
      <div class="ac-type">${ac.type}</div>
      <div class="ac-type" style="font-size:9px;margin-top:2px;color:rgba(0,255,136,0.4)">
        Max ${ac.maxSpeed}kts · ${ac.maxAltitude.toLocaleString()}ft
      </div>
    `;
    card.addEventListener('click', () => {
      selectedAircraftId = ac.id;
      document.querySelectorAll('.aircraft-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
    grid.appendChild(card);
  });
}

function toggleSpawnMenu() {
  const menu     = document.getElementById('spawnMenu');
  const backdrop = document.getElementById('menuBackdrop');
  const isOpen   = menu.classList.contains('visible');
  if (isOpen) { closeSpawnMenu(); } else { openSpawnMenu(); }
}

function openSpawnMenu() {
  buildAircraftGrid();
  document.getElementById('spawnMenu').classList.add('visible');
  document.getElementById('menuBackdrop').classList.add('visible');
}

function closeSpawnMenu() {
  document.getElementById('spawnMenu').classList.remove('visible');
  document.getElementById('menuBackdrop').classList.remove('visible');
}

function toggleAPModal() {
  const modal = document.getElementById('apModal');
  modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

function closeAPModal() {
  document.getElementById('apModal').style.display = 'none';
}

function updateAPModalState() {
  const btn = document.getElementById('apEngageBtn');
  const ind = document.getElementById('apStateIndicator');
  if (autopilot.engaged) {
    btn.textContent = 'DISENGAGE AUTOPILOT';
    btn.classList.add('active');
    ind.textContent = 'ENGAGED';
    ind.classList.add('engaged');
  } else {
    btn.textContent = 'ENGAGE AUTOPILOT';
    btn.classList.remove('active');
    ind.textContent = 'DISENGAGED';
    ind.classList.remove('engaged');
  }
}

/* ════════════════════════════════════════════════════
   WIRE UI EVENTS
════════════════════════════════════════════════════ */

function wireUI() {
  // Menu open via topbar click
  document.getElementById('hudAircraftName').addEventListener('click', openSpawnMenu);

  // Menu close
  document.getElementById('menuClose').addEventListener('click', closeSpawnMenu);
  document.getElementById('menuBackdrop').addEventListener('click', closeSpawnMenu);

  // Spawn button
  document.getElementById('spawnBtn').addEventListener('click', spawnAircraft);

  // Location buttons
  document.querySelectorAll('.loc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLocation = btn.dataset.loc;
      document.getElementById('customCoords').style.display =
        selectedLocation === 'custom' ? 'flex' : 'none';
    });
  });

  // Cesium token
  document.getElementById('cesiumToken').value = savedToken !== DEFAULT_TOKEN ? savedToken : '';
  document.getElementById('tokenApplyBtn').addEventListener('click', () => {
    const tok = document.getElementById('cesiumToken').value.trim();
    if (!tok) return;
    localStorage.setItem('cesiumToken', tok);
    Cesium.Ion.defaultAccessToken = tok;
    // Reload imagery
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(new Cesium.IonImageryProvider({ assetId: 2 }));
    hud.notify('TOKEN APPLIED — RELOADING TILES');
  });

  // Autopilot panel close
  document.getElementById('apClose').addEventListener('click', closeAPModal);

  // AP engage button
  document.getElementById('apEngageBtn').addEventListener('click', () => {
    autopilot.toggle();
    updateAPModalState();
    hud.notify(autopilot.engaged ? 'AUTOPILOT ENGAGED' : 'AUTOPILOT DISENGAGED');
  });

  // AP adjust buttons
  document.querySelectorAll('.ap-adj').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const delta = parseInt(btn.dataset.delta);

      if (field === 'heading') {
        autopilot.modes.heading.target = ((autopilot.modes.heading.target + delta) + 360) % 360;
        document.getElementById('apHdgInput').textContent =
          String(Math.round(autopilot.modes.heading.target)).padStart(3, '0');
      } else if (field === 'altitude') {
        autopilot.modes.altitude.target = Math.max(0, Math.min(60000,
          autopilot.modes.altitude.target + delta));
        document.getElementById('apAltInput').textContent =
          Math.round(autopilot.modes.altitude.target).toLocaleString();
      } else if (field === 'speed') {
        autopilot.modes.speed.target = Math.max(0, Math.min(1500,
          autopilot.modes.speed.target + delta));
        document.getElementById('apSpdInput').textContent =
          Math.round(autopilot.modes.speed.target);
      }
    });
  });

  // AP mode checkboxes
  document.getElementById('apHdgEnabled').addEventListener('change', (e) => {
    autopilot.setMode('heading', e.target.checked);
    if (e.target.checked && physics.state) {
      autopilot.modes.heading.target = Math.round(physics.state.heading);
      document.getElementById('apHdgInput').textContent =
        String(autopilot.modes.heading.target).padStart(3, '0');
    }
  });
  document.getElementById('apAltEnabled').addEventListener('change', (e) => {
    autopilot.setMode('altitude', e.target.checked);
    if (e.target.checked && physics.state) {
      autopilot.modes.altitude.target = Math.round(physics.state.altitude / 100) * 100;
      document.getElementById('apAltInput').textContent =
        autopilot.modes.altitude.target.toLocaleString();
    }
  });
  document.getElementById('apSpdEnabled').addEventListener('change', (e) => {
    autopilot.setMode('speed', e.target.checked);
    if (e.target.checked && physics.state) {
      autopilot.modes.speed.target = Math.round(physics.state.speed);
      document.getElementById('apSpdInput').textContent = autopilot.modes.speed.target;
    }
  });
}

/* ════════════════════════════════════════════════════
   BOOTSTRAP
════════════════════════════════════════════════════ */

window.addEventListener('load', () => {
  // Init Cesium
  const token = localStorage.getItem('cesiumToken') || DEFAULT_TOKEN;
  initCesium(token);

  // Show placeholder world view
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-73.7781, 40.6413, 8000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch:   Cesium.Math.toRadians(-30),
      roll: 0
    }
  });

  // Init all systems
  initSystems();

  // Wire UI
  wireUI();

  // Start render loop
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);

  // Auto-open menu on first load
  setTimeout(openSpawnMenu, 800);
});
