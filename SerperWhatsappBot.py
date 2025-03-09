"""
WhatsApp Fact Checking Bot powered by Twilio
Receives messages via WhatsApp and uses Serper API for enhanced fact-checking
Includes audio transcription using OpenAI's Whisper
"""
from flask import Flask, request, jsonify
import os
import requests
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
import json
import tempfile
import re
import traceback
from flask_cors import CORS
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
import openai

# Load environment variables
load_dotenv()

# Configure API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# Initialize Twilio client
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize LLM
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant"
)

# System prompt for extracting claims from text
EXTRACT_CLAIMS_PROMPT = """
Analyze the provided text and extract 3-4 specific factual claims that can be verified.

For each claim:
1. Extract the exact statement from the text that can be verified as true or false
2. Make sure these are substantive factual claims, not opinions or subjective statements
3. Focus on claims that would be important for readers to know the accuracy of
4. Include sufficient context to make the claim clear

Return ONLY a JSON array in this exact format:
[
  {
    "claim": "The exact claim from the text with necessary context",
    "search_query": "Suggested search terms to verify this claim"
  }
]

Do not attempt to verify the claims yourself. Just identify and contextualize them for verification.
"""

# System prompt for verifying with Serper search results
SERPER_VERIFICATION_PROMPT = """
You are a fact-checker with a reputation for accuracy and attention to detail.

Fact-check the following claim using the search results provided:

Claim: {{claim}}

Search Results: {{search_results}}

Based on these search results, determine if the claim is TRUE, FALSE, or UNVERIFIED.

Your response must be in this exact JSON format:
{
  "claim": "{{claim}}",
  "result": "TRUE/FALSE/UNVERIFIED",
  "summary": "A one-sentence summary of your verdict",
  "detailed_analysis": "A detailed explanation of your reasoning (2-3 sentences)",
  "sources": [
    {
      "name": "Website or Publication Name",
      "url": "Source URL"
    }
  ]
}

Guidelines:
- Only mark a claim as TRUE if credible sources clearly support it
- Only mark a claim as FALSE if credible sources clearly refute it
- Mark as UNVERIFIED if the sources are contradictory or insufficient
- Focus on the most authoritative sources (educational institutions, scientific publications, etc.)
"""

# Functions for media handling
def download_media(media_url):
    """
    Download media from Twilio's servers
    """
    try:
        # Get the correct media URL by removing .json if present
        correct_media_url = media_url.rstrip('.json')
        
        # Create a session with the credentials
        session = requests.Session()
        session.auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Make the request
        response = session.get(correct_media_url)
        response.raise_for_status()
        
        # Get content information
        content_type = response.headers.get('Content-Type', '')
        
        # Choose appropriate file extension
        if 'mp3' in content_type or 'mpeg' in content_type:
            ext = '.mp3'
        elif 'ogg' in content_type:
            ext = '.ogg'
        elif 'wav' in content_type:
            ext = '.wav'
        else:
            ext = '.audio'  # generic extension
        
        # Save to temp file
        temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        temp_file.write(response.content)
        temp_file.close()
        
        return temp_file.name
    except Exception as e:
        print(f"Error downloading media: {e}")
        return None
    
def transcribe_audio(audio_file_path):
    """
    Transcribe audio using OpenAI's Whisper API
    """
    print(f"[TRANSCRIBE] Starting transcription of file: {audio_file_path}")
    try:
        print(f"[TRANSCRIBE] File exists: {os.path.exists(audio_file_path)}")
        print(f"[TRANSCRIBE] File size: {os.path.getsize(audio_file_path)} bytes")
        
        with open(audio_file_path, "rb") as audio_file:
            print("[TRANSCRIBE] File opened successfully, sending to Whisper API")
            transcription = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Clean up the temporary file
        os.unlink(audio_file_path)
        print("[TRANSCRIBE] Temp file deleted")
        
        if transcription and hasattr(transcription, 'text'):
            print(f"[TRANSCRIBE] Transcription successful, text length: {len(transcription.text)}")
            print(f"[TRANSCRIBE] Transcription: {transcription.text[:100]}...")
            return transcription.text
        else:
            print("[TRANSCRIBE] Transcription object invalid or missing text property")
            return None
    except Exception as e:
        print(f"[TRANSCRIBE] Error transcribing audio: {str(e)}")
        import traceback
        traceback.print_exc()
        # Clean up the temporary file
        try:
            if os.path.exists(audio_file_path):
                os.unlink(audio_file_path)
                print("[TRANSCRIBE] Temp file deleted after error")
        except:
            pass
        return None

