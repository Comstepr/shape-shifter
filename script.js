const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const shapeNameLabel = document.getElementById("shape-name");
const sideCountLabel = document.getElementById("side-count");
const elapsedLabel = document.getElementById("elapsed");
const fpsLabel = document.getElementById("fps");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const resetBtn = document.getElementById("reset-btn");
const speedSlider = document.getElementById("speed-slider");
const speedReadout = document.getElementById("speed-readout");
const ttsToggle = document.getElementById("tts-toggle");
const accelToggle = document.getElementById("accel-toggle");
const voiceSelect = document.getElementById("voice-select");

const config = {
  baseRadius: 220,
  ballRadius: 12,
  ballSpeed: 220, // pixels per second
  backgroundColor: "#09091c",
  polygonColor: "#2176ff",
  ballColor: "#ffdd57",
  trailColor: "rgba(255, 221, 87, 0.15)",
  bounceSpeedGain: 12, // pixels per bounce
  maxSpeed: 1200,
};

const specialNames = new Map([
  [3, "Triangle"],
  [4, "Square"],
  [5, "Pentagon"],
  [6, "Hexagon"],
  [7, "Heptagon"],
  [8, "Octagon"],
  [9, "Nonagon"],
  [10, "Decagon"],
  [11, "Hendecagon"],
  [12, "Dodecagon"],
  [13, "Triskaidecagon"],
  [14, "Tetradecagon"],
  [15, "Pentadecagon"],
  [16, "Hexadecagon"],
  [17, "Heptadecagon"],
  [18, "Octadecagon"],
  [19, "Enneadecagon"],
  [20, "Icosagon"],
  [30, "Triacontagon"],
  [40, "Tetracontagon"],
  [50, "Pentacontagon"],
  [60, "Hexacontagon"],
  [70, "Heptacontagon"],
  [80, "Octacontagon"],
  [90, "Enneacontagon"],
  [100, "Hectogon"],
]);

const unitPrefixes = ["", "hen", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "ennea"];
const tensPrefixes = ["", "deca", "icosa", "triaconta", "tetraconta", "pentaconta", "hexaconta", "heptaconta", "octaconta", "enneaconta"];
const hundredsPrefixes = ["", "hecta", "dihecta", "trihecta", "tetrahecta", "pentahecta", "hexahecta", "heptahecta", "octahecta", "enneahecta"];

let totalSides = 3;
let polygon = buildPolygon(totalSides);

let currentSpeed = config.ballSpeed;

const ball = {
  position: { x: canvas.width / 2, y: canvas.height / 2 },
  velocity: randomVelocity(),
};

let lastTick = null;
let startTime = null;
let accumulatedTime = 0;
let paused = false;
let ttsEnabled = false;
let accelEnabled = true;
let fpsAccumulator = 0;
let framesThisSecond = 0;
let lastFpsUpdate = performance.now();
let availableVoices = [];
let selectedVoice = null;
let selectedVoiceId = null;
const supportsSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
let voicesReady = !supportsSpeech;
let started = false;

function buildPolygon(sides) {
  const vertices = [];
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const step = (Math.PI * 2) / sides;

  for (let i = 0; i < sides; i += 1) {
    const angle = -Math.PI / 2 + i * step;
    vertices.push({
      x: center.x + config.baseRadius * Math.cos(angle),
      y: center.y + config.baseRadius * Math.sin(angle),
    });
  }

  return { center, vertices, edges: computeEdges(vertices, center) };
}

function computeEdges(vertices, center) {
  const edges = [];
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const edge = {
      a,
      b,
      normal: computeInwardNormal(a, b, center),
    };
    edges.push(edge);
  }
  return edges;
}

function computeInwardNormal(a, b, center) {
  const edge = { x: b.x - a.x, y: b.y - a.y };
  const len = Math.hypot(edge.x, edge.y);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  let normal = { x: -edge.y / len, y: edge.x / len }; // one of the two perpendiculars
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const toCenter = { x: center.x - midpoint.x, y: center.y - midpoint.y };
  const dot = normal.x * toCenter.x + normal.y * toCenter.y;
  if (dot < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  return normal;
}

function randomVelocity() {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * currentSpeed,
    y: Math.sin(angle) * currentSpeed,
  };
}

