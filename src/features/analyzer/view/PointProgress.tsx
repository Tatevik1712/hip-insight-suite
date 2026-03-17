/**
 * @file features/analyzer/view/PointProgress.tsx
 * @layer View
 * @description Индикатор прогресса расстановки точек. Только UI, никакой логики.
 */
import React from "react";
import { POINT_META } from "@/constants";
import type { Point } from "@/types";

interface Props {
  points: (Point | undefined)[];
  currentIndex: number;
}

const GROUPS = [
  { label: "Хильгенрейнер", indices: [0, 1] as const },
  { label: "Крышка впадины", indices: [2, 3] as const },
  { label: "Шейка бедра",    indices: [4, 5] as const },
] as const;

export const PointProgress: React.FC<Props> = ({ points, currentIndex }) => (
  <div className="flex flex-col gap-3">
    {GROUPS.map((group) => {
      const color = POINT_META[group.indices[0]].color;
      return (
        <div key={group.label} className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="w-32 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </span>
          <div className="flex gap-2">
            {group.indices.map((i) => {
              const placed = !!points[i];
              const active = i === currentIndex;
              return (
                <div key={i}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300",
                    placed ? "border-transparent text-white" :
                    active ? "border-2 text-foreground bg-background animate-pulse-soft" :
                             "border-border text-muted-foreground bg-secondary",
                  ].join(" ")}
                  style={placed ? { backgroundColor: color } : active ? { borderColor: color } : undefined}
                >
                  {POINT_META[i].label}
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);
