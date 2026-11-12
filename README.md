# Ablox

Ablox is an independent fan-made browser game hub featuring original 3D experiences created for this project.

## Included experiences
- **Sky Obby 3D** — jump between floating platforms and reach the finish.
- **Coin Rush City** — explore a small 3D city and collect coins.
- **Neon Run 3D** — dodge obstacles on a neon runner track.

## 3D engine and camera
The games use **Three.js** with real WebGL 3D geometry, lighting, shadows, perspective and a block-style player character. Drag inside the game viewport to orbit the third-person camera. Use the mouse wheel or a two-finger pinch to zoom, and use the camera reset button to return to the default view. WASD / arrow keys move relative to the camera.

Three.js is loaded from cdnjs, so the browser needs an internet connection to start a game.

## Run locally
Open `index.html` in a modern browser with an internet connection, or serve this folder using any static HTTP server.

## GitHub Pages
This is a static website. Publish the repository root (`/`) from the `main` branch in GitHub Pages. The workflow in `.github/workflows/pages.yml` deploys the site on each push to `main`.

## Controls
- **WASD / Arrow keys** — move relative to the camera
- **Space** — jump
- **Mouse drag / finger drag** — rotate camera
- **Mouse wheel / pinch** — zoom
- **Camera reset button** — restore camera
- **Escape** — pause
- Touch movement controls appear on smaller screens.

## Project note
Ablox is a fan-made, independent project and is not affiliated with, endorsed by, or sponsored by Roblox Corporation. All game names, scenes, interface elements and code in this repository are original Ablox content.
