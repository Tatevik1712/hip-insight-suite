/**
 * @file components/PatientCard.tsx
 * @description Карточка пациента — управляемый компонент (controlled).
 *
 * Данные хранятся в родителе (Index.tsx) и передаются через пропсы.
 * Это позволяет Index.tsx читать данные при сохранении в БД.
 */
import React from "react";
import { User, FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { PatientData } from "@/services/analysisRepository";

interface Props {
  data:     PatientData;
  onChange: (data: PatientData) => void;
}

// Человекочитаемые названия диагнозов
const DIAGNOSIS_LABELS: Record<string, string> = {
  norm:       "Норма",
  borderline: "Пограничное состояние",
  grade1:     "Дисплазия I степени (предвывих)",
  grade2:     "Дисплазия II степени (подвывих)",
  grade3:     "Дисплазия III степени (вывих)",
};

const PatientCard: React.FC<Props> = ({ data, onChange }) => {
  const [expanded, setExpanded] = React.useState(true);

  // Универсальный обработчик изменения поля
  const set = (field: keyof PatientData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ ...data, [field]: e.target.value });

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground " +
    "placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none " +
    "focus:ring-2 focus:ring-primary/20 transition-colors";

  const diagnosisStatusCls =
    data.diagnosis === "norm"       ? "status-normal"     :
    data.diagnosis === "borderline" ? "status-borderline" :
    data.diagnosis                  ? "status-dysplasia"  : "";

  return (
    <div className="glass-panel rounded-lg overflow-hidden">

      {/* Заголовок — кликабельный */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-medical-blue" />
          <span className="text-sm font-semibold text-foreground">Данные пациента</span>
        </div>
        {expanded
          ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">

          {/* ФИО */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              ФИО пациента
            </label>
            <input
              type="text"
              placeholder="Иванов Иван Иванович"
              value={data.fullName}
              onChange={set("fullName")}
              className={inputCls}
            />
          </div>

          {/* Дата рождения + ID */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Дата рождения
              </label>
              <input
                type="date"
                value={data.birthDate}
                onChange={set("birthDate")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                ID пациента
              </label>
              <input
                type="text"
                placeholder="DDH-2024-0001"
                value={data.patientId}
                onChange={set("patientId")}
                className={inputCls}
              />
            </div>
          </div>

          {/* Лечащий врач */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Лечащий врач
            </label>
            <input
              type="text"
              placeholder="Петров П.П."
              value={data.doctor}
              onChange={set("doctor")}
              className={inputCls}
            />
          </div>

          <div className="border-t border-border" />

          {/* Диагноз */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Диагноз
            </label>
            <select value={data.diagnosis} onChange={set("diagnosis")} className={inputCls}>
              <option value="">— не указан —</option>
              <option value="norm">Норма</option>
              <option value="borderline">Пограничное состояние</option>
              <option value="grade1">Дисплазия I степени (предвывих)</option>
              <option value="grade2">Дисплазия II степени (подвывих)</option>
              <option value="grade3">Дисплазия III степени (вывих)</option>
            </select>
          </div>

          {/* Статус диагноза */}
          {data.diagnosis && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${diagnosisStatusCls}`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse-soft shrink-0" />
              {DIAGNOSIS_LABELS[data.diagnosis] ?? data.diagnosis}
            </div>
          )}

          {/* Заметки */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              <FileText className="w-3 h-3 inline mr-1" />
              Заметки врача
            </label>
            <textarea
              rows={3}
              placeholder="Клинические наблюдения, рекомендации..."
              value={data.notes}
              onChange={set("notes")}
              className={inputCls + " resize-none leading-relaxed"}
            />
          </div>

        </div>
      )}
    </div>
  );
};

export default PatientCard;