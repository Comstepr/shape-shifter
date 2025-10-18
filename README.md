# Shape Shifter

Shape Shifter is a browser-based playground that begins with a triangle and a ball ricocheting inside it. Each time the ball hits an edge, the polygon gains another side (triangle → square → pentagon → …) and, if text-to-speech (TTS) is enabled, the app speaks the new shape’s proper name. The polygon count, elapsed time, and motion controls are all visible on screen.

## Features

- **Infinite polygon evolution** – The ball bounces inside a regular polygon that gains a side on every collision.
- **Gravity-driven motion** – Starts with a natural drop, uses gravity, restitution, and damping for realistic bounces.
- **Accurate naming** – Includes conventional names up to icosagon and generates systematic names beyond that.
- **Speech-friendly** – Optional text-to-speech with selectable voices (once the browser exposes them).
- **Physics tweaks** – Adjustable speed slider, optional acceleration per bounce, pause/resume/reset controls.
- **Live stats** – Shows side count, paused stopwatch, and a real-time FPS counter.

## Requirements

- A modern desktop browser with HTML5 canvas support.
- For TTS and the voice selector: a browser that implements the Web Speech API (`speechSynthesis`).

## Getting Started

1. Open `index.html` in your preferred browser (double-click the file or drag it into the browser window).
2. Wait for the “Start” button to activate (voices load in the background when supported).
3. Click **Start** to begin the simulation.
4. Use the control panel to pause/resume, reset, toggle acceleration, or adjust the ball speed.
5. (Optional) enable **Speak shape name** and choose a voice to hear the polygon names as they change.

## Project Structure

```
shape-project/
├── index.html   # UI layout and inline styling
├── script.js    # Canvas rendering, physics, controls, and TTS management
└── README.md    # This guide
```

## Customisation Tips

- **Ball speed** – Adjust the slider during runtime; it scales gravity, bounce energy, and the initial nudge. To change the baseline, edit `config.ballSpeed` in `script.js`.
- **Acceleration gain** – Tweak `config.bounceSpeedGain` to control speed increase per bounce.
- **Voice preference logic** – Modify the `voiceQualityScore` function in `script.js` to change how voices are ranked.
- **Polygon appearance** – Update the canvas styling in `index.html` or draw trails/gradients in `script.js`.

## Browser Notes

- Voice availability differs between browsers/OSes; Chrome usually exposes the richest catalog.
- If no voices are available, the start button will remain disabled until the browser reports at least one voice (or the app detects that speech is unsupported, in which case it will enable Start automatically).

## License

This project is provided as-is. Feel free to remix or build upon it for personal or educational use. If you share improvements, consider contributing back so others can benefit.
