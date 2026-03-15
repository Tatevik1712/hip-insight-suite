import { Sun, Contrast, ImageOff, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export interface ImageFilters {
  brightness: number;
  contrast: number;
  invert: boolean;
}

interface ImageAdjustmentsProps {
  filters: ImageFilters;
  onChange: (filters: ImageFilters) => void;
}

const ImageAdjustments = ({ filters, onChange }: ImageAdjustmentsProps) => {
  const handleReset = () => onChange({ brightness: 100, contrast: 100, invert: false });

  return (
    <div className="glass-panel rounded-lg p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Цветокоррекция</h3>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Сброс
        </button>
      </div>

      {/* Brightness */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-medical-amber" />
            <span className="text-xs text-foreground">Яркость</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{filters.brightness}%</span>
        </div>
        <Slider
          value={[filters.brightness]}
          onValueChange={([v]) => onChange({ ...filters, brightness: v })}
          min={0}
          max={200}
          step={5}
          className="w-full"
        />
      </div>

      {/* Contrast */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Contrast className="w-3.5 h-3.5 text-medical-blue" />
            <span className="text-xs text-foreground">Контрастность</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{filters.contrast}%</span>
        </div>
        <Slider
          value={[filters.contrast]}
          onValueChange={([v]) => onChange({ ...filters, contrast: v })}
          min={0}
          max={200}
          step={5}
          className="w-full"
        />
      </div>

      {/* Invert */}
      <button
        onClick={() => onChange({ ...filters, invert: !filters.invert })}
        className={`w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all ${
          filters.invert
            ? "bg-medical-teal/20 text-medical-teal border border-medical-teal/30"
            : "bg-secondary text-foreground hover:bg-secondary/80"
        }`}
      >
        <ImageOff className="w-3.5 h-3.5" />
        {filters.invert ? "Негатив включён" : "Негатив"}
      </button>
    </div>
  );
};

export default ImageAdjustments;
