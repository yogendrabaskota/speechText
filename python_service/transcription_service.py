from flask import Flask, request, jsonify
from transformers import AutoProcessor, AutoModelForCTC
import torch
import soundfile as sf
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the Wav2Vec2 model and processor from the local directory
MODEL_DIR = "./models"
processor = AutoProcessor.from_pretrained(MODEL_DIR)
model = AutoModelForCTC.from_pretrained(MODEL_DIR)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    try:
        # Log file details for debugging
        print(f"Received file: {file.filename}")
        print(f"File size: {len(file.read())} bytes")

        # Go back to the beginning of the file object after reading the file size
        file.seek(0)

        # Load the audio file from the uploaded content
        audio, sampling_rate = sf.read(file)
        print(f"Audio shape: {audio.shape}, Sampling rate: {sampling_rate}")

        # Process audio and generate transcription
        inputs = processor(audio, sampling_rate=sampling_rate, return_tensors="pt", padding=True)

        # Run the model to get logits
        with torch.no_grad():
            logits = model(inputs.input_values).logits

        # Decode the transcription
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(predicted_ids)

        return jsonify({"transcription": transcription[0]})
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