# Helper function for JSON processing
def fix_broken_json(json_str):
    """Fix common JSON errors from LLM outputs"""
    try:
        # Test if it's valid to begin with
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        # Fix missing commas between properties
        fixed_str = re.sub(r'(".*?":\s*".*?")\s*\n\s*(".*?")',
                           r'\1,\n  \2', json_str)
        
        # Handle properties with non-string values
        fixed_str = re.sub(r'(".*?":\s*[^",\s{[].*?[^,\s{[])(\s*\n\s*)(".*?")',
                           r'\1,\2\3', fixed_str)
        
        try:
            # Test if our fix worked
            json.loads(fixed_str)
            return fixed_str
        except json.JSONDecodeError:
            # If all else fails, return the original
            return json_str
    except Exception:
        # Any other exceptions, just return the original
        return json_str

# Serper fact-checking functions
def extract_claims(text):
    """Extract factual claims from text using LLM"""
    try:
        # For very short text, treat it as a single claim
        if len(text.split()) < 15:
            return [{
                "claim": text,
                "search_query": f"fact check {text}"
            }]
        
        messages = [
            SystemMessage(content=EXTRACT_CLAIMS_PROMPT),
            HumanMessage(content=text)
        ]
        
        response = llm.invoke(messages)
        content = response.content
        
        # Extract JSON
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            claims = json.loads(json_str)
            return claims
        else:
            # If no proper JSON found, create a fallback claim
            return [{
                "claim": text[:200] + ("..." if len(text) > 200 else ""),
                "search_query": f"fact check {text[:100]}"
            }]
    except Exception as e:
        print(f"Error extracting claims: {e}")
        # Create a fallback claim with the first sentence
        first_sentence = text.split('.')[0] if '.' in text else text[:100]
        return [{
            "claim": first_sentence,
            "search_query": f"fact check {first_sentence}"
        }]
def search_with_serper(query):
    """Search for a query using Serper API"""
    try:
        url = "https://google.serper.dev/search"
        api_key = "2509c7486d24cbd0f8facbcf4999e9d41094eed4"  # Hardcoded for testing
        
        headers = {
            'X-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'q': query,
            'num': 5
        }
        
        print(f"Using direct API key: {api_key[:4]}...{api_key[-4:]}")
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Full response text: {response.text}")
            return None
    except Exception as e:
        print(f"Error in Serper search: {str(e)}")
        return None
def verify_with_serper_and_llama(claim_data):
    """Verify a claim using Serper search results and LLM"""
    try:
        # Extract claim text
        if isinstance(claim_data, dict):
            claim = claim_data.get("claim", "")
            search_query = claim_data.get("search_query", "")
        else:
            claim = claim_data
            search_query = ""
        
        print(f"Verifying claim: {claim}")
        print(f"Search query: {search_query}")
        
        # Generate a search query if not provided
        if not search_query:
            search_query = f"fact check {claim}"
        
        # Search with Serper
        search_results = search_with_serper(search_query)
        
        if not search_results:
            print("No search results returned from Serper")
            return {
                "claim": claim,
                "result": "UNVERIFIED",
                "summary": "Insufficient evidence available to verify this claim.",
                "detailed_analysis": "No reliable sources were found to verify this specific claim.",
                "sources": []
            }
        
        if "organic" not in search_results or len(search_results["organic"]) == 0:
            print("No organic search results in Serper response")
            return {
                "claim": claim,
                "result": "UNVERIFIED",
                "summary": "Insufficient evidence available to verify this claim.",
                "detailed_analysis": "No reliable sources were found to verify this specific claim.",
                "sources": []
            }
        
        print(f"Found {len(search_results['organic'])} organic search results")
        
        # Format search results for the prompt
        formatted_results = json.dumps(search_results["organic"][:5], indent=2)
        
        # Create verification prompt
        verification_prompt = SERPER_VERIFICATION_PROMPT.replace("{{claim}}", claim).replace("{{search_results}}", formatted_results)
        
        print("Sending to LLM for verification...")
        messages = [
            SystemMessage(content=verification_prompt)
        ]
        
        response = llm.invoke(messages)
        content = response.content
        print(f"LLM response first 100 chars: {content[:100]}...")
        
        # Extract JSON
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = content[start_idx:end_idx]
                print(f"Extracted JSON string first 100 chars: {json_str[:100]}...")
                
                # Fix potential JSON formatting errors
                fixed_json_str = fix_broken_json(json_str)
                
                try:
                    result = json.loads(fixed_json_str)
                    print(f"Parsed JSON result with keys: {result.keys()}")
                    
                    # Ensure result includes the claim
                    if 'claim' not in result:
                        result['claim'] = claim
                    
                    # Format sources for clean display
                    formatted_sources = []
                    if 'sources' in result and result['sources']:
                        for source in result['sources']:
                            if isinstance(source, dict) and 'name' in source and 'url' in source:
                                formatted_sources.append({
                                    'name': source['name'],
                                    'url': source['url']
                                })
                    
                    if formatted_sources:
                        result['sources'] = formatted_sources
                    else:
                        result['sources'] = []
                    
                    print(f"Final verification result: {result['result']}")
                    return result
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {e}")
                    print(f"Problem JSON string: {fixed_json_str}")
                    raise ValueError("JSON parsing error")
            else:
                print("Could not find JSON in LLM response")
                print(f"Full LLM response: {content}")
                raise ValueError("JSON not found in response")
        
        except Exception as e:
            print(f"Error processing verification response: {e}")
            traceback.print_exc()
            
            # Create a fallback result
            return {
                "claim": claim,
                "result": "UNVERIFIED",
                "summary": "Technical issues prevented proper verification.",
                "detailed_analysis": "Technical difficulties prevented the proper analysis of this claim.",
                "sources": []
            }
    
    except Exception as e:
        print(f"Error in Serper verification: {e}")
        traceback.print_exc()
        
        # Create a fallback result
        return {
            "claim": claim_data.get("claim", claim_data) if isinstance(claim_data, dict) else claim_data,
            "result": "UNVERIFIED",
            "summary": "Technical difficulties interrupted the verification process.",
            "detailed_analysis": f"An error occurred during verification: {str(e)}",
            "sources": []
        }

