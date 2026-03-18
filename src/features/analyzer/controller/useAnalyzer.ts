/**
 * @file features/analyzer/controller/useAnalyzer.ts
 * @layer Controller
 * @description Хук управления состоянием анализатора (MVC Controller).
 *
 * Единственное место где живёт состояние анализатора.
 * Получает события от View → вызывает Model/Services → возвращает новое состояние.
 * View-компоненты не содержат никакой логики — только отображение.
 *
 * Поток данных:
 *   View event → useAnalyzer → Model (hipAnalysis) → новый result
 *                            → Service (canvasDraw) → перерисовка canvas
 *                            → Service (mlApi)      → AI-точки
 */

import { useState, useRef, useCallback } from "react";
import { runAnalysis, getNormForAge } from "../model/hipAnalysis";
import { drawScene, drawPlaceholder } from "@/services/canvasDraw";
import { sendToMLBackend } from "@/services/mlApi";
import type { Point, Gender, AnalysisResult, AppMode, AIStatus } from "@/types";
import { REQUIRED_POINTS, DEFAULT_PIXEL_TO_MM, POINT_META } from "@/constants";

// ─── Публичный интерфейс ──────────────────────────────────────────────────────

export interface AnalyzerController {
  // Состояние
  mode: AppMode;
  points: (Point | undefined)[];
  currentPointIndex: number;
  image: HTMLImageElement | null;
  imageFile: File | null;
  ageMonths: number;
  gender: Gender;
  result: AnalysisResult | null;
  pixelSize: { x: number; y: number } | null;
  aiStatus: AIStatus;
  aiError: string | null;

  // Ссылка на canvas (передаётся напрямую в <canvas ref={canvasRef}>)
  canvasRef: React.RefObject<HTMLCanvasElement>;

  // Производные строки для UI (вычисляются здесь, не в компоненте)
  nextHint: string;
  normLabel: string;

  // Обработчики событий
  handleImageLoad:  (file: File) => void;
  handleCanvasClick:(e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleReset:      () => void;
  handleAIPredict: () => Promise<{ result: AnalysisResult; points: Point[] } | null>;
  setAgeMonths:     (v: number) => void;
  setGender:        (v: Gender) => void;
}

// ─── Хук ──────────────────────────────────────────────────────────────────────

export function useAnalyzer(): AnalyzerController {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode,               setMode]               = useState<AppMode>("waiting");
  const [points,             setPoints]             = useState<(Point | undefined)[]>([]);
  const [currentPointIndex,  setCurrentPointIndex]  = useState(0);
  const [image,              setImage]              = useState<HTMLImageElement | null>(null);
  const [imageFile,          setImageFile]          = useState<File | null>(null);
  const [ageMonths,          setAgeMonthsState]     = useState(0);
  const [gender,             setGenderState]        = useState<Gender>("male");
  const [result,             setResult]             = useState<AnalysisResult | null>(null);
  const [pixelSize,          setPixelSize]          = useState<{ x: number; y: number } | null>(null);
  const [aiStatus,           setAiStatus]           = useState<AIStatus>("idle");
  const [aiError,            setAiError]            = useState<string | null>(null);

  /** Перерисовывает canvas — вызывается при любом изменении точек */
  const redraw = useCallback((pts: (Point | undefined)[], img: HTMLImageElement | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    img ? drawScene(canvas, img, pts) : drawPlaceholder(canvas);
  }, []);

  /**
   * Загружает img из DataURL или base64.
   * Если переданы aiPoints — сразу переходим в completed.
   */
  const applyImage = useCallback(
    (src: string, aiPoints?: Point[]) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = img.width; canvas.height = img.height; }
        setImage(img);

