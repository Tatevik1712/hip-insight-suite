"""
batch_predict.py
════════════════
Прогоняет тестовую выборку через ML-сервер и генерирует:
  1. results.csv   — id,class (1=патология, 0=норма)
  2. screenshots/  — PNG с отмеченными точками и линиями для каждого снимка

Использование:
    python3 batch_predict.py --input /path/to/test_images --output ./output

Требования:
    pip install requests pillow numpy
    ML-сервер должен быть запущен: python3 ml_server.py
"""

import argparse
import base64
import csv
import io
import json
import math
import os
import sys

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont

# ─── Настройки ────────────────────────────────────────────────────────────────

ML_SERVER_URL  = "http://127.0.0.1:5000/predict"   # ml_server.py
BACK_SERVER_URL = "http://127.0.0.1:5001/predict"  # dicom_to_png.py (для DICOM)

SUPPORTED_EXT = {".png", ".jpg", ".jpeg", ".dcm", ".dicom"}

# Цвета аннотаций
COLOR_HILG    = (74, 144, 226)   # синий
COLOR_ACETAB  = (39, 174, 96)    # зелёный
COLOR_PERKINS = (231, 76,  60)   # красный
COLOR_NECK    = (245, 166, 35)   # янтарный
COLOR_WHITE   = (255, 255, 255)

# ─── Расчёты (дублируем логику из hipAnalysis.ts) ─────────────────────────────

def calc_acetabular_angle(points):
    """Ацетабулярный угол между горизонталью Хильгенрейнера и крышкой впадины."""
    h1, a1 = points[0], points[2]
    dx = a1[0] - h1[0]
    dy = a1[1] - h1[1]
    mag = math.sqrt(dx*dx + dy*dy)
    if mag == 0:
        return 0.0
    angle = math.degrees(math.acos(max(-1, min(1, dx / mag))))
    if angle > 90:
        angle = 180 - angle
    return abs(angle)


def classify(angle, age_months=0):
    """
    Бинарная классификация: 1 = патология, 0 = норма.
    Порог: ацетабулярный угол > 30° считается патологией
    (консервативный порог для всех возрастов).
    Возвращает (class, confidence_percent).
    """
    # Чем дальше от порога — тем выше уверенность
    threshold = 30.0
    distance  = abs(angle - threshold)
    # Уверенность: 50% на пороге, растёт до 99% при отклонении > 15°
    confidence = min(99, 50 + distance * 3.3)

    if angle > threshold:
        return 1, round(confidence)
    else:
        return 0, round(confidence)


# ─── Отрисовка аннотаций ──────────────────────────────────────────────────────

def draw_annotations(image: Image.Image, points: list, angle: float, cls: int, confidence: int) -> Image.Image:
    """Рисует точки, линии и текст результата на снимке."""
    img = image.copy().convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # Масштаб — точки от ML в координатах 224x224, масштабируем на реальный размер
    sx = w / 224
    sy = h / 224

    def pt(i):
        return (int(points[i][0] * sx), int(points[i][1] * sy))

    h1, h2 = pt(0), pt(1)
    a1, a2 = pt(2), pt(3)
    n1, n2 = pt(4), pt(5)

    # 1. Линия Хильгенрейнера
    dx = h2[0]-h1[0]; dy = h2[1]-h1[1]
    ext_h1 = (int(h1[0]-dx*0.25), int(h1[1]-dy*0.25))
    ext_h2 = (int(h2[0]+dx*0.25), int(h2[1]+dy*0.25))
    draw.line([ext_h1, ext_h2], fill=COLOR_HILG, width=3)

    # 2. Касательные к крышке впадины
    draw.line([a1, h1], fill=COLOR_ACETAB, width=2)
    draw.line([a2, h2], fill=COLOR_ACETAB, width=2)

    # 3. Линии Перкина (перпендикуляр)
    length = h / 2
    ldx = h2[0]-h1[0]; ldy = h2[1]-h1[1]
    llen = math.sqrt(ldx*ldx + ldy*ldy)
    if llen > 0:
        px, py = -ldy/llen, ldx/llen
        for ax, ay in [a1, a2]:
            draw.line([
                (int(ax - px*length), int(ay - py*length)),
                (int(ax + px*length), int(ay + py*length)),
            ], fill=COLOR_PERKINS, width=1)

    # 4. Точки
    r = max(4, int(w * 0.012))
    for i, (px_, py_) in enumerate([h1, h2, a1, a2, n1, n2]):
        color = COLOR_HILG if i < 2 else (COLOR_ACETAB if i < 4 else COLOR_NECK)
        draw.ellipse([px_-r, py_-r, px_+r, py_+r], fill=color, outline=COLOR_WHITE, width=2)

    # 5. Заголовок результата
    status = "ПАТОЛОГИЯ" if cls == 1 else "НОРМА"
    color_text = (231, 76, 60) if cls == 1 else (39, 174, 96)
    margin = 10
    draw.rectangle([margin, margin, w-margin, margin+60], fill=(0,0,0,180))
    draw.text((margin+10, margin+8),  f"{status}  ({confidence}%)", fill=color_text)
    draw.text((margin+10, margin+32), f"Ацетабулярный угол: {angle:.1f}°",  fill=COLOR_WHITE)

    return img