def perform_serper_fact_check(text):
    """
    Main function to perform fact-checking with Serper
    """
    try:
        # Extract claims from text
        claims = extract_claims(text)
        
        if not claims:
            return [{"claim": "No verifiable claims found in this message.", 
                     "result": "UNVERIFIED", 
                     "summary": "The message doesn't contain specific factual statements that can be verified."}]
        
        # Verify each claim (limit to 3 to keep WhatsApp responses manageable)
        verified_claims = []
        for claim_obj in claims[:3]:
            verification = verify_with_serper_and_llama(claim_obj)
            verified_claims.append(verification)
        
        return verified_claims
    
    except Exception as e:
        print(f"Error in Serper fact-checking: {e}")
        traceback.print_exc()
        return [{"claim": "Error processing request", 
                 "result": "UNVERIFIED", 
                 "summary": f"Technical error during fact-checking: {str(e)}"}]

def format_serper_fact_check_results(results):
    """
    Format the Serper fact-checking results into a readable WhatsApp message
    """
    if not results or len(results) == 0:
        return "⚠️ No verifiable claims were identified in this message."
    
    response = "📊 *FACT CHECK RESULTS*\n\n"
    
    for item in results:
        claim = item.get("claim", "")
        result = item.get("result", "UNVERIFIED")
        summary = item.get("summary", "")
        detailed_analysis = item.get("detailed_analysis", "")
        sources = item.get("sources", [])
        
        if result == "TRUE":
            result_emoji = "✅ TRUE"
        elif result == "FALSE":
            result_emoji = "❌ FALSE"
        else:
            result_emoji = "❓ UNVERIFIED"
            
        response += f"*Claim:* {claim}\n*Result:* {result_emoji}\n"
        
        if summary:
            response += f"*Summary:* {summary}\n"
        
        if detailed_analysis:
            response += f"*Analysis:* {detailed_analysis}\n"
        
        # Add sources if available
        if sources:
            response += "*Sources:*\n"
            for source in sources[:2]:  # Limit to first 2 sources for WhatsApp readability
                if isinstance(source, dict):
                    name = source.get("name", "Unknown Source")
                    if name:
                        response += f"- {name}\n"
            
        response += "\n"
    
    response += "⚠️ *Beware of messages asking you to forward to others!*\nForward more content to check its accuracy."
    return response


def detect_misinformation_patterns(text):
    """
    Detect common patterns in viral misinformation
    Returns a list of warning flags
    """
    text = text.lower()
    warnings = []
    
    # Common misinformation patterns
    if "forward this to" in text or "share with" in text or "send to" in text:
        warnings.append("⚠️ Message asks for forwarding - common in misinformation campaigns")
    
    if "big pharma" in text or "doctors don't want you to know" in text or "they don't want you to know" in text:
        warnings.append("⚠️ Claims about information suppression often lack evidence")
    
    if "miracle cure" in text or "kills 99%" in text or "cures all" in text:
        warnings.append("⚠️ Claims about miracle cures or perfect effectiveness are typically exaggerated")
    
    if "scientists have discovered" in text and not ("published in" in text or "journal" in text or "study link" in text):
        warnings.append("⚠️ Vague references to 'scientists' without specific sources")
    
    if "breaking news" in text and ("forward" in text or "share" in text):
        warnings.append("⚠️ Urgent 'breaking news' asking for shares is a red flag")
    
    return warnings

def enhance_fact_check_response(formatted_response, original_text):
    """
    Add misinformation pattern warnings to the fact check response
    """
    warnings = detect_misinformation_patterns(original_text)
    
    if warnings:
        formatted_response += "\n\n*MISINFORMATION RED FLAGS:*\n"
        for warning in warnings:
            formatted_response += f"{warning}\n"
    
    return formatted_response

