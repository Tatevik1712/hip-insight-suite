/**
 * @file services/mlApi.ts
 * @layer Service
 * @description HTTP-клиент для ML-бэкенда.
 * Теперь возвращает также бинарную классификацию и уверенность.
 */

import { ML_BACKEND_URL, ML_POINT_KEYS } from "@/constants";
import type { MLPredictResponse, MLPredictResult, Point } from "@/types";

export async function sendToMLBackend(file: File): Promise<MLPredictResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${ML_BACKEND_URL}/predict`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Не удалось подключиться к ML-серверу. " +
      "Убедитесь что запущены dicom_to_png.py и ml_server.py"
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Ошибка сервера: ${response.status}`);
  }

  const data: MLPredictResponse = await response.json();
  if (data.error)    throw new Error(data.error);
  if (!data.predict) throw new Error("Сервер не вернул предсказания точек");

  const points: Point[] = ML_POINT_KEYS.map((key) => {
    const p = data.predict![key];
    if (!p) throw new Error(`Отсутствует точка "${key}"`);
    const x = parseFloat(String(p.x));
    const y = parseFloat(String(p.y));
    if (isNaN(x) || isNaN(y)) throw new Error(`Некорректные координаты "${key}"`);
    return [x, y];
  });

  return {
    points,
    imageBase64:  data.image,
    pixelSizeX:   data.pixel_size_x,
    pixelSizeY:   data.pixel_size_y,
    // Новые поля от обновлённого ml_server.py
    cls:          (data as any).class        ?? null,
    confidence:   (data as any).confidence   ?? null,
  };
}