/**
 * @file features/analyzer/model/hipAnalysis.ts
 * @layer Model
 * @description Бизнес-логика анализа дисплазии тазобедренного сустава.
 *
 * ТОЛЬКО чистые функции:
 * — нет React, нет DOM, нет сетевых запросов
 * — детерминированы: одни входные данные → всегда один результат
 * — можно покрыть юнит-тестами без моков
 *
 * Методология: рентгенометрия по Хильгенрейнеру и Перкину.
 * Классификация: Tönnis D. "Congenital Dysplasia and Dislocation of the Hip"
 */

import type {
  Point, Gender, AgeNorm, Distances,
  DysplasiaResult, PerkinsPosition, AnalysisResult,
} from "@/types";
import { AGE_NORMS, DEFAULT_PIXEL_TO_MM } from "@/constants";

// ─── Нормы ────────────────────────────────────────────────────────────────────

/**
 * Возрастная норма ацетабулярного угла.
 * Если возраст вне таблицы — клампируется к ближайшему значению.
 */
export function getNormForAge(months: number, gender: Gender): AgeNorm {
  const m = Math.min(Math.max(months, 0), 24);
  let norm = AGE_NORMS[0];
  for (const row of AGE_NORMS) {
    if (m >= row.age) norm = row;
    else break;
  }
  const base = gender === "male" ? norm.male : norm.female;
  return { norm: base, min: base - norm.range, max: base + norm.range, range: norm.range };
}

// ─── Ацетабулярный угол ───────────────────────────────────────────────────────

/**
 * Угол между горизонталью Хильгенрейнера и касательной к крышке впадины.
 * Алгоритм: угол между векторами через скалярное произведение.
 *
 * @returns градусы, 0 если точек недостаточно
 */
export function calcAcetabularAngle(points: (Point | undefined)[]): number {
  if (!points[0] || !points[2]) return 0;
  const [h1, , a1] = points as Point[];
  const dx = a1[0] - h1[0];
  const dy = a1[1] - h1[1];
  const mag = Math.sqrt(dx*dx + dy*dy);
  if (mag === 0) return 0;
  // cos(θ) = dx/|вектор| (скалярное произведение с единичным горизонтальным вектором)
  let angle = (Math.acos(Math.max(-1, Math.min(1, dx/mag))) * 180) / Math.PI;
  if (angle > 90) angle = 180 - angle;
  return Math.abs(angle);
}

// ─── Дистанции Хильгенрейнера ─────────────────────────────────────────────────

/**
 * h — расстояние от головки бедра до линии Хильгенрейнера.
 *     Норма 8–12 мм. Уменьшение — смещение головки вверх (вывих).
 *
 * d — горизонтальное расстояние от дна впадины до проекции головки.
 *     Норма 10–15 мм. Увеличение — латерализация (подвывих/вывих).
 *
 * @param pixelToMm - из DICOM-метаданных или DEFAULT_PIXEL_TO_MM
 */
export function calcHDistance(
  points: (Point | undefined)[],
  pixelToMm = DEFAULT_PIXEL_TO_MM
): Distances {
  if (!points[0] || !points[1] || !points[4]) return { h: 0, d: 0 };
  const [h1, h2, , , n1] = points as Point[];

  // Уравнение прямой Ax + By + C = 0
  const A = h2[1]-h1[1], B = h1[0]-h2[0], C = h2[0]*h1[1]-h1[0]*h2[1];
  const len = Math.sqrt(A*A + B*B);
  if (len === 0) return { h: 0, d: 0 };

  // h = формула расстояния от точки до прямой
  const hPx = Math.abs(A*n1[0] + B*n1[1] + C) / len;

  // Проекция точки шейки на линию → расстояние d
  const t = (A*(h1[0]-n1[0]) + B*(h1[1]-n1[1])) / (A*A + B*B);
  const dPx = Math.sqrt((n1[0]+A*t-h1[0])**2 + (n1[1]+B*t-h1[1])**2);

  return { h: hPx*pixelToMm, d: dPx*pixelToMm };
}

// ─── Позиция по Перкину ───────────────────────────────────────────────────────

/**
 * Линия Перкина — вертикаль из края крышки впадины.
 * Норма: головка медиально (левее линии).
 * Латерально — признак подвывиха или вывиха.
 */
export function checkPerkinsPosition(points: (Point | undefined)[]): PerkinsPosition {
  if (!points[2] || !points[4]) return null;
  return points[4][0] < points[2][0] ? "medial" : "lateral";
}

// ─── Классификация дисплазии ──────────────────────────────────────────────────

/**
 * Степень дисплазии по Тённису.
 * Норма:      угол 26–28.5°, d 10–15 мм, h 8–12 мм
 * I степень:  увеличен угол, остальное в норме (предвывих)
 * II степень: угол + d > 12 мм (подвывих)
 * III степень: угол + d + h < 8 мм (вывих)
 */
export function determineDysplasia(angle: number, h: number, d: number): DysplasiaResult {
  const angleOk = angle >= 26 && angle <= 28.5;
  const dOk     = d >= 10 && d <= 15;
  const hOk     = Math.abs(h - 10) <= 2;

  if (angleOk && dOk && hOk)
    return { stage: "Норма",       description: "Все показатели в пределах нормы",                                                   level: "normal"     };
  if (angle > 28.5 && dOk && hOk)
    return { stage: "I степень",   description: "Предвывих — увеличен ацетабулярный угол, центрирование сохранено",                  level: "grade1"     };
  if (angle > 28.5 && d > 12 && hOk)
    return { stage: "II степень",  description: "Подвывих — увеличены угол и дистанция d (латерализация), h в норме",               level: "grade2"     };
  if (angle > 28.5 && d > 12 && h < 8)
    return { stage: "III степень", description: "Вывих — увеличены угол и d, уменьшена дистанция h (смещение вверх)",               level: "grade3"     };

  return { stage: "Неполные данные", description: "Комбинация показателей не соответствует стандартной классификации",              level: "incomplete" };
}

// ─── Фасад ────────────────────────────────────────────────────────────────────

/**
 * Полный анализ снимка — агрегирует все расчёты.
 * Вызывается из Controller после расстановки 6 точек.
 */
export function runAnalysis(
  points: (Point | undefined)[],
  ageMonths: number,
  gender: Gender,
  pixelToMm = DEFAULT_PIXEL_TO_MM
): AnalysisResult {
  const angle     = calcAcetabularAngle(points);
  const distances = calcHDistance(points, pixelToMm);
  const perkins   = checkPerkinsPosition(points);
  const normData  = getNormForAge(ageMonths, gender);
  const dysplasia = determineDysplasia(angle, distances.h, distances.d);
  return { angle, distances, perkins, normData, dysplasia };
}