def send_whatsapp_message(to_number, message_body):
    """
    Send a WhatsApp message via Twilio
    to_number should be in format 'whatsapp:+1XXXXXXXXXX'
    """
    print(f"[SEND] Attempting to send WhatsApp message to {to_number}")
    print(f"[SEND] Message length: {len(message_body)}")
    print(f"[SEND] Message preview: {message_body[:100]}...")
    
    try:
        # Make sure credentials are properly formatted (no quotes or spaces)
        account_sid = TWILIO_ACCOUNT_SID.strip() if TWILIO_ACCOUNT_SID else ""
        auth_token = TWILIO_AUTH_TOKEN.strip() if TWILIO_AUTH_TOKEN else ""
        
        print(f"[SEND] Using ACCOUNT_SID: {account_sid[:4]}...{account_sid[-4:] if len(account_sid) > 8 else ''}")
        print(f"[SEND] AUTH_TOKEN length: {len(auth_token)} characters")
        
        # Create fresh Twilio client with explicit credentials
        client = Client(account_sid, auth_token)
        
        # Send the message
        print(f"[SEND] Sending message via Twilio from {TWILIO_WHATSAPP_NUMBER} to {to_number}")
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=message_body,
            to=to_number
        )
        print(f"[SEND] ✅ Message sent successfully with SID: {message.sid}")
        return message.sid
    except Exception as e:
        print(f"[SEND] ❌ ERROR sending WhatsApp message: {e}")
        import traceback
        traceback.print_exc()
        return None
    

    
@app.route('/api/check', methods=['POST'])
def check_facts_api():
    """
    API endpoint for direct fact-checking
    """
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({
            "error": "Missing 'text' field in request"
        }), 400
    
    text = data['text']
    results = perform_serper_fact_check(text)
    
    return jsonify(results)
