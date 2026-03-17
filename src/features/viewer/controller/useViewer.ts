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
  const [zoom, setZoom]       = useState(1);
  const [pan, setPan]         = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn  = useCallback(() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleReset   = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    setPan(p => ({
      x: p.x + (e.clientX - lastPos.current.x),
      y: p.y + (e.clientY - lastPos.current.y),
    }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Колёсико мыши — нативный обработчик (passive: false нужен для preventDefault)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(Math.max(z + (e.deltaY > 0 ? -ZOOM_WHEEL_STEP : ZOOM_WHEEL_STEP), ZOOM_MIN), ZOOM_MAX));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return { zoom, pan, isPanning, containerRef, handleZoomIn, handleZoomOut, handleReset, handleMouseDown, handleMouseMove, handleMouseUp };
}
