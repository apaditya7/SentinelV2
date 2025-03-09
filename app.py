from flask import Flask, request, jsonify
import joblib
import numpy as np
import librosa
import os

app = Flask(__name__)

# Load the model and scaler
model_filename = "svm_model.pkl"
scaler_filename = "scaler.pkl"
svm_classifier = joblib.load(model_filename)
scaler = joblib.load(scaler_filename)

def extract_mfcc_features(audio_path, n_mfcc=13, n_fft=2048, hop_length=512):
    try:
        audio_data, sr = librosa.load(audio_path, sr=None)
        mfccs = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length)
        return np.mean(mfccs.T, axis=0)
    except Exception as e:
        return None

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    file = request.files['audio']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not (file.filename.endswith('.wav') or file.filename.endswith('.mp3')):
        return jsonify({"error": "Only .wav and .mp3 files are allowed"}), 400

    # Save file temporarily
    temp_path = "temp_audio"
    file_extension = file.filename.rsplit(".", 1)[1].lower()
    temp_file = f"{temp_path}.{file_extension}"
    file.save(temp_file)

    # Extract MFCC features
    mfcc_features = extract_mfcc_features(temp_file)

    # Remove temporary file
    os.remove(temp_file)

    if mfcc_features is None:
        return jsonify({"error": "Failed to process audio"}), 500

    mfcc_features_scaled = scaler.transform(mfcc_features.reshape(1, -1))
    probabilities = svm_classifier.predict_proba(mfcc_features_scaled)

    confidence_percentage = np.max(probabilities) * 100
    prediction = svm_classifier.predict(mfcc_features_scaled)[0]

    result = "Genuine" if prediction == 0 else "Deepfake"

    return jsonify({
        "result": result,
        "confidence": f"{confidence_percentage:.2f}%"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# Commands
# python app.py
# curl -X POST -F "audio=@test_audio_fake.wav" http://127.0.0.1:5000/analyze
# curl -X POST -F "audio=@test_audio_real.mp3" http://127.0.0.1:5000/analyze

