/**
 * @file shared/components/ModeToggle.tsx
 * @description Переключатель режимов «Врач / Студент». Чистый View, без логики.
 */
import { Stethoscope, GraduationCap } from "lucide-react";

interface Props {
  studentMode: boolean;
  onToggle:    () => void;
}

const ModeToggle: React.FC<Props> = ({ studentMode, onToggle }) => (
  <div className="glass-panel rounded-lg p-3 flex items-center gap-3">
    <button onClick={onToggle}
      className="relative w-full flex items-center rounded-md overflow-hidden bg-secondary h-9">
      <div
        className="absolute h-full w-1/2 rounded-md medical-gradient transition-transform duration-300 ease-out"
        style={{ transform: studentMode ? "translateX(100%)" : "translateX(0)" }}
      />
      {([
        { mode: false, icon: Stethoscope, label: "Врач"    },
        { mode: true,  icon: GraduationCap, label: "Студент" },
      ] as const).map(({ mode, icon: Icon, label }) => (
        <span key={label}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors duration-300
            ${studentMode === mode ? "text-primary-foreground" : "text-muted-foreground"}`}>
          <Icon className="w-3.5 h-3.5" />{label}
        </span>
      ))}
    </button>
  </div>
);

export default ModeToggle;
