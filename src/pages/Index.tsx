import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DicomViewer from "@/components/DicomViewer";
import ParametersDashboard from "@/components/ParametersDashboard";
import DiagnosisCard from "@/components/DiagnosisCard";
import ModeToggle from "@/components/ModeToggle";
import StudentPanel from "@/components/StudentPanel";
import UploadPanel from "@/components/UploadPanel";
import ImageAdjustments, { type ImageFilters } from "@/components/ImageAdjustments";
import SendToAIButton from "@/components/SendToAIButton";
import { XRayAnalyzer } from "@/components/XRayAnalyzer";
import { Activity, Images, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import hipXray from "@/assets/hip-xray.jpg";

const Index = () => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [studentMode, setStudentMode] = useState(false);
  const [studentChecked, setStudentChecked] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const imageFromQuery = searchParams.get("image");
  const [customImage, setCustomImage] = useState<string | null>(imageFromQuery);
  const [filters, setFilters] = useState<ImageFilters>({ brightness: 100, contrast: 100, invert: false });
  const [aiLoading, setAiLoading] = useState(false);

  const currentImageSrc = customImage || hipXray;

  const handleSendToAI = (processedDataUrl: string) => {
    setAiLoading(true);
    toast({
      title: "Изображение готово",
      description: "Обработанный снимок подготовлен для отправки в вашу модель ИИ. Data URL доступен в консоли.",
    });
    console.log("[HipDx AI] Processed image data URL length:", processedDataUrl.length);
    console.log("[HipDx AI] Use this data URL to send to your AI model.");
    window.dispatchEvent(new CustomEvent("hipdx:image-ready", { detail: { dataUrl: processedDataUrl } }));
    setAiLoading(false);
  };

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
          <button
            onClick={() => navigate("/gallery")}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Images className="w-4 h-4" />
            Галерея
          </button>
          <span className="text-xs text-muted-foreground font-mono">ID: DDH-2024-0847</span>
          <div className="w-2 h-2 rounded-full bg-medical-green animate-pulse-soft" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Viewer */}
        <div className="flex-1 flex p-3">
          <DicomViewer
            showOverlay={showOverlay}
            onToggleOverlay={() => setShowOverlay(o => !o)}
            studentMode={studentMode}
            showStudentCheck={studentChecked}
            customImage={customImage}
            filters={filters}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-[360px] border-l border-border bg-card overflow-y-auto p-4 space-y-4 shrink-0">
          <ModeToggle
            studentMode={studentMode}
            onToggle={() => { setStudentMode(m => !m); setStudentChecked(false); }}
          />

          <UploadPanel onUploaded={(url) => setCustomImage(url)} />

          <ImageAdjustments filters={filters} onChange={setFilters} />

          <SendToAIButton
            imageSrc={currentImageSrc}
            filters={filters}
            loading={aiLoading}
            onSend={handleSendToAI}
          />

          {studentMode ? (
            <StudentPanel
              onCheck={() => setStudentChecked(true)}
              checked={studentChecked}
              onReset={() => setStudentChecked(false)}
              onOpenAnalyzer={() => setAnalyzerOpen(true)}
            />
          ) : (
            <>
              <ParametersDashboard />
              <DiagnosisCard status="normal" />
            </>
          )}
        </aside>
      </div>

      {/* ── XRay Analyzer Modal ───────────────────────────────────────────── */}
      {analyzerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 animate-fade-in">
          {/* Modal header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-3 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
                Анализатор точек — Режим обучения
              </span>
            </div>
            <button
              onClick={() => setAnalyzerOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Закрыть
            </button>
          </div>

          {/* Analyzer content — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <XRayAnalyzer />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;