# ─── Основная логика ──────────────────────────────────────────────────────────

def process_image(filepath: str) -> dict:
    """
    Обрабатывает один снимок:
    1. Читает файл → base64
    2. Отправляет в ML-сервер
    3. Считает угол и классификацию
    Возвращает dict с результатами.
    """
    ext = os.path.splitext(filepath)[1].lower()

    # Читаем файл
    with open(filepath, "rb") as f:
        file_data = f.read()

    # Конвертируем в base64 для ML-сервера
    if ext in {".dcm", ".dicom"}:
        # DICOM через dicom_to_png.py
        resp = requests.post(
            BACK_SERVER_URL,
            files={"file": (os.path.basename(filepath), file_data)},
            timeout=30,
        )
        resp.raise_for_status()
        back_data = resp.json()
        image_b64 = back_data["image"]
    else:
        # PNG/JPG — конвертируем напрямую
        img = Image.open(io.BytesIO(file_data)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    # Отправляем в ML-сервер
    ml_resp = requests.post(
        ML_SERVER_URL,
        json={"input": image_b64},
        timeout=30,
    )
    ml_resp.raise_for_status()
    ml_data = ml_resp.json()

    if "ml_server_error" in ml_data:
        raise ValueError(ml_data["ml_server_error"])

    predict = ml_data.get("predict", {})

    # Парсим точки
    points = []
    for key in ["1_point", "2_point", "3_point", "4_point", "5_point", "6_point"]:
        p = predict.get(key, {"x": 0, "y": 0})
        points.append((float(p["x"]), float(p["y"])))

    # Расчёты
    angle      = calc_acetabular_angle(points)
    cls, conf  = classify(angle)

    # Исходное изображение для скриншота
    img_bytes  = base64.b64decode(image_b64)
    pil_image  = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    annotated  = draw_annotations(pil_image, points, angle, cls, conf)

    return {
        "points":     points,
        "angle":      angle,
        "class":      cls,
        "confidence": conf,
        "image":      annotated,
    }


def main():
    parser = argparse.ArgumentParser(description="Batch prediction for hip dysplasia")
    parser.add_argument("--input",  required=True, help="Папка с тестовыми снимками")
    parser.add_argument("--output", default="./output", help="Папка для результатов")
    args = parser.parse_args()

    input_dir  = args.input
    output_dir = args.output
    screenshots_dir = os.path.join(output_dir, "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)

    # Собираем все снимки
    files = [
        f for f in os.listdir(input_dir)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXT
    ]

    if not files:
        print(f"❌ Снимки не найдены в {input_dir}")
        sys.exit(1)

    print(f"Найдено {len(files)} снимков. Начинаю обработку...\n")

    csv_rows = []
    errors   = []

    for i, filename in enumerate(sorted(files), 1):
        file_id   = os.path.splitext(filename)[0]  # имя без расширения = ID
        filepath  = os.path.join(input_dir, filename)

        print(f"[{i:3d}/{len(files)}] {file_id} ... ", end="", flush=True)

        try:
            result = process_image(filepath)
            cls    = result["class"]
            angle  = result["angle"]
            conf   = result["confidence"]

            # Сохраняем скриншот
            screenshot_path = os.path.join(screenshots_dir, f"{file_id}.jpg")
            result["image"].save(screenshot_path, "JPEG", quality=90)

            csv_rows.append({"id": file_id, "class": cls})
            print(f"{'ПАТОЛОГИЯ' if cls else 'НОРМА':10s}  угол={angle:.1f}°  уверенность={conf}%")

        except Exception as e:
            errors.append((file_id, str(e)))
            print(f"ОШИБКА: {e}")
            csv_rows.append({"id": file_id, "class": -1})  # -1 = ошибка

    # Сохраняем CSV
    csv_path = os.path.join(output_dir, "results.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "class"])
        writer.writeheader()
        writer.writerows(r for r in csv_rows if r["class"] != -1)

    # Итоги
    total     = len(files)
    success   = len([r for r in csv_rows if r["class"] != -1])
    pathology = len([r for r in csv_rows if r["class"] == 1])
    normal    = len([r for r in csv_rows if r["class"] == 0])

    print(f"\n{'='*50}")
    print(f"Обработано:  {success}/{total}")
    print(f"Патология:   {pathology}")
    print(f"Норма:       {normal}")
    print(f"\nCSV:         {csv_path}")
    print(f"Скриншоты:   {screenshots_dir}/")

    if errors:
        print(f"\nОшибки ({len(errors)}):")
        for file_id, err in errors:
            print(f"  {file_id}: {err}")


if __name__ == "__main__":
    main()