/**
 * @file src/types/index.ts
 * @description Все TypeScript-типы приложения в одном месте.
 *
 * Правило: компоненты, хуки и утилиты импортируют типы ОТСЮДА,
 * а не объявляют их локально. Это единственный источник правды для типов.
 */

// ─── Геометрия ────────────────────────────────────────────────────────────────

/** Координаты точки на снимке [x, y] в пикселях */
export type Point = [number, number];

// ─── Пациент ──────────────────────────────────────────────────────────────────

/** Биологический пол (влияет на нормы ацетабулярного угла) */
export type Gender = "male" | "female";

// ─── Нормы ────────────────────────────────────────────────────────────────────

/** Возрастная норма ацетабулярного угла */
export interface AgeNorm {
  norm: number;   // среднее значение, градусы
  min: number;    // нижняя граница нормального диапазона
  max: number;    // верхняя граница нормального диапазона
  range: number;  // допустимое отклонение (±)
}

// ─── Результаты анализа ───────────────────────────────────────────────────────

/** Дистанции по методу Хильгенрейнера, в мм */
export interface Distances {
  h: number; // от головки бедра до линии Хильгенрейнера (норма 8–12 мм)
  d: number; // от дна впадины до проекции головки (норма 10–15 мм)
}

/** Степень тяжести дисплазии */
export type DysplasiaLevel =
  | "normal"      // норма
  | "grade1"      // I — предвывих
  | "grade2"      // II — подвывих
  | "grade3"      // III — вывих
  | "incomplete"; // недостаточно данных

/** Диагностическое заключение */
export interface DysplasiaResult {
  stage: string;        // "Норма" | "I степень" | ...
  description: string;  // клиническое описание
  level: DysplasiaLevel;
}

/** Положение головки бедра по Перкину */
export type PerkinsPosition = "medial" | "lateral" | null;

/** Полный результат анализа одного снимка */
export interface AnalysisResult {
  angle: number;
  distances: Distances;
  perkins: PerkinsPosition;
  normData: AgeNorm;
  dysplasia: DysplasiaResult;
}

// ─── Состояние анализатора ────────────────────────────────────────────────────

export type AppMode =
  | "waiting"    // снимок не загружен
  | "placing"    // ручная расстановка точек
  | "completed"; // расчёт завершён

export type AIStatus = "idle" | "loading" | "success" | "error";

// ─── ML API ───────────────────────────────────────────────────────────────────

/** Сырой ответ Flask-сервера (dicom_to_png.py) */
export interface MLPredictResponse {
  image: string;           // base64 PNG
  image_type?: string;
  pixel_size_x?: number;   // мм/пиксель (только для DICOM)
  pixel_size_y?: number;
  predict?: Record<string, { x: string | number; y: string | number }>;
  error?: string;
}

/** Распарсенный результат ML */
export interface MLPredictResult {
  points: Point[];       // 6 точек: H1 H2 A1 A2 N1 N2
  imageBase64: string;
  pixelSizeX?: number;
  pixelSizeY?: number;
}

// ─── Viewer ───────────────────────────────────────────────────────────────────

/** Фильтры изображения для DicomViewer */
export interface ImageFilters {
  brightness: number; // 0–200, дефолт 100
  contrast: number;   // 0–200, дефолт 100
  invert: boolean;
}

/** Режим отображения главного интерфейса */
export type AppView = "doctor" | "student";