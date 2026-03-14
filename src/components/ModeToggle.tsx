import { Stethoscope, GraduationCap } from "lucide-react";

interface ModeToggleProps {
  studentMode: boolean;
  onToggle: () => void;
}

const ModeToggle = ({ studentMode, onToggle }: ModeToggleProps) => {
  return (
    <div className="glass-panel rounded-lg p-3 flex items-center gap-3">
      <button
        onClick={onToggle}
        className="relative w-full flex items-center rounded-md overflow-hidden bg-secondary h-9"
      >
        <div
          className="absolute h-full w-1/2 rounded-md medical-gradient transition-transform duration-300 ease-out"
          style={{ transform: studentMode ? "translateX(100%)" : "translateX(0)" }}
        />
        <span className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors duration-300 ${!studentMode ? "text-primary-foreground" : "text-muted-foreground"}`}>
          <Stethoscope className="w-3.5 h-3.5" />
          Врач
        </span>
        <span className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors duration-300 ${studentMode ? "text-primary-foreground" : "text-muted-foreground"}`}>
          <GraduationCap className="w-3.5 h-3.5" />
          Студент
        </span>
      </button>
    </div>
  );
};

export default ModeToggle;