@app.route('/webhook', methods=['POST'])
def twilio_webhook():
    """
    Webhook endpoint for Twilio WhatsApp messages
    """
    # Get the message content
    incoming_msg = request.values.get('Body', '').strip()
    sender = request.values.get('From', '')
    
    print(f"\n[WEBHOOK] ⭐ Received webhook request from {sender}")
    print(f"[WEBHOOK] Message: {incoming_msg[:100]}..." if incoming_msg else "[WEBHOOK] Empty message")
    print(f"[WEBHOOK] Request values: {dict(request.values)}")
    
    # Create a response object
    resp = MessagingResponse()
    print("[WEBHOOK] Created TwiML MessagingResponse object")
    
    # Check if this is a join or help message
    if incoming_msg:
        lower_msg = incoming_msg.lower()
        if lower_msg in ["join", "hello", "hi", "hey", "start"]:
            print("[WEBHOOK] Detected greeting message")
            welcome_msg = "👋 Welcome to FactCheck Bot! Send me any message, news article, or claim, and I'll check its factual accuracy for you using advanced search technology. You can also send voice messages for fact-checking."
            resp.message(welcome_msg)
            final_resp = str(resp)
            print(f"[WEBHOOK] Final TwiML response (length={len(final_resp)}): {final_resp}")
            return final_resp
    
    # Check for media content
    num_media = int(request.values.get('NumMedia', 0))
    print(f"[WEBHOOK] Media count: {num_media}")
    
    # Handle media messages
    if num_media > 0:
        media_url = request.values.get('MediaUrl0', '')
        media_content_type = request.values.get('MediaContentType0', '')
        
        print(f"[WEBHOOK] Media URL: {media_url}")
        print(f"[WEBHOOK] Media content type: {media_content_type}")
        
        if media_content_type.startswith('audio/') or media_content_type.startswith('voice/'):
            try:
                print("[WEBHOOK] Processing audio message")
                # Download and process audio
                file_path = download_media(media_url)
                print(f"[WEBHOOK] Download media result: {'Success' if file_path else 'Failed'}")
                
                if file_path:
                    # Transcribe audio
                    transcribed_text = transcribe_audio(file_path)
                    print(f"[WEBHOOK] Transcription result: {'Success' if transcribed_text else 'Failed'}")
                    
                    if transcribed_text:
                        print(f"[WEBHOOK] Transcribed text: {transcribed_text[:100]}...")
                        # Process the transcription with fact checking
                        results = perform_serper_fact_check(transcribed_text)
                        print(f"[WEBHOOK] Fact check complete, got {len(results)} results")
                        
                        formatted_response = format_serper_fact_check_results(results)
                        print(f"[WEBHOOK] Formatted response length: {len(formatted_response)}")
                        
                        enhanced_response = enhance_fact_check_response(formatted_response, transcribed_text)
                        print(f"[WEBHOOK] Enhanced response length: {len(enhanced_response)}")
                        
                        # Message length handling for WhatsApp's 1600 character limit
                        try:
                            print(f"[WEBHOOK] Attempting direct messages to {sender}")
                            # Debug prints to verify credentials
                            print(f"[DEBUG] ACCOUNT_SID: {TWILIO_ACCOUNT_SID[:4]}...{TWILIO_ACCOUNT_SID[-4:]}")
                            print(f"[DEBUG] AUTH_TOKEN: {TWILIO_AUTH_TOKEN[:2]}...{TWILIO_AUTH_TOKEN[-2:]}")
                            print(f"[DEBUG] WHATSAPP_NUMBER: {TWILIO_WHATSAPP_NUMBER}")
                            print(f"[DEBUG] Recipient: {sender}")
                            
                            # Create a single client instance for all messages
                            direct_client = Client(
                                TWILIO_ACCOUNT_SID.strip(),
                                TWILIO_AUTH_TOKEN.strip()
                            )
                            
                            # First send the transcription (keeping under 1500 chars to be safe)
                            transcription_msg = f"📝 *Transcription:*\n\n{transcribed_text}"
                            if len(transcription_msg) > 1500:
                                transcription_msg = transcription_msg[:1450] + "... (truncated)"
                            
                            message1 = direct_client.messages.create(
                                from_=TWILIO_WHATSAPP_NUMBER,
                                body=transcription_msg,
                                to=sender
                            )
                            print(f"[WEBHOOK] Transcription message sent with SID: {message1.sid}")
                            
                            # Now split the fact check results into chunks of 1500 chars max
                            # Start with the header
                            chunks = ["📊 *FACT CHECK RESULTS*\n\n"]
                            
                            # Process each result as a separate chunk if needed
                            for i, result in enumerate(results):
                                claim = result.get("claim", "")
                                verdict = result.get("result", "UNVERIFIED")
                                summary = result.get("summary", "")
                                analysis = result.get("detailed_analysis", "")
                                sources = result.get("sources", [])
                                
                                # Format the result
                                if verdict == "TRUE":
                                    result_emoji = "✅ TRUE"
                                elif verdict == "FALSE":
                                    result_emoji = "❌ FALSE"
                                else:
                                    result_emoji = "❓ UNVERIFIED"
                                    
                                result_text = f"*Claim {i+1}:* {claim}\n*Result:* {result_emoji}\n"
                                
                                if summary:
                                    result_text += f"*Summary:* {summary}\n"
                                
                                if analysis:
                                    result_text += f"*Analysis:* {analysis}\n"
                                
                                # Add sources if available
                                if sources:
                                    result_text += "*Sources:*\n"
                                    for source in sources[:2]:  # Limit to first 2 sources
                                        if isinstance(source, dict):
                                            name = source.get("name", "Unknown Source")
                                            if name:
                                                result_text += f"- {name}\n"
                                    
                                result_text += "\n"
                                
                                # Check if this result can fit in the current chunk
                                if len(chunks[-1]) + len(result_text) <= 1500:
                                    chunks[-1] += result_text
                                else:
                                    # Start a new chunk if it won't fit
                                    chunks.append(result_text)
                            
                            # Add warning to the last chunk
                            warning_text = "\n⚠️ *Beware of messages asking you to forward to others!*\nForward more content to check its accuracy."
                            
                            if len(chunks[-1]) + len(warning_text) <= 1500:
                                chunks[-1] += warning_text
                            else:
                                chunks.append(warning_text)
                            
                            # Send each chunk as a separate message
                            for i, chunk in enumerate(chunks):
                                message = direct_client.messages.create(
                                    from_=TWILIO_WHATSAPP_NUMBER,
                                    body=chunk,
                                    to=sender
                                )
                                print(f"[WEBHOOK] Fact check chunk {i+1} sent with SID: {message.sid}")
                            
                            # Simple TwiML response since direct messages worked
                            resp.message("I've processed your audio and sent the results.")
                            
                        except Exception as e:
                            print(f"[WEBHOOK] Error sending direct messages: {e}")
                            traceback.print_exc()
                            
                            # If direct messages fail, fall back to TwiML response with a summary
                            fallback_msg = "I processed your audio but couldn't send the detailed results directly. Here's a summary:"
                            if len(transcribed_text) > 200:
                                summary = transcribed_text[:200] + "..."
                            else:
                                summary = transcribed_text
                            
                            fallback_msg += f"\n\nTranscription: {summary}\n\n"
                            
                            # Add a brief version of results
                            for result in results[:2]:  # Limit to first 2 results
                                claim = result.get("claim", "")[:100]
                                result_type = result.get("result", "UNVERIFIED")
                                fallback_msg += f"Claim: {claim}... Result: {result_type}\n"
                            
                            resp.message(fallback_msg)
                    else:
                        print("[WEBHOOK] Transcription failed")
                        resp.message("I couldn't transcribe this audio. Please try sending clearer audio or text directly.")
                else:
                    print("[WEBHOOK] Media download failed")
                    resp.message("I had trouble accessing this audio file. Please try again or send text directly.")
            except Exception as e:
                print(f"[WEBHOOK] Error processing audio: {e}")
                traceback.print_exc()
                resp.message("I encountered an error processing your audio. Please try sending text instead.")
        
        elif media_content_type.startswith('image/') or media_content_type.startswith('video/'):
            # Skip image and video processing
            print("[WEBHOOK] Received image/video, skipping processing")
            resp.message("I currently only fact-check text and audio messages. Please send me text or voice messages to verify.")
        
        else:
            print(f"[WEBHOOK] Unsupported media type: {media_content_type}")
            resp.message("I received your media but can't process this type. I can fact-check text and audio messages.")
    
    # Handle text messages
    elif incoming_msg:
        print(f"[WEBHOOK] Processing text message: {incoming_msg[:100]}...")
        
        # Process text message with Serper fact checking
        try:
            print("[WEBHOOK] Starting fact-check process")
            
            results = perform_serper_fact_check(incoming_msg)
            print(f"[WEBHOOK] Got {len(results)} fact-check results")
            
            formatted_response = format_serper_fact_check_results(results)
            print(f"[WEBHOOK] Formatted response length: {len(formatted_response)}")
            
            # Enhance response with misinformation pattern detection
            enhanced_response = enhance_fact_check_response(formatted_response, incoming_msg)
            print(f"[WEBHOOK] Enhanced response length: {len(enhanced_response)}")
            
            # Try direct message approach with chunking to respect 1600 char limit
            try:
                print(f"[WEBHOOK] Attempting direct message to {sender}")
                # Debug prints to verify credentials
                print(f"[DEBUG] ACCOUNT_SID: {TWILIO_ACCOUNT_SID[:4]}...{TWILIO_ACCOUNT_SID[-4:]}")
                print(f"[DEBUG] AUTH_TOKEN: {TWILIO_AUTH_TOKEN[:2]}...{TWILIO_AUTH_TOKEN[-2:]}")
                print(f"[DEBUG] WHATSAPP_NUMBER: {TWILIO_WHATSAPP_NUMBER}")
                print(f"[DEBUG] Recipient: {sender}")
                
                # Create a client
                direct_client = Client(
                    TWILIO_ACCOUNT_SID.strip(),
                    TWILIO_AUTH_TOKEN.strip()
                )
                
                # Check if the response is too long and needs chunking
                if len(enhanced_response) > 1500:
                    # Split the response into chunks
                    chunks = []
                    current_chunk = ""
                    
                    # Split by double newlines to keep logical sections together
                    parts = enhanced_response.split("\n\n")
                    
                    for part in parts:
                        # If adding this part would exceed the limit, start a new chunk
                        if len(current_chunk) + len(part) + 2 > 1500:  # +2 for the newlines
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = part
                        else:
                            if current_chunk:
                                current_chunk += "\n\n" + part
                            else:
                                current_chunk = part
                    
                    # Add the last chunk if not empty
                    if current_chunk:
                        chunks.append(current_chunk)
                    
                    # Send each chunk as a separate message
                    for i, chunk in enumerate(chunks):
                        message = direct_client.messages.create(
                            from_=TWILIO_WHATSAPP_NUMBER,
                            body=chunk,
                            to=sender
                        )
                        print(f"[WEBHOOK] Text chunk {i+1} sent with SID: {message.sid}")
                    
                    # Since direct messages worked, simple TwiML
                    resp.message("I've verified your information and sent the results.")
                else:
                    # Message is short enough to send as is
                    message = direct_client.messages.create(
                        from_=TWILIO_WHATSAPP_NUMBER,
                        body=enhanced_response,
                        to=sender
                    )
                    print(f"[WEBHOOK] Direct message sent with SID: {message.sid}")
                    
                    # Simple TwiML since direct message worked
                    resp.message("I've verified your information and sent the results.")
                
            except Exception as e:
                print(f"[WEBHOOK] Error sending direct message: {e}")
                traceback.print_exc()
                
                # Fall back to TwiML if direct message fails
                # Need to make sure TwiML response isn't too large
                if len(enhanced_response) > 1500:
                    truncated_response = enhanced_response[:1450] + "... (results truncated for length)"
                    resp.message(truncated_response)
                else:
                    resp.message(enhanced_response)
                
        except Exception as e:
            print(f"[WEBHOOK] ❌ Error in fact-checking: {e}")
            traceback.print_exc()
            
            error_msg = "I encountered an error while fact-checking. Please try again with a different message."
            print(f"[WEBHOOK] Sending error message: {error_msg}")
            resp.message(error_msg)
    
    # Empty message
    else:
        print("[WEBHOOK] Empty message received")
        empty_msg = "Please send me a message to fact-check."
        resp.message(empty_msg)
    
    # Return the TwiML response
    final_resp = str(resp)
    print(f"[WEBHOOK] Final TwiML response (length={len(final_resp)}): {final_resp}")
    print("[WEBHOOK] ⭐ Webhook processing complete")
    return final_resp


