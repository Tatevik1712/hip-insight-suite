import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DicomViewer from "@/components/DicomViewer";
import ParametersDashboard from "@/components/ParametersDashboard";
import DiagnosisCard from "@/components/DiagnosisCard";
import ModeToggle from "@/components/ModeToggle";
import StudentPanel from "@/components/StudentPanel";
import UploadPanel from "@/components/UploadPanel";
import { Activity, Images } from "lucide-react";

const Index = () => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [studentMode, setStudentMode] = useState(false);
  const [studentChecked, setStudentChecked] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const imageFromQuery = searchParams.get("image");
  const [customImage, setCustomImage] = useState<string | null>(imageFromQuery);

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
          />
        </div>

        {/* Sidebar */}
        <aside className="w-[360px] border-l border-border bg-card overflow-y-auto p-4 space-y-4 shrink-0">
          <ModeToggle studentMode={studentMode} onToggle={() => { setStudentMode(m => !m); setStudentChecked(false); }} />

          <UploadPanel onUploaded={(url) => setCustomImage(url)} />

          {studentMode ? (
            <StudentPanel
              onCheck={() => setStudentChecked(true)}
              checked={studentChecked}
              onReset={() => setStudentChecked(false)}
            />
          ) : (
            <>
              <ParametersDashboard />
              <DiagnosisCard status="normal" />
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Index;
