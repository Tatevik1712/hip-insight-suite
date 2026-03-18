/**
 * @file features/viewer/controller/useViewer.ts
 * @layer Controller
 * @description Хук управления состоянием просмотрщика снимков.
 *
 * Инкапсулирует логику зума, панорамирования и колёсика мыши.
 * DicomViewer-компонент не содержит этой логики — только вызывает хук.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_WHEEL_STEP } from "../model/viewerConfig";

export interface ViewerController {
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  handleZoomIn:    () => void;
  handleZoomOut:   () => void;
  handleReset:     () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp:   () => void;
}

export function useViewer(): ViewerController {
  const [zoom, setZoom]           = useState(1);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPos    = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn  = useCallback(() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleReset   = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Все обработчики мыши — нативные, чтобы не терять события при ре-рендере
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setIsPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!lastPos.current) return;
      e.preventDefault();
      setPan(p => ({
        x: p.x + (e.clientX - lastPos.current.x),
        y: p.y + (e.clientY - lastPos.current.y),
      }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => setIsPanning(false);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(Math.max(
        z + (e.deltaY > 0 ? -ZOOM_WHEEL_STEP : ZOOM_WHEEL_STEP),
        ZOOM_MIN), ZOOM_MAX));
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup",   onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("wheel",     onWheel, { passive: false });

    return () => {
      el.removeEventListener("mousedown",  onMouseDown);
      el.removeEventListener("mousemove",  onMouseMove);
      el.removeEventListener("mouseup",    onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("wheel",      onWheel);
    };
  }, []); // пустой массив — вешаем один раз

  return { zoom, pan, isPanning, containerRef,
           handleZoomIn, handleZoomOut, handleReset,
           // React-обработчики больше не нужны — оставляем для совместимости
           handleMouseDown: () => {},
           handleMouseMove: () => {},
           handleMouseUp:   () => {},
  };
}