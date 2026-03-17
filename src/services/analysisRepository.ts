/**
 * @file services/analysisRepository.ts
 * @layer Service
 * @description Репозиторий для сохранения данных в Supabase.
 *
 * Сохраняет только поля которые гарантированно есть в таблице:
 * id, patient_id, diagnosis, image_url, file_name, notes,
 * full_name, birth_date, doctor
 *
 * Результаты анализа (angle, distance_h и др.) сохраняются отдельным
 * UPDATE после того как Supabase обновит кэш схемы.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, Gender } from "@/types";

// ─── Типы ─────────────────────────────────────────────────────────────────────

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
  id?:     string;
  error?:  string;
}

// Маппинг диагнозов из формы в человекочитаемый вид для БД
const DIAGNOSIS_MAP: Record<string, string> = {
  norm:       "Норма",
  borderline: "Пограничное состояние",
  grade1:     "Дисплазия I степени",
  grade2:     "Дисплазия II степени",
  grade3:     "Дисплазия III степени",
  pending:    "Не определен",
};

/**
 * Сохраняет запись в Supabase.
 * Использует только колонки из оригинальной схемы таблицы
 * чтобы избежать ошибки кэша PostgREST.
 */
export async function saveAnalysis(
  payload: SaveAnalysisPayload
): Promise<SaveAnalysisResult> {
  const { patient, result, imageFile } = payload;

  // Только оригинальные колонки таблицы — гарантированно в кэше
  const record = {
    patient_id: patient.patientId || `DDH-${Date.now()}`,
    file_name:  imageFile?.name   ?? "xray.png",
    image_url:  imageFile?.name   ?? "pending",
    diagnosis:  DIAGNOSIS_MAP[patient.diagnosis] ?? patient.diagnosis ?? "Не определен",
    full_name:  patient.fullName  || null,
    birth_date: patient.birthDate || null,
    doctor:     patient.doctor    || null,
    // Упаковываем результаты анализа и доп. данные в поле notes как JSON
    // чтобы не потерять данные пока кэш не обновится
    notes: JSON.stringify({
      userNotes:      patient.notes || null,
      angle:          result?.angle                ?? null,
      distance_h:     result?.distances.h          ?? null,
      distance_d:     result?.distances.d          ?? null,
      perkins:        result?.perkins              ?? null,
      dysplasia_level: result?.dysplasia.level     ?? null,
      dysplasia_stage: result?.dysplasia.stage     ?? null,
    }),
  };

  console.log("[analysisRepository] Сохраняем запись:", {
    ...record,
    notes: "...см. ниже",
  });

  const { data, error } = await supabase
    .from("xray_images")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    console.error("[analysisRepository] Ошибка Supabase:", JSON.stringify(error));
    return { success: false, error: error.message };
  }

  console.log("[analysisRepository] Запись сохранена, id:", data?.id);
  return { success: true, id: data?.id };
}