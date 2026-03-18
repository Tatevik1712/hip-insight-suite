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

## Как добавить новую анатомическую зону (пример: колено)

Проект построен по Feature-Sliced Design и позволяет относительно легко расширять набор анализируемых суставов.  
Ниже — полный пошаговый чек-лист на примере добавления **анализа коленного сустава** (`knee`).

### 1. Подготовка (Backend)

1. **Добавить поддержку новой зоны в `dicom_to_png.py`**  
   - В эндпоинте `/predict` добавить логику определения зоны (по названию файла, префиксу или отдельному полю).
   - При необходимости добавить новый маршрут `/predict_knee`.

2. **Обучить/добавить модель для колена**  
   - Поместить новую модель в папку `ML/models/` (например, `knee_pooler.h5`).
   - Обновить `ml_server.py`:
     ```python
     if zone == "knee":
         model = load_model("models/knee_pooler.h5")
         # ... логика предсказания точек для колена

Расширить эндпоинт /save (если нужны специфические поля)
Добавить новые колонки в таблицу xray_analyses (например, tibial_slope, mechanical_axis и т.д.).

Обновить data.csv (для эталонных точек в режиме обучения)
Добавить новые строки с разметкой для коленных снимков.



### 2. Frontend — Feature-Sliced структура

1. **Создать новую feature (рекомендуется)**
```
src/features/knee-analyzer/
├── model/
├── controller/
├── view/
└── index.ts
```
2. **Обновить типы (src/types/index.ts)**
```
export type AnatomicalZone = "hip" | "knee" | "shoulder";   // добавить "knee"
export interface KneeAnalysisResult {
  tibialSlope: number;
  mechanicalAxisDeviation: number;
  // ...
}
```
3. **Создать/расширить хук-контроллер**
   - useKneeAnalyzer.ts (по аналогии с useAnalyzer.ts)
   - Добавить поддержку новой зоны в useAnalyzer.ts (если хочешь unified хук) или сделать отдельный.

4. **Обновить Canvas-логику (src/services/canvasDraw.ts)**
   - Добавить функцию drawKneeScene() с нужными линиями и углами для колена.

5. **Создать компоненты представления**
   - KneeAnalyzer.tsx
   - KneeResultsPanel.tsx
   - KneePointProgress.tsx (если нужна другая последовательность точек)



### 3. Интеграция в приложение

1. **Обновить роутинг (App.tsx или pages/)**
```
<Route path="/knee" element={<KneeAnalyzer />} />
```
2. **Добавить переключатель зоны (если хочешь unified интерфейс)**
```tsxconst zones = [
  { value: "hip", label: "Тазобедренный сустав" },
  { value: "knee", label: "Коленный сустав" },
];
```
3. **Обновить константы**
   - src/constants/index.ts → добавить KNEE_POINT_KEYS, KNEE_COLORS, REQUIRED_KNEE_POINTS и т.д.

4. **Обновить сохранение**
    - Расширить studentRepository.ts и analysisRepository.ts для поддержки новой зоны.