def process_message(sender, incoming_msg, num_media, values):
    """
    Process the message in a background thread
    """
    try:
        # Handle media messages
        if num_media > 0:
            media_url = values.get('MediaUrl0', '')
            media_content_type = values.get('MediaContentType0', '')
            
            print(f"[PROCESS] Media URL: {media_url}")
            print(f"[PROCESS] Media content type: {media_content_type}")
            
            if media_content_type.startswith('audio/') or media_content_type.startswith('voice/'):
                process_audio_message(sender, media_url, media_content_type)
            
            elif media_content_type.startswith('image/') or media_content_type.startswith('video/'):
                # Skip image and video processing
                print("[PROCESS] Received image/video, skipping processing")
                send_message(
                    sender,
                    "I currently only fact-check text and audio messages. Please send me text or voice messages to verify."
                )
            
            else:
                print(f"[PROCESS] Unsupported media type: {media_content_type}")
                send_message(
                    sender,
                    "I received your media but can't process this type. I can fact-check text and audio messages."
                )
        
        # Handle text messages
        elif incoming_msg:
            print(f"[PROCESS] Processing text message: {incoming_msg[:100]}...")
            process_text_message(sender, incoming_msg)
        
        # Empty message
        else:
            print("[PROCESS] Empty message received")
            send_message(
                sender,
                "Please send me a message to fact-check."
            )
    
    except Exception as e:
        print(f"[PROCESS] Error in message processing: {e}")
        traceback.print_exc()
        try:
            send_message(
                sender,
                "I encountered an error while processing your message. Please try again."
            )
        except:
            pass

