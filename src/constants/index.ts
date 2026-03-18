// =============================================
// Константы проекта
// =============================================
/**
 * @file src/constants/index.ts
 * @description Все константы приложения в одном месте.
 *
 * Правило: никаких магических чисел и строк в компонентах.
 * Всё меняется здесь — применяется везде.
 */

// ─── ML Backend ───────────────────────────────────────────────────────────────

/** URL Flask-сервера (dicom_to_png.py). Меняй при деплое на прод. */
export const ML_BACKEND_URL = "http://127.0.0.1:5001";

/**
 * Ключи точек в ответе ML-сервера.
 * Порядок задаёт маппинг: 1→H1, 2→H2, 3→A1, 4→A2, 5→N1, 6→N2
 */
export const ML_POINT_KEYS = [
  "1_point", "2_point", "3_point",
  "4_point", "5_point", "6_point",
] as const;

// ─── Расчёты ──────────────────────────────────────────────────────────────────

/**
 * Дефолтный коэффициент пикселей в мм.
 * Для DICOM берётся из метаданных PixelSpacing — этот используется для PNG/JPG.
 */
export const DEFAULT_PIXEL_TO_MM = 0.1;

/** Количество анатомических точек для одного анализа */
export const REQUIRED_POINTS = 6;

/** Максимальный возраст пациента (таблица норм покрывает 0–24 мес.) */
export const MAX_AGE_MONTHS = 24;

// ─── Цвета аннотаций canvas ───────────────────────────────────────────────────
// Синхронизированы с CSS-переменными из index.css

export const COLORS = {
  hilgenreiner: "hsl(211, 100%, 50%)", // --medical-blue
  acetabular:   "hsl(174, 72%, 56%)",  // --medical-teal
  perkins:      "hsl(0, 72%, 51%)",    // --destructive
  hDistance:    "#22d3ee",             // cyan
  neck:         "hsl(38, 92%, 50%)",   // --medical-amber
} as const;

// ─── Метки точек ─────────────────────────────────────────────────────────────

/** Подсказки и цвета для каждой из 6 точек */
export const POINT_META = [
  { name: "Хильгенрейнер — левая точка",  color: COLORS.hilgenreiner, label: "H₁" },
  { name: "Хильгенрейнер — правая точка", color: COLORS.hilgenreiner, label: "H₂" },
  { name: "Крышка впадины — левая",        color: COLORS.acetabular,   label: "A₁" },
  { name: "Крышка впадины — правая",       color: COLORS.acetabular,   label: "A₂" },
  { name: "Шейка бедра — левая",           color: COLORS.neck,         label: "N₁" },
  { name: "Шейка бедра — правая",          color: COLORS.neck,         label: "N₂" },
] as const;

// ─── Таблица возрастных норм ─────────────────────────────────────────────────
// Источник: Tönnis D. "Congenital Dysplasia and Dislocation of the Hip"
// Девочки: нормы выше на 2–3° из-за особенностей развития вертлужной впадины

export const AGE_NORMS = [
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