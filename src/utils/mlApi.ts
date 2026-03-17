import { Point } from "./hipAnalysis";

// Colors matching project CSS variables (resolved to actual values)
const BLUE   = "hsl(211, 100%, 50%)";
const TEAL   = "hsl(174, 72%, 56%)";
const AMBER  = "hsl(38, 92%, 50%)";
const RED    = "hsl(0, 72%, 51%)";
const CYAN   = "#22d3ee";

const POINT_COLORS = [BLUE, BLUE, TEAL, TEAL, AMBER, AMBER];
const POINT_LABELS = ["H₁", "H₂", "A₁", "A₂", "N₁", "N₂"];

function drawPoint(ctx: CanvasRenderingContext2D, point: Point, color: string, size = 7) {
  // Outer glow
  ctx.beginPath();
  ctx.arc(point[0], point[1], size + 5, 0, 2 * Math.PI);
  ctx.fillStyle = color + "33";
  ctx.fill();
  // Main dot
  ctx.beginPath();
  ctx.arc(point[0], point[1], size, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "white";
  ctx.fillText(text, x + 11, y - 7);
  ctx.shadowBlur = 0;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, width = 2, dash: number[] = []
) {
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTextLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export function drawScene(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  points: (Point | undefined)[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!image) {
    drawPlaceholder(canvas);
    return;
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const allSix = points.length === 6 && points.every(Boolean);

  if (allSix) {
    const [h1, h2, a1, a2, n1] = points as Point[];
    ctx.globalAlpha = 0.93;

    // 1. Hilgenreiner line (blue)
    const changeX = h2[0] - h1[0];
    const changeY = h2[1] - h1[1];
    drawLine(ctx, h1[0] - changeX * 0.25, h1[1] - changeY * 0.25, h2[0] + changeX * 0.25, h2[1] + changeY * 0.25, BLUE, 3);
    drawTextLabel(ctx, "Хильгенрейнер", (h1[0] + h2[0]) / 2 - 40, (h1[1] + h2[1]) / 2 - 12, BLUE);

    // 2. Acetabular roof lines (teal, dashed)
    drawLine(ctx, a1[0], a1[1], h1[0], h1[1], TEAL, 2, [6, 4]);
    drawLine(ctx, a2[0], a2[1], h2[0], h2[1], TEAL, 2, [6, 4]);

    // 3. Perkins lines (red, perpendicular)
    const dx = h2[0] - h1[0];
    const dy = h2[1] - h1[1];
    const len = 400;
    const perpLen = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / perpLen;
    const ny =  dx / perpLen;
    drawLine(ctx, a1[0] - nx * len * 0.5, a1[1] - ny * len * 0.5, a1[0] + nx * len * 0.5, a1[1] + ny * len * 0.5, RED, 1.5, [5, 4]);
    drawLine(ctx, a2[0] - nx * len * 0.5, a2[1] - ny * len * 0.5, a2[0] + nx * len * 0.5, a2[1] + ny * len * 0.5, RED, 1.5, [5, 4]);
    drawTextLabel(ctx, "Перкин", a1[0] + 8, a1[1] + 28, RED);

    // 4. h-distance (cyan)
    const A = h2[1] - h1[1];
    const B = h1[0] - h2[0];
    const denom = A * A + B * B;
    if (denom > 0) {
      const t = (A * (h1[0] - n1[0]) + B * (h1[1] - n1[1])) / denom;
      const projX = n1[0] + A * t;
      const projY = n1[1] + B * t;
      drawLine(ctx, n1[0], n1[1], projX, projY, CYAN, 1.5, [3, 3]);
      ctx.fillStyle = CYAN;
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      ctx.fillText("h", (n1[0] + projX) / 2 + 5, (n1[1] + projY) / 2);
    }

    ctx.globalAlpha = 1.0;
  }

  // Draw all placed points
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!pt) continue;
    const color = POINT_COLORS[i] ?? BLUE;
    drawPoint(ctx, pt, color);
    drawLabel(ctx, POINT_LABELS[i], pt[0], pt[1], color);
  }
}

export function drawPlaceholder(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Light background matching project theme
  ctx.fillStyle = "hsl(210, 20%, 98%)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dashed border
  ctx.strokeStyle = "hsl(216, 18%, 85%)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  const m = 20;
  const r = 12;
  const x = m, y = m, w = canvas.width - m * 2, h = canvas.height - m * 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Upload icon
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 - 18;
  ctx.strokeStyle = "hsl(216, 18%, 75%)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 16); ctx.lineTo(cx, cy - 10);
  ctx.moveTo(cx - 10, cy - 2); ctx.lineTo(cx, cy - 14); ctx.lineTo(cx + 10, cy - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 20); ctx.lineTo(cx - 14, cy + 26); ctx.lineTo(cx + 14, cy + 26); ctx.lineTo(cx + 14, cy + 20);
  ctx.stroke();

  // Text
  ctx.fillStyle = "hsl(220, 10%, 46%)";
  ctx.font = "500 14px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Загрузите рентгеновский снимок", cx, cy + 50);
  ctx.fillStyle = "hsl(216, 18%, 70%)";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText("PNG / JPG / WEBP", cx, cy + 70);
  ctx.textAlign = "left";
}