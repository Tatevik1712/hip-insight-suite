import React from "react";
import { POINT_HINTS } from "../hooks/useHipAnalysis";
import { Point } from "../utils/hipAnalysis";

interface Props {
  points: (Point | undefined)[];
  currentIndex: number;
}

const groups = [
  { label: "Хильгенрейнер", color: "bg-blue-400", indices: [0, 1] },
  { label: "Крышка впадины", color: "bg-emerald-400", indices: [2, 3] },
  { label: "Шейка бедра",    color: "bg-amber-400",  indices: [4, 5] },
] as const;

export const PointProgress: React.FC<Props> = ({ points, currentIndex }) => {
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${group.color}`} />
          <span className="w-36 font-mono text-[11px] uppercase tracking-widest text-slate-500">
            {group.label}
          </span>
          <div className="flex gap-2">
            {group.indices.map((i) => {
              const placed = !!points[i];
              const active = i === currentIndex;
              return (
                <div
                  key={i}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all duration-300 ${
                    placed
                      ? `border-transparent ${group.color} text-slate-900`
                      : active
                      ? `border-2 ${group.color.replace("bg-", "border-")} text-slate-300 animate-pulse`
                      : "border-slate-700 text-slate-600"
                  }`}
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