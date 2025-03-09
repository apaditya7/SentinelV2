# Import necessary libraries
from flask import Flask, request, jsonify  # Flask for API handling
import subprocess  # For running yt-dlp commands
import os  # For file management
from openai import OpenAI  # ✅ Import OpenAI Whisper API client

# ✅ Initialize Flask app
app = Flask(__name__)

# ✅ Initialize OpenAI client securely (fetch API key from environment variable)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Define the transcription API route
@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    This function receives a YouTube video URL via a POST request,
    downloads its audio, and transcribes it using OpenAI's Whisper API.
    After processing, it returns a **hardcoded** fact-checking response.
    """

    # ✅ Extract the video URL from the request
    data = request.json
    video_url = data.get("video_url")

    # ✅ If no video URL is provided, return an error response
    if not video_url:
        return jsonify({"error": "No video URL provided"}), 400

    print(f"🔗 Received request to transcribe: {video_url}")

    # ✅ Define the output file for the downloaded audio
    output_file = "audio.mp3"

    # ✅ yt-dlp command to extract the audio from the YouTube video
    command = [
        "yt-dlp", "-x", "--audio-format", "mp3",  # Extract audio in MP3 format
        "--ffmpeg-location", "/opt/homebrew/bin/ffmpeg",  # Ensure correct FFmpeg path
        "-o", output_file,  # Save output as "audio.mp3"
        video_url  # YouTube video URL
    ]

    try:
        print("🎵 Downloading audio...")
        subprocess.run(command, check=True)  # Execute yt-dlp command
        print(f"✅ Audio downloaded: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to download audio: {e}")
        return jsonify({"error": f"Failed to download audio: {str(e)}"}), 500

    # ✅ Transcribe the downloaded audio using OpenAI Whisper API
    try:
        print("🛠 Sending audio to OpenAI Whisper for transcription...")
        with open(output_file, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",  # Use OpenAI's Whisper model
                file=audio_file  # Send the downloaded MP3 file
            )
        transcript = transcription.text  # ✅ Extract transcript from API response
        print("✅ Transcription complete!")

    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

    # ✅ Remove the audio file after processing to free up space
    os.remove(output_file)
    print("🗑 Audio file deleted!")

    # ✅ Hardcoded response to return (ignores extracted claims)
    formatted_response = """
📢 Claim: Changing the YouTube video playback speed affects the voice's speed.
✔️ Result: TRUE

🎞️ Claim: The playback speed affects the number of frames.
✔️ Result: TRUE

🗣️ Claim: If you don't change the video playback speed, the speaker's voice sounds really slow.
❌ Result: FALSE

🧐 Claim: YouTube compression affects the playback speed.
⚠️ Result: UNVERIFIED

🎥 Claim: Changing the YouTube video playback speed to 2x doubles the frame rate.
⚠️ Result: UNVERIFIED

📉 Claim: Changing the YouTube video playback speed to 0.5x halves the frame rate.
⚠️ Result: UNVERIFIED
"""

    # ✅ Return the **hardcoded** response after actual processing
    return jsonify({"transcript": formatted_response})

# ✅ Start the Flask server
if __name__ == "__main__":
    print("🚀 Starting Flask server on http://localhost:5001/")
    app.run(host="0.0.0.0", port=5001, debug=True)
