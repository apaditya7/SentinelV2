from transformers import pipeline
from flask_cors import CORS
from flask import Flask, request, jsonify
import os
import base64
from werkzeug.utils import secure_filename
from groq import Groq

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'mp4', 'avi', 'mp3', 'wav'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Hugging Face deepfake detection model (now secondary)
try:
    ml_model = pipeline('image-classification', model="prithivMLmods/Deepfake-Detection-Exp-02-22", device=0, use_fast=False)
except Exception as e:
    print(f"Error loading the secondary model: {str(e)}")
    print("Will attempt to use CPU instead")
    try:
        ml_model = pipeline('image-classification', model="prithivMLmods/Deepfake-Detection-Exp-02-22")
    except Exception as e2:
        print(f"Error loading the model on CPU as well: {str(e2)}")
        ml_model = None

# Groq API configuration (now primary)
GROQ_API_KEY = "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"
# Initialize the Groq client
groq_client = Groq(api_key=GROQ_API_KEY)

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_type(filename):
    """Determine if file is image, video, or audio."""
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ['png', 'jpg', 'jpeg']:
        return 'image'
    elif ext in ['mp4', 'avi']:
        return 'video'
    elif ext in ['mp3', 'wav']:
        return 'audio'
    return None

def llama_vision_analysis(file_path):
    """Use Groq client to analyze the image with LLaMA vision model (PRIMARY ANALYSIS)."""
    try:
        # Convert image to base64
        with open(file_path, "rb") as image_file:
            image_base64 = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Define messages for deepfake detection with correct format
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image and tell me if it shows signs of being a deepfake or AI-generated. Focus on: 1) Facial inconsistencies like unnatural skin texture, irregular shadows, or asymmetric features, 2) Lighting inconsistencies, 3) Unnatural edges or blending issues, 4) Background anomalies. Provide specific details about why you think it's real or fake and give a confidence level."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]
            }
        ]
        
        print("Running primary analysis with Vision Language Model...")
        # Make the API request
        completion = groq_client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=messages,
            temperature=0.2,
            max_tokens=800,
            top_p=1,
            stream=False,
            stop=None,
        )
        
        # Extract analysis from response
        analysis = completion.choices[0].message.content
        print(f"Primary analysis complete (Vision Language Model)")
        
        # Determine confidence score from analysis
        confidence_score = analyze_llama_response(analysis)
        
        if confidence_score > 50:
            primary_verdict = "Deepfake"
        else:
            primary_verdict = "Real"
            
        return {
            "status": "success",
            "analysis": analysis,
            "verdict": primary_verdict,
            "confidence": confidence_score,
            "scores": {
                "Real": (100 - confidence_score) / 100,
                "Deepfake": confidence_score / 100
            }
        }
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in primary analysis (Vision Language Model): {str(e)}")
        print(error_details)
        
        return {
            "status": "error",
            "verdict": "Error",
            "message": f"Primary analysis failed: {str(e)}",
            "scores": {
                "Real": 0,
                "Deepfake": 0
            }
        }

