/**
 * @file shared/components/StudentPanel.tsx
 * @description Минимальная панель студенческого режима.
 * Анализатор открывается автоматически при переключении режима —
 * эта панель показывается когда пользователь вернулся из анализатора.
 */
import React from "react";
import { GraduationCap, ScanLine, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onOpenAnalyzer: () => void;
}

const StudentPanel: React.FC<Props> = ({ onOpenAnalyzer }) => {
  const navigate = useNavigate();

  return (
    <div className="glass-panel rounded-lg p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="w-4 h-4 text-medical-teal" />
        <h3 className="text-sm font-semibold text-foreground">Режим обучения</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Самостоятельно расставьте анатомические точки на снимке,
        получите расчёт параметров и сохраните результат.
      </p>

      <div className="flex flex-col gap-2">
        {/* Открыть анализатор */}
        <button
          onClick={onOpenAnalyzer}
          className="w-full flex items-center justify-center gap-2 rounded-lg
                     medical-gradient text-primary-foreground px-4 py-2.5
                     text-xs font-semibold hover:opacity-90 transition-all active:scale-95"
        >
          <ScanLine className="w-3.5 h-3.5" />
          Открыть анализатор
        </button>

        {/* Перейти в галерею студента */}
        <button
          onClick={() => navigate("/student-gallery")}
          className="w-full flex items-center justify-center gap-2 rounded-lg
                     border border-border bg-secondary px-4 py-2.5
                     text-xs font-medium text-foreground hover:bg-muted transition-all"
        >
          <Images className="w-3.5 h-3.5" />
          Мои работы
        </button>
      </div>
    </div>
  );
};

export default StudentPanel;