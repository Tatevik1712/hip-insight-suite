/**
 * @file services/analysisRepository.ts
 * @layer Service
 * @description Репозиторий — отправляет данные на Flask → PostgreSQL.
 * Теперь передаёт base64 снимка для сохранения на диск.
 */

import type { AnalysisResult, Gender } from "@/types";

const BACKEND_URL = "http://127.0.0.1:5001";

export interface PatientData {
  fullName:  string;
  birthDate: string;
  patientId: string;
  doctor:    string;
  diagnosis: string;
  notes:     string;
}

export interface SaveAnalysisPayload {
  patient:     PatientData;
  ageMonths:   number;
  gender:      Gender;
  result:      AnalysisResult | null;
  imageFile:   File | null;
  imageBase64: string | null;
}

export interface SaveAnalysisResult {
  success: boolean;
  id?:     number;
  error?:  string;
}

const DIAGNOSIS_MAP: Record<string, string> = {
  norm:       "Норма",
  borderline: "Пограничное состояние",
  grade1:     "Дисплазия I степени",
  grade2:     "Дисплазия II степени",
  grade3:     "Дисплазия III степени",
};

export async function saveAnalysis(
  payload: SaveAnalysisPayload
): Promise<SaveAnalysisResult> {
  const { patient, ageMonths, gender, result, imageFile, imageBase64 } = payload;

  const body = {
    patient_id:      patient.patientId || `DDH-${Date.now()}`,
    full_name:       patient.fullName  || null,
    birth_date:      patient.birthDate || null,
    doctor:          patient.doctor    || null,
    diagnosis:       DIAGNOSIS_MAP[patient.diagnosis] ?? patient.diagnosis ?? "Не определен",
    notes:           patient.notes     || null,
    file_name:       imageFile?.name   ?? "xray.png",

    // Передаём base64 чтобы бэкенд сохранил файл на диск
    image_base64:    imageBase64,

    age_months:      ageMonths,
    gender:          gender,
    angle:           result ? parseFloat(result.angle.toFixed(2))       : null,
    distance_h:      result ? parseFloat(result.distances.h.toFixed(2)) : null,
    distance_d:      result ? parseFloat(result.distances.d.toFixed(2)) : null,
    perkins:         result?.perkins         ?? null,
    dysplasia_level: result?.dysplasia.level ?? null,
    dysplasia_stage: result?.dysplasia.stage ?? null,
  };

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/save`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  } catch {
    return {
      success: false,
      error: "Не удалось подключиться к бэкенду. Убедитесь что dicom_to_png.py запущен.",
    };
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    return { success: false, error: data.error ?? "Ошибка сохранения" };
  }

  return { success: true, id: data.id };
}