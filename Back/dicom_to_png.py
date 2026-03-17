from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import pydicom
import numpy as np
from PIL import Image
import io
import os
import base64
import requests
import psycopg2
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ─── Подключение к PostgreSQL ─────────────────────────────────────────────────

DB_CONFIG = {
    "dbname":   "hipdx",
    "user":     os.getenv("DB_USER",     "tatev"),   # замени на своё имя пользователя
    "password": os.getenv("DB_PASSWORD", ""),
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     os.getenv("DB_PORT",     "5432"),
}

def get_db():
    """Возвращает соединение с PostgreSQL."""
    return psycopg2.connect(**DB_CONFIG)


# ─── Конвертация DICOM → PNG ──────────────────────────────────────────────────

def dicom_to_png(dicom_data):
    """Конвертирует DICOM файл в base64 PNG + возвращает размер пикселя."""
    ds = pydicom.dcmread(io.BytesIO(dicom_data))
    pixel_array = ds.pixel_array

    if pixel_array.dtype != np.uint8:
        pixel_array = ((pixel_array - pixel_array.min()) /
                       (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)

    pixel_array = np.stack([pixel_array] * 3, axis=-1)

    if len(pixel_array.shape) == 2:
        image = Image.fromarray(pixel_array, mode='L')
    elif len(pixel_array.shape) == 3:
        image = Image.fromarray(pixel_array)
    else:
        raise ValueError("Неподдерживаемый формат DICOM")

    print('dicom')
    png_buffer = io.BytesIO()
    image.save(png_buffer, format='PNG')
    png_buffer.seek(0)
    image_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')
    pixel_size = ds.PixelSpacing

    return {
        'image': image_base64,
        'image_type': 'png',
        'pixel_size_x': pixel_size[0],
        'pixel_size_y': pixel_size[1],
    }


def imageto_base64(image_file):
    """Конвертирует PNG/JPG в base64."""
    try:
        data = io.BytesIO(image_file)
        image = Image.open(data)
        image = image.convert("RGB")
        print('image')
        png_buffer = io.BytesIO()
        image.save(png_buffer, format='PNG')
        png_buffer.seek(0)
        image_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')
        return {'image': image_base64}
    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500


def make_predict(data):
    """Отправляет изображение в ML-сервер, получает координаты точек."""
    try:
        request_data = {'input': data['image']}
        response = requests.post(ml_server_url, json=request_data)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": "Ошибка от сервера нейросети"}
    except requests.exceptions.ConnectionError:
        return {"error": "Не удалось подключиться к серверу нейросети. Убедитесь, что он запущен."}


# ─── Эндпоинты ────────────────────────────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def main_point():
    """Принимает снимок, конвертирует, запускает ML, возвращает результат."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Файл не выбран'}), 400

        file_data = file.read()
        ext = os.path.splitext(file.filename)[1].lower()

        if ext in ['.png', '.jpg', '.jpeg']:
            result = imageto_base64(file_data)
        else:
            result = dicom_to_png(file_data)

        result.update(make_predict(result))
        return jsonify(result)

    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/save', methods=['POST'])
def save_analysis():
    """
    Сохраняет данные пациента и результаты анализа в PostgreSQL.

    Принимает JSON:
    {
        patient_id, full_name, birth_date, doctor, diagnosis, notes,
        file_name, age_months, gender,
        angle, distance_h, distance_d, perkins, dysplasia_level, dysplasia_stage
    }

    Возвращает: { success: true, id: <int> }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных'}), 400

        conn = get_db()
        cur  = conn.cursor()

        cur.execute("""
            INSERT INTO xray_analyses (
                patient_id, full_name, birth_date, doctor,
                diagnosis, notes, file_name,
                age_months, gender,
                angle, distance_h, distance_d,
                perkins, dysplasia_level, dysplasia_stage
            ) VALUES (
                %(patient_id)s, %(full_name)s, %(birth_date)s, %(doctor)s,
                %(diagnosis)s, %(notes)s, %(file_name)s,
                %(age_months)s, %(gender)s,
                %(angle)s, %(distance_h)s, %(distance_d)s,
                %(perkins)s, %(dysplasia_level)s, %(dysplasia_stage)s
            ) RETURNING id
        """, {
            "patient_id":      data.get("patient_id"),
            "full_name":       data.get("full_name"),
            "birth_date":      data.get("birth_date") or None,
            "doctor":          data.get("doctor"),
            "diagnosis":       data.get("diagnosis"),
            "notes":           data.get("notes"),
            "file_name":       data.get("file_name"),
            "age_months":      data.get("age_months"),
            "gender":          data.get("gender"),
            "angle":           data.get("angle"),
            "distance_h":      data.get("distance_h"),
            "distance_d":      data.get("distance_d"),
            "perkins":         data.get("perkins"),
            "dysplasia_level": data.get("dysplasia_level"),
            "dysplasia_stage": data.get("dysplasia_stage"),
        })

        record_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        print(f"[save] Запись сохранена, id: {record_id}")
        return jsonify({"success": True, "id": record_id})

    except Exception as e:
        print(f"[save] Ошибка: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analyses', methods=['GET'])
def get_analyses():
    """
    Возвращает список всех записей для галереи.
    Поддерживает фильтрацию: ?patient_id=...&diagnosis=...
    """
    try:
        patient_id = request.args.get("patient_id", "")
        diagnosis  = request.args.get("diagnosis", "")

        conn = get_db()
        cur  = conn.cursor()

        query = "SELECT * FROM xray_analyses WHERE 1=1"
        params = []

        if patient_id:
            query += " AND patient_id ILIKE %s"
            params.append(f"%{patient_id}%")
        if diagnosis:
            query += " AND diagnosis ILIKE %s"
            params.append(f"%{diagnosis}%")

        query += " ORDER BY created_at DESC"

        cur.execute(query, params)
        columns = [desc[0] for desc in cur.description]
        rows    = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for row in rows:
            record = dict(zip(columns, row))
            # Конвертируем datetime и date в строки для JSON
            for key, val in record.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
            result.append(record)

        return jsonify(result)

    except Exception as e:
        print(f"[analyses] Ошибка: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/')
def index():
    """Отдаем HTML страницу."""
    return send_file('index.html')


if __name__ == '__main__':
    ml_server_url = 'http://127.0.0.1:5000/predict'
    app.run(debug=True, port=5001)