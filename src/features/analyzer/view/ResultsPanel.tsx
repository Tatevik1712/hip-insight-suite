/**
 * @file features/analyzer/view/ResultsPanel.tsx
 * @layer View
 * @description Панель результатов анализа.
 * Отображает: бинарный вывод (патология/норма), угол, дистанции, Перкин, диагноз.
 */
import React from "react";
import type { AnalysisResult, DysplasiaLevel } from "@/types";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  result:      AnalysisResult;
  cls?:        0 | 1 | null;   // бинарный класс от ML-сервера
  confidence?: number | null;  // уверенность 0-100
}

const LEVEL_STYLES: Record<DysplasiaLevel, { bg: string; border: string; text: string; badge: string }> = {
  normal:     { bg: "bg-success/8",     border: "border-success/30",     text: "text-success",          badge: "status-normal"     },
  grade1:     { bg: "bg-warning/8",     border: "border-warning/30",     text: "text-warning",          badge: "status-borderline" },
  grade2:     { bg: "bg-warning/12",    border: "border-warning/40",     text: "text-warning",          badge: "status-borderline" },
  grade3:     { bg: "bg-destructive/8", border: "border-destructive/30", text: "text-destructive",      badge: "status-dysplasia"  },
  incomplete: { bg: "bg-muted",         border: "border-border",         text: "text-muted-foreground", badge: ""                  },
};

function Metric({ label, value, norm, unit = "" }: {
  label: string; value: string; norm: string; unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/60 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground leading-none">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <span className="text-[10px] text-muted-foreground">{norm}</span>
    </div>
  );
}

export const ResultsPanel: React.FC<Props> = ({ result, cls, confidence }) => {
  const { angle, distances, perkins, normData, dysplasia } = result;
  const s     = LEVEL_STYLES[dysplasia.level];
  const above = angle > normData.max;

  // Определяем бинарный класс из угла если ML не вернул
  const binaryClass      = cls      ?? (angle > 30 ? 1 : 0);
  const binaryConfidence = confidence ?? Math.min(99, Math.round(50 + Math.abs(angle - 30) * 3.3));
  const isPathology      = binaryClass === 1;

  return (
    <div className="flex flex-col gap-3 animate-fade-in">

      {/* ── Бинарный вывод: патология / норма ─────────────────────────── */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${
        isPathology
          ? "bg-destructive/8 border-destructive/30"
          : "bg-success/8 border-success/30"
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isPathology ? "bg-destructive/15" : "bg-success/15"
        }`}>
          {isPathology
            ? <ShieldAlert className="w-5 h-5 text-destructive" />
            : <ShieldCheck className="w-5 h-5 text-success" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${isPathology ? "text-destructive" : "text-success"}`}>
            {isPathology ? "Патология выявлена" : "Патология не выявлена"}
          </div>
          {/* Прогресс-бар уверенности */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isPathology ? "bg-destructive" : "bg-success"
                }`}
                style={{ width: `${binaryConfidence}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
              {binaryConfidence}% уверенность
            </span>
          </div>
        </div>
      </div>

      {/* ── Ацетабулярный угол ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-secondary/60 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Ацетабулярный угол
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold leading-none ${above ? "text-destructive" : "text-success"}`}>
            {angle.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">°</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-700 ${above ? "bg-destructive" : "bg-success"}`}
              style={{ width: `${Math.min((angle / 40) * 100, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            норма: {normData.min.toFixed(1)}–{normData.max.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* ── Дистанции h и d ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Дистанция h" value={distances.h.toFixed(1)} norm="норма: 8–12 мм" unit="мм" />
        <Metric label="Дистанция d" value={distances.d.toFixed(1)} norm="норма: 10–15 мм" unit="мм" />
      </div>

      {/* ── Позиция по Перкину ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2.5">
        <div className={`w-2 h-2 rounded-full shrink-0 ${perkins === "medial" ? "bg-success" : "bg-warning"}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Перкин:</span>
        <span className="text-xs text-foreground font-medium">
          {perkins === "medial" ? "Медиально — норма ✓" : perkins === "lateral" ? "Латерально — подвывих ⚠" : "—"}
        </span>
      </div>

      {/* ── Степень дисплазии ──────────────────────────────────────────── */}
      <div className={`rounded-xl border ${s.bg} ${s.border} p-3`}>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.badge}`}>
          {dysplasia.stage}
        </span>
        <p className={`mt-2 text-xs leading-relaxed ${s.text}`}>{dysplasia.description}</p>
      </div>

    </div>
  );
};