def process_audio_message(sender, media_url, media_content_type):
    """
    Process an audio message
    """
    try:
        print("[PROCESS] Processing audio message")
        # First, inform the user we're processing
        send_message(
            sender,
            "I'm processing your audio message. This may take a moment..."
        )
        
        # Download and process audio
        file_path = download_media(media_url)
        print(f"[PROCESS] Download media result: {'Success' if file_path else 'Failed'}")
        
        if file_path:
            # Transcribe audio
            transcribed_text = transcribe_audio(file_path)
            print(f"[PROCESS] Transcription result: {'Success' if transcribed_text else 'Failed'}")
            
            if transcribed_text:
                print(f"[PROCESS] Transcribed text: {transcribed_text[:100]}...")
                
                # Send transcription first
                transcription_msg = f"📝 *Transcription:*\n\n{transcribed_text}"
                if len(transcription_msg) > 1500:
                    transcription_msg = transcription_msg[:1450] + "... (truncated)"
                
                send_message(sender, transcription_msg)
                
                # Process the transcription with fact checking
                results = perform_serper_fact_check(transcribed_text)
                print(f"[PROCESS] Fact check complete, got {len(results)} results")
                
                # Send fact checking results
                send_fact_check_results(sender, results)
            else:
                print("[PROCESS] Transcription failed")
                send_message(
                    sender,
                    "I couldn't transcribe this audio. Please try sending clearer audio or text directly."
                )
        else:
            print("[PROCESS] Media download failed")
            send_message(
                sender,
                "I had trouble accessing this audio file. Please try again or send text directly."
            )
    except Exception as e:
        print(f"[PROCESS] Error processing audio: {e}")
        traceback.print_exc()
        send_message(
            sender,
            "I encountered an error processing your audio. Please try sending text instead."
        )

def process_text_message(sender, text):
    """
    Process a text message
    """
    try:
        # First, inform the user we're processing
        send_message(
            sender,
            "I'm fact-checking your message. This may take a moment..."
        )
        
        # Process text message with Serper fact checking
        results = perform_serper_fact_check(text)
        print(f"[PROCESS] Got {len(results)} fact-check results")
        
        # Send fact checking results
        send_fact_check_results(sender, results)
        
    except Exception as e:
        print(f"[PROCESS] Error in fact-checking: {e}")
        traceback.print_exc()
        
        send_message(
            sender,
            "I encountered an error while fact-checking. Please try again with a different message."
        )

