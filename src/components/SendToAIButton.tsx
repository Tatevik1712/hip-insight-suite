import { useRef, useCallback } from "react";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ImageFilters } from "@/components/ImageAdjustments";

interface SendToAIButtonProps {
  imageSrc: string;
  filters: ImageFilters;
  loading: boolean;
  onSend: (processedDataUrl: string) => void;
}

/**
 * Renders the current image with CSS filters baked into a canvas,
 * then exports it as a data URL for the AI model.
 */
const SendToAIButton = ({ imageSrc, filters, loading, onSend }: SendToAIButtonProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSend = useCallback(async () => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
      });

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context недоступен");

      // Apply filters via canvas
      ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) ${filters.invert ? "invert(1)" : ""}`;
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL("image/png");
      onSend(dataUrl);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    }
  }, [imageSrc, filters, onSend, toast]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <Button
        onClick={handleSend}
        disabled={loading}
        size="sm"
        className="w-full text-xs medical-gradient border-0 text-primary-foreground hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
        ) : (
          <Brain className="w-3.5 h-3.5 mr-1.5" />
        )}
        {loading ? "Анализ..." : "Отправить в ИИ"}
      </Button>
    </>
  );
};

export default SendToAIButton;
