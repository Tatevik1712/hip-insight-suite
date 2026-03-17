/**
 * @file features/viewer/model/viewerConfig.ts
 * @layer Model
 * @description Статические данные для DicomViewer: точки и лимиты зума.
 * Вынесены из компонента чтобы их можно было менять без правки JSX.
 */

/** Анатомические точки для SVG-оверлея (координаты в % для viewBox 0 0 100 100) */
export const OVERLAY_KEY_POINTS = [
  { id: "triradiate_l", x: 38, y: 42, label: "Y-хрящ (L)" },
  { id: "triradiate_r", x: 62, y: 42, label: "Y-хрящ (R)" },
  { id: "femoral_l",    x: 33, y: 55, label: "Головка (L)" },
  { id: "femoral_r",    x: 67, y: 55, label: "Головка (R)" },
  { id: "acetab_l",     x: 30, y: 38, label: "Край вертл. (L)" },
  { id: "acetab_r",     x: 70, y: 38, label: "Край вертл. (R)" },
] as const;

/** Допустимый диапазон масштабирования */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.25;
export const ZOOM_WHEEL_STEP = 0.1;
