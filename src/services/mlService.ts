// src/services/mlService.ts
const DICOM_SERVER_URL = 'http://127.0.0.1:5001';   // твой Back/dicom_to_png.py

export async function predictPoints(file: File): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log(`[mlService] Отправляем файл ${file.name} на /predict...`);

    const response = await fetch(`${DICOM_SERVER_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("[mlService] Ответ от сервера:", data);

    // Возвращаем ml_result (там должны быть точки от ML)
    return data.ml_result || data;
  } catch (error) {
    console.error("[mlService] Ошибка при предсказании:", error);
    throw error;
  }
}

// Новый сервис для сохранения (уже с полными данными)
export async function saveAnalysisToBackend(payload: any): Promise<any> {
  const response = await fetch(`${DICOM_SERVER_URL}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Save failed');
  }

  return response.json();
}