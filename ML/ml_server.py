from flask import Flask, request, send_file, jsonify
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model
import base64
import io
import gc
from sklearn.preprocessing import StandardScaler
import joblib

app = Flask(__name__)


@app.route('/predict',methods=["POST"])
def predict():
    '''
    Принимается строка base64, описывающая картинку. На выходе - точки интереса. В response json с полем predict, в нём такой словарь
     data = {'1_point':{'x':y[0],'y':y[1]},
                '2_point':{'x':y[2],'y':y[3]},
                '3_point':{'x':y[4],'y':y[5]},
                '4_point':{'x':y[6],'y':y[7]},
                '5_point':{'x':y[8],'y':y[9]},
                '6_point':{'x':y[10],'y':y[11],}
        }
    '''
    try:
        data = request.get_json()

        # Проверяем
        if ((not data) ):
            print('why')
            return jsonify({'ml_server_error': 'Файл не найден'}), 400
        
    
          
        base64_string = base64.b64decode(data['input']) #base64 - строка
        bytes_io = io.BytesIO(base64_string)
        # Перемещение в начало потока BytesIO
        bytes_io.seek(0)
        # Преобразование BytesIO в объект, похожий на файл
        file = io.BufferedReader(bytes_io)
        image = Image.open(file)
        image = image.resize((224,224))
        image_array = np.array(image) #превращаем строку в массив

       

        image_array = np.expand_dims(image_array, axis=0) #добавим размерность

        X = pooler.predict(image_array) #получим вектор
        y_pred_scaled = model.predict(X) #нормализованные координаты
        Y = scaler_y.inverse_transform(y_pred_scaled)[0]#истинные координаты точек
        
        for i in range(0,len(Y)):
            Y[i] = round(Y[i])
        Y = Y.astype(int)

        y = []

        for i in Y:
            y.append(str(i))

        data = {'1_point':{'x':y[0],'y':y[1]},
                '2_point':{'x':y[2],'y':y[3]},
                '3_point':{'x':y[4],'y':y[5]},
                '4_point':{'x':y[6],'y':y[7]},
                '5_point':{'x':y[8],'y':y[9]},
                '6_point':{'x':y[10],'y':y[11],}
        }
        
        gc.collect()        # на всякий случай вызвать сборку мусора
        return jsonify({"predict":data})
    
    except Exception as e:
        print(str(e))
        return jsonify({'ml_server_error': str(e)}), 500

if __name__ == '__main__':
    model = joblib.load('best_forest.pkl')
    pooler = load_model('pooler.h5')
    scaler_y = joblib.load('scaler_y.pkl')
    app.run(debug=True, port=5000)


