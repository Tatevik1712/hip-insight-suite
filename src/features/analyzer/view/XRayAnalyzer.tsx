/**
 * @file features/analyzer/view/XRayAnalyzer.tsx
 * @layer View
 * @description Главный View-компонент анализатора.
 *
 * Рендерит UI и передаёт события в useAnalyzer (Controller).
 * Бизнес-логики здесь нет — только отображение и обработчики кликов.
 */
import React, { useEffect, useRef } from "react";
import { useAnalyzer } from "../controller/useAnalyzer";
import { ResultsPanel } from "./ResultsPanel";
import { PointProgress } from "./PointProgress";
import { drawPlaceholder } from "@/services/canvasDraw";
import { COLORS } from "@/constants";
import { Upload, RotateCcw } from "lucide-react";

const INSTRUCTION_STEPS = [
  { color: COLORS.hilgenreiner, text: "Точки 1–2: Линия Хильгенрейнера (слева → справа)" },
  { color: COLORS.acetabular,   text: "Точки 3–4: Крышка вертлужной впадины (слева → справа)" },
  { color: COLORS.neck,         text: "Точки 5–6: Шейка бедра (слева → справа)" },
] as const;

const LEGEND = [
  { color: COLORS.hilgenreiner, label: "Линия Хильгенрейнера" },
  { color: COLORS.acetabular,   label: "Крышка впадины" },
  { color: COLORS.perkins,      label: "Линия Перкина" },
  { color: COLORS.hDistance,    label: "Дистанция h" },
  { color: COLORS.neck,         label: "Шейка бедра" },
] as const;

export const XRayAnalyzer: React.FC = () => {
  const ctrl = useAnalyzer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Инициализация canvas-заглушки при первом рендере
  useEffect(() => {
    const canvas = ctrl.canvasRef.current;
    if (canvas && !ctrl.image) {
      canvas.width = 700; canvas.height = 420;
      drawPlaceholder(canvas);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ctrl.handleImageLoad(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mx-auto max-w-7xl flex flex-col gap-5">

        {/* ── Параметры пациента ────────────────────────────────────────── */}
        <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Возраст</label>
            <input type="number" min={0} max={24} value={ctrl.ageMonths}
              onChange={(e) => ctrl.setAgeMonths(parseInt(e.target.value) || 0)}
              className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm
                         text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs text-muted-foreground">мес.</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Пол</label>
            <div className="flex rounded-lg border border-border bg-secondary p-0.5">
              {(["male", "female"] as const).map((g) => (
                <button key={g} onClick={() => ctrl.setGender(g)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                    ctrl.gender === g ? "medical-gradient text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >{g === "male" ? "Мальчик" : "Девочка"}</button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-primary font-medium">{ctrl.normLabel}</span>
          </div>

          {ctrl.pixelSize && (
            <div className="flex items-center gap-2 rounded-full border border-medical-teal/30 bg-medical-teal/5 px-4 py-1.5">
              <span className="text-xs text-medical-teal font-medium">
                Пиксель: {ctrl.pixelSize.x.toFixed(3)} × {ctrl.pixelSize.y.toFixed(3)} мм
              </span>
            </div>
          )}

          <div className="ml-auto flex gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 medical-gradient text-primary-foreground rounded-lg px-4 py-2
                         text-xs font-semibold hover:opacity-90 transition-all active:scale-95 shadow-sm">
              <Upload className="w-3.5 h-3.5" />Загрузить снимок
            </button>
            <button onClick={ctrl.handleReset} disabled={!ctrl.image}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2
                         text-xs font-medium text-foreground hover:bg-muted transition-all
                         disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">
              <RotateCcw className="w-3.5 h-3.5" />Сброс
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.dcm,.dicom" className="hidden" onChange={onFileChange} />
        </div>


        {/* ── Canvas + боковая панель ───────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          <div className="flex flex-col gap-4">

            <div className="glass-panel rounded-xl overflow-hidden">
              <canvas ref={ctrl.canvasRef} onClick={ctrl.handleCanvasClick}
                className={`block w-full ${ctrl.mode === "placing" ? "cursor-crosshair" : "cursor-default"}`} />
              {ctrl.mode !== "waiting" && (
                <div className="border-t border-border/60 bg-card/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ctrl.mode === "placing"   && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                    {ctrl.mode === "completed" && ctrl.aiStatus === "success" && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                    {ctrl.mode === "completed" && ctrl.aiStatus !== "success" && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                    <span className="text-xs text-foreground font-medium">{ctrl.nextHint}</span>
                  </div>
                  {ctrl.mode === "placing" && (
                    <span className="text-xs text-muted-foreground font-mono">{ctrl.currentPointIndex}/6</span>
                  )}
                </div>
              )}
            </div>

            {/* Инструкция */}
            {ctrl.mode === "waiting" && (
              <div className="glass-panel rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Порядок расстановки точек
                </p>
                {INSTRUCTION_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 mt-2">
                    <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                    <span className="text-xs text-muted-foreground leading-relaxed">{step.text}</span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground/60 mt-3">
                  После 6-й точки автоматически строятся линии и рассчитываются параметры
                </p>
              </div>
            )}

            {/* Прогресс */}
            {ctrl.mode === "placing" && (
              <div className="glass-panel rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Прогресс расстановки
                </p>
                <PointProgress points={ctrl.points} currentIndex={ctrl.currentPointIndex} />
              </div>
            )}
          </div>

          {/* Результаты и легенда */}
          <div className="flex flex-col gap-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Результаты
                </p>
                {ctrl.aiStatus === "success" && ctrl.result && (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-medium rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5">
                    <Sparkles className="w-3 h-3" />ИИ
                  </span>
                )}
              </div>
              {!ctrl.result ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-full border border-border bg-secondary flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-muted-foreground">Расставьте все 6 точек на снимке</p>
                </div>
              ) : (
                <ResultsPanel result={ctrl.result} />
              )}
            </div>

            <div className="glass-panel rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Легенда</p>
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-3 mt-2">
                  <div className="h-2 w-5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XRayAnalyzer;
