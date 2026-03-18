/**
 * @file pages/StudentGallery.tsx
 * @description Галерея работ студентов.
 * Показывает снимки с разметкой, результаты анализа и имя студента.
 * Можно переключить между размеченным и оригинальным снимком.
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Search, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

const BACKEND_URL = "http://127.0.0.1:5001";

interface StudentAnalysis {
  id:              number;
  created_at:      string;
  student_name:    string | null;
  notes:           string | null;
  annotated_url:   string | null;
  original_url:    string | null;
  file_name:       string;
  angle:           number | null;
  dysplasia_stage: string | null;
  dysplasia_level: string | null;
  perkins:         string | null;
}

const StudentGallery: React.FC = () => {
  const [records,      setRecords]      = useState<StudentAnalysis[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  // Для каждой карточки храним: показывать разметку или оригинал
  const [showAnnotated, setShowAnnotated] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/student-analyses`);
      if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
      const data = await res.json();
      setRecords(data);
      // По умолчанию показываем размеченный снимок
      const initial: Record<number, boolean> = {};
      data.forEach((r: StudentAnalysis) => { initial[r.id] = true; });
      setShowAnnotated(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter((r) =>
    !search ||
    (r.student_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const getDiagnosisBadge = (level: string | null) => {
    if (level === "normal")   return "status-normal";
    if (level === "grade1")   return "status-borderline";
    if (level === "incomplete") return "bg-secondary text-foreground border border-border";
    return "status-dysplasia";
  };

  const toggleAnnotation = (id: number) => {
    setShowAnnotated(prev => ({ ...prev, [id]: !prev[id] }));
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
            <h1 className="text-sm font-semibold text-foreground">Работы студентов</h1>
            <p className="text-[10px] text-muted-foreground">Сохранённые разметки</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} из {records.length}
          </span>
          <button onClick={fetchRecords} className="text-xs text-primary hover:underline">
            Обновить
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input placeholder="Поиск по имени или файлу"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs" />
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
              Убедитесь что Flask-сервер запущен
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <p className="text-sm">Работ пока нет</p>
            <p className="text-xs">Расставьте точки в режиме обучения и нажмите «Сохранить работу»</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((record) => {
              const useAnnotated = showAnnotated[record.id] ?? true;
              const imgUrl = useAnnotated ? record.annotated_url : record.original_url;

              return (
                <div key={record.id} className="glass-panel rounded-lg overflow-hidden">

                  {/* Снимок */}
                  <div className="relative aspect-square bg-viewer-bg overflow-hidden">
                    {imgUrl ? (
                      <img src={imgUrl} alt={record.file_name}
                        className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-xs text-slate-500">Снимок недоступен</p>
                      </div>
                    )}

                    {/* Кнопка переключения разметки */}
                    {record.annotated_url && record.original_url && (
                      <button
                        onClick={() => toggleAnnotation(record.id)}
                        className="absolute top-2 right-2 glass-dark rounded-lg p-1.5
                                   flex items-center gap-1.5 text-[10px] transition-all hover:scale-105"
                        style={{ color: "hsla(0,0%,100%,0.8)" }}
                        title={useAnnotated ? "Показать оригинал" : "Показать разметку"}
                      >
                        {useAnnotated
                          ? <><EyeOff className="w-3 h-3" />Оригинал</>
                          : <><Eye    className="w-3 h-3" />Разметка</>}
                      </button>
                    )}
                  </div>

                  {/* Данные */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-foreground truncate">
                        {record.student_name ?? "Аноним"}
                      </span>
                      {record.dysplasia_level && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0
                          ${getDiagnosisBadge(record.dysplasia_level)}`}>
                          {record.dysplasia_stage ?? record.dysplasia_level}
                        </span>
                      )}
                    </div>

                    {record.angle !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        Угол: <span className="font-mono font-medium text-foreground">{record.angle}°</span>
                        {record.perkins && ` · Перкин: ${record.perkins === "medial" ? "норма" : "подвывих"}`}
                      </p>
                    )}

                    {record.notes && (
                      <p className="text-[10px] text-muted-foreground italic truncate">{record.notes}</p>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGallery;