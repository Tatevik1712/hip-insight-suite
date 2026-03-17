import React, { useEffect, useRef } from "react";
import { useHipAnalysis } from "../hooks/useHipAnalysis";
import { ResultsPanel } from "./ResultsPanel";
import { PointProgress } from "./PointProgress";
import { drawPlaceholder } from "../utils/canvasDraw";
import { Upload, RotateCcw, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const INSTRUCTION_STEPS = [
  { color: "hsl(var(--medical-blue))",  text: "Точки 1–2: Линия Хильгенрейнера (слева → справа)" },
  { color: "hsl(var(--medical-teal))",  text: "Точки 3–4: Крышка вертлужной впадины (слева → справа)" },
  { color: "hsl(var(--medical-amber))", text: "Точки 5–6: Шейка бедра (слева → справа)" },
];

export const XRayAnalyzer: React.FC = () => {
  const {
    mode, points, currentPointIndex, image, imageFile,
    ageMonths, gender, result,
    aiStatus, aiError, pixelSize,
    canvasRef, nextHint, normLabel,
    handleImageLoad, handleCanvasClick, handleReset, handleAIPredict,
    setAgeMonths, setGender,
  } = useHipAnalysis();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !image) {
      canvas.width = 700;
      canvas.height = 420;
      drawPlaceholder(canvas);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageLoad(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mx-auto max-w-7xl flex flex-col gap-5">

        {/* ── Patient info + controls ─────────────────────────────────────── */}
        <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center gap-4">
          {/* Age */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Возраст</span>
            <input
              type="number" min={0} max={24} value={ageMonths}
              onChange={(e) => setAgeMonths(parseInt(e.target.value) || 0)}
              className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs text-muted-foreground">мес.</span>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Пол</span>
            <div className="flex rounded-lg border border-border bg-secondary p-0.5">
              {(["male", "female"] as const).map((g) => (
                <button key={g} onClick={() => setGender(g)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                    gender === g ? "medical-gradient text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === "male" ? "Мальчик" : "Девочка"}
                </button>
              ))}
            </div>
          </div>

          {/* Norm badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-primary font-medium">{normLabel}</span>
          </div>

          {/* Pixel size badge (DICOM only) */}
          {pixelSize && (
            <div className="flex items-center gap-2 rounded-full border border-medical-teal/30 bg-medical-teal/5 px-4 py-1.5">
              <span className="text-xs text-medical-teal font-medium">
                Размер пикселя: {pixelSize.x.toFixed(3)} × {pixelSize.y.toFixed(3)} мм
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 medical-gradient text-primary-foreground rounded-lg px-4 py-2 text-xs font-semibold hover:opacity-90 transition-all active:scale-95 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Загрузить снимок
            </button>
            <button
              onClick={handleReset} disabled={!image}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-all disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сброс
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.dcm,.dicom" className="hidden" onChange={onFileChange} />
        </div>

        {/* ── AI Prediction panel ─────────────────────────────────────────── */}
        {image && (
          <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Автоопределение точек ИИ</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Нейросеть автоматически расставит 6 анатомических точек. Поддерживаются DICOM и PNG/JPG.
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/* AI status */}
              {aiStatus === "success" && (
                <div className="flex items-center gap-1.5 text-success text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Точки определены
                </div>
              )}
              {aiStatus === "error" && (
                <div className="flex items-center gap-1.5 text-destructive text-xs font-medium max-w-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{aiError}</span>
                </div>
              )}

              <button
                onClick={handleAIPredict}
                disabled={!imageFile || aiStatus === "loading"}
                className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiStatus === "loading" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Анализирую...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" />Определить точки</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Main grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

          {/* Left: canvas */}
          <div className="flex flex-col gap-4">
            <div className="glass-panel rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`block w-full ${mode === "placing" ? "cursor-crosshair" : "cursor-default"}`}
              />
              {mode !== "waiting" && (
                <div className="border-t border-border/60 bg-card/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {mode === "placing" && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                    {mode === "completed" && aiStatus === "success" && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                    {mode === "completed" && aiStatus !== "success" && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                    <span className="text-xs text-foreground font-medium">{nextHint}</span>
                  </div>
                  {mode === "placing" && (
                    <span className="text-xs text-muted-foreground font-mono">{currentPointIndex}/6</span>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            {mode === "waiting" && (
              <div className="glass-panel rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Два способа расстановки точек
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg border border-border bg-secondary/50 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Автоматически (ИИ)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Загрузите снимок и нажмите «Определить точки» — нейросеть сделает всё сама</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">Вручную</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Кликайте на снимок в нужном порядке — 6 точек последовательно</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {INSTRUCTION_STEPS.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                      <span className="text-xs text-muted-foreground leading-relaxed">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Point progress */}
            {mode === "placing" && (
              <div className="glass-panel rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Прогресс расстановки
                </p>
                <PointProgress points={points} currentIndex={currentPointIndex} />
              </div>
            )}
          </div>

          {/* Right: results */}
          <div className="flex flex-col gap-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Результаты измерений
                </p>
                {aiStatus === "success" && result && (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-medium rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5">
                    <Sparkles className="w-3 h-3" />
                    ИИ
                  </span>
                )}
              </div>

              {!result ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-full border border-border bg-secondary flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Расставьте точки вручную или используйте ИИ
                  </p>
                </div>
              ) : (
                <ResultsPanel result={result} />
              )}
            </div>

            {/* Legend */}
            <div className="glass-panel rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Легенда</p>
              <div className="flex flex-col gap-2">
                {[
                  { style: { backgroundColor: "hsl(var(--medical-blue))" },  label: "Линия Хильгенрейнера" },
                  { style: { backgroundColor: "hsl(var(--medical-teal))" },  label: "Крышка впадины" },
                  { style: { backgroundColor: "hsl(0, 72%, 51%)" },           label: "Линия Перкина" },
                  { style: { backgroundColor: "#22d3ee" },                    label: "Дистанция h" },
                  { style: { backgroundColor: "hsl(var(--medical-amber))" }, label: "Шейка бедра" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="h-2 w-5 rounded-full shrink-0" style={item.style} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XRayAnalyzer;