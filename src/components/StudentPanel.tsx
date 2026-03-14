import { Pencil, CheckSquare, RotateCcw } from "lucide-react";

interface StudentPanelProps {
  onCheck: () => void;
  checked: boolean;
  onReset: () => void;
}

const StudentPanel = ({ onCheck, checked, onReset }: StudentPanelProps) => {
  return (
    <div className="glass-panel rounded-lg p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Pencil className="w-4 h-4 text-medical-teal" />
        <h3 className="text-sm font-semibold text-foreground">Режим обучения</h3>
      </div>
      
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Расставьте опорные точки на снимке самостоятельно. Нажмите «Проверить» для сравнения с эталоном ИИ.
      </p>

      <div className="flex gap-2">
        <button
          onClick={onCheck}
          disabled={checked}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs font-semibold transition-all ${
            checked
              ? "bg-medical-green/20 text-medical-green border border-medical-green/30"
              : "medical-gradient text-primary-foreground hover:opacity-90"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          {checked ? "Проверено" : "Проверить себя"}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Сброс
        </button>
      </div>

      {checked && (
        <div className="mt-3 p-3 rounded-md bg-secondary animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-0.5 rounded bg-medical-blue" />
            <span className="text-xs text-muted-foreground">Ваши линии</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded bg-medical-green border-dashed" style={{ borderTop: "1.5px dashed hsl(142, 71%, 45%)" , height: 0 }} />
            <span className="text-xs text-muted-foreground">Эталон ИИ</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPanel;
