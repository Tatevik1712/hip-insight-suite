# Архитектура HipDx AI

## Принцип проектирования

Система спроектирована как **расширяемая платформа** — новый модуль анализа (другая анатомическая зона, другая патология) добавляется без изменения существующего кода.

Архитектурный паттерн: **Feature-Sliced Design** + **MVC** внутри каждой фичи.

---

## Структура проекта

```
hip-insight-suite/
│
├── src/
│   ├── types/               # Все TypeScript-типы — единственный источник правды
│   ├── constants/           # Константы: нормы, цвета, URL, лимиты
│   ├── services/            # Сервисы: HTTP-клиенты, Canvas API
│   │   ├── mlApi.ts         # Запросы к ML-бэкенду
│   │   ├── canvasDraw.ts    # Отрисовка аннотаций
│   │   └── analysisRepository.ts  # Сохранение в PostgreSQL
│   │
│   ├── features/            # Бизнес-фичи (MVC внутри каждой)
│   │   ├── analyzer/        # Анализ рентгеновских снимков
│   │   │   ├── model/       # Чистые функции расчётов
│   │   │   ├── controller/  # React-хук (состояние + логика)
│   │   │   └── view/        # React-компоненты (только UI)
│   │   └── viewer/          # Просмотрщик снимков
│   │       ├── model/       # Конфигурация (точки оверлея, лимиты зума)
│   │       ├── controller/  # Хук зума и панорамирования
│   │       └── view/        # DicomViewer компонент
│   │
│   ├── shared/              # Переиспользуемые компоненты без логики
│   │   └── components/      # ModeToggle, StudentPanel
│   │
│   └── pages/               # Тонкие обёртки для React Router
│
├── ML/
│   ├── ml_server.py         # Flask: нейросеть (порт 5000)
│   ├── batch_predict.py     # Скрипт для тестовой выборки
│   ├── best_forest.pkl      # Обученная модель RandomForest
│   ├── pooler.h5            # CNN-экстрактор признаков
│   └── scaler_y.pkl         # Нормализатор координат
│
└── Back/
    ├── dicom_to_png.py      # Flask: точка входа (порт 5001)
    ├── schema.sql           # Схема PostgreSQL
    └── uploads/             # Сохранённые снимки
```

---

## MVC внутри фичи `analyzer`

```
┌─────────────────────────────────────────────────────────────┐
│                        View                                  │
│  XRayAnalyzer.tsx — рендер, передача событий в Controller   │
│  ResultsPanel.tsx — отображение результатов                 │
│  PointProgress.tsx — индикатор расстановки точек            │
└────────────────────────┬────────────────────────────────────┘
                         │ события (клик, файл, кнопка)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Controller                              │
│  useAnalyzer.ts — единственное место состояния              │
│  · handleImageLoad   → FileReader → loadImageFromSrc        │
│  · handleCanvasClick → добавить точку → если 6 → runAnalysis│
│  · handleAIPredict   → sendToMLBackend → applyImage         │
│  · setAgeMonths/Gender → пересчёт если completed           │
└──────────┬──────────────────────┬──────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌─────────────────────────────────────┐
│      Model       │   │             Services                 │
│ hipAnalysis.ts   │   │  canvasDraw.ts — Canvas API          │
│                  │   │  mlApi.ts      — HTTP к Flask        │
│ · calcAngle()    │   │  analysisRepository.ts — PostgreSQL  │
│ · calcHDistance()│   └─────────────────────────────────────┘
│ · determineDyspl.│
│ · runAnalysis()  │
└──────────────────┘
```

---

## Поток данных

### Ручной режим
```
Клик по canvas
  → useAnalyzer.handleCanvasClick()
  → points[i] = [x, y]
  → canvasDraw.drawScene()        // перерисовка
  → если 6 точек: runAnalysis()   // расчёт
  → setResult()
  → ResultsPanel рендерит результат
```

### AI-режим
```
Кнопка "Определить точки"
  → useAnalyzer.handleAIPredict()
  → mlApi.sendToMLBackend(file)
  → POST http://127.0.0.1:5001/predict
      → dicom_to_png.py конвертирует DICOM если нужно
      → POST http://127.0.0.1:5000/predict
          → CNN (pooler.h5) извлекает признаки
          → RandomForest предсказывает 6 точек
          → calc_angle() + classify() → class + confidence
      → возвращает { predict, angle, class, confidence }
  → runAnalysis(aiPoints)         // расчёт углов и дистанций
  → canvasDraw.drawScene()        // отрисовка
  → saveAnalysis() → PostgreSQL   // сохранение
```

---

## Как добавить новый модуль анализа

Например, для анализа **позвоночника** или **коленного сустава**.

### Шаг 1 — Новая фича (фронтенд)

```bash
mkdir -p src/features/spine/{model,controller,view}
```

Создай три файла по аналогии с `analyzer`:

```
src/features/spine/
├── model/spineAnalysis.ts     # чистые функции расчётов для позвоночника
├── controller/useSpine.ts     # хук состояния
└── view/SpineAnalyzer.tsx     # UI компонент
```

В `model/spineAnalysis.ts` реализуй только функции расчётов специфичные для позвоночника. Общие сервисы (`canvasDraw`, `mlApi`) переиспользуются без изменений.

### Шаг 2 — ML-модель (бэкенд)

В `ML/ml_server.py` добавь новый эндпоинт:

```python
@app.route('/predict/spine', methods=["POST"])
def predict_spine():
    # загрузи свою модель и верни координаты точек
    pass
```

В `constants/index.ts` добавь URL нового эндпоинта:

```ts
export const ML_SPINE_URL = "http://127.0.0.1:5000/predict/spine";
```

### Шаг 3 — Страница и роут

```tsx
// src/pages/SpinePage.tsx
import { SpineAnalyzer } from "@/features/spine/view/SpineAnalyzer";
export default function SpinePage() { return <SpineAnalyzer />; }
```

```tsx
// src/App.tsx
<Route path="/spine" element={<SpinePage />} />
```

**Что НЕ нужно менять:** ядро приложения (`types`, `services`, `shared`, роутер) остаётся нетронутым.

---

## Разделение ответственности

| Слой | Файлы | Правило |
|------|-------|---------|
| **Model** | `*/model/*.ts` | Только чистые функции. Нет React, нет fetch, нет DOM |
| **Controller** | `*/controller/use*.ts` | Только состояние и логика. Нет JSX |
| **View** | `*/view/*.tsx` | Только рендер. Нет вычислений, нет fetch |
| **Service** | `services/*.ts` | Изолированная работа с внешним миром |
| **Constants** | `constants/index.ts` | Нет магических чисел в коде |
| **Types** | `types/index.ts` | Единственный источник типов |