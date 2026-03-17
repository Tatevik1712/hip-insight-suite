// ─── Types ────────────────────────────────────────────────────────────────────

export type Point = [number, number];

export type Gender = "male" | "female";

export interface AgeNorm {
  norm: number;
  min: number;
  max: number;
  range: number;
}

export interface Distances {
  h: number; // расстояние от шейки до линии Хильгенрейнера (мм)
  d: number; // расстояние вдоль линии Хильгенрейнера (мм)
}

export type DysplasiaLevel = "normal" | "grade1" | "grade2" | "grade3" | "incomplete";

export interface DysplasiaResult {
  stage: string;
  description: string;
  level: DysplasiaLevel;
}

export type PerkinsPosition = "medial" | "lateral" | null;

export interface AnalysisResult {
  angle: number;
  distances: Distances;
  perkins: PerkinsPosition;
  normData: AgeNorm;
  dysplasia: DysplasiaResult;
}

// ─── Age Norms Table ──────────────────────────────────────────────────────────

const AGE_NORMS = [
  { age: 0,  male: 28,   female: 30,   range: 2   },
  { age: 1,  male: 27,   female: 29,   range: 2.5 },
  { age: 2,  male: 26,   female: 28,   range: 2.5 },
  { age: 3,  male: 25,   female: 27,   range: 2.5 },
  { age: 4,  male: 24,   female: 26,   range: 2.5 },
  { age: 5,  male: 23,   female: 25,   range: 2.5 },
  { age: 6,  male: 22,   female: 24,   range: 2.5 },
  { age: 7,  male: 21,   female: 23,   range: 2.5 },
  { age: 8,  male: 20.5, female: 22.5, range: 2.5 },
  { age: 9,  male: 20,   female: 22,   range: 2.5 },
  { age: 10, male: 19.5, female: 21.5, range: 2.5 },
  { age: 11, male: 19,   female: 21,   range: 2.5 },
  { age: 12, male: 18,   female: 20,   range: 2.5 },
  { age: 18, male: 16,   female: 17,   range: 2   },
  { age: 24, male: 15,   female: 16,   range: 2   },
] as const;

// ─── Core Calculations ────────────────────────────────────────────────────────

export const PIXEL_TO_MM = 0.1;

export function getNormForAge(months: number, gender: Gender): AgeNorm {
  const m = Math.min(Math.max(months, 0), 24);
  let norm = AGE_NORMS[0];
  for (const n of AGE_NORMS) {
    if (m >= n.age) norm = n;
    else break;
  }
  const base = gender === "male" ? norm.male : norm.female;
  return { norm: base, min: base - norm.range, max: base + norm.range, range: norm.range };
}

export function calcAcetabularAngle(points: (Point | undefined)[]): number {
  if (points.length < 4 || !points[0] || !points[2]) return 0;
  const h1 = points[0];
  const a1 = points[2];
  const dx = a1[0] - h1[0];
  const dy = a1[1] - h1[1];
  const mag2 = Math.sqrt(dx * dx + dy * dy);
  if (mag2 === 0) return 0;
  // dot product with horizontal vector (100, 0)
  const dot = 100 * dx;
  const mag1 = 100;
  let angle = (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI;
  if (angle > 90) angle = 180 - angle;
  return Math.abs(angle);
}

export function calcHDistance(points: (Point | undefined)[]): Distances {
  if (points.length < 5 || !points[0] || !points[1] || !points[4]) return { h: 0, d: 0 };
  const h1 = points[0];
  const h2 = points[1];
  const n1 = points[4];

  const A = h2[1] - h1[1];
  const B = h1[0] - h2[0];
  const C = h2[0] * h1[1] - h1[0] * h2[1];
  const denom = Math.sqrt(A * A + B * B);
  if (denom === 0) return { h: 0, d: 0 };

  const hDist = Math.abs(A * n1[0] + B * n1[1] + C) / denom;
  const t = (A * (h1[0] - n1[0]) + B * (h1[1] - n1[1])) / (A * A + B * B);
  const projX = n1[0] + A * t;
  const projY = n1[1] + B * t;
  const dDist = Math.sqrt((projX - h1[0]) ** 2 + (projY - h1[1]) ** 2);

  return { h: hDist * PIXEL_TO_MM, d: dDist * PIXEL_TO_MM };
}

export function checkPerkinsPosition(points: (Point | undefined)[]): PerkinsPosition {
  if (points.length < 5 || !points[2] || !points[4]) return null;
  return points[4][0] < points[2][0] ? "medial" : "lateral";
}

export function determineDysplasia(angle: number, h: number, d: number): DysplasiaResult {
  const isAngleNormal = angle >= 26 && angle <= 28.5;
  const isDNormal = d >= 10 && d <= 15;
  const isHNormal = Math.abs(h - 10) <= 2;

  if (isAngleNormal && isDNormal && isHNormal)
    return {
      stage: "Норма",
      description: "Все показатели в пределах нормы",
      level: "normal",
    };
  if (angle > 28.5 && isDNormal && isHNormal)
    return {
      stage: "I степень",
      description: "Предвывих — увеличен ацетабулярный угол, центрирование сохранено",
      level: "grade1",
    };
  if (angle > 28.5 && d > 12 && isHNormal)
    return {
      stage: "II степень",
      description: "Подвывих — увеличены угол и дистанция d (латерализация), h в норме",
      level: "grade2",
    };
  if (angle > 28.5 && d > 12 && h < 8)
    return {
      stage: "III степень",
      description: "Вывих — увеличены угол и d, уменьшена дистанция h (смещение вверх)",
      level: "grade3",
    };
  return {
    stage: "Неполные данные",
    description: "Комбинация показателей не соответствует стандартной классификации",
    level: "incomplete",
  };
}

export function runAnalysis(
  points: (Point | undefined)[],
  ageMonths: number,
  gender: Gender
): AnalysisResult {
  const angle = calcAcetabularAngle(points);
  const distances = calcHDistance(points);
  const perkins = checkPerkinsPosition(points);
  const normData = getNormForAge(ageMonths, gender);
  const dysplasia = determineDysplasia(angle, distances.h, distances.d);
  return { angle, distances, perkins, normData, dysplasia };
}