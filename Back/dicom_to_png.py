from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import pydicom
import numpy as np
from PIL import Image
import io
import os
import base64
import requests

app = Flask(__name__)
CORS(app)  # Разрешаем CORS для работы с фронтендом

def dicom_to_png(dicom_data):
    """Конвертирует DICOM файл в строку, описывающую PNG изображение, размер пикселя, формат изображения
    Вернёт словарь виде: {'image':image_base64,
            'image_type':'png',
            'pixel_size_x':pixel_size[0],
            'pixel_size_y':pixel_size[1]}"""
    
    # Читаем DICOM файл
    ds = pydicom.dcmread(io.BytesIO(dicom_data))
    
    # Получаем пиксельные данные
    pixel_array = ds.pixel_array
    
    # Нормализуем значения до диапазона 0-255
    if pixel_array.dtype != np.uint8:
        pixel_array = ((pixel_array - pixel_array.min()) / 
                      (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
        
    pixel_array = np.stack([pixel_array] * 3, axis=-1) #дублируем в 3х канал ???
    
    # Создаем PIL изображение
    if len(pixel_array.shape) == 2:
        image = Image.fromarray(pixel_array, mode='L')
    elif len(pixel_array.shape) == 3:
        image = Image.fromarray(pixel_array)
    else:
        raise ValueError("Неподдерживаемый формат DICOM")
    
    print('dicom')
    # Сохраняем в строку base_64
    png_buffer = io.BytesIO()
    image.save(png_buffer, format='PNG')
    png_buffer.seek(0)
    image_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    pixel_size = ds.PixelSpacing#в мм

    data = {'image':image_base64,
            'image_type':'png',
            'pixel_size_x':pixel_size[0],
            'pixel_size_y':pixel_size[1]}
    
    return data



@app.route('/predict', methods=['POST'])
def main_point():

    '''
    Точка взаимодействия фронта и перевода dicom в картинку, вызов сервера с МО, возвращение предсказания. Принимаем request с файлом. Response - json с полями, зависящими от фходного файла.
    Для dicom: {'image':image_base64,
            'image_type':'png',
            'pixel_size_x':pixel_size[0],
            'pixel_size_y':pixel_size[1],
            'predict':{1_point:{'x':x,'y':y},
                        и т.д.
                        }
            }

    Для изображения:{'image':image_base64,
                    'predict':{1_point:{'x':x,'y':y},
                                        и т.д.
                                        }
    }
    '''
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'Файл не выбран'}), 400
        
        # Читаем файл
        file_data = file.read()

        type = os.path.splitext(file.filename)[1]

        images_type = ['.png','.jpg','.jpeg']

        print(type)

        if(type in images_type):
            result = imageto_base64(file_data)
        else:
            result = dicom_to_png(file_data)

        
        result.update(make_predict(result))
        return jsonify(result)

    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500

def imageto_base64(image_file):
     '''
     Перевод изображений png, jpeg, jpg в строку, описывающую изображение. Image_file - байты файла. Возвращает словарь [image] - строка, описывающая файл
     '''
     try:
        data = io.BytesIO(image_file)
        image = Image.open(data)
        image = image.convert("RGB") #уберём альфа канал из изображения
        print('image')
        # Сохраняем в строку base_64
        png_buffer = io.BytesIO()
        image.save(png_buffer, format='PNG')
        png_buffer.seek(0)
        image_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')
        return {'image':image_base64}
        

     except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500


def make_predict(data):
    '''
    data - Json с полем image, в которм строка, описывающая изображение
    '''
    try:
        request_data = {'input':data['image']}
        # Делаем POST-запрос к нейросети
        response = requests.post(ml_server_url, json=request_data)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": "Ошибка от сервера нейросети"}
    except requests.exceptions.ConnectionError:
        return {"error": "Не удалось подключиться к серверу нейросети. Убедитесь, что он запущен."}



@app.route('/')
def index():
    """Отдаем HTML страницу"""
    return send_file('index.html')

if __name__ == '__main__':
    ml_server_url = 'http://127.0.0.1:5000/predict'
    app.run(debug=True, port=5001)