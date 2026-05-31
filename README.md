 # WebFS Flight Simulator
A browser-based flight simulator built with CesiumJS and hosted on GitHub Pages.
🚀 Quick Start
Fork or clone this repository
Add your Cesium Ion token — get a free token at ion.cesium.com
Enable GitHub Pages in repo Settings → Pages → Source: `main` branch, root `/`
Open the simulator and paste your token in the spawn menu
✈ Controls
Key	Action
`W / S`	Throttle up / down
`↑ / ↓`	Pitch up / down
`← / →`	Bank left / right
`Q / E`	Rudder left / right
`G`	Toggle landing gear
`F`	Cycle flaps
`C`	Cycle camera mode
`P`	Toggle autopilot
`A`	Open autopilot panel
`M`	Open spawn menu
`[ / ]`	Zoom in / out
🛩 Adding Custom Aircraft Models
Place your `.glb` or `.gltf` files in the `/models/` folder
Edit `js/aircraft-registry.js` and update the `custom1`, `custom2`, `custom3` entries:
```js
   {
     id: 'custom1',
     name: 'MY AIRCRAFT',
     model: 'models/my-aircraft.glb',
     scale: 1.0,
     maxSpeed: 350,
     // ... flight envelope params
   }
   ```
Where to find free glTF aircraft models
Sketchfab (filter by downloadable)
NASA 3D Resources
Google Poly Archive
🤖 Autopilot Modes
HDG HOLD — Maintains target heading via bank angle
ALT HOLD — Maintains target altitude via pitch
SPD HOLD — Autothrottle to maintain target airspeed
🗺 Spawn Locations
Code	Airport
JFK	New York John F. Kennedy
LHR	London Heathrow
DXB	Dubai International
SYD	Sydney Kingsford Smith
HND	Tokyo Haneda
CDG	Paris Charles de Gaulle
Custom coordinates are also supported.
⚙ Cesium Ion Token
Your token is saved in browser localStorage after first entry — you won't need to re-enter it.
To change the default token, edit line 4 of `js/main.js`:
```js
const DEFAULT_TOKEN = 'YOUR_TOKEN_HERE';
```
📁 Project Structure
```
/
├── index.html              # Main page
├── css/
│   └── style.css           # HUD & UI styles
├── js/
│   ├── aircraft-registry.js  # Aircraft definitions
│   ├── flight-physics.js     # Physics engine
│   ├── autopilot.js          # Autopilot PID controller
│   ├── camera.js             # Camera modes
│   ├── hud.js                # HUD manager
│   ├── input.js              # Keyboard input
│   └── main.js               # Bootstrap & game loop
└── models/
    ├── aircraft1.glb         # Your custom model 1
    ├── aircraft2.glb         # Your custom model 2
    └── aircraft3.glb         # Your custom model 3
```
