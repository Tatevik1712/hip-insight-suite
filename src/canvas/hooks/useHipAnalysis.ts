import { useState, useRef, useCallback } from "react";
import {
  Point,
  Gender,
  AnalysisResult,
  getNormForAge,
  runAnalysis,
} from "../utils/hipAnalysis";
import { drawScene, drawPlaceholder } from "../utils/canvasDraw";

export const POINT_HINTS = [
  { name: "Хильгенрейнер — левая точка", color: "#60A5FA", label: "H₁" },
  { name: "Хильгенрейнер — правая точка", color: "#60A5FA", label: "H₂" },
  { name: "Крышка впадины — левая", color: "#34D399", label: "A₁" },
  { name: "Крышка впадины — правая", color: "#34D399", label: "A₂" },
  { name: "Шейка бедра — левая", color: "#FBBF24", label: "N₁" },
  { name: "Шейка бедра — правая", color: "#FBBF24", label: "N₂" },
] as const;

export type AppMode = "waiting" | "placing" | "completed";

export interface HipAnalysisState {
  mode: AppMode;
  points: (Point | undefined)[];
  currentPointIndex: number;
  image: HTMLImageElement | null;
  ageMonths: number;
  gender: Gender;
  result: AnalysisResult | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  nextHint: string;
  normLabel: string;
  handleImageLoad: (file: File) => void;
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleReset: () => void;
  setAgeMonths: (v: number) => void;
  setGender: (v: Gender) => void;
}

export function useHipAnalysis(): HipAnalysisState {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<AppMode>("waiting");
  const [points, setPoints] = useState<(Point | undefined)[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ageMonths, setAgeMonths] = useState(0);
  const [gender, setGender] = useState<Gender>("male");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Re-render canvas whenever dependencies change
  const redraw = useCallback(
    (currentPoints: (Point | undefined)[], currentImage: HTMLImageElement | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (currentImage) {
        drawScene(canvas, currentImage, currentPoints);
      } else {
        drawPlaceholder(canvas);
      }
    },
    []
  );

  const handleImageLoad = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          const emptyPoints: (Point | undefined)[] = [];
          setPoints(emptyPoints);
          setCurrentPointIndex(0);
          setMode("placing");
          setResult(null);
          drawScene(canvas!, img, emptyPoints);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "placing" || currentPointIndex >= 6) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      const clamped: Point = [
        Math.max(0, Math.min(canvas.width, x)),
        Math.max(0, Math.min(canvas.height, y)),
      ];

      const newPoints = [...points];
      newPoints[currentPointIndex] = clamped;
      setPoints(newPoints);
      redraw(newPoints, image);

      const nextIndex = currentPointIndex + 1;
      setCurrentPointIndex(nextIndex);

      if (nextIndex === 6) {
        setMode("completed");
        const analysis = runAnalysis(newPoints, ageMonths, gender);
        setResult(analysis);
      }
    },
    [mode, currentPointIndex, points, image, ageMonths, gender, redraw]
  );

  const handleReset = useCallback(() => {
    const emptyPoints: (Point | undefined)[] = [];
    setPoints(emptyPoints);
    setCurrentPointIndex(0);
    setMode(image ? "placing" : "waiting");
    setResult(null);
    redraw(emptyPoints, image);
  }, [image, redraw]);

  const handleSetAge = useCallback(
    (v: number) => {
      setAgeMonths(v);
      // Recalculate if already complete
      if (mode === "completed" && points.length === 6) {
        const analysis = runAnalysis(points, v, gender);
        setResult(analysis);
      }
    },
    [mode, points, gender]
  );

  const handleSetGender = useCallback(
    (v: Gender) => {
      setGender(v);
      if (mode === "completed" && points.length === 6) {
        const analysis = runAnalysis(points, ageMonths, v);
        setResult(analysis);
      }
    },
    [mode, points, ageMonths]
  );

  // Derived UI strings
  const nextHint =
    mode === "waiting"
      ? "Загрузите снимок, чтобы начать"
      : mode === "completed"
      ? "Расчёт завершён"
      : `Поставьте точку ${currentPointIndex + 1}: ${POINT_HINTS[currentPointIndex]?.name ?? ""}`;

  const normData = getNormForAge(ageMonths, gender);
  let ageLabel = "при рождении";
  if (ageMonths >= 24) ageLabel = "2 года";
  else if (ageMonths >= 18) ageLabel = "18 мес.";
  else if (ageMonths >= 12) ageLabel = "1 год";
  else if (ageMonths >= 1) ageLabel = `${ageMonths} мес.`;
  const genderLabel = gender === "male" ? "мальчики" : "девочки";
  const normLabel = `Норма (${ageLabel}, ${genderLabel}): ${normData.norm.toFixed(1)}° ± ${normData.range}°`;

  return {
    mode,
    points,
    currentPointIndex,
    image,
    ageMonths,
    gender,
    result,
    canvasRef,
    nextHint,
    normLabel,
    handleImageLoad,
    handleCanvasClick,
    handleReset,
    setAgeMonths: handleSetAge,
    setGender: handleSetGender,
  };
}