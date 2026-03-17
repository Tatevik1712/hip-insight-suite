import React, { useEffect, useRef } from "react";
import { useHipAnalysis } from "../hooks/useHipAnalysis";
import { ResultsPanel } from "./ResultsPanel";
import { PointProgress } from "./PointProgress";
import { drawPlaceholder } from "../utils/canvasDraw";

// ─── Instruction rows ─────────────────────────────────────────────────────────
const INSTRUCTION_STEPS = [
  { dot: "bg-blue-400",    text: "Точки 1–2: Линия Хильгенрейнера (слева → справа)" },
  { dot: "bg-emerald-400", text: "Точки 3–4: Крышка вертлужной впадины (слева → справа)" },
  { dot: "bg-amber-400",   text: "Точки 5–6: Шейка бедра (слева → справа)" },
];

export const XRayAnalyzer: React.FC = () => {
  const {
    mode,
    points,
    currentPointIndex,
    image,
    ageMonths,
    gender,
    result,
    canvasRef,
    nextHint,
    normLabel,
    handleImageLoad,
    handleCanvasClick,
    handleReset,
    setAgeMonths,
    setGender,
  } = useHipAnalysis();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draw placeholder on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !image) {
      canvas.width = 600;
      canvas.height = 400;
      drawPlaceholder(canvas);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageLoad(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-950 font-['IBM_Plex_Mono',monospace] text-slate-100">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 ring-1 ring-blue-500/40">
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-slate-100 uppercase">Hip Insight</h1>
              <p className="text-[10px] tracking-wider text-slate-500 uppercase">Анализ дисплазии тазобедренного сустава</p>
            </div>
          </div>

          {/* Norm badge */}
          <div className="hidden rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 sm:block">
            <span className="text-[11px] text-blue-300">{normLabel}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">

          {/* ── LEFT: Canvas + controls ─────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Patient info bar */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <label className="text-[11px] uppercase tracking-widest text-slate-500">Возраст</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(parseInt(e.target.value) || 0)}
                    className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-center font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500">мес.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[11px] uppercase tracking-widest text-slate-500">Пол</label>
                <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        gender === g
                          ? "bg-blue-600 text-white"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {g === "male" ? "М" : "Ж"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-500 active:scale-95"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Загрузить
                </button>
                <button
                  onClick={handleReset}
                  disabled={!image}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                >
                  Сброс
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            {/* Canvas area */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`block w-full ${mode === "placing" ? "cursor-crosshair" : "cursor-default"}`}
                style={{ imageRendering: "auto" }}
              />

              {/* Status overlay at bottom of canvas */}
              {mode !== "waiting" && (
                <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800/80 bg-slate-950/80 px-4 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {mode === "placing" && (
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                      )}
                      {mode === "completed" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                      <span className="font-mono text-[12px] text-slate-300">{nextHint}</span>
                    </div>
                    {mode === "placing" && (
                      <span className="font-mono text-[11px] text-slate-600">
                        {currentPointIndex}/6 точек
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instructions (collapsed when image loaded) */}
            {mode === "waiting" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="mb-3 text-[11px] uppercase tracking-widest text-slate-500">
                  Порядок расстановки точек
                </p>
                <div className="flex flex-col gap-2.5">
                  {INSTRUCTION_STEPS.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${step.dot}`} />
                      <span className="text-[12px] leading-relaxed text-slate-400">{step.text}</span>
                    </div>
                  ))}
                  <p className="mt-1 text-[11px] text-slate-600">
                    После 6-й точки автоматически построятся линии и расчёты
                  </p>
                </div>
              </div>
            )}

            {/* Point progress (shown while placing) */}
            {mode === "placing" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="mb-3 text-[11px] uppercase tracking-widest text-slate-500">
                  Прогресс расстановки
                </p>
                <PointProgress points={points} currentIndex={currentPointIndex} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Results sidebar ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="mb-4 text-[11px] uppercase tracking-widest text-slate-500">
                Результаты измерений
              </p>

              {!result ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-[12px] text-slate-600">
                    Расставьте все 6 точек на снимке, чтобы увидеть результат
                  </p>
                </div>
              ) : (
                <ResultsPanel result={result} />
              )}
            </div>

            {/* Legend */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="mb-3 text-[11px] uppercase tracking-widest text-slate-500">Легенда</p>
              <div className="flex flex-col gap-2">
                {[
                  { color: "bg-blue-400",    label: "Линия Хильгенрейнера" },
                  { color: "bg-emerald-400", label: "Крышка впадины (касательная)" },
                  { color: "bg-red-400",     label: "Линия Перкина" },
                  { color: "bg-cyan-400",    label: "Дистанция h" },
                  { color: "bg-amber-400",   label: "Точки шейки бедра" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`h-2 w-5 rounded-full ${item.color}`} />
                    <span className="text-[11px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default XRayAnalyzer;