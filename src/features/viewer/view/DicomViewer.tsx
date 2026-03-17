/**
 * @file features/viewer/view/DicomViewer.tsx
 * @layer View
 * @description Просмотрщик рентгеновских снимков с зумом и панорамированием.
 *
 * Отображает снимок только если он передан через проп customImage.
 * Без снимка — показывает заглушку с предложением загрузить файл.
 * SVG-оверлей с линиями убран — линии рисуются через canvas в XRayAnalyzer.
 */
import React from "react";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Move, Upload } from "lucide-react";
import { useViewer } from "../controller/useViewer";
import type { ImageFilters } from "@/types";

interface Props {
  showOverlay:      boolean;
  onToggleOverlay:  () => void;
  studentMode:      boolean;
  showStudentCheck: boolean;
  customImage?:     string | null;
  filters:          ImageFilters;
}

const DicomViewer: React.FC<Props> = ({
  showOverlay, onToggleOverlay, studentMode, showStudentCheck, customImage, filters,
}) => {
  const v = useViewer();
  const cssFilter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)${filters.invert ? " invert(1)" : ""}`;

  return (
    <div className="relative flex-1 bg-viewer-bg rounded-lg overflow-hidden viewer-grid">

      {/* Тулбар слева — только если снимок загружен */}
      {customImage && (
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={onToggleOverlay}
            className="glass-dark rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-medium transition-all hover:scale-105"
            style={{ color: showOverlay ? "hsl(174, 72%, 56%)" : "hsla(0,0%,100%,0.5)" }}
          >
            {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Визуализация
          </button>
        </div>
      )}

      {/* Тулбар справа — только если снимок загружен */}
      {customImage && (
        <div className="absolute top-4 right-4 z-20 flex gap-1">
          {([
            { icon: ZoomIn,    action: v.handleZoomIn,  label: "Zoom in"  },
            { icon: ZoomOut,   action: v.handleZoomOut, label: "Zoom out" },
            { icon: RotateCcw, action: v.handleReset,   label: "Reset"    },
          ] as const).map(({ icon: Icon, action, label }) => (
            <button key={label} onClick={action} title={label}
              className="glass-dark rounded-lg p-2 transition-all hover:scale-105"
              style={{ color: "hsla(0,0%,100%,0.7)" }}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Индикатор зума */}
      {customImage && (
        <div className="absolute bottom-4 left-4 z-20 glass-dark rounded-lg px-3 py-1.5 text-xs font-mono"
          style={{ color: "hsla(0,0%,100%,0.5)" }}>
          {Math.round(v.zoom * 100)}%
        </div>
      )}

      {/* Подсказка панорамирования */}
      {customImage && v.zoom > 1 && (
        <div className="absolute bottom-4 right-4 z-20 glass-dark rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5"
          style={{ color: "hsla(0,0%,100%,0.4)" }}>
          <Move className="w-3 h-3" /> Перетаскивание
        </div>
      )}

      {/* Содержимое */}
      {!customImage ? (
        /* Заглушка — снимок не загружен */
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 select-none">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: "hsla(0,0%,100%,0.15)" }}>
            <Upload className="w-7 h-7" style={{ color: "hsla(0,0%,100%,0.25)" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-1" style={{ color: "hsla(0,0%,100%,0.5)" }}>
              Снимок не загружен
            </p>
            <p className="text-xs" style={{ color: "hsla(0,0%,100%,0.25)" }}>
              Загрузите DICOM, PNG или JPG через боковую панель
            </p>
          </div>
        </div>
      ) : (
        /* Снимок с зумом и паном */
        <div
          ref={v.containerRef}
          className="w-full h-full flex items-center justify-center select-none"
          style={{ cursor: v.isPanning ? "grabbing" : "grab" }}
          onMouseDown={v.handleMouseDown}
          onMouseMove={v.handleMouseMove}
          onMouseUp={v.handleMouseUp}
          onMouseLeave={v.handleMouseUp}
        >
          <div
            className="relative"
            style={{
              transform: `translate(${v.pan.x}px, ${v.pan.y}px) scale(${v.zoom})`,
              transformOrigin: "center center",
              transition: v.isPanning ? "none" : "transform 0.15s ease-out",
            }}
          >
            <img
              src={customImage}
              alt="Рентгенограмма тазобедренных суставов"
              className="max-h-[calc(100vh-8rem)] w-auto object-contain pointer-events-none"
              draggable={false}
              style={{ filter: cssFilter, transition: "filter 0.2s ease" }}
            />

            {/* Эталонная метка в студенческом режиме после проверки */}
            {studentMode && showStudentCheck && (
              <svg
                className="absolute inset-0 w-full h-full animate-fade-in"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <text x="50" y="6" fill="hsl(142,71%,45%)" fontSize="2.5"
                  fontFamily="Inter" textAnchor="middle" opacity="0.8">
                  Эталонные линии ИИ
                </text>
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DicomViewer;