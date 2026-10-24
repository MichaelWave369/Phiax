# PHIAX · The Living Ship

> An original, playful virtual spaceship. A shimmering adaptive saucer, a procedural sky inspired by Mount Shasta's lenticular clouds, and a shipmind that has far too many opinions for something made of JavaScript.

**PHIAX** stands for **Personal Holographic Intelligence and Astral eXplorer**. This is v0.1: a real, interactive browser simulator, not a movie reproduction or a connected LLM.

## What is already playable

- **Visual flight deck:** original SVG morphing spacecraft with glow, hovering, HUD, radar reticle and a procedural Canvas 2D sky (Shasta dusk, lenticular cloud belt, fictional upper orbit).
- **Flight model:** keyboard-controlled throttle, heading and altitude; responsive flight telemetry; destination-based autopilot; launch and landing simulation.
- **Interactive shipmind:** local, clearly labeled rule-based replies with attitude, flight commands and a few explanations of real cloud physics.
- **Speech:** optional spoken replies via the browser's Web Speech speech synthesis; optional microphone input when the browser supports SpeechRecognition.
- **Ship systems:** morph the silhouette and trigger a visible resonance pulse. Optional procedural Web Audio beeps.
- **No API key or build tool required.** This is an HTML/CSS/JavaScript static site that works on GitHub Pages. User preferences for sound and voice are saved locally.

## Quick start

From the repo folder, launch a local HTTP server:

~~~bash
python -m http.server 8000
~~~

Open **http://localhost:8000**. Use an HTTP server instead of double-clicking index.html because ES module imports are blocked under file:// on many browsers.

Run the built-in tests using Node.js 18 or later:

~~~bash
npm test
~~~

No npm install is necessary.

## Flight controls

| Action | Mouse / touch | Keyboard / shipmind |
| --- | --- | --- |
| Throttle | Engine slider | W / S |
| Yaw | Autopilot or shipmind | A / D |
| Rise / descend | Autopilot or landing | E / Q |
| Resonance pulse | Pulse system | Space / say "pulse" |
| Course selection | Destination matrix | "take us to orbit", "go to clouds" |
| Autopilot | Autopilot toggle | "engage autopilot", "disengage autopilot" |
| Hull mode | Morph system | "morph" |
| Landing | Land button | "land" |
| Takeoff | Launch button | "launch" |

Keyboard flight controls operate when you are not typing in the chat or focusing a button. Choosing a destination automatically engages autopilot. The simulated altitude, heading and speed converge on the selected route's targets.

## PHIAX chat examples

- "Who are you?"
- "Tell me about lenticular clouds."
- "What's our status?"
- "Take us to orbit."
- "Disengage autopilot."
- "Morph the ship."
- "Are you conscious?"

Replies are **local, scripted intent matching**. PHIAX does not yet call a cloud LLM, have autonomous access to devices, or claim sentience. Destination names and orbital parameters are artistic simulation data. The cloud explanation refers to real atmospheric standing waves.

## Privacy and browser support

- No tracking, accounts or backend API.
- Text chat is handled inside the current browser tab and is not saved or transmitted by this app.
- Sound and voice toggle preferences are stored with localStorage.
- Speech output uses the browser's native speechSynthesis implementation and its installed or browser-provided voices.
- Microphone input requires explicit browser permission. **Some browsers send recognized speech to their vendor's speech recognition service.** It is opt-in and is disabled when unsupported.
- No network access is needed after loading the static files themselves. Sound fonts and film assets are not downloaded.

## GitHub Pages

An Actions workflow in [pages.yml](.github/workflows/pages.yml) runs Node tests for pull requests and publishes this static site on pushes to main.

1. Merge the feature pull request into main.
2. In **Settings → Pages**, set **Build and deployment → Source: GitHub Actions** (if not already enabled).
3. Run the **Verify and publish PHIAX** workflow, or let the main-branch push trigger it.
4. Once the deployment succeeds, the expected project URL is **https://michaelwave369.github.io/Phiax/**.

A workflow file alone does not mean Pages is active. Check its deployment status in Actions.

## Repository map

~~~text
index.html                Semantic UI, SVG spacecraft and control panel
styles.css                Responsive visual system and animated hull
src/app.mjs               Canvas renderer, events, speech, flight input
src/flight.mjs            Pure flight calculations, routes and helpers
src/brain.mjs             Local shipmind personality + commands
tests/core.test.mjs       Native Node regression tests
.github/workflows/pages.yml  PR tests and Pages publishing
~~~

## Where we can take PHIAX

Next missions could include an orbit/ground map, smooth transitions between altitude bands, a WebGL/XR interior, advanced procedural hull modes, optional model connections through a deliberate user-controlled gateway, and bridges to other Φ projects. The goal is to preserve a working, self-contained baseline while growing the experience.

## Inspiration and rights

Inspired by the **feeling** of classic friendly-spaceship science fiction and the atmospheric lenticular clouds near Mount Shasta. PHIAX is an **original character and spacecraft design**. Not affiliated with or endorsed by Disney, the makers of *Flight of the Navigator*, or any film rights holder. No movie dialogue, music, images or character assets are used.

Released under the [MIT License](LICENSE). Made for curious captains.
