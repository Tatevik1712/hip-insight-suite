/**
 * @file services/studentRepository.ts
 * @layer Service
 * @description Сохранение работ студентов в PostgreSQL через Flask.
 *
 * Сохраняет:
 * - PNG с разметкой (скриншот canvas со всеми точками и линиями)
 * - PNG оригинального снимка (без разметки)
 * - Результаты ручного анализа
 */

const BACKEND_URL = "http://127.0.0.1:5001";

export interface StudentSavePayload {
  studentName:    string;
  notes:          string;
  annotatedBase64: string;  // canvas.toDataURL() — снимок с разметкой
  originalBase64:  string;  // оригинальный снимок без разметки
  fileName:       string;
  angle:          number | null;
  distanceH:      number | null;
  distanceD:      number | null;
  perkins:        string | null;
  dysplasiaLevel: string | null;
  dysplasiaStage: string | null;
  aiAngle?:       number | null;
  aiClass?:       number | null;
  aiConfidence?:  number | null;
}

export interface StudentSaveResult {
  success: boolean;
  id?:     number;
  error?:  string;
}

export async function saveStudentAnalysis(
  payload: StudentSavePayload
): Promise<StudentSaveResult> {
  const body = {
    student_name:     payload.studentName    || null,
    notes:            payload.notes          || null,
    annotated_base64: payload.annotatedBase64,
    original_base64:  payload.originalBase64,
    file_name:        payload.fileName,
    angle:            payload.angle,
    distance_h:       payload.distanceH,
    distance_d:       payload.distanceD,
    perkins:          payload.perkins,
    dysplasia_level:  payload.dysplasiaLevel,
    dysplasia_stage:  payload.dysplasiaStage,
    ai_angle:         payload.aiAngle        ?? null,
    ai_class:         payload.aiClass        ?? null,
    ai_confidence:    payload.aiConfidence   ?? null,
  };

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/save-student`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  } catch {
    return {
      success: false,
      error: "Не удалось подключиться к бэкенду.",
    };
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    return { success: false, error: data.error ?? "Ошибка сохранения" };
  }

  return { success: true, id: data.id };
}