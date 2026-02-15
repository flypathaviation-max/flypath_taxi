const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const WORLD_W = 1200;
const WORLD_H = 1600;

const bg = new Image();
bg.src = "assets/airport.png";

const plane = {
  x: 260,
  y: 1400,
  heading: -Math.PI / 2, // nariz hacia arriba (norte en tu mapa)
  speed: 0,

  maxFwd: 220,     // px/s
  maxRev: 140,     // px/s
  accel: 520,      // px/s^2
  brake: 900,      // px/s^2
  drag: 0.88,      // fricción cuando no pulsas nada
  turnRate: 2.8    // rad/s (pivot en el sitio)
};

const keys = { up:false, down:false, left:false, right:false, space:false };

function resetPlane() {
  plane.x = 260;
  plane.y = 1400;
  plane.heading = -Math.PI / 2;
  plane.speed = 0;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function approach(cur, target, delta) {
  if (cur < target) return Math.min(cur + delta, target);
  return Math.max(cur - delta, target);
}

// Evita scroll del navegador con flechas/espacio
window.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();

  if (e.code === "ArrowUp") keys.up = true;
  if (e.code === "ArrowDown") keys.down = true;
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
  if (e.code === "Space") keys.space = true;
  if (e.code === "KeyR") resetPlane();
}, { passive: false });

window.addEventListener("keyup", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();

  if (e.code === "ArrowUp") keys.up = false;
  if (e.code === "ArrowDown") keys.down = false;
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "Space") keys.space = false;
}, { passive: false });

// Click para ver coords (Shift+Click teletransporta)
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

// Icono de avión simple (top-down) — nariz hacia arriba en coords locales
function drawPlaneIcon() {
  ctx.save();
  ctx.translate(plane.x, plane.y);
  // Alinear la “nariz” del dibujo con el heading real
const DRAW_ROT_OFFSET = Math.PI / 2;  // 90° (si quedara al revés, pon -Math.PI/2)
ctx.rotate(plane.heading + DRAW_ROT_OFFSET);

// Tamaño x2
const s = 2.0;


  // Sombra suave para que destaque
  ctx.beginPath();
  ctx.ellipse(3, 3, 18, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.fill();

  // Fuselaje (cápsula)
  ctx.beginPath();
  ctx.moveTo(0, -26*s);     // nariz
  ctx.quadraticCurveTo(9*s, -18*s, 9*s, -6*s);
  ctx.lineTo(9*s, 18*s);
  ctx.quadraticCurveTo(9*s, 26*s, 0, 26*s); // cola
  ctx.quadraticCurveTo(-9*s, 26*s, -9*s, 18*s);
  ctx.lineTo(-9*s, -6*s);
  ctx.quadraticCurveTo(-9*s, -18*s, 0, -26*s);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.stroke();

  // Alas (rect simple)
  ctx.beginPath();
  ctx.roundRect(-28*s, -2*s, 56*s, 10*s, 4*s);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();

  // Cola horizontal
  ctx.beginPath();
  ctx.roundRect(-18*s, 16*s, 36*s, 8*s, 4*s);
  ctx.fill();
  ctx.stroke();

  // “Cabina” para ver claramente la nariz
  ctx.beginPath();
  ctx.ellipse(0, -14*s, 5*s, 8*s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fill();

  ctx.restore();
}

// Polyfill simple para roundRect si el navegador no lo soporta
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    this.beginPath();
    this.moveTo(x+rr, y);
    this.arcTo(x+w, y, x+w, y+h, rr);
    this.arcTo(x+w, y+h, x, y+h, rr);
    this.arcTo(x, y+h, x, y, rr);
    this.arcTo(x, y, x+w, y, rr);
    this.closePath();
    return this;
  };
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  // 1) Pivotar sobre sí mismo (siempre permitido)
  if (keys.left)  plane.heading -= plane.turnRate * dt;
  if (keys.right) plane.heading += plane.turnRate * dt;

  // 2) Velocidad objetivo según teclas
  let targetSpeed = 0;
  if (keys.up) targetSpeed = plane.maxFwd;
  if (keys.down) targetSpeed = -plane.maxRev;

  // 3) Frenar fuerte con espacio
  if (keys.space) {
    plane.speed = approach(plane.speed, 0, plane.brake * dt);
  } else {
    plane.speed = approach(plane.speed, targetSpeed, plane.accel * dt);

    // fricción si no pulsas ni up ni down
    if (!keys.up && !keys.down) {
      plane.speed *= Math.pow(plane.drag, dt * 60);
      if (Math.abs(plane.speed) < 0.7) plane.speed = 0;
    }
  }

  // 4) Mover SIEMPRE en dirección de la nariz (o en reverse, contrario)
  plane.x += Math.cos(plane.heading) * plane.speed * dt;
  plane.y += Math.sin(plane.heading) * plane.speed * dt;

  // Límites del mundo
  plane.x = clamp(plane.x, 18, WORLD_W - 18);
  plane.y = clamp(plane.y, 18, WORLD_H - 18);

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

  drawPlaneIcon();
  requestAnimationFrame(loop);
}

bg.onload = () => requestAnimationFrame(loop);
bg.onerror = () => requestAnimationFrame(loop);