        if (aiPoints?.length === REQUIRED_POINTS) {
          setPoints(aiPoints);
          setCurrentPointIndex(REQUIRED_POINTS);
          setMode("completed");
          // callback-форма чтобы читать актуальный ageMonths/gender без deps
          setAgeMonthsState((age) => {
            setGenderState((g) => {
              const pm = pixelSize ? Math.min(pixelSize.x, pixelSize.y) : DEFAULT_PIXEL_TO_MM;
              setResult(runAnalysis(aiPoints, age, g, pm));
              return g;
            });
            return age;
          });
          if (canvas) drawScene(canvas, img, aiPoints);
        } else {
          setPoints([]);
          setCurrentPointIndex(0);
          setMode("placing");
          setResult(null);
          if (canvas) drawScene(canvas, img, []);
        }
      };
      img.src = src;
    },
    [pixelSize]
  );

  /** Загружает новый файл — унифицировано для DICOM и обычных изображений */
  const handleImageLoad = useCallback((file: File) => {
    setImageFile(file);
    setAiStatus("idle");
    setAiError(null);
    setPixelSize(null);

    setAiStatus("loading");

    sendToMLBackend(file)
      .then((data) => {
        if (data.pixelSizeX && data.pixelSizeY) {
          setPixelSize({ x: data.pixelSizeX, y: data.pixelSizeY });
        }

        // Используем base64 PNG, который пришёл с сервера
        applyImage(`data:image/png;base64,${data.imageBase64}`);

        setAiStatus("idle");
      })
      .catch((err) => {
        setAiStatus("error");
        setAiError(err instanceof Error ? err.message : "Неизвестная ошибка");
        console.error("handleImageLoad error:", err);
      });
  }, [applyImage]);

  /** Клик по canvas: добавляет точку, при 6-й запускает расчёт */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "placing" || currentPointIndex >= REQUIRED_POINTS) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvas.width,  Math.round((e.clientX - rect.left) * canvas.width  / rect.width)));
      const y = Math.max(0, Math.min(canvas.height, Math.round((e.clientY - rect.top)  * canvas.height / rect.height)));

      const next = [...points];
      next[currentPointIndex] = [x, y];
      setPoints(next);
      redraw(next, image);

      const idx = currentPointIndex + 1;
      setCurrentPointIndex(idx);

      if (idx === REQUIRED_POINTS) {
        setMode("completed");
        const pm = pixelSize ? Math.min(pixelSize.x, pixelSize.y) : DEFAULT_PIXEL_TO_MM;
        setResult(runAnalysis(next, ageMonths, gender, pm));
      }
    },
    [mode, currentPointIndex, points, image, ageMonths, gender, pixelSize, redraw]
  );

  /** Сбрасывает точки и результат */
  const handleReset = useCallback(() => {
    setPoints([]);
    setCurrentPointIndex(0);
    setMode(image ? "placing" : "waiting");
    setResult(null);
    setAiStatus("idle");
    setAiError(null);
    redraw([], image);
  }, [image, redraw]);

  /** Запрос к ML-бэкенду, автоматическая расстановка точек */
    const handleAIPredict = useCallback(async (): Promise<{ result: AnalysisResult; points: Point[] } | null> => {

    if (!imageFile) return null;
    setAiStatus("loading");
    setAiError(null);
    try {
      const { points: aiPts, imageBase64, pixelSizeX, pixelSizeY } =
        await sendToMLBackend(imageFile);

      const pm = pixelSizeX && pixelSizeY
        ? Math.min(pixelSizeX, pixelSizeY)
        : DEFAULT_PIXEL_TO_MM;

      if (pixelSizeX && pixelSizeY) setPixelSize({ x: pixelSizeX, y: pixelSizeY });

      applyImage(`data:image/png;base64,${imageBase64}`, aiPts);

      // Считаем результат здесь же и возвращаем — не ждём обновления state
      const analysisResult = runAnalysis(aiPts, ageMonths, gender, pm);
      setAiStatus("success");
      return { result: analysisResult, points: aiPts };
    } catch (err) {
      setAiStatus("error");
      setAiError(err instanceof Error ? err.message : "Неизвестная ошибка");
      return null;
    }
  }, [imageFile, applyImage, ageMonths, gender]);

  /** Обновляет возраст и пересчитывает диагноз если анализ уже выполнен */
  const setAgeMonths = useCallback((v: number) => {
    setAgeMonthsState(v);
    if (mode === "completed" && points.length === REQUIRED_POINTS) {
      const pm = pixelSize ? Math.min(pixelSize.x, pixelSize.y) : DEFAULT_PIXEL_TO_MM;
      setResult(runAnalysis(points, v, gender, pm));
    }
  }, [mode, points, gender, pixelSize]);

  /** Обновляет пол и пересчитывает диагноз */
  const setGender = useCallback((v: Gender) => {
    setGenderState(v);
    if (mode === "completed" && points.length === REQUIRED_POINTS) {
      const pm = pixelSize ? Math.min(pixelSize.x, pixelSize.y) : DEFAULT_PIXEL_TO_MM;
      setResult(runAnalysis(points, ageMonths, v, pm));
    }
  }, [mode, points, ageMonths, pixelSize]);

  // ── Производные строки (вычисляются здесь, не в JSX) ──────────────────────

  const nextHint =
    mode === "waiting"   ? "Загрузите снимок чтобы начать" :
    mode === "completed" ? "Расчёт завершён — можно скорректировать точки вручную" :
    `Точка ${currentPointIndex + 1}: ${POINT_META[currentPointIndex]?.name ?? ""}`;

  const { norm, range } = getNormForAge(ageMonths, gender);
  const ageLabel =
    ageMonths >= 24 ? "2 года" : ageMonths >= 18 ? "18 мес." :
    ageMonths >= 12 ? "1 год"  : ageMonths >= 1  ? `${ageMonths} мес.` : "при рождении";
  const normLabel = `Норма (${ageLabel}, ${gender === "male" ? "мальчики" : "девочки"}): ${norm.toFixed(1)}° ± ${range}°`;

  return {
    mode, points, currentPointIndex, image, imageFile,
    ageMonths, gender, result, pixelSize,
    aiStatus, aiError, canvasRef, nextHint, normLabel,
    handleImageLoad, handleCanvasClick, handleReset, handleAIPredict,
    setAgeMonths, setGender,
  };
}