def send_fact_check_results(sender, results):
    """
    Send fact check results with proper formatting and rate limiting
    """
    try:
        # Send header
        header_msg = "📊 *FACT CHECK RESULTS*"
        send_message(sender, header_msg)
        
        # Send each result as a separate message
        for i, result in enumerate(results):
            claim = result.get("claim", "")
            verdict = result.get("result", "UNVERIFIED")
            summary = result.get("summary", "")
            analysis = result.get("detailed_analysis", "")
            sources = result.get("sources", [])
            
            # Format the result
            if verdict == "TRUE":
                result_emoji = "✅ TRUE"
            elif verdict == "FALSE":
                result_emoji = "❌ FALSE"
            else:
                result_emoji = "❓ UNVERIFIED"
                
            result_text = f"*Claim {i+1}:* {claim}\n*Result:* {result_emoji}\n"
            
            if summary:
                result_text += f"*Summary:* {summary}\n"
            
            if analysis:
                result_text += f"*Analysis:* {analysis}\n"
            
            # Add sources if available
            if sources:
                result_text += "*Sources:*\n"
                for source in sources[:2]:  # Limit to first 2 sources
                    if isinstance(source, dict):
                        name = source.get("name", "Unknown Source")
                        if name:
                            result_text += f"- {name}\n"
            
            # Check length and possibly split
            if len(result_text) > 1500:
                chunks = split_message(result_text, 1500)
                for j, chunk in enumerate(chunks):
                    prefix = f"*Claim {i+1} (Part {j+1}/{len(chunks)}):* " if j > 0 else ""
                    send_message(sender, prefix + chunk)
            else:
                send_message(sender, result_text)
        
        # Send warning about forwarded messages
        warning_text = "⚠️ *Beware of messages asking you to forward to others!*\nForward more content to check its accuracy."
        send_message(sender, warning_text)
        
    except Exception as e:
        print(f"[PROCESS] Error sending fact check results: {e}")
        traceback.print_exc()
        
        # Try to send error message
        try:
            send_message(
                sender,
                "I had trouble sending all the fact-check results. Please try again later."
            )
        except:
            pass

def send_message(recipient, message):
    """
    Send a WhatsApp message with rate limiting
    """
    try:
        # Create client
        client = Client(
            TWILIO_ACCOUNT_SID.strip(),
            TWILIO_AUTH_TOKEN.strip()
        )
        
        # Send message
        message_obj = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=message,
            to=recipient
        )
        print(f"[SEND] Message sent with SID: {message_obj.sid}")
        
        # Wait 4 seconds to respect the 3-second rate limit
     
        return message_obj.sid
    except Exception as e:
        print(f"[SEND] Error sending message: {e}")
        raise  # Re-raise to let the caller handle the error

def split_message(text, max_length=1500):
    """
    Split a message into chunks of max_length characters
    """
    # If the message is short enough, return it as is
    if len(text) <= max_length:
        return [text]
    
    # Otherwise, split it into chunks
    chunks = []
    current_chunk = ""
    
    # Try to split at paragraph breaks
    paragraphs = text.split("\n\n")
    
    for para in paragraphs:
        # If adding this paragraph would exceed the limit, start a new chunk
        if len(current_chunk) + len(para) + 2 > max_length:  # +2 for "\n\n"
            if current_chunk:
                chunks.append(current_chunk)
            
            # If the paragraph itself is too long, split it further
            if len(para) > max_length:
                # Split at sentence breaks
                sentences = para.split(". ")
                current_chunk = ""
                
                for sentence in sentences:
                    # If adding this sentence would exceed the limit, start a new chunk
                    if len(current_chunk) + len(sentence) + 2 > max_length:
                        if current_chunk:
                            chunks.append(current_chunk)
                        
                        # If the sentence itself is too long, just truncate
                        if len(sentence) > max_length:
                            chunks.extend([sentence[i:i+max_length-3] + "..." for i in range(0, len(sentence), max_length-3)])
                            current_chunk = ""
                        else:
                            current_chunk = sentence + ". "
                    else:
                        current_chunk += sentence + ". "
            else:
                current_chunk = para
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
    
    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks
@app.route('/send-welcome', methods=['POST'])
def send_welcome_message():
    """
    API endpoint to send a welcome message to a user
    """
    data = request.json
    
    if not data or 'to' not in data:
        return jsonify({
            "error": "Missing 'to' field in request"
        }), 400
    
    to_number = data['to']
    # Ensure the to_number has the WhatsApp prefix
    if not to_number.startswith('whatsapp:'):
        to_number = f"whatsapp:{to_number}"
    
    welcome_message = "Hello! I'm WhatsappFactCheck Bot - your advanced fact checker! Send me any text, news, voice messages, or claims to verify using multiple reliable sources."
    message_sid = send_whatsapp_message(to_number, welcome_message)
    
    if message_sid:
        return jsonify({
            "success": True,
            "message_sid": message_sid
        })
    else:
        return jsonify({
            "success": False,
            "error": "Failed to send message"
        }), 500

if __name__ == '__main__':
    # Send a notification on startup
    print("WhatsApp Fact Checker Bot with Serper API starting up...")
    print(f"SERPER_API_KEY: {'✓ Set' if SERPER_API_KEY else '✗ Missing (REQUIRED)'}")
    
    if not SERPER_API_KEY:
        print("\n⚠️ ERROR: SERPER_API_KEY environment variable is required but not set.")
        print("Please set this in your .env file and restart the application.\n")
    
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)