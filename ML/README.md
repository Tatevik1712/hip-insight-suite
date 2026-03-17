# ML-модуль HipDx AI

Модуль машинного обучения для автоматического анализа рентгеновских снимков тазобедренного сустава.

---

## Архитектура модели

Двухэтапный pipeline:

```
PNG/JPG снимок (224×224)
        │
        ▼
┌───────────────────────┐
│   CNN Pooler          │  pooler.h5
│   (feature extractor) │  Извлекает признаки из изображения
│   → вектор признаков  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│   Random Forest       │  best_forest.pkl
│   Регрессор           │  Предсказывает 12 координат (6 точек × x,y)
│   → [x1,y1,...,x6,y6] │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│   Постобработка       │  ml_server.py
│   · calc_angle()      │  Ацетабулярный угол
│   · classify()        │  Патология / норма + уверенность
└───────────────────────┘
```

---

## Файлы

| Файл | Описание |
|------|----------|
| `ml_server.py` | Flask-сервер (порт 5000). Принимает base64, возвращает точки + классификацию |
| `batch_predict.py` | Batch-скрипт для тестовой выборки. Генерирует CSV и скриншоты |
| `best_forest.pkl` | Обученный RandomForestRegressor (scikit-learn) |
| `pooler.h5` | CNN feature extractor (Keras/TensorFlow) |
| `scaler_y.pkl` | StandardScaler для нормализации координат |

---

## API

### `POST /predict`

Принимает:
```json
{ "input": "<base64 PNG 224×224>" }
```

Возвращает:
```json
{
  "predict": {
    "1_point": {"x": "112", "y": "98"},
    "2_point": {"x": "134", "y": "97"},
    "3_point": {"x": "89",  "y": "78"},
    "4_point": {"x": "156", "y": "79"},
    "5_point": {"x": "95",  "y": "118"},
    "6_point": {"x": "148", "y": "117"}
  },
  "angle":      28.5,
  "class":      1,
  "confidence": 87
}
```

**Поля ответа:**

| Поле | Тип | Описание |
|------|-----|----------|
| `predict` | object | Координаты 6 анатомических точек в пикселях (224×224) |
| `angle` | float | Ацетабулярный угол, градусы |
| `class` | 0\|1 | 0 = норма, 1 = патология |
| `confidence` | int | Уверенность модели, % |

**Порядок точек:**

| Ключ | Анатомия |
|------|----------|
| `1_point` | Хильгенрейнер левый (H₁) |
| `2_point` | Хильгенрейнер правый (H₂) |
| `3_point` | Крышка впадины левая (A₁) |
| `4_point` | Крышка впадины правая (A₂) |
| `5_point` | Шейка бедра левая (N₁) |
| `6_point` | Шейка бедра правая (N₂) |

---

## Классификация

Бинарный классификатор основан на клиническом пороге:

```python
def classify(angle: float) -> tuple[int, int]:
    threshold  = 30.0          # клинически обоснованный порог
    distance   = abs(angle - threshold)
    confidence = min(99, int(50 + distance * 3.3))
    return (1 if angle > threshold else 0), confidence
```

- **Угол ≤ 30°** → класс 0 (норма)
- **Угол > 30°** → класс 1 (патология)
- **Уверенность** растёт с удалением от порога: 50% на границе → 99% при отклонении > 15°

---

## Batch-скрипт для тестовой выборки

```bash
# Оба сервера должны быть запущены
python3 batch_predict.py \
  --input /path/to/test_images \
  --output ./output
```

**Результат:**

```
output/
├── results.csv          # id,class — файл для сдачи на хакатоне
└── screenshots/
    ├── 1OGQ64.jpg       # снимок с аннотациями
    ├── 28v1xk.jpg
    └── ...
```

**Формат CSV:**
```
id,class
1OGQ64,1
28v1xk,0
71dphp,1
```

---

## Запуск

```bash
cd ML
python3 ml_server.py
# → http://127.0.0.1:5000
```

**Зависимости:**
```bash
pip install flask tensorflow scikit-learn joblib numpy pillow
```

---

## Расширение модуля

Для добавления новой анатомической зоны:

1. Добавь новый эндпоинт в `ml_server.py`:
```python
@app.route('/predict/spine', methods=["POST"])
def predict_spine():
    # своя логика для позвоночника
    pass
```

2. Загружай свои модели при старте сервера:
```python
spine_model = joblib.load('spine_forest.pkl')
```

3. Основной pipeline (base64 → numpy → predict → JSON) переиспользуется без изменений.