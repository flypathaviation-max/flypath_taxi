const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const WORLD_W = 1200;
const WORLD_H = 1600;

const bg = new Image();
bg.src = "assets/airport.png";

const plane = {
  x: 260,
  y: 1400,
  heading: -Math.PI / 2,
  speed: 0,

  maxFwd: 220,     // velocidad max hacia delante (px/s)
  maxRev: 80,      // marcha atrás suave
  accel: 420,      // aceleración (px/s^2)
  brake: 900,      // frenada fuerte (px/s^2)
  drag: 0.92,      // fricción natural por frame (aprox)
  turnRate: 2.6    // rad/s a alta velocidad
};

const keys = { up:false, down:false, left:false, right:false, space:false, shift:false };

function resetPlane() {
  plane.x = 260;
  plane.y = 1400;
  plane.heading = -Math.PI / 2;
  plane.speed = 0;
}

// Evita que las flechas/espacio hagan scroll en la página
window.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();

  if (e.code === "ArrowUp") keys.up = true;
  if (e.code === "ArrowDown") keys.down = true;
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
  if (e.code === "Space") keys.space = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
  if (e.code === "KeyR") resetPlane();
}, { passive: false });

window.addEventListener("keyup", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();

  if (e.code === "ArrowUp") keys.up = false;
  if (e.code === "ArrowDown") keys.down = false;
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "Space") keys.space = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = false;
}, { passive: false });

// Click para coordenadas; Shift+Click para teletransportar
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) / rect.width;
  const sy = (e.clientY - rect.top) / rect.height;
  const wx = Math.round(sx * WORLD_W);
  const wy = Math.round(sy * WORLD_H);
  console.log("Coords:", wx, wy);

  if (e.shiftKey) {
    plane.x = wx;
    plane.y = wy;
    plane.speed = 0;
  }
});

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function approach(current, target, delta) {
  if (current < target) return Math.min(current + delta, target);
  return Math.max(current - delta, target);
}

// Avión top-down (silhouette simple)
function drawAirplane() {
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.heading);

  // Escala
  const s = 1.0;

  // Colores
  const fill = "#f6f7fb";
  const stroke = "rgba(0,0,0,0.55)";

  ctx.lineWidth = 2;

  // Fuselaje + morro
  ctx.beginPath();
  ctx.moveTo(0, -26*s);       // punta
  ctx.lineTo(7*s, -12*s);
  ctx.lineTo(7*s, 18*s);
  ctx.lineTo(0, 26*s);        // cola
  ctx.lineTo(-7*s, 18*s);
  ctx.lineTo(-7*s, -12*s);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();

  // Alas
  ctx.beginPath();
  ctx.moveTo(-28*s, -2*s);
  ctx.lineTo(28*s, -2*s);
  ctx.lineTo(22*s, 6*s);
  ctx.lineTo(-22*s, 6*s);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();

  // Estabilizador trasero
  ctx.beginPath();
  ctx.moveTo(-16*s, 18*s);
  ctx.lineTo(16*s, 18*s);
  ctx.lineTo(12*s, 24*s);
  ctx.lineTo(-12*s, 24*s);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();

  // “Cabina” para dar dirección visual
  ctx.beginPath();
  ctx.ellipse(0, -12*s, 4.5*s, 7*s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  ctx.restore();
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  // === Velocidad (throttle/freno) ===
  let targetSpeed = 0;
  if (keys.up) targetSpeed = plane.maxFwd;
  if (keys.down) targetSpeed = -plane.maxRev;

  // Freno fuerte con espacio
  if (keys.space) {
    plane.speed = approach(plane.speed, 0, plane.brake * dt);
  } else {
    // Acelera/decela hacia target
    plane.speed = approach(plane.speed, targetSpeed, plane.accel * dt);

    // Fricción natural si no hay throttle
    if (!keys.up && !keys.down) {
      plane.speed *= Math.pow(plane.drag, dt * 60);
      if (Math.abs(plane.speed) < 0.6) plane.speed = 0;
    }
  }

  // === Giro tipo “taxi” ===
  // Sin SHIFT: casi no gira parado; gira más cuanto más velocidad tengas
  const speedFactor = keys.shift
    ? 1
    : clamp(Math.abs(plane.speed) / 140, 0, 1); // 0..1

  const canTurn = keys.shift || Math.abs(plane.speed) > 2;

  if (canTurn) {
    if (keys.left)  plane.heading -= plane.turnRate * speedFactor * dt;
    if (keys.right) plane.heading += plane.turnRate * speedFactor * dt;
  }

  // === Movimiento (siempre en dirección del heading) ===
  plane.x += Math.cos(plane.heading) * plane.speed * dt;
  plane.y += Math.sin(plane.heading) * plane.speed * dt;

  // Límites
  plane.x = Math.max(18, Math.min(WORLD_W - 18, plane.x));
  plane.y = Math.max(18, Math.min(WORLD_H - 18, plane.y));

  // Render
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bg.complete && bg.naturalWidth) {
    ctx.drawImage(bg, 0, 0, WORLD_W, WORLD_H);
  } else {
    ctx.fillStyle = "#111822";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "16px system-ui";
    ctx.fillText("Cargando plano...", 20, 30);
  }

  drawAirplane();
  requestAnimationFrame(loop);
}

bg.onload = () => requestAnimationFrame(loop);
bg.onerror = () => requestAnimationFrame(loop);
