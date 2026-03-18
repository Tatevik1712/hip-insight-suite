/**
 * @file components/PatientCard.tsx
 * @description Карточка пациента — только административные данные.
 * Диагноз намеренно убран отсюда — он заполняется ПОСЛЕ анализа ИИ,
 * чтобы не навязывать врачу предвзятость до получения результатов.
 */
import React from "react";
import { User, FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { PatientData } from "@/services/analysisRepository";

interface Props {
  data:     PatientData;
  onChange: (data: PatientData) => void;
}

const PatientCard: React.FC<Props> = ({ data, onChange }) => {
  const [expanded, setExpanded] = React.useState(true);

  const set = (field: keyof PatientData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...data, [field]: e.target.value });

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground " +
    "placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none " +
    "focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <div className="glass-panel rounded-lg overflow-hidden">
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
            <input type="text" placeholder="Иванов Иван Иванович"
              value={data.fullName} onChange={set("fullName")} className={inputCls} />
          </div>

          {/* Дата рождения + ID */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Дата рождения
              </label>
              <input type="date" value={data.birthDate}
                onChange={set("birthDate")} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                ID пациента
              </label>
              <input type="text" placeholder="DDH-2024-0001"
                value={data.patientId} onChange={set("patientId")} className={inputCls} />
            </div>
          </div>

          {/* Лечащий врач */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Лечащий врач
            </label>
            <input type="text" placeholder="Петров П.П."
              value={data.doctor} onChange={set("doctor")} className={inputCls} />
          </div>

          <div className="border-t border-border" />

          {/* Заметки */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              <FileText className="w-3 h-3 inline mr-1" />
              Заметки врача
            </label>
            <textarea rows={2} placeholder="Клинические наблюдения..."
              value={data.notes} onChange={set("notes")}
              className={inputCls + " resize-none leading-relaxed"} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCard;