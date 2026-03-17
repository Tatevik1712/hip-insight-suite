# Hip Insight — Интеграция анализатора дисплазии

## Файлы для добавления в проект

```
src/
├── utils/
│   ├── hipAnalysis.ts      ← все расчёты (углы, нормы, дистанции)
│   └── canvasDraw.ts       ← отрисовка точек и линий на canvas
├── hooks/
│   └── useHipAnalysis.ts   ← React-хук, вся логика состояния
├── components/
│   ├── XRayAnalyzer.tsx    ← главный компонент страницы
│   ├── ResultsPanel.tsx    ← панель результатов
│   └── PointProgress.tsx   ← индикатор прогресса точек
└── pages/
    └── AnalysisPage.tsx    ← страница-обёртка
```

## Шаг 1: Скопируй файлы

Скопируй все файлы в соответствующие папки твоего `src/`.

## Шаг 2: Шрифт IBM Plex Mono

В `index.html` добавь в `<head>`:

```html
<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

## Шаг 3: Подключи в роутер

Если у тебя React Router:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AnalysisPage from "./pages/AnalysisPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Твои существующие роуты */}
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Или без роутера просто добавь в `App.tsx`:

```tsx
import XRayAnalyzer from "./components/XRayAnalyzer";

export default function App() {
  return <XRayAnalyzer />;
}
```

## Шаг 4: Tailwind — убедись что animate-in работает

В `tailwind.config.ts` должен быть плагин `tailwindcss-animate`:

```ts
import animate from "tailwindcss-animate";

export default {
  plugins: [animate],
};
```

Если его нет:

```bash
npm install tailwindcss-animate
```

## Как работает логика

1. **`hipAnalysis.ts`** — чистые функции, без React:
   - `calcAcetabularAngle(points)` — ацетабулярный угол
   - `calcHDistance(points)` — дистанции h и d по Хильгенрейнеру
   - `checkPerkinsPosition(points)` — позиция по Перкину
   - `determineDysplasia(angle, h, d)` — степень дисплазии
   - `getNormForAge(months, gender)` — возрастная норма

2. **`canvasDraw.ts`** — функции рисования на `<canvas>`:
   - `drawScene(canvas, image, points)` — полная отрисовка
   - `drawPlaceholder(canvas)` — заглушка без снимка

3. **`useHipAnalysis.ts`** — хук:
   - Держит состояние (точки, режим, результат)
   - Обрабатывает клики на canvas
   - Автоматически пересчитывает при смене возраста/пола

4. **`XRayAnalyzer.tsx`** — UI:
   - Загрузка файла
   - Canvas с crosshair при расстановке точек
   - Боковая панель результатов
   - Темная клиническая тема