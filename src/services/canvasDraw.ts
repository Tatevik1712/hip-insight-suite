/**
 * @file src/services/canvasDraw.ts
 * @layer Service
 * @description Сервис отрисовки аннотаций на HTML Canvas.
 *
 * Инкапсулирует Canvas API. Не зависит от React.
 * Принимает нативный HTMLCanvasElement, чистые данные — ничего лишнего.

 * Основная функция отрисовки всего на canvas:
 * - исходное изображение
 * - точки студента
 * - линии (Хильгенрейнер, Перкин и т.д.)
 * - эталонные точки (зелёные)

 */

import type { Point } from "@/types";
import { COLORS, POINT_META } from "@/constants";

// ─── Примитивы рисования ──────────────────────────────────────────────────────

function drawPoint(ctx: CanvasRenderingContext2D, p: Point, color: string, size = 7) {
  // Ореол
  ctx.beginPath();
  ctx.arc(p[0], p[1], size + 5, 0, 2 * Math.PI);
  ctx.fillStyle = color + "33";
  ctx.fill();
  // Точка
  ctx.beginPath();
  ctx.arc(p[0], p[1], size, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  // Белая обводка для контраста на тёмных снимках
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
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

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, color: string
) {
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

// ─── Публичные функции ────────────────────────────────────────────────────────

/**
 * Рисует снимок + все анатомические линии + точки.
 * Линии рисуются только при наличии всех 6 точек.
 */
export function drawScene(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  points: (Point | undefined)[]
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const allSix = points.length === 6 && points.every(Boolean);

  if (allSix) {
    const [h1, h2, a1, a2, n1] = points as Point[];
    ctx.globalAlpha = 0.93;

    // 1. Линия Хильгенрейнера (синий, продлённая на 25%)
    const ex = h2[0] - h1[0], ey = h2[1] - h1[1];
    drawLine(ctx, h1[0] - ex*0.25, h1[1] - ey*0.25, h2[0] + ex*0.25, h2[1] + ey*0.25, COLORS.hilgenreiner, 3);
    drawText(ctx, "Хильгенрейнер", (h1[0]+h2[0])/2 - 40, (h1[1]+h2[1])/2 - 12, COLORS.hilgenreiner);

    // 2. Касательные к крышке впадины (бирюза, пунктир)
    drawLine(ctx, a1[0], a1[1], h1[0], h1[1], COLORS.acetabular, 2, [6, 4]);
    drawLine(ctx, a2[0], a2[1], h2[0], h2[1], COLORS.acetabular, 2, [6, 4]);

    // 3. Линии Перкина (красный, перпендикуляр к Хильгенрейнеру)
    const lineLen = Math.sqrt(ex*ex + ey*ey);
    const px = -ey/lineLen, py = ex/lineLen; // единичный перпендикуляр
    const half = 200;
    drawLine(ctx, a1[0]-px*half, a1[1]-py*half, a1[0]+px*half, a1[1]+py*half, COLORS.perkins, 1.5, [5, 4]);
    drawLine(ctx, a2[0]-px*half, a2[1]-py*half, a2[0]+px*half, a2[1]+py*half, COLORS.perkins, 1.5, [5, 4]);
    drawText(ctx, "Перкин", a1[0]+8, a1[1]+28, COLORS.perkins);

    // 4. Дистанция h (голубой, от шейки до линии Хильгенрейнера)
    const A = h2[1]-h1[1], B = h1[0]-h2[0];
    const denom = A*A + B*B;
    if (denom > 0) {
      const t = (A*(h1[0]-n1[0]) + B*(h1[1]-n1[1])) / denom;
      const projX = n1[0]+A*t, projY = n1[1]+B*t;
      drawLine(ctx, n1[0], n1[1], projX, projY, COLORS.hDistance, 1.5, [3, 3]);
      ctx.fillStyle = COLORS.hDistance;
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      ctx.fillText("h", (n1[0]+projX)/2+5, (n1[1]+projY)/2);
    }

    ctx.globalAlpha = 1.0;
  }

  // Точки поверх линий
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!pt) continue;
    drawPoint(ctx, pt, POINT_META[i].color);
    drawLabel(ctx, POINT_META[i].label, pt[0], pt[1]);
  }
}

/**
 * Рисует светлую заглушку до загрузки снимка.
 */
export function drawPlaceholder(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "hsl(210, 20%, 98%)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Пунктирная скруглённая рамка
  const m=20, r=12, x=m, y=m, w=canvas.width-m*2, h=canvas.height-m*2;
  ctx.strokeStyle = "hsl(216, 18%, 85%)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Иконка
  const cx=canvas.width/2, cy=canvas.height/2-18;
  ctx.strokeStyle = "hsl(216, 18%, 75%)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy+16); ctx.lineTo(cx, cy-10);
  ctx.moveTo(cx-10, cy-2); ctx.lineTo(cx, cy-14); ctx.lineTo(cx+10, cy-2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx-14, cy+20); ctx.lineTo(cx-14, cy+26);
  ctx.lineTo(cx+14, cy+26); ctx.lineTo(cx+14, cy+20);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "hsl(220, 10%, 46%)";
  ctx.font = "500 14px Inter, system-ui, sans-serif";
  ctx.fillText("Загрузите рентгеновский снимок", cx, cy+50);
  ctx.fillStyle = "hsl(216, 18%, 70%)";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText("DICOM · PNG · JPG", cx, cy+70);
  ctx.textAlign = "left";
}