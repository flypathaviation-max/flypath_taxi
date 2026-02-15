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
  maxSpeed: 180,
  accel: 320,
  turnRate: 2.8
};

const keys = { up:false, left:false, right:false, space:false };

function resetPlane() {
  plane.x = 260;
  plane.y = 1400;
  plane.heading = -Math.PI / 2;
  plane.speed = 0;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp") keys.up = true;
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
  if (e.code === "Space") keys.space = true;
  if (e.code === "KeyR") resetPlane();
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowUp") keys.up = false;
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "Space") keys.space = false;
});

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

function drawPlane() {
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.heading);

  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(11, 14);
  ctx.lineTo(-11, 14);
  ctx.closePath();
  ctx.fillStyle = "#ffd166";
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.stroke();

  ctx.restore();
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  if (keys.space) {
    plane.speed = 0;
  } else {
    if (keys.up) {
      plane.speed += plane.accel * dt;
      if (plane.speed > plane.maxSpeed) plane.speed = plane.maxSpeed;
    } else {
      plane.speed *= Math.pow(0.90, dt * 60);
      if (plane.speed < 0.6) plane.speed = 0;
    }

    if (keys.left) plane.heading -= plane.turnRate * dt;
    if (keys.right) plane.heading += plane.turnRate * dt;
  }

  plane.x += Math.cos(plane.heading) * plane.speed * dt;
  plane.y += Math.sin(plane.heading) * plane.speed * dt;

  plane.x = Math.max(14, Math.min(WORLD_W - 14, plane.x));
  plane.y = Math.max(14, Math.min(WORLD_H - 14, plane.y));

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

  drawPlane();
  requestAnimationFrame(loop);
}

bg.onload = () => requestAnimationFrame(loop);
bg.onerror = () => requestAnimationFrame(loop);
