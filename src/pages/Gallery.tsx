import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Activity, Search, Calendar, Stethoscope, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface XrayImage {
  id: string;
  patient_id: string;
  diagnosis: string;
  image_url: string;
  file_name: string;
  notes: string | null;
  created_at: string;
}

const Gallery = () => {
  const [images, setImages] = useState<XrayImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientFilter, setPatientFilter] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("xray_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setImages(data);
    setLoading(false);
  };

  const filtered = images.filter((img) => {
    const matchPatient = !patientFilter || img.patient_id.toLowerCase().includes(patientFilter.toLowerCase());
    const matchDiagnosis = !diagnosisFilter || img.diagnosis.toLowerCase().includes(diagnosisFilter.toLowerCase());
    const matchDate = !dateFilter || img.created_at.startsWith(dateFilter);
    return matchPatient && matchDiagnosis && matchDate;
  });

  const getDiagnosisBadge = (diagnosis: string) => {
    if (diagnosis === "Норма") return "status-normal";
    if (diagnosis === "Пограничное состояние") return "status-borderline";
    if (diagnosis === "Дисплазия") return "status-dysplasia";
    return "bg-secondary text-foreground";
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-lg medical-gradient flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">Галерея снимков</h1>
            <p className="text-[10px] text-muted-foreground">Все загруженные рентгенограммы</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} из {images.length} снимков
        </span>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-card px-6 py-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="ID пациента"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={diagnosisFilter}
            onChange={(e) => setDiagnosisFilter(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground"
          >
            <option value="">Все диагнозы</option>
            <option value="Норма">Норма</option>
            <option value="Пограничное состояние">Пограничное</option>
            <option value="Дисплазия">Дисплазия</option>
            <option value="Не определен">Не определен</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Search className="w-8 h-8 opacity-40" />
            <p className="text-sm">Снимки не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((img) => (
              <div
                key={img.id}
                className="glass-panel rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/?image=${encodeURIComponent(img.image_url)}`)}
              >
                <div className="aspect-square bg-viewer-bg overflow-hidden">
                  <img
                    src={img.image_url}
                    alt={img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-foreground">
                      ID: {img.patient_id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${getDiagnosisBadge(img.diagnosis)}`}>
                      {img.diagnosis}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{img.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(img.created_at).toLocaleDateString("ru-RU")}
                  </p>
                  {img.notes && (
                    <p className="text-[10px] text-muted-foreground truncate italic">
                      {img.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