function polygonName(sides) {
  if (specialNames.has(sides)) {
    return specialNames.get(sides);
  }
  if (sides >= 1000) {
    return `${sides}-gon`;
  }

  const hundreds = Math.floor(sides / 100);
  const tens = Math.floor((sides % 100) / 10);
  const units = sides % 10;

  let stem = "";

  if (hundreds > 0) {
    stem += hundredsPrefixes[hundreds] ?? "";
  }

  if (tens === 1 && units !== 0 && sides < 100) {
    const teen = specialNames.get(sides);
    if (teen) {
      return teen;
    }
  }

  if (tens > 0) {
    if (tens === 2 && units > 0) {
      stem += "icosi";
    } else {
      stem += tensPrefixes[tens] ?? "";
    }
  }

  if (units > 0) {
    if (tens > 0 || hundreds > 0) {
      stem += "kai";
    }
    stem += unitPrefixes[units] ?? "";
  }

  if (!stem) {
    return `${sides}-gon`;
  }

  const suffix = stem.endsWith("a") || stem.endsWith("i") ? "gon" : "agon";
  return capitalize(stem + suffix);
}

function capitalize(word) {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function speakName(name) {
  if (!ttsEnabled || !supportsSpeech) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(name);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function announceShape() {
  const label = polygonName(totalSides);
  shapeNameLabel.textContent = label;
  if (sideCountLabel) {
    sideCountLabel.textContent = `${totalSides} ${totalSides === 1 ? "side" : "sides"}`;
  }
  speakName(label);
}

function update(deltaTime) {
  if (paused) {
    return;
  }

  ball.position.x += ball.velocity.x * deltaTime;
  ball.position.y += ball.velocity.y * deltaTime;

  let collided = false;

  for (const edge of polygon.edges) {
    const dist =
      (ball.position.x - edge.a.x) * edge.normal.x +
      (ball.position.y - edge.a.y) * edge.normal.y;

    if (dist < config.ballRadius) {
      collided = true;

      const penetration = config.ballRadius - dist;
      ball.position.x += edge.normal.x * penetration;
      ball.position.y += edge.normal.y * penetration;

      const velDot = ball.velocity.x * edge.normal.x + ball.velocity.y * edge.normal.y;
      ball.velocity.x -= 2 * velDot * edge.normal.x;
      ball.velocity.y -= 2 * velDot * edge.normal.y;
    }
  }

  if (collided) {
    totalSides += 1;
    polygon = buildPolygon(totalSides);
    announceShape();
    if (accelEnabled) {
      const targetSpeed = Math.min(currentSpeed + config.bounceSpeedGain, config.maxSpeed);
      setBallSpeed(targetSpeed);
      updateSpeedUI(currentSpeed);
    }
  }
}

function render() {
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(0, 0);

  ctx.strokeStyle = config.polygonColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const verts = polygon.vertices;
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i += 1) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = config.trailColor;
  ctx.fill();

  ctx.fillStyle = config.ballColor;
  ctx.beginPath();
  ctx.arc(ball.position.x, ball.position.y, config.ballRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  updateElapsedDisplay();
  updateFpsDisplay();
}

function tick(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  update(delta);
  render();
  requestAnimationFrame(tick);
}

function init() {
  announceShape();
  wireControls();
  updateElapsedDisplay();
  updateControlAvailability();
  resetFpsTracking();
  render();
}

function setBallSpeed(speed) {
  const clamped = Math.min(speed, config.maxSpeed);
  currentSpeed = clamped;
  const magnitude = Math.hypot(ball.velocity.x, ball.velocity.y);
  if (magnitude > 0) {
    const scale = currentSpeed / magnitude;
    ball.velocity.x *= scale;
    ball.velocity.y *= scale;
  } else {
    const fresh = randomVelocity();
    ball.velocity.x = fresh.x;
    ball.velocity.y = fresh.y;
  }
}

function updateElapsedDisplay() {
  if (!elapsedLabel) {
    return;
  }
  const now = performance.now();
  const runningTime = started && !paused && startTime !== null ? now - startTime : 0;
  const elapsedMs = started ? accumulatedTime + runningTime : 0;
  elapsedLabel.textContent = `${(elapsedMs / 1000).toFixed(1)}s`;
}

function updateFpsDisplay() {
  if (!fpsLabel) {
    return;
  }
  const now = performance.now();
  framesThisSecond += 1;
  const delta = now - lastFpsUpdate;
  fpsAccumulator += delta;
  if (fpsAccumulator >= 500) {
    const fps = Math.round((framesThisSecond / fpsAccumulator) * 1000);
    fpsLabel.textContent = `${fps} fps`;
    fpsAccumulator = 0;
    framesThisSecond = 0;
  }
  lastFpsUpdate = now;
}

function resetFpsTracking() {
  framesThisSecond = 0;
  fpsAccumulator = 0;
  lastFpsUpdate = performance.now();
  if (fpsLabel) {
    fpsLabel.textContent = started ? "-- fps" : "0 fps";
  }
}

function updateSpeedUI(speed) {
  if (speedReadout) {
    speedReadout.textContent = Math.round(speed).toString();
  }
  if (speedSlider) {
    const max = Number(speedSlider.max);
    const clamped = Math.min(speed, Number.isNaN(max) ? speed : max);
    speedSlider.value = clamped.toString();
  }
}

function updateControlAvailability() {
  if (startBtn) {
    const waitingForVoices = !voicesReady && !started;
    startBtn.disabled = started || !voicesReady;
    if (waitingForVoices) {
      startBtn.textContent = "Start (loading voices…)";
      startBtn.title = "Waiting for speech voices to load.";
    } else {
      startBtn.textContent = "Start";
      startBtn.title = started ? "Simulation already running." : "Begin the simulation.";
    }
  }

  if (pauseBtn) {
    pauseBtn.disabled = !started || paused;
  }

  if (resumeBtn) {
    resumeBtn.disabled = !started || !paused;
  }

  if (resetBtn) {
    resetBtn.disabled = !started;
  }
}

function startSimulation() {
  if (started || !voicesReady) {
    return;
  }
  started = true;
  paused = false;
  accumulatedTime = 0;
  const now = performance.now();
  startTime = now;
  lastTick = now;
  resetFpsTracking();
  updateElapsedDisplay();
  updateControlAvailability();
  requestAnimationFrame(tick);
  if (ttsEnabled) {
    announceShape();
  }
}

const preferredVoiceLocales = ["en-US", "en-GB", "en-AU", "en-CA", "en-IN"];

function voiceQualityScore(voice) {
  let score = 0;
  const lang = (voice.lang || "").toLowerCase();
  if (preferredVoiceLocales.some((locale) => lang.startsWith(locale.toLowerCase()))) {
    score += 20;
  }
  if (/female|woman|feminine/i.test(voice.name)) {
    score += 6;
  }
  if (/natural|neural/i.test(voice.name)) {
    score += 5;
  }
  if (/google|samantha|serena|ava|karen|olivia/i.test(voice.name)) {
    score += 4;
  }
  if (!voice.localService) {
    score += 2;
  }
  if (/english/i.test(voice.lang || "")) {
    score += 3;
  }
  return score;
}

function choosePreferredVoice(voices) {
  if (!voices.length) {
    return null;
  }
  let best = voices[0];
  let bestScore = voiceQualityScore(best);
  for (const voice of voices.slice(1)) {
    const score = voiceQualityScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

function refreshVoiceOptions() {
  if (!supportsSpeech || !voiceSelect) {
    return;
  }
  availableVoices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";

  if (availableVoices.length === 0) {
    const option = document.createElement("option");
    option.textContent = "No voices available";
    voiceSelect.appendChild(option);
    voiceSelect.disabled = true;
    voiceSelect.title = "No speech voices available.";
    voicesReady = false;
    updateControlAvailability();
    return;
  }

  availableVoices = [...availableVoices].sort((a, b) => {
    const scoreDiff = voiceQualityScore(b) - voiceQualityScore(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.name.localeCompare(b.name);
  });

  const fragment = document.createDocumentFragment();
  let localeNames;
  try {
    localeNames = new Intl.DisplayNames([navigator.language || "en"], { type: "language" });
  } catch (_error) {
    localeNames = null;
  }
  for (const voice of availableVoices) {
    const option = document.createElement("option");
    const localeLabel = localeNames ? localeNames.of(voice.lang) ?? voice.lang : voice.lang;
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} – ${localeLabel}`;
    fragment.appendChild(option);
  }
  voiceSelect.appendChild(fragment);

  const previousVoiceId = selectedVoiceId;
  const previousVoice = selectedVoiceId
    ? availableVoices.find((voice) => voice.voiceURI === selectedVoiceId)
    : null;
  selectedVoice = previousVoice ?? choosePreferredVoice(availableVoices);
  selectedVoiceId = selectedVoice ? selectedVoice.voiceURI : null;

  if (selectedVoiceId) {
    voiceSelect.value = selectedVoiceId;
  }

  voiceSelect.disabled = !ttsEnabled || availableVoices.length === 0;
  if (!voiceSelect.disabled) {
    voiceSelect.title = "Select a preferred voice.";
  }

  if (ttsEnabled && selectedVoiceId && selectedVoiceId !== previousVoiceId && shapeNameLabel?.textContent) {
    speakName(shapeNameLabel.textContent);
  }

  voicesReady = availableVoices.length > 0;
  updateControlAvailability();
}

function initVoices() {
  if (!supportsSpeech || !voiceSelect) {
    return;
  }

  refreshVoiceOptions();
  const synth = window.speechSynthesis;
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", refreshVoiceOptions);
  } else {
    synth.onvoiceschanged = refreshVoiceOptions;
  }
  // Trigger voice loading for some browsers.
  synth.getVoices();
}

function wireControls() {
  if (speedSlider) {
    speedSlider.value = config.ballSpeed.toString();
    const initialSpeed = Number(speedSlider.value);
    setBallSpeed(initialSpeed);
    updateSpeedUI(currentSpeed);
  }

  if (accelToggle) {
    accelToggle.checked = accelEnabled;
  }

  if (supportsSpeech) {
    initVoices();
  } else if (voiceSelect) {
    voiceSelect.innerHTML = "<option>Speech not supported</option>";
    voiceSelect.disabled = true;
    availableVoices = [];
    selectedVoice = null;
    selectedVoiceId = null;
    voiceSelect.title = "Text-to-speech not supported in this browser.";
    voicesReady = true;
  }

  startBtn?.addEventListener("click", () => {
    if (started || !voicesReady) {
      return;
    }
    startSimulation();
  });

  pauseBtn?.addEventListener("click", () => {
    if (paused || !started) {
      return;
    }
    const now = performance.now();
    if (startTime !== null) {
      accumulatedTime += now - startTime;
    }
    startTime = null;
    paused = true;
    if (supportsSpeech) {
      window.speechSynthesis.cancel();
    }
    updateElapsedDisplay();
    updateControlAvailability();
  });

  resumeBtn?.addEventListener("click", () => {
    if (!paused || !started) {
      return;
    }
    paused = false;
    const now = performance.now();
    startTime = now;
    lastTick = now;
    updateElapsedDisplay();
    updateControlAvailability();
  });

  resetBtn?.addEventListener("click", () => {
    if (!started) {
      return;
    }
    totalSides = 3;
    polygon = buildPolygon(totalSides);
    ball.position.x = canvas.width / 2;
    ball.position.y = canvas.height / 2;
    ball.velocity = randomVelocity();
    setBallSpeed(config.ballSpeed);
    paused = false;
    const now = performance.now();
    lastTick = now;
    startTime = now;
    accumulatedTime = 0;
    if (supportsSpeech) {
      window.speechSynthesis.cancel();
    }
    announceShape();
    if (accelToggle) {
      accelToggle.checked = accelEnabled;
    }
    if (speedSlider) {
      speedSlider.value = config.ballSpeed.toString();
    }
    updateSpeedUI(currentSpeed);
    updateElapsedDisplay();
    updateControlAvailability();
  });

  speedSlider?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const value = Number(target.value);
    setBallSpeed(value);
    updateSpeedUI(currentSpeed);
  });

  accelToggle?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    accelEnabled = target.checked;
    if (!accelEnabled) {
      setBallSpeed(currentSpeed);
      updateSpeedUI(currentSpeed);
    }
  });

  if (!supportsSpeech) {
    ttsEnabled = false;
    if (ttsToggle) {
      ttsToggle.checked = false;
      ttsToggle.disabled = true;
      ttsToggle.title = "Text-to-speech not supported in this browser.";
    }
    if (voiceSelect) {
      voiceSelect.disabled = true;
      voiceSelect.title = "Text-to-speech not supported in this browser.";
    }
  } else {
    ttsToggle?.addEventListener("change", (event) => {
      ttsEnabled = event.target.checked;
      if (!ttsEnabled) {
        window.speechSynthesis.cancel();
        if (voiceSelect) {
          voiceSelect.disabled = true;
          voiceSelect.title = "Enable speech to choose a voice.";
        }
      } else {
        if (voiceSelect && availableVoices.length > 0) {
          voiceSelect.disabled = false;
          voiceSelect.title = "Select a preferred voice.";
        }
        announceShape();
      }
    });

    voiceSelect?.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }
      const chosen = availableVoices.find((voice) => voice.voiceURI === target.value);
      if (chosen) {
        selectedVoice = chosen;
        selectedVoiceId = chosen.voiceURI;
        if (ttsEnabled) {
          const currentName = shapeNameLabel?.textContent || polygonName(totalSides);
          speakName(currentName);
        }
      }
    });
  }

  updateControlAvailability();
}

init();
