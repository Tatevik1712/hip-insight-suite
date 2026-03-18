"""
dicom_to_png.py — основной бэкенд (порт 5001)
Отвечает за:
  • Конвертацию DICOM → PNG
  • Вызов ML-сервера
  • Сохранение результатов в PostgreSQL
  • Отдачу сохранённых изображений (/images/<filename>)
"""

from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
import pydicom
import numpy as np
from PIL import Image
import io
import os
import base64
import requests
import psycopg2
import uuid

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

DB_CONFIG = {
    "dbname":   "hipdx",
    "user":     os.getenv("DB_USER",     "tatev"),
    "password": os.getenv("DB_PASSWORD", ""),
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     os.getenv("DB_PORT",     "5432"),
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)


def dicom_to_png(dicom_data):
    ds = pydicom.dcmread(io.BytesIO(dicom_data))
    pixel_array = ds.pixel_array
    if pixel_array.dtype != np.uint8:
        pixel_array = ((pixel_array - pixel_array.min()) /
                       (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
    pixel_array = np.stack([pixel_array] * 3, axis=-1)
    image = Image.fromarray(pixel_array) if len(pixel_array.shape) == 3 else Image.fromarray(pixel_array, mode='L')
    print('dicom')
    buf = io.BytesIO()
    image.save(buf, format='PNG')
    buf.seek(0)
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    # PixelSpacing может отсутствовать — пробуем несколько тегов
    pixel_size = (
        getattr(ds, 'PixelSpacing', None) or
        getattr(ds, 'ImagerPixelSpacing', None) or
        getattr(ds, 'NominalScannedPixelSpacing', None)
    )

    result = {'image': image_base64, 'image_type': 'png'}
    if pixel_size:
        result['pixel_size_x'] = float(pixel_size[0])
        result['pixel_size_y'] = float(pixel_size[1])

    return result


def imageto_base64(image_file):
    try:
        image = Image.open(io.BytesIO(image_file)).convert("RGB")
        print('image')
        buf = io.BytesIO()
        image.save(buf, format='PNG')
        buf.seek(0)
        return {'image': base64.b64encode(buf.getvalue()).decode('utf-8')}
    except Exception as e:
        return {'error': str(e)}


def make_predict(data):
    try:
        response = requests.post(ml_server_url, json={'input': data['image']})
        return response.json() if response.status_code == 200 else {"error": "Ошибка нейросети"}
    except requests.exceptions.ConnectionError:
        return {"error": "ML-сервер недоступен"}


def save_image_to_disk(image_base64: str, original_filename: str) -> str:
    ext      = os.path.splitext(original_filename)[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    img_bytes = base64.b64decode(image_base64)
    with open(filepath, "wb") as f:
        f.write(img_bytes)
    return filename


@app.route('/predict', methods=['POST'])
def main_point():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Файл не выбран'}), 400

        file_data = file.read()
        ext = os.path.splitext(file.filename)[1].lower()

        result = imageto_base64(file_data) if ext in ['.png','.jpg','.jpeg'] else dicom_to_png(file_data)
        result.update(make_predict(result))
        return jsonify(result)
    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/save', methods=['POST'])
def save_analysis():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных'}), 400

        image_url = None
        if data.get("image_base64"):
            filename  = save_image_to_disk(data["image_base64"], data.get("file_name", "xray.png"))
            image_url = f"http://127.0.0.1:5001/images/{filename}"

        conn = get_db()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO xray_analyses (
                patient_id, full_name, birth_date, doctor,
                diagnosis, notes, file_name, image_url,
                age_months, gender,
                angle, distance_h, distance_d,
                perkins, dysplasia_level, dysplasia_stage
            ) VALUES (
                %(patient_id)s, %(full_name)s, %(birth_date)s, %(doctor)s,
                %(diagnosis)s, %(notes)s, %(file_name)s, %(image_url)s,
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
            "image_url":       image_url,
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

        print(f"[save] Сохранено id={record_id}, image_url={image_url}")
        return jsonify({"success": True, "id": record_id})

    except Exception as e:
        print(f"[save] Ошибка: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/images/<filename>')
def serve_image(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route('/analyses', methods=['GET'])
def get_analyses():
    try:
        patient_id = request.args.get("patient_id", "")
        diagnosis  = request.args.get("diagnosis", "")

        conn = get_db()
        cur  = conn.cursor()

        query  = "SELECT * FROM xray_analyses WHERE 1=1"
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
            for key, val in record.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
            result.append(record)

        return jsonify(result)

    except Exception as e:
        print(f"[analyses] Ошибка: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/')
def index():
    return send_file('index.html')


@app.route('/save-student', methods=['POST'])
def save_student():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных'}), 400

        annotated_url = None
        original_url  = None
        fname = data.get("file_name", "xray.png")

        if data.get("annotated_base64"):
            filename      = save_image_to_disk(data["annotated_base64"], f"annotated_{fname}")
            annotated_url = f"http://127.0.0.1:5001/images/{filename}"

        if data.get("original_base64"):
            filename      = save_image_to_disk(data["original_base64"], f"original_{fname}")
            original_url  = f"http://127.0.0.1:5001/images/{filename}"

        conn = get_db()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO student_analyses (
                student_name, notes, file_name,
                annotated_url, original_url,
                angle, distance_h, distance_d,
                perkins, dysplasia_level, dysplasia_stage,
                ai_angle, ai_class, ai_confidence
            ) VALUES (
                %(student_name)s, %(notes)s, %(file_name)s,
                %(annotated_url)s, %(original_url)s,
                %(angle)s, %(distance_h)s, %(distance_d)s,
                %(perkins)s, %(dysplasia_level)s, %(dysplasia_stage)s,
                %(ai_angle)s, %(ai_class)s, %(ai_confidence)s
            ) RETURNING id
        """, {
            "student_name":    data.get("student_name"),
            "notes":           data.get("notes"),
            "file_name":       fname,
            "annotated_url":   annotated_url,
            "original_url":    original_url,
            "angle":           data.get("angle"),
            "distance_h":      data.get("distance_h"),
            "distance_d":      data.get("distance_d"),
            "perkins":         data.get("perkins"),
            "dysplasia_level": data.get("dysplasia_level"),
            "dysplasia_stage": data.get("dysplasia_stage"),
            "ai_angle":        data.get("ai_angle"),
            "ai_class":        data.get("ai_class"),
            "ai_confidence":   data.get("ai_confidence"),
        })

        record_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        print(f"[save-student] Сохранено id={record_id}")
        return jsonify({"success": True, "id": record_id})

    except Exception as e:
        print(f"[save-student] Ошибка: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/student-analyses', methods=['GET'])
def get_student_analyses():
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT * FROM student_analyses ORDER BY created_at DESC")
        columns = [desc[0] for desc in cur.description]
        rows    = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for row in rows:
            record = dict(zip(columns, row))
            for key, val in record.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
            result.append(record)

        return jsonify(result)

    except Exception as e:
        print(f"[student-analyses] Ошибка: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    ml_server_url = 'http://127.0.0.1:5000/predict'
    app.run(debug=True, port=5001)