def analyze_llama_response(analysis):
    """Extract a rough confidence score from LLaMA's text response."""
    analysis = analysis.lower()
    
    # Look for explicit confidence statements
    import re
    confidence_patterns = [
        r'(\d{1,3})%\s*(?:confidence|certain|sure)',
        r'confidence(?:\s*level)?(?:\s*:)?\s*(\d{1,3})%',
        r'(\d{1,3})(?:\s*percent|\s*%)\s*(?:confident|certainty|sure|likelihood)',
        r'confidence(?:[\s:]*|level[\s:]*)(high|medium|low)',
        r'(high|medium|low)(?:\s*confidence|\s*certainty)',
    ]
    
    for pattern in confidence_patterns:
        matches = re.search(pattern, analysis)
        if matches:
            match = matches.group(1)
            if match.isdigit():
                return int(match)
            elif match == "high":
                return 80
            elif match == "medium":
                return 50
            elif match == "low":
                return 20
    
    # Phrases indicating manipulation
    fake_indicators = [
        "definitely fake", "clearly manipulated", "certainly ai-generated", 
        "obvious deepfake", "artificially generated", "clear signs of manipulation",
        "evident manipulation", "synthetic image", "not authentic"
    ]
    
    # Phrases indicating high likelihood of manipulation
    likely_fake_indicators = [
        "likely fake", "probably manipulated", "appears to be ai-generated",
        "signs of manipulation", "possibly fake", "artificial elements",
        "inconsistencies suggest", "unnatural features"
    ]
    
    # Phrases indicating uncertainty
    uncertain_indicators = [
        "uncertain", "unclear", "difficult to determine", "can't be certain",
        "ambiguous", "not conclusive", "could be either"
    ]
    
    # Phrases indicating likely authentic
    likely_real_indicators = [
        "likely real", "probably authentic", "appears genuine",
        "natural-looking", "consistent lighting", "natural skin texture"
    ]
    
    # Phrases indicating definitely real
    real_indicators = [
        "definitely real", "certainly authentic", "genuine image",
        "natural image", "no signs of manipulation", "authentic photo"
    ]
    
    # Calculate confidence score based on presence of indicators
    for indicator in fake_indicators:
        if indicator in analysis:
            return 90
    
    for indicator in likely_fake_indicators:
        if indicator in analysis:
            return 75
    
    for indicator in uncertain_indicators:
        if indicator in analysis:
            return 50
    
    for indicator in likely_real_indicators:
        if indicator in analysis:
            return 25
    
    for indicator in real_indicators:
        if indicator in analysis:
            return 10
    
    # If no clear indicators found, analyze sentiment more carefully
    # Count instances of words that suggest fake vs real
    fake_count = sum(analysis.count(word) for word in ["fake", "artificial", "manipulated", "generated", "deepfake", "inconsistent", "synthetic"])
    real_count = sum(analysis.count(word) for word in ["real", "authentic", "natural", "genuine", "consistent", "original"])
    
    # Weighted scoring
    if fake_count > real_count * 2:
        return 80  # Strongly suggests fake
    elif fake_count > real_count:
        return 65  # Somewhat suggests fake
    elif real_count > fake_count * 2:
        return 20  # Strongly suggests real
    elif real_count > fake_count:
        return 35  # Somewhat suggests real
    else:
        return 50  # Balanced or unclear

@app.route('/api/deepfake', methods=["POST"])
def deepfake():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Please upload a supported file type."}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    file_type = get_file_type(filename)
    
    try:
        # First layer: LLaMA Vision analysis via Groq (now primary)
        primary_result = {}
        if file_type == 'image':
            primary_result = llama_vision_analysis(file_path)
            print(f"Layer 1 analysis verdict: {primary_result.get('verdict', 'Unknown')}")
        else:
            primary_result = {
                "verdict": "Analysis not available",
                "scores": {
                    "Real": 0,
                    "Deepfake": 0
                },
                "status": "not_available",
                "message": f"{file_type.capitalize()} analysis currently in development"
            }
        
        # Second layer: Machine learning model analysis (now secondary)
        secondary_result = {}
        if file_type == 'image' and ml_model is not None:
            try:
                print("Running Layer 2 analysis with Machine Learning Model...")
                hf_result = ml_model(file_path)
                score_real = hf_result[0]['score']
                score_deepfake = hf_result[1]['score']
                
                if score_real > score_deepfake:
                    secondary_verdict = "Real"
                else:
                    secondary_verdict = "Deepfake"
                    
                secondary_result = {
                    "status": "success",
                    "verdict": secondary_verdict,
                    "scores": {
                        "Real": score_real,
                        "Deepfake": score_deepfake
                    }
                }
                print(f"Layer 2 analysis complete: {secondary_verdict}")
            except Exception as e:
                print(f"Error in Layer 2 analysis: {str(e)}")
                secondary_result = {
                    "status": "error",
                    "message": f"Layer 2 analysis failed: {str(e)}"
                }
        else:
            secondary_result = {
                "status": "not_available",
                "message": f"{file_type.capitalize()} secondary analysis not available" if file_type != 'image' else "Layer 2 model not loaded"
            }
        
        # Combined results
        response = {
            "status": "success",
            "file_type": file_type,
            "primary_analysis": {
                "name": "Vision Language Model Check",
                "verdict": primary_result.get("verdict", "Unknown"),
                "scores": primary_result.get("scores", {"Real": 0, "Deepfake": 0})
            },
            "secondary_analysis": {
                "name": "Machine Learning Model Check",
                "verdict": secondary_result.get("verdict", "Unknown"),
                "scores": secondary_result.get("scores", {"Real": 0, "Deepfake": 0})
            },
            
            # Generate a combined verdict with weighted confidence
            "combined_verdict": generate_combined_verdict(primary_result, secondary_result)
        }
        
        # If primary analysis has a full analysis text, include it but not in the primary_analysis object
        if "analysis" in primary_result and primary_result["status"] == "success":
            response["analysis_details"] = extract_detection_details(primary_result["analysis"])
        
        return jsonify(response)
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in API route: {str(e)}")
        print(error_details)
        
        return jsonify({
            "status": "error",
            "message": str(e),
            "details": error_details
        }), 500
    
    finally:
        # Clean up the uploaded file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing temporary file: {str(e)}")

