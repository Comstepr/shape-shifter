const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const shapeNameLabel = document.getElementById("shape-name");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const resetBtn = document.getElementById("reset-btn");
const speedSlider = document.getElementById("speed-slider");
const speedReadout = document.getElementById("speed-readout");
const ttsToggle = document.getElementById("tts-toggle");

const config = {
  baseRadius: 220,
  ballRadius: 12,
  ballSpeed: 220, // pixels per second
  backgroundColor: "#09091c",
  polygonColor: "#2176ff",
  ballColor: "#ffdd57",
  trailColor: "rgba(255, 221, 87, 0.15)",
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

const ball = {
  position: { x: canvas.width / 2, y: canvas.height / 2 },
  velocity: randomVelocity(),
};

let lastTick = performance.now();
let paused = false;
let currentSpeed = config.ballSpeed;
let ttsEnabled = true;
const supportsSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

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
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function announceShape() {
  const label = polygonName(totalSides);
  shapeNameLabel.textContent = label;
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
  requestAnimationFrame(tick);
}

function setBallSpeed(speed) {
  currentSpeed = speed;
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

function wireControls() {
  if (speedSlider) {
    const initialSpeed = Number(speedSlider.value);
    speedReadout.textContent = initialSpeed.toString();
    setBallSpeed(initialSpeed);
  }

  pauseBtn?.addEventListener("click", () => {
    if (paused) {
      return;
    }
    paused = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    if (supportsSpeech) {
      window.speechSynthesis.cancel();
    }
  });

  resumeBtn?.addEventListener("click", () => {
    if (!paused) {
      return;
    }
    paused = false;
    resumeBtn.disabled = true;
    pauseBtn.disabled = false;
    lastTick = performance.now();
  });

  resetBtn?.addEventListener("click", () => {
    totalSides = 3;
    polygon = buildPolygon(totalSides);
    ball.position.x = canvas.width / 2;
    ball.position.y = canvas.height / 2;
    ball.velocity = randomVelocity();
    paused = false;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    lastTick = performance.now();
    if (supportsSpeech) {
      window.speechSynthesis.cancel();
    }
    announceShape();
  });

  speedSlider?.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    speedReadout.textContent = value.toString();
    setBallSpeed(value);
  });

  if (!supportsSpeech) {
    ttsEnabled = false;
    if (ttsToggle) {
      ttsToggle.checked = false;
      ttsToggle.disabled = true;
      ttsToggle.title = "Text-to-speech not supported in this browser.";
    }
  } else {
    ttsToggle?.addEventListener("change", (event) => {
      ttsEnabled = event.target.checked;
      if (!ttsEnabled) {
        window.speechSynthesis.cancel();
      } else {
        announceShape();
      }
    });
  }
}

init();
