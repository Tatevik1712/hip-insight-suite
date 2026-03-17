import { useState, useRef, useCallback } from "react";
import {
  Point,
  Gender,
  AnalysisResult,
  getNormForAge,
  runAnalysis,
} from "../utils/hipAnalysis";
import { drawScene, drawPlaceholder } from "../utils/canvasDraw";
import { sendToMLBackend } from "../utils/mlApi";

export const POINT_HINTS = [
  { name: "Хильгенрейнер — левая точка", color: "hsl(211, 100%, 50%)", label: "H₁" },
  { name: "Хильгенрейнер — правая точка", color: "hsl(211, 100%, 50%)", label: "H₂" },
  { name: "Крышка впадины — левая",        color: "hsl(174, 72%, 56%)",  label: "A₁" },
  { name: "Крышка впадины — правая",       color: "hsl(174, 72%, 56%)",  label: "A₂" },
  { name: "Шейка бедра — левая",           color: "hsl(38, 92%, 50%)",   label: "N₁" },
  { name: "Шейка бедра — правая",          color: "hsl(38, 92%, 50%)",   label: "N₂" },
] as const;

export type AppMode = "waiting" | "placing" | "completed";
export type AIStatus = "idle" | "loading" | "success" | "error";

export interface HipAnalysisState {
  mode: AppMode;
  points: (Point | undefined)[];
  currentPointIndex: number;
  image: HTMLImageElement | null;
  imageFile: File | null;
  ageMonths: number;
  gender: Gender;
  result: AnalysisResult | null;
  aiStatus: AIStatus;
  aiError: string | null;
  pixelSize: { x: number; y: number } | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  nextHint: string;
  normLabel: string;
  handleImageLoad: (file: File) => void;
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleReset: () => void;
  handleAIPredict: () => Promise<void>;
  setAgeMonths: (v: number) => void;
  setGender: (v: Gender) => void;
}

export function useHipAnalysis(): HipAnalysisState {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<AppMode>("waiting");
  const [points, setPoints] = useState<(Point | undefined)[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ageMonths, setAgeMonths] = useState(0);
  const [gender, setGender] = useState<Gender>("male");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState<{ x: number; y: number } | null>(null);

  const redraw = useCallback(
    (currentPoints: (Point | undefined)[], currentImage: HTMLImageElement | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (currentImage) drawScene(canvas, currentImage, currentPoints);
      else drawPlaceholder(canvas);
    },
    []
  );

  const loadImageFromSrc = useCallback(
    (src: string, file: File | null, existingPoints?: Point[]) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        if (existingPoints && existingPoints.length === 6) {
          // AI предсказало точки — сразу показываем результат
          setPoints(existingPoints);
          setCurrentPointIndex(6);
          setMode("completed");
          setResult(runAnalysis(existingPoints, ageMonths, gender));
          drawScene(canvas!, img, existingPoints);
        } else {
          const emptyPoints: (Point | undefined)[] = [];
          setPoints(emptyPoints);
          setCurrentPointIndex(0);
          setMode("placing");
          setResult(null);
          drawScene(canvas!, img, emptyPoints);
        }
      };
      img.src = src;
    },
    [ageMonths, gender]
  );

  const handleImageLoad = useCallback(
    (file: File) => {
      setImageFile(file);
      setAiStatus("idle");
      setAiError(null);
      setPixelSize(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        loadImageFromSrc(e.target?.result as string, file);
      };
      reader.readAsDataURL(file);
    },
    [loadImageFromSrc]
  );

  // ── AI Prediction ────────────────────────────────────────────────────────────
  const handleAIPredict = useCallback(async () => {
    if (!imageFile) return;

    setAiStatus("loading");
    setAiError(null);

    try {
      const { points: aiPoints, imageBase64, pixelSizeX, pixelSizeY } = await sendToMLBackend(imageFile);

      if (pixelSizeX && pixelSizeY) setPixelSize({ x: pixelSizeX, y: pixelSizeY });

      // Загружаем конвертированное изображение от бэкенда (особенно важно для DICOM)
      const imageSrc = `data:image/png;base64,${imageBase64}`;
      loadImageFromSrc(imageSrc, imageFile, aiPoints);

      setAiStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setAiStatus("error");
      setAiError(message);
    }
  }, [imageFile, loadImageFromSrc]);

  // ── Manual click ─────────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "placing" || currentPointIndex >= 6) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
      const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
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
        setResult(runAnalysis(newPoints, ageMonths, gender));
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
    setAiStatus("idle");
    setAiError(null);
    redraw(emptyPoints, image);
  }, [image, redraw]);

  const handleSetAge = useCallback(
    (v: number) => {
      setAgeMonths(v);
      if (mode === "completed" && points.length === 6) {
        setResult(runAnalysis(points, v, gender));
      }
    },
    [mode, points, gender]
  );

  const handleSetGender = useCallback(
    (v: Gender) => {
      setGender(v);
      if (mode === "completed" && points.length === 6) {
        setResult(runAnalysis(points, ageMonths, v));
      }
    },
    [mode, points, ageMonths]
  );

  // ── Derived UI strings ───────────────────────────────────────────────────────
  const nextHint =
    mode === "waiting"
      ? "Загрузите снимок чтобы начать"
      : mode === "completed"
      ? "Расчёт завершён — можно скорректировать точки вручную"
      : `Точка ${currentPointIndex + 1}: ${POINT_HINTS[currentPointIndex]?.name ?? ""}`;

  const normData = getNormForAge(ageMonths, gender);
  let ageLabel = "при рождении";
  if (ageMonths >= 24) ageLabel = "2 года";
  else if (ageMonths >= 18) ageLabel = "18 мес.";
  else if (ageMonths >= 12) ageLabel = "1 год";
  else if (ageMonths >= 1) ageLabel = `${ageMonths} мес.`;
  const normLabel = `Норма (${ageLabel}, ${gender === "male" ? "мальчики" : "девочки"}): ${normData.norm.toFixed(1)}° ± ${normData.range}°`;

  return {
    mode, points, currentPointIndex, image, imageFile,
    ageMonths, gender, result,
    aiStatus, aiError, pixelSize,
    canvasRef, nextHint, normLabel,
    handleImageLoad, handleCanvasClick, handleReset, handleAIPredict,
    setAgeMonths: handleSetAge,
    setGender: handleSetGender,
  };
}