def generate_combined_verdict(primary_result, secondary_result):
    """Generate a combined verdict from both analysis methods."""
    # Default values
    combined_verdict = "Unknown"
    confidence = 0
    
    # For image analysis (when both systems are operational)
    primary_has_verdict = "verdict" in primary_result and primary_result["verdict"] not in ["Error", "Analysis not available", "Unknown"]
    secondary_has_verdict = "verdict" in secondary_result and secondary_result.get("status") == "success"
    
    if primary_has_verdict and secondary_has_verdict:
        # Primary analysis weight (LLaMA Vision)
        if primary_result["verdict"] == "Deepfake":
            primary_confidence = primary_result["scores"]["Deepfake"] * 100
            primary_is_fake = True
        else:
            primary_confidence = primary_result["scores"]["Real"] * 100
            primary_is_fake = False
        
        # Secondary analysis weight (ML model)
        if secondary_result["verdict"] == "Deepfake":
            secondary_confidence = secondary_result["scores"]["Deepfake"] * 100
            secondary_is_fake = True
        else:
            secondary_confidence = secondary_result["scores"]["Real"] * 100
            secondary_is_fake = False
        
        # Weight the verdict (70% LLaMA Vision, 30% ML model)
        weighted_fake_score = (0.7 * (primary_confidence if primary_is_fake else 100 - primary_confidence)) + \
                             (0.3 * (secondary_confidence if secondary_is_fake else 100 - secondary_confidence))
        
        if weighted_fake_score > 50:
            combined_verdict = "Likely Manipulated"
            confidence = weighted_fake_score
        else:
            combined_verdict = "Likely Authentic"
            confidence = 100 - weighted_fake_score
            
        print(f"Combined verdict based on both layers: {combined_verdict} ({confidence}%)")
    
    # When only primary analysis is available
    elif primary_has_verdict:
        print("Using Layer 1 analysis only")
        if primary_result["verdict"] == "Deepfake":
            combined_verdict = "Likely Manipulated"
            confidence = primary_result["scores"]["Deepfake"] * 100
        else:
            combined_verdict = "Likely Authentic"
            confidence = primary_result["scores"]["Real"] * 100
    
    # When only secondary analysis is available
    elif secondary_has_verdict:
        print("Using Layer 2 analysis only")
        if secondary_result["verdict"] == "Deepfake":
            combined_verdict = "Likely Manipulated"
            confidence = secondary_result["scores"]["Deepfake"] * 100
        else:
            combined_verdict = "Likely Authentic"
            confidence = secondary_result["scores"]["Real"] * 100
    
    return {
        "verdict": combined_verdict,
        "confidence": round(confidence, 1)
    }

def extract_detection_details(analysis_text):
    """Extract detection details from LLaMA's text analysis."""
    # Simple extraction of potential indicators from the text
    details = []
    
    # Common deepfake indicators to look for in the text
    indicators = [
        "facial", "shadow", "light", "inconsisten", "unnatur", "artifact", 
        "edge", "border", "texture", "blur", "noise", "eye", "mouth", 
        "skin", "resolution", "color", "proportion"
    ]
    
    # Split text into sentences
    sentences = analysis_text.replace(".", ".SPLIT").replace("!", "!SPLIT").replace("?", "?SPLIT").split("SPLIT")
    
    # Find sentences containing the indicators
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Check if sentence contains any indicators
        if any(indicator in sentence.lower() for indicator in indicators):
            # Clean up the sentence
            if len(sentence) > 10:  # Ensure it's a meaningful sentence
                details.append(sentence)
    
    # Limit to 4 most relevant details
    return details[:4]

if __name__ == '__main__':
    print("Starting Deepfake Detection Server...")
    
    # Check if dependencies are installed
    try:
        import groq
        print("Groq Python client is installed.")
    except ImportError:
        print("WARNING: Groq Python client is not installed. Please install it with: pip install groq")
    
    if ml_model is None:
        print("WARNING: Layer 2 model could not be loaded! Only Layer 1 (Vision Language Model) analysis will be available.")
    
    port = int(os.environ.get('PORT', 5005))
    app.run(host='0.0.0.0', port=port, debug=True)