import React from "react";
import { POINT_HINTS } from "../hooks/useHipAnalysis";
import { Point } from "../utils/hipAnalysis";

interface Props {
  points: (Point | undefined)[];
  currentIndex: number;
}

const groups = [
  { label: "Хильгенрейнер", color: "hsl(var(--medical-blue))",  indices: [0, 1] as const },
  { label: "Крышка впадины", color: "hsl(var(--medical-teal))",  indices: [2, 3] as const },
  { label: "Шейка бедра",    color: "hsl(var(--medical-amber))", indices: [4, 5] as const },
] as const;

export const PointProgress: React.FC<Props> = ({ points, currentIndex }) => {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
          <span className="w-32 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </span>
          <div className="flex gap-2">
            {group.indices.map((i) => {
              const placed = !!points[i];
              const active = i === currentIndex;
              return (
                <div
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${
                    placed
                      ? "border-transparent text-white"
                      : active
                      ? "border-2 text-foreground animate-pulse-soft bg-background"
                      : "border-border text-muted-foreground bg-secondary"
                  }`}
                  style={
                    placed
                      ? { backgroundColor: group.color }
                      : active
                      ? { borderColor: group.color }
                      : {}
                  }
                >
                  {POINT_HINTS[i].label}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};