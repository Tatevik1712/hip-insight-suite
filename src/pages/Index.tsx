/**
 * @file pages/Index.tsx
 * @description Главная страница приложения.
 *
 * Логический порядок шагов для врача:
 *   1. Загрузить снимок
 *   2. Заполнить данные пациента (ФИО, ID, дата рождения, врач, заметки)
 *   3. Настроить фильтры изображения (опционально)
 *   4. Указать возраст и пол для расчёта норм
 *   5. Нажать "Определить точки" → ИИ анализирует снимок
 *   6. Просмотреть визуализацию точек и линий на снимке
 *   7. Просмотреть результаты и диагноз → сохранить в БД
 *
 * Ключевая логика:
 * - Диагноз НЕ вводится до анализа — он берётся из результатов ИИ
 * - После анализа точки ИИ отображаются прямо на снимке в DicomViewer
 */
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Activity, Images, X, Sparkles, Loader2,
  AlertCircle, CheckCircle2, Upload, RotateCcw,
  Database, GraduationCap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useAnalyzer }  from "@/features/analyzer/controller/useAnalyzer";
import { ResultsPanel } from "@/features/analyzer/view/ResultsPanel";
import { XRayAnalyzer } from "@/features/analyzer/view/XRayAnalyzer";
import DicomViewer      from "@/features/viewer/view/DicomViewer";
import ModeToggle       from "@/shared/components/ModeToggle";
import StudentPanel     from "@/shared/components/StudentPanel";
import PatientCard      from "@/components/PatientCard";
import ImageAdjustments, { type ImageFilters } from "@/components/ImageAdjustments";

import { saveAnalysis, type PatientData } from "@/services/analysisRepository";
import type { Gender, Point } from "@/types";

const EMPTY_PATIENT: PatientData = {
  fullName: "", birthDate: "", patientId: "",
  doctor: "", notes: "",
};

/**
 * Вычисляет возраст в месяцах из даты рождения.
 * Используется для автоматической синхронизации поля "возраст"
 * с полем "дата рождения" в карточке пациента.
 */
function calcAgeMonths(birthDate: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now   = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12
               + (now.getMonth() - birth.getMonth());
  return Math.max(0, Math.min(24, months));
}

