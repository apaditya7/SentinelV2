import whisper
from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    data = request.json
    video_url = data.get("video_url")

    if not video_url:
        return jsonify({"error": "No video URL provided"}), 400

    # ✅ Download audio from YouTube
    output_file = "audio.mp3"
    command = [
    "yt-dlp", "-x", "--audio-format", "mp3",
    "--ffmpeg-location", "/opt/homebrew/bin/ffmpeg",
    "--cookies", "cookies.txt",  
    "-o", output_file, video_url
]

    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Failed to download audio: {str(e)}"}), 500

    # ✅ Run Whisper Locally (No API key needed)
    try:
        model = whisper.load_model("medium")  # ✅ Change "medium" to "small" or "large" if needed
        result = model.transcribe(output_file, language="en")
        transcript = result["text"]  # ✅ Extract text correctly
    except Exception as e:
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

    # ✅ Remove the audio file after processing
    os.remove(output_file)

    return jsonify({"transcript": transcript})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
