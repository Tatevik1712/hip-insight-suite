import { useState, useRef, useCallback, useEffect } from "react";
import hipXray from "@/assets/hip-xray.jpg";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface DicomViewerProps {
  showOverlay: boolean;
  onToggleOverlay: () => void;
  studentMode: boolean;
  showStudentCheck: boolean;
  customImage?: string | null;
}

const KEY_POINTS = [
  { id: "triradiate_l", x: 38, y: 42, label: "Y-хрящ (L)" },
  { id: "triradiate_r", x: 62, y: 42, label: "Y-хрящ (R)" },
  { id: "femoral_l", x: 33, y: 55, label: "Головка (L)" },
  { id: "femoral_r", x: 67, y: 55, label: "Головка (R)" },
  { id: "acetab_l", x: 30, y: 38, label: "Край вертл. (L)" },
  { id: "acetab_r", x: 70, y: 38, label: "Край вертл. (R)" },
];

const DicomViewer = ({ showOverlay, onToggleOverlay, studentMode, showStudentCheck, customImage }: DicomViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const imageSrc = customImage || hipXray;

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 3));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const shouldShowLines = showOverlay && (!studentMode || showStudentCheck);

  return (
    <div className="relative flex-1 bg-viewer-bg rounded-lg overflow-hidden viewer-grid">
      {/* Toolbar */}
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

      <div className="absolute top-4 right-4 z-20 flex gap-1">
        {[
          { icon: ZoomIn, action: handleZoomIn, label: "Zoom in" },
          { icon: ZoomOut, action: handleZoomOut, label: "Zoom out" },
          { icon: RotateCcw, action: handleReset, label: "Reset" },
        ].map(({ icon: Icon, action, label }) => (
          <button
            key={label}
            onClick={action}
            className="glass-dark rounded-lg p-2 transition-all hover:scale-105"
            style={{ color: "hsla(0,0%,100%,0.7)" }}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 z-20 glass-dark rounded-lg px-3 py-1.5 text-xs font-mono" style={{ color: "hsla(0,0%,100%,0.5)" }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Pan hint */}
      {zoom > 1 && (
        <div className="absolute bottom-4 right-4 z-20 glass-dark rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5" style={{ color: "hsla(0,0%,100%,0.4)" }}>
          <Move className="w-3 h-3" /> Перетаскивание
        </div>
      )}

      {/* Image + SVG overlay */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center select-none"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.15s ease-out",
          }}
        >
          <img
            src={imageSrc}
            alt="Рентгенограмма тазобедренных суставов"
            className="max-h-[calc(100vh-8rem)] w-auto object-contain pointer-events-none"
            draggable={false}
          />

          {/* SVG overlay */}
          {shouldShowLines && (
            <svg
              className="absolute inset-0 w-full h-full animate-fade-in"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Hilgenreiner line */}
              <line x1="15" y1="42" x2="85" y2="42" className="line-hilgenreiner" strokeWidth="0.3" strokeDasharray="1,0.5" />
              <text x="87" y="42" fill="hsl(174, 72%, 56%)" fontSize="2.2" fontFamily="Inter">H</text>

              {/* Perkins lines */}
              <line x1="30" y1="30" x2="30" y2="60" className="line-perkins" strokeWidth="0.3" strokeDasharray="0.8,0.4" />
              <line x1="70" y1="30" x2="70" y2="60" className="line-perkins" strokeWidth="0.3" strokeDasharray="0.8,0.4" />
              <text x="31" y="31" fill="hsl(38, 92%, 50%)" fontSize="2.2" fontFamily="Inter">P</text>

              {/* Acetabular angle lines */}
              <line x1="38" y1="42" x2="30" y2="38" className="line-acetabular" strokeWidth="0.4" />
              <line x1="62" y1="42" x2="70" y2="38" className="line-acetabular" strokeWidth="0.4" />

              {/* Angle arcs */}
              <path d="M 35 42 A 3 3 0 0 1 32 40" fill="none" stroke="hsl(211, 100%, 50%)" strokeWidth="0.25" />
              <text x="32" y="40.5" fill="hsl(211, 100%, 50%)" fontSize="1.8" fontFamily="Inter">28°</text>
              <path d="M 65 42 A 3 3 0 0 0 68 40" fill="none" stroke="hsl(211, 100%, 50%)" strokeWidth="0.25" />
              <text x="65" y="40.5" fill="hsl(211, 100%, 50%)" fontSize="1.8" fontFamily="Inter">22°</text>

              {/* Key points */}
              {KEY_POINTS.map(pt => (
                <g key={pt.id}>
                  <circle cx={pt.x} cy={pt.y} r="0.8" fill="hsl(211, 100%, 50%)" opacity="0.9" />
                  <circle cx={pt.x} cy={pt.y} r="1.5" fill="none" stroke="hsl(211, 100%, 50%)" strokeWidth="0.15" opacity="0.5" className="animate-pulse-soft" />
                </g>
              ))}

              {/* Shenton's line (curved) */}
              <path d="M 28 58 Q 33 50 38 48" fill="none" stroke="hsl(142, 71%, 45%)" strokeWidth="0.3" strokeDasharray="0.6,0.3" />
              <path d="M 72 58 Q 67 50 62 48" fill="none" stroke="hsl(142, 71%, 45%)" strokeWidth="0.3" strokeDasharray="0.6,0.3" />
            </svg>
          )}

          {/* Student mode: reference lines shown on check */}
          {studentMode && showStudentCheck && (
            <svg
              className="absolute inset-0 w-full h-full animate-fade-in"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <text x="50" y="8" fill="hsl(142, 71%, 45%)" fontSize="2.5" fontFamily="Inter" textAnchor="middle" opacity="0.8">
                Эталонные линии ИИ
              </text>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default DicomViewer;
