from flask import Flask, request, jsonify
from transformers import AutoProcessor, AutoModelForCTC
import torch
import soundfile as sf
from flask_cors import CORS
import io

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the Wav2Vec2 model and processor from the local directory
MODEL_DIR = "./models"
processor = AutoProcessor.from_pretrained(MODEL_DIR)
model = AutoModelForCTC.from_pretrained(MODEL_DIR)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    # Check if the file is in the request
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    try:
        # Ensure the uploaded file is a WAV file
        if not file.filename.lower().endswith(".wav"):
            return jsonify({"error": "Invalid file format. Only .wav files are allowed."}), 400

        # Log file details for debugging
        print(f"Received file: {file.filename}")

        # Read audio data directly from the uploaded WAV file
        wav_audio = io.BytesIO(file.read())
        audio_data, sampling_rate = sf.read(wav_audio)
        print(f"Audio shape: {audio_data.shape}, Sampling rate: {sampling_rate}")

        # Process audio and generate transcription
        inputs = processor(audio_data, sampling_rate=sampling_rate, return_tensors="pt", padding=True)

        # Run the model to get logits
        with torch.no_grad():
            logits = model(inputs.input_values).logits

        # Decode the transcription
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(predicted_ids)

        # Return the transcription
        return jsonify({"transcription": transcription[0]})
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