const Index = () => {
  const [showOverlay,    setShowOverlay]    = useState(true);
  const [studentMode,    setStudentMode]    = useState(false);
  const [analyzerOpen,   setAnalyzerOpen]   = useState(false);
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100, contrast: 100, invert: false,
  });
  const [patientData, setPatientData] = useState<PatientData>(EMPTY_PATIENT);
  const [saveStatus, setSaveStatus]   = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [savedId,    setSavedId]      = useState<number | null>(null);

  // Точки ИИ для визуализации на снимке
  const [aiPoints, setAiPoints] = useState<Point[] | null>(null);

  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { toast }      = useToast();
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const analyzer = useAnalyzer();

  const imageFromQuery = searchParams.get("image");
  useEffect(() => {
    if (!imageFromQuery) return;
    fetch(imageFromQuery)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], "xray.jpg", { type: blob.type });
        analyzer.handleImageLoad(file);
      })
      .catch(() => {});
  }, []);

  const viewerImage = analyzer.image?.src ?? null;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzer.handleImageLoad(file);
      setSaveStatus("idle");
      setSavedId(null);
      setAiPoints(null); // сброс точек при новом снимке
    }
    e.target.value = "";
  };

  // ── AI-анализ + сохранение ──────────────────────────────────────────────────
  const handleAnalyzeAndSave = async () => {
    if (!analyzer.imageFile) {
      toast({ title: "Загрузите снимок", variant: "destructive" }); return;
    }
    if (!patientData.fullName.trim()) {
      toast({ title: "Введите ФИО пациента", variant: "destructive" }); return;
    }
    if (!patientData.birthDate) {
      toast({ title: "Укажите дату рождения", variant: "destructive" }); return;
    }
    if (!patientData.patientId.trim()) {
      toast({ title: "Введите ID пациента", variant: "destructive" }); return;
    }
    if (!patientData.doctor.trim()) {
      toast({ title: "Укажите лечащего врача", variant: "destructive" }); return;
    }

    // Запускаем AI — получаем результат напрямую
    const aiResponse = await analyzer.handleAIPredict();
    if (!aiResponse) return;

    const { result: analysisResult, points: predictedPoints } = aiResponse;
    setAiPoints(predictedPoints);  // ← точки напрямую, не из state

    // Сохраняем в БД
    setSaveStatus("saving");
    try {
      const imageBase64 = analyzer.image?.src
        ?.replace(/^data:image\/\w+;base64,/, "") ?? null;

      const { success, id, error } = await saveAnalysis({
        patient:     patientData,
        ageMonths:   analyzer.ageMonths,
        gender:      analyzer.gender,
        result:      analysisResult,
        imageFile:   analyzer.imageFile,
        imageBase64,
      });

      if (success && id) {
        setSaveStatus("saved");
        setSavedId(id);
        toast({
          title: "Данные сохранены",
          description: `Запись сохранена (ID: ${String(id)})`,
        });
      } else {
        throw new Error(error ?? "Ошибка сохранения");
      }
    } catch (err) {
      setSaveStatus("error");
      toast({
        title: "Ошибка сохранения",
        description: err instanceof Error ? err.message : "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const canAnalyze =
    !!analyzer.imageFile &&
    analyzer.aiStatus !== "loading" &&
    saveStatus !== "saving";

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg medical-gradient flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">HipDx AI</h1>
            <p className="text-[10px] text-muted-foreground">Анализ дисплазии ТБС</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/gallery")}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Images className="w-4 h-4" />Галерея врача
          </button>
          <button onClick={() => navigate("/student-gallery")}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <GraduationCap className="w-4 h-4" />Работы студентов
          </button>
          <div className="w-2 h-2 rounded-full bg-medical-green animate-pulse-soft" />
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Просмотрщик — показывает аннотации ИИ после анализа */}
        <div className="flex-1 flex p-3">
          <DicomViewer
            showOverlay={showOverlay}
            onToggleOverlay={() => setShowOverlay(o => !o)}
            studentMode={studentMode}
            showStudentCheck={false}
            customImage={viewerImage}
            filters={filters}
            aiPoints={aiPoints}
          />
        </div>

        {/* Боковая панель */}
        <aside className="w-[360px] border-l border-border bg-card overflow-y-auto p-4 space-y-4 shrink-0">

          <ModeToggle
            studentMode={studentMode}
            onToggle={() => {
              const next = !studentMode;
              setStudentMode(next);
              if (next) setAnalyzerOpen(true);
            }}
          />

          {/* ── ВРАЧЕБНЫЙ РЕЖИМ ──────────────────────────────────────── */}
          {!studentMode && (
            <>
              {/* ШАГ 1: Загрузка снимка */}
              <div className="glass-panel rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary-foreground">1</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">Загрузите снимок</p>
                </div>

                {!analyzer.image ? (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2
                               border-dashed border-border bg-secondary/40 px-4 py-5 text-xs
                               font-medium text-muted-foreground hover:border-primary/50
                               hover:text-primary hover:bg-primary/5 transition-all">
                    <Upload className="w-4 h-4" />
                    Загрузить рентгеновский снимок · DICOM, PNG, JPG
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                      <span className="text-xs text-foreground truncate">
                        {analyzer.imageFile?.name ?? "Снимок загружен"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        analyzer.handleReset();
                        setSaveStatus("idle");
                        setSavedId(null);
                        setAiPoints(null);
                        setPatientData(EMPTY_PATIENT);
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                      <RotateCcw className="w-3 h-3" />Сменить
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file"
                  accept="image/*,.dcm,.dicom" className="hidden" onChange={onFileChange} />
              </div>

              {/* ШАГ 2: Данные пациента (без диагноза) */}
              <div className="relative">
                {!analyzer.image && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Сначала загрузите снимок</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${analyzer.image ? "bg-primary" : "bg-muted"}`}>
                    <span className="text-[10px] font-bold text-primary-foreground">2</span>
                  </div>
                  <p className={`text-xs font-semibold ${analyzer.image ? "text-foreground" : "text-muted-foreground"}`}>
                    Данные пациента
                  </p>
                </div>
                <PatientCard
                  data={patientData}
                  onChange={(newData) => {
                    setPatientData(newData);
                    // Автоматически обновляем возраст в месяцах из даты рождения
                    if (newData.birthDate !== patientData.birthDate) {
                      const months = calcAgeMonths(newData.birthDate);
                      analyzer.setAgeMonths(months);
                    }
                  }}
                />
                {patientData.birthDate && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    Возраст рассчитан автоматически: {calcAgeMonths(patientData.birthDate)} мес.
                    (можно скорректировать в шаге 4)
                  </p>
                )}
              </div>

              {/* ШАГ 3: Фильтры */}
              <div className="relative">
                {!analyzer.image && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-background/60 backdrop-blur-[1px]" />
                )}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${analyzer.image ? "bg-primary" : "bg-muted"}`}>
                    <span className="text-[10px] font-bold text-primary-foreground">3</span>
                  </div>
                  <p className={`text-xs font-semibold ${analyzer.image ? "text-foreground" : "text-muted-foreground"}`}>
                    Настройте изображение
                  </p>
                </div>
                <ImageAdjustments filters={filters} onChange={setFilters} />
              </div>

              {/* ШАГ 4: Параметры для расчёта норм */}
              {analyzer.image && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary-foreground">4</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">Параметры пациента</p>
                  </div>
                  <div className="glass-panel rounded-lg p-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Возраст</label>
                        <input type="number" min={0} max={24} value={analyzer.ageMonths}
                          onChange={(e) => analyzer.setAgeMonths(parseInt(e.target.value) || 0)}
                          className="w-14 rounded-lg border border-border bg-background px-2 py-1.5
                                     text-center text-sm text-foreground focus:border-primary
                                     focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <span className="text-xs text-muted-foreground">мес.</span>
                      </div>
                      <div className="flex rounded-lg border border-border bg-secondary p-0.5">
                        {(["male", "female"] as const).map((g) => (
                          <button key={g} onClick={() => analyzer.setGender(g as Gender)}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                              analyzer.gender === g
                                ? "medical-gradient text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}>
                            {g === "male" ? "М" : "Ж"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-[11px] text-primary">{analyzer.normLabel}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ШАГ 5: Анализ ИИ */}
              {analyzer.image && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary-foreground">5</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">Анализ ИИ</p>
                  </div>
                  <div className="glass-panel rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Нейросеть определит 6 анатомических точек, построит линии на снимке
                      и рассчитает клинические параметры.
                    </p>

                    {analyzer.aiStatus === "error" && (
                      <div className="flex items-start gap-1.5 text-destructive text-xs mb-3 p-2 rounded-lg bg-destructive/8 border border-destructive/20">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{analyzer.aiError}</span>
                      </div>
                    )}
                    {saveStatus === "saved" && (
                      <div className="flex items-center gap-1.5 text-success text-xs mb-3 p-2 rounded-lg bg-success/8 border border-success/20">
                        <Database className="w-3.5 h-3.5" />
                        <span>Сохранено в базе данных</span>
                      </div>
                    )}
                    {saveStatus === "error" && (
                      <div className="flex items-center gap-1.5 text-destructive text-xs mb-3 p-2 rounded-lg bg-destructive/8 border border-destructive/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Ошибка сохранения в БД</span>
                      </div>
                    )}

                    <button onClick={handleAnalyzeAndSave} disabled={!canAnalyze}
                      className="w-full flex items-center justify-center gap-2 medical-gradient
                                 text-primary-foreground rounded-lg px-4 py-2.5 text-xs font-semibold
                                 hover:opacity-90 transition-all active:scale-95 shadow-sm
                                 disabled:cursor-not-allowed disabled:opacity-60">
                      {analyzer.aiStatus === "loading" || saveStatus === "saving" ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {saveStatus === "saving" ? "Сохраняю..." : "Анализирую..."}
                        </>
                      ) : saveStatus === "saved" ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" />Анализ завершён</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" />Определить точки и сохранить</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Результаты — появляются ПОСЛЕ анализа с диагнозом от ИИ */}
              {analyzer.result && (
                <div className="glass-panel rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Результаты ИИ
                    </p>
                    <span className="flex items-center gap-1 text-[10px] text-primary font-medium
                                     rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5">
                      <Sparkles className="w-3 h-3" />ИИ
                    </span>
                  </div>
                  <ResultsPanel result={analyzer.result} />
                </div>
              )}
            </>
          )}

          {/* ── СТУДЕНЧЕСКИЙ РЕЖИМ ──────────────────────────────────── */}
          {studentMode && (
            <>
              <ImageAdjustments filters={filters} onChange={setFilters} />
              <StudentPanel onOpenAnalyzer={() => setAnalyzerOpen(true)} />
            </>
          )}
        </aside>
      </div>

      {/* Fullscreen анализатор студента */}
      {analyzerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-foreground">
                Анализатор точек — Режим обучения
              </span>
            </div>
            <button onClick={() => setAnalyzerOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5
                         text-xs text-muted-foreground hover:text-foreground
                         hover:border-muted-foreground transition-all">
              <X className="w-3.5 h-3.5" />Закрыть
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <XRayAnalyzer />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;