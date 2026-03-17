/**
 * @file pages/AnalysisPage.tsx
 * @description Страница анализатора по маршруту /analysis.
 * Тонкая обёртка для роутера — никакой логики здесь нет.
 */
import { XRayAnalyzer } from "@/features/analyzer/view/XRayAnalyzer";

export default function AnalysisPage() {
  return <XRayAnalyzer />;
}
