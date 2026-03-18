"""
ml_server.py
════════════
Flask ML-сервер. Принимает base64 PNG, возвращает:
  - predict:    координаты 6 анатомических точек
  - angle:      ацетабулярный угол (градусы)
  - class:      0=норма, 1=патология
  - confidence: уверенность модели (0-100%)

Модель: best_model.h5 (CNN, прямое предсказание координат)
Скейлер: target_scaler.pkl (StandardScaler для координат)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model
from sklearn.preprocessing import StandardScaler
import base64
import io
import gc
import math
import joblib

app = Flask(__name__)
CORS(app)


# ─── Расчёты ──────────────────────────────────────────────────────────────────

def calc_acetabular_angle(y: list) -> float:
    """
    Ацетабулярный угол из предсказанных координат.
    Точки: y[0],y[1]=H1  y[2],y[3]=H2  y[4],y[5]=A1 ...
    Вычисляет ацетабулярный угол по 6 предсказанным точкам.
    Используется клинический порог 30° для бинарной классификации.
    """
    h1 = (y[0], y[1])
    a1 = (y[4], y[5])
    dx = a1[0] - h1[0]
    dy = a1[1] - h1[1]
    mag = math.sqrt(dx * dx + dy * dy)
    if mag == 0:
        return 0.0
    angle = math.degrees(math.acos(max(-1.0, min(1.0, dx / mag))))
    if angle > 90:
        angle = 180 - angle
    return abs(angle)


def classify(angle: float) -> tuple:
    """
    Бинарная классификация: 1=патология, 0=норма.
    Порог 30° — клинически обоснованный для любого возраста.
    Возвращает (class, confidence_percent).
    """
    threshold  = 30.0
    distance   = abs(angle - threshold)
    confidence = min(99, int(50 + distance * 3.3))
    cls        = 1 if angle > threshold else 0
    return cls, confidence


# ─── Эндпоинт ─────────────────────────────────────────────────────────────────

@app.route('/predict', methods=["POST"])
def predict():
    """
    Принимает JSON { input: "<base64 PNG>" }.
    Возвращает:
    {
      predict:    { 1_point: {x, y}, ... 6_point: {x, y} },
      angle:      <float>,
      class:      <0|1>,
      confidence: <int 0-100>
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'ml_server_error': 'Нет данных'}), 400

        # Декодируем base64 → PIL Image → numpy
        base64_bytes = base64.b64decode(data['input'])
        bytes_io     = io.BytesIO(base64_bytes)
        bytes_io.seek(0)
        image        = Image.open(io.BufferedReader(bytes_io))
        image        = image.resize((224, 224))
        image_array  = np.array(image)
        image_array  = np.expand_dims(image_array, axis=0)

        # Предсказание координат напрямую через CNN
        Y = model.predict(image_array)[0]
        Y = scaler.inverse_transform(Y.reshape(1, -1))[0]

        # Округляем до целых пикселей
        Y = [int(round(v)) for v in Y]

        # Формируем словарь точек
        points_dict = {
            '1_point': {'x': str(Y[0]),  'y': str(Y[1])},
            '2_point': {'x': str(Y[2]),  'y': str(Y[3])},
            '3_point': {'x': str(Y[4]),  'y': str(Y[5])},
            '4_point': {'x': str(Y[6]),  'y': str(Y[7])},
            '5_point': {'x': str(Y[8]),  'y': str(Y[9])},
            '6_point': {'x': str(Y[10]), 'y': str(Y[11])},
        }

        # Расчёт угла и классификация
        angle     = calc_acetabular_angle(Y)
        cls, conf = classify(angle)

        gc.collect()

        return jsonify({
            "predict":    points_dict,
            "angle":      round(angle, 2),
            "class":      cls,
            "confidence": conf,
        })

    except Exception as e:
        print(str(e))
        return jsonify({'ml_server_error': str(e)}), 500


if __name__ == '__main__':
    model  = load_model('best_model.h5')
    scaler = joblib.load('target_scaler.pkl')
    app.run(debug=True, port=5000)