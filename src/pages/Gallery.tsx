/**
 * @file pages/Gallery.tsx
 * @description Галерея сохранённых снимков с реальными изображениями.
 * Данные и снимки загружаются через Flask-бэкенд.
 */
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Activity, Search, Calendar, Stethoscope, ArrowLeft, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "http://127.0.0.1:5001";

interface Analysis {
  id:              number;
  patient_id:      string;
  full_name:       string | null;
  diagnosis:       string;
  file_name:       string;
  image_url:       string | null;
  notes:           string | null;
  created_at:      string;
  angle:           number | null;
  dysplasia_stage: string | null;
  doctor:          string | null;
}

const Gallery = () => {
  const [records,         setRecords]         = useState<Analysis[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [patientFilter,   setPatientFilter]   = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");
  const [dateFilter,      setDateFilter]      = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/analyses`);
      if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
      setRecords(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter((r) => {
    const matchPatient   = !patientFilter   ||
      r.patient_id.toLowerCase().includes(patientFilter.toLowerCase()) ||
      (r.full_name ?? "").toLowerCase().includes(patientFilter.toLowerCase());
    const matchDiagnosis = !diagnosisFilter || r.diagnosis.toLowerCase().includes(diagnosisFilter.toLowerCase());
    const matchDate      = !dateFilter      || r.created_at.startsWith(dateFilter);
    return matchPatient && matchDiagnosis && matchDate;
  });

  const getDiagnosisBadge = (diagnosis: string) => {
    if (diagnosis.includes("Норма"))       return "status-normal";
    if (diagnosis.includes("Пограничное")) return "status-borderline";
    if (diagnosis.includes("Дисплазия"))   return "status-dysplasia";
    return "bg-secondary text-foreground border border-border";
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-lg medical-gradient flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">Галерея снимков</h1>
            <p className="text-[10px] text-muted-foreground">Все сохранённые анализы</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} из {records.length} записей
          </span>
          <button onClick={fetchRecords} className="text-xs text-primary hover:underline">
            Обновить
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-card px-6 py-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input placeholder="ID или ФИО пациента" value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
          <select value={diagnosisFilter} onChange={(e) => setDiagnosisFilter(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground">
            <option value="">Все диагнозы</option>
            <option value="Норма">Норма</option>
            <option value="Пограничное">Пограничное</option>
            <option value="Дисплазия I">Дисплазия I степени</option>
            <option value="Дисплазия II">Дисплазия II степени</option>
            <option value="Дисплазия III">Дисплазия III степени</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input type="date" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Загрузка...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">
              Убедитесь что Flask-сервер запущен: <code>python3 dicom_to_png.py</code>
            </p>
            <button onClick={fetchRecords} className="text-xs text-primary hover:underline">
              Попробовать снова
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Search className="w-8 h-8 opacity-40" />
            <p className="text-sm">Записи не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((record) => (
              <div key={record.id}
                className="glass-panel rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                onClick={() => record.image_url && navigate(`/?image=${encodeURIComponent(record.image_url)}`)}>

                {/* Снимок */}
                <div className="aspect-square bg-viewer-bg overflow-hidden flex items-center justify-center">
                  {record.image_url ? (
                    <img
                      src={record.image_url}
                      alt={record.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        // Если снимок не загрузился — показываем заглушку
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  {/* Заглушка */}
                  <div className={`flex flex-col items-center gap-2 ${record.image_url ? "hidden" : ""}`}>
                    <ImageOff className="w-8 h-8 text-slate-500" />
                    <p className="text-[10px] text-slate-500">Снимок недоступен</p>
                  </div>
                </div>

                {/* Данные */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-medium text-foreground truncate">
                      {record.patient_id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${getDiagnosisBadge(record.diagnosis)}`}>
                      {record.diagnosis}
                    </span>
                  </div>

                  {record.full_name && (
                    <p className="text-[10px] text-foreground truncate">{record.full_name}</p>
                  )}

                  {record.doctor && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Врач: {record.doctor}
                    </p>
                  )}

                  {record.angle !== null && (
                    <p className="text-[10px] text-muted-foreground">
                      Угол: <span className="font-mono font-medium text-foreground">{record.angle}°</span>
                      {record.dysplasia_stage && ` · ${record.dysplasia_stage}`}
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString("ru-RU", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                  </p>
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