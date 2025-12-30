"""
SeanceAI - Talk to History
Flask application for conversing with historical figures powered by AI.
"""

# Patch gevent for async support (must be done before other imports)
try:
    from gevent import monkey
    monkey.patch_all()
except ImportError:
    pass  # gevent not installed (local dev)

import os
import json
import time
import requests
from typing import Tuple
from flask import Flask, render_template, jsonify, request, Response
from dotenv import load_dotenv
from figures import get_all_figures, get_figure, get_system_prompt, get_dinner_party_prompt, CURATED_COMBOS

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free"
MAX_HISTORY = 20  # Maximum number of messages to keep in history

# Rate limit handling configuration
MAX_RETRIES = 3
RETRY_DELAYS = [2, 5, 10]  # Exponential backoff delays in seconds

# Fallback models when primary model is rate-limited (in order of preference)
FALLBACK_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "deepseek/deepseek-r1:free",
]

# Available models - mix of free and premium
AVAILABLE_MODELS = [
    {"id": "google/gemini-2.0-flash-exp:free", "name": "Gemini 2.0 Flash (Free)", "tier": "free"},
    {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (Free)", "tier": "free"},
    {"id": "deepseek/deepseek-r1:free", "name": "DeepSeek R1 (Free)", "tier": "free"},
    {"id": "qwen/qwen-2.5-72b-instruct:free", "name": "Qwen 2.5 72B (Free)", "tier": "free"},
    {"id": "mistralai/mistral-small-3.1-24b-instruct:free", "name": "Mistral Small 3.1 (Free)", "tier": "free"},
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash", "tier": "cheap"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "tier": "cheap"},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku", "tier": "cheap"},
    {"id": "deepseek/deepseek-chat", "name": "DeepSeek V3", "tier": "cheap"},
    {"id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4", "tier": "premium"},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "tier": "premium"},
    {"id": "google/gemini-2.5-pro-preview", "name": "Gemini 2.5 Pro", "tier": "premium"},
    {"id": "anthropic/claude-opus-4", "name": "Claude Opus 4", "tier": "premium"},
]


def _make_api_request(messages: list, model: str, timeout: int = 30, stream: bool = False):
    """
    Make a single API request to OpenRouter.
    Returns (response, error_info) tuple.
    error_info is None on success, or a dict with 'status_code', 'is_rate_limit', 'message'.
    """
    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": request.host_url if request else "http://localhost",
                "X-Title": "SeanceAI - Talk to History"
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.8,
                **({"stream": True} if stream else {})
            },
            timeout=timeout,
            stream=stream
        )
        
        # Check for rate limiting before raise_for_status
        if response.status_code == 429:
            error_msg = "Rate limited"
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('metadata', {}).get('raw', error_msg)
            except:
                pass
            return None, {
                'status_code': 429,
                'is_rate_limit': True,
                'message': error_msg
            }
        
        response.raise_for_status()
        return response, None
        
    except requests.exceptions.Timeout:
        return None, {
            'status_code': None,
            'is_rate_limit': False,
            'message': 'Request timed out'
        }
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response else None
        error_msg = str(e)
        try:
            if e.response:
                error_data = e.response.json()
                error_msg = error_data.get('error', {}).get('message', str(e))
        except:
            pass
        return None, {
            'status_code': status_code,
            'is_rate_limit': status_code == 429,
            'message': error_msg
        }
    except requests.exceptions.RequestException as e:
        return None, {
            'status_code': None,
            'is_rate_limit': False,
            'message': str(e)
        }


def call_llm(messages: list, model: str = None) -> Tuple[str, bool]:
    """
    Call the OpenRouter API with the given messages.
    Includes retry logic with exponential backoff and model fallback for rate limits.
    Returns a tuple: (response_text, is_error)
    If is_error is True, response_text contains an error message.
    """
    if not OPENROUTER_API_KEY:
        app.logger.error("OPENROUTER_API_KEY is not set")
        return ("OpenRouter API key not configured. Please set the OPENROUTER_API_KEY environment variable.", True)
    
    selected_model = model or DEFAULT_MODEL
    models_to_try = [selected_model] + [m for m in FALLBACK_MODELS if m != selected_model]
    
    last_error = None
    
    for model_index, current_model in enumerate(models_to_try):
        app.logger.info(f"Trying model: {current_model} (attempt {model_index + 1}/{len(models_to_try)})")
        
        # Retry loop for current model
        for retry in range(MAX_RETRIES):
            app.logger.info(f"Calling OpenRouter API with model: {current_model} (retry {retry + 1}/{MAX_RETRIES})")
            
            response, error_info = _make_api_request(messages, current_model)
            
            if response is not None:
                # Success! Parse the response
                try:
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0]["message"]["content"]
                        app.logger.info(f"Successfully received response from {current_model}")
                        return (content, False)
                    else:
                        app.logger.warning("OpenRouter API returned no choices in response")
                        return ("I apologize, but I seem to be having trouble formulating my thoughts. Could you perhaps rephrase your question?", True)
                except (KeyError, IndexError, json.JSONDecodeError) as e:
                    app.logger.error(f"Unexpected API response format: {e}")
                    return ("The connection to the past seems unclear. Please try again.", True)
            
            # Handle error
            last_error = error_info
            
            if error_info['is_rate_limit']:
                app.logger.warning(f"Rate limited on {current_model}: {error_info['message']}")
                
                # If this is not the last retry, wait before retrying
                if retry < MAX_RETRIES - 1:
                    delay = RETRY_DELAYS[min(retry, len(RETRY_DELAYS) - 1)]
                    app.logger.info(f"Waiting {delay}s before retry...")
                    time.sleep(delay)
                else:
                    # Last retry for this model, try next model
                    app.logger.info(f"Max retries reached for {current_model}, trying next model...")
                    break
            else:
                # Non-rate-limit error, don't retry
                app.logger.error(f"API error: {error_info['message']}")
                break
    
    # All models and retries exhausted
    if last_error and last_error['is_rate_limit']:
        app.logger.error("All models rate-limited")
        return ("The spirits are overwhelmed with visitors right now. Please wait a moment and try again, or select a different AI model from the dropdown.", True)
    elif last_error and last_error.get('status_code') == 401:
        return ("I apologize, but your API key appears to be invalid. Please check your configuration.", True)
    elif last_error and 'timed out' in last_error.get('message', '').lower():
        return ("The spirits seem distant at the moment. Please try again in a moment.", True)
    else:
        app.logger.error(f"All attempts failed. Last error: {last_error}")
        return ("I apologize, but something has disrupted our connection. Please try again.", True)


def stream_llm(messages: list, model: str = None):
    """
    Stream response from OpenRouter API using Server-Sent Events.
    Includes retry logic with model fallback for rate limits.
    Yields SSE-formatted chunks as they arrive.
    """
    if not OPENROUTER_API_KEY:
        app.logger.error("OPENROUTER_API_KEY is not set for streaming")
        yield f"data: {json.dumps({'error': 'OpenRouter API key not configured. Please set the OPENROUTER_API_KEY environment variable.'})}\n\n"
        return
    
    selected_model = model or DEFAULT_MODEL
    models_to_try = [selected_model] + [m for m in FALLBACK_MODELS if m != selected_model]
    
    last_error = None
    success = False
    
    for model_index, current_model in enumerate(models_to_try):
        if success:
            break
            
        app.logger.info(f"Streaming: trying model {current_model} (attempt {model_index + 1}/{len(models_to_try)})")
        
        for retry in range(MAX_RETRIES):
            if success:
                break
                
            app.logger.info(f"Streaming request to OpenRouter API with model: {current_model} (retry {retry + 1}/{MAX_RETRIES})")
            
            response, error_info = _make_api_request(messages, current_model, timeout=60, stream=True)
            
            if response is not None:
                # Success! Stream the response
                try:
                    for line in response.iter_lines():
                        if line:
                            line_text = line.decode('utf-8')
                            if line_text.startswith('data: '):
                                data_str = line_text[6:]  # Remove 'data: ' prefix
                                if data_str.strip() == '[DONE]':
                                    yield f"data: {json.dumps({'done': True})}\n\n"
                                    success = True
                                    break
                                try:
                                    data = json.loads(data_str)
                                    if 'choices' in data and len(data['choices']) > 0:
                                        delta = data['choices'][0].get('delta', {})
                                        content = delta.get('content', '')
                                        if content:
                                            yield f"data: {json.dumps({'content': content})}\n\n"
                                            success = True  # Mark as success once we get content
                                except json.JSONDecodeError:
                                    continue
                    
                    if success:
                        return  # Exit completely on success
                        
                except Exception as e:
                    app.logger.error(f"Streaming read error: {e}")
                    last_error = {'message': str(e), 'is_rate_limit': False}
                    break
            else:
                # Handle error
                last_error = error_info
                
                if error_info['is_rate_limit']:
                    app.logger.warning(f"Streaming rate limited on {current_model}: {error_info['message']}")
                    
                    # If this is not the last retry, wait before retrying
                    if retry < MAX_RETRIES - 1:
                        delay = RETRY_DELAYS[min(retry, len(RETRY_DELAYS) - 1)]
                        app.logger.info(f"Waiting {delay}s before retry...")
                        time.sleep(delay)
                    else:
                        # Last retry for this model, try next model
                        app.logger.info(f"Max retries reached for {current_model}, trying next model...")
                        break
                else:
                    # Non-rate-limit error, don't retry
                    app.logger.error(f"Streaming API error: {error_info['message']}")
                    break
    
    # All models and retries exhausted - yield error
    if not success:
        if last_error and last_error.get('is_rate_limit'):
            app.logger.error("Streaming: All models rate-limited")
            yield f"data: {json.dumps({'error': 'The spirits are overwhelmed with visitors. Please wait a moment and try again, or select a different AI model.', 'rate_limited': True})}\n\n"
        elif last_error and 'timed out' in last_error.get('message', '').lower():
            yield f"data: {json.dumps({'error': 'The spirits seem distant. Please try again.'})}\n\n"
        else:
            app.logger.error(f"Streaming: All attempts failed. Last error: {last_error}")
            yield f"data: {json.dumps({'error': 'Connection disrupted. Please try again.'})}\n\n"


@app.route('/')
def index():
    """Serve the main HTML page."""
    return render_template('index.html')


@app.route('/api/figures')
def api_figures():
    """Return list of all historical figures."""
    figures = get_all_figures()
    return jsonify({"figures": figures})


@app.route('/api/figures/<figure_id>')
def api_figure(figure_id):
    """Return data for a single historical figure."""
    figure = get_figure(figure_id)
    if figure:
        return jsonify({"figure": figure})
    else:
        return jsonify({"error": "Figure not found"}), 404


@app.route('/api/models')
def api_models():
    """Return list of available AI models."""
    return jsonify({"models": AVAILABLE_MODELS, "default": DEFAULT_MODEL})


@app.route('/api/health')
def api_health():
    """Health check endpoint for Railway monitoring."""
    health_status = {
        "status": "healthy",
        "api_key_configured": bool(OPENROUTER_API_KEY),
        "api_key_length": len(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else 0
    }
    
    if not OPENROUTER_API_KEY:
        health_status["status"] = "degraded"
        health_status["warning"] = "OPENROUTER_API_KEY is not set"
    
    return jsonify(health_status)


@app.route('/api/chat', methods=['POST'])
def api_chat():
    """
    Handle chat messages.
    Expects JSON body: { "figure_id": "einstein", "message": "Hello!", "history": [...] }
    Returns: { "response": "Ah, greetings!...", "figure": {...} }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        figure_id = data.get('figure_id')
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        model = data.get('model')  # Optional model override
        
        if not figure_id:
            return jsonify({"error": "No figure_id provided"}), 400
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        # Get figure data and system prompt
        figure = get_figure(figure_id)
        system_prompt = get_system_prompt(figure_id)
        
        if not figure or not system_prompt:
            return jsonify({"error": "Figure not found"}), 404
        
        # Build messages for the API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (limited to last MAX_HISTORY messages)
        for msg in history[-MAX_HISTORY:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add the new user message
        messages.append({"role": "user", "content": user_message})
        
        # Get AI response
        ai_response, is_error = call_llm(messages, model)
        
        if is_error:
            return jsonify({
                "error": ai_response,
                "figure": figure
            }), 500
        else:
            return jsonify({
                "response": ai_response,
                "figure": figure
            })
        
    except Exception as e:
        app.logger.error(f"Chat error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.route('/api/chat/stream', methods=['POST'])
def api_chat_stream():
    """
    Handle streaming chat messages using Server-Sent Events.
    Expects JSON body: { "figure_id": "einstein", "message": "Hello!", "history": [...] }
    Returns: SSE stream with content chunks
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        figure_id = data.get('figure_id')
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        model = data.get('model')  # Optional model override
        
        if not figure_id:
            return jsonify({"error": "No figure_id provided"}), 400
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        # Get figure data and system prompt
        figure = get_figure(figure_id)
        system_prompt = get_system_prompt(figure_id)
        
        if not figure or not system_prompt:
            return jsonify({"error": "Figure not found"}), 404
        
        # Build messages for the API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (limited to last MAX_HISTORY messages)
        for msg in history[-MAX_HISTORY:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add the new user message
        messages.append({"role": "user", "content": user_message})
        
        # Return streaming response
        return Response(
            stream_llm(messages, model),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        app.logger.error(f"Stream chat error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.route('/api/dinner-party/combos')
def api_dinner_party_combos():
    """Return curated guest combinations for dinner parties."""
    return jsonify({"combos": CURATED_COMBOS})


@app.route('/api/dinner-party/chat', methods=['POST'])
def api_dinner_party_chat():
    """
    Handle dinner party messages where multiple figures respond.
    Uses a single LLM call with structured output for efficiency.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        guest_ids = data.get('guests', [])
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        model = data.get('model')
        
        if not guest_ids or len(guest_ids) < 2:
            return jsonify({"error": "At least 2 guests required"}), 400
        
        if len(guest_ids) > 5:
            return jsonify({"error": "Maximum 5 guests allowed"}), 400
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        # Validate all guests exist
        guests = []
        for guest_id in guest_ids:
            figure = get_figure(guest_id)
            if not figure:
                return jsonify({"error": f"Guest '{guest_id}' not found"}), 404
            guests.append(figure)
        
        # Build the dinner party system prompt
        system_prompt = get_dinner_party_prompt(guest_ids)
        
        # Build messages for the API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in history[-MAX_HISTORY:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add the new user message
        messages.append({"role": "user", "content": user_message})
        
        # Get AI response
        ai_response, is_error = call_llm(messages, model)
        
        if is_error:
            return jsonify({
                "error": ai_response,
                "guests": guests
            }), 500
        
        # Parse the response - the LLM returns responses for each figure
        # Format expected: [FIGURE_ID]: response text
        responses = parse_dinner_party_response(ai_response, guest_ids)
        
        return jsonify({
            "responses": responses,
            "raw_response": ai_response,
            "guests": guests
        })
        
    except Exception as e:
        app.logger.error(f"Dinner party chat error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.route('/api/dinner-party/chat/stream', methods=['POST'])
def api_dinner_party_chat_stream():
    """
    Handle streaming dinner party messages using Server-Sent Events.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        guest_ids = data.get('guests', [])
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        model = data.get('model')
        
        if not guest_ids or len(guest_ids) < 2:
            return jsonify({"error": "At least 2 guests required"}), 400
        
        if len(guest_ids) > 5:
            return jsonify({"error": "Maximum 5 guests allowed"}), 400
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        # Validate all guests exist
        for guest_id in guest_ids:
            if not get_figure(guest_id):
                return jsonify({"error": f"Guest '{guest_id}' not found"}), 404
        
        # Build the dinner party system prompt
        system_prompt = get_dinner_party_prompt(guest_ids)
        
        # Build messages for the API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in history[-MAX_HISTORY:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add the new user message
        messages.append({"role": "user", "content": user_message})
        
        # Return streaming response
        return Response(
            stream_llm(messages, model),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        app.logger.error(f"Dinner party stream error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


def parse_dinner_party_response(response: str, guest_ids: list) -> list:
    """
    Parse the dinner party response into individual figure responses.
    Expected format: [FIGURE_ID]: response text
    """
    responses = []
    current_figure = None
    current_text = []
    
    lines = response.strip().split('\n')
    
    for line in lines:
        # Check if this line starts a new figure's response
        found_figure = False
        for guest_id in guest_ids:
            # Check for various formats: [einstein]:, EINSTEIN:, **Einstein:**
            markers = [
                f"[{guest_id}]:",
                f"[{guest_id.upper()}]:",
                f"{guest_id.upper()}:",
                f"**{guest_id.title()}:**",
                f"**{get_figure(guest_id)['name']}:**",
                f"{get_figure(guest_id)['name']}:",
            ]
            for marker in markers:
                if line.strip().upper().startswith(marker.upper().rstrip(':')):
                    # Save previous figure's response
                    if current_figure and current_text:
                        responses.append({
                            "figure_id": current_figure,
                            "response": '\n'.join(current_text).strip()
                        })
                    
                    current_figure = guest_id
                    # Extract text after the marker
                    remaining = line
                    for m in markers:
                        if remaining.strip().upper().startswith(m.upper().rstrip(':')):
                            remaining = remaining[len(m):].strip()
                            break
                    current_text = [remaining] if remaining else []
                    found_figure = True
                    break
            if found_figure:
                break
        
        if not found_figure and current_figure:
            current_text.append(line)
    
    # Don't forget the last figure's response
    if current_figure and current_text:
        responses.append({
            "figure_id": current_figure,
            "response": '\n'.join(current_text).strip()
        })
    
    # If parsing failed, return the whole response attributed to first guest
    if not responses and response.strip():
        responses.append({
            "figure_id": guest_ids[0],
            "response": response.strip()
        })
    
    return responses


@app.route('/api/dinner-party/suggestions', methods=['POST'])
def api_dinner_party_suggestions():
    """
    Generate follow-up question suggestions for dinner party using LLM.
    Returns quickly with 3 contextual suggestions.
    Uses a fast, lightweight prompt for speed.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"suggestions": ["What do you think?", "Tell us more!", "Do you agree?"]}), 200
        
        guest_ids = data.get('guests', [])
        history = data.get('history', [])
        last_response = data.get('last_response', '')
        
        # Build guest names
        guest_names = []
        for guest_id in guest_ids:
            figure = get_figure(guest_id)
            if figure:
                guest_names.append(figure['name'])
        
        # Create a concise prompt for generating suggestions quickly
        prompt = f"""Generate 3 short follow-up questions (under 40 chars each) for a dinner party with {', '.join(guest_names[:3])}.

Last response: "{last_response[:200]}..."

Return ONLY a JSON array: ["Question 1?", "Question 2?", "Question 3?"]"""
        
        messages = [
            {"role": "system", "content": "You generate short, engaging discussion questions. Return only valid JSON array, no other text."},
            {"role": "user", "content": prompt}
        ]
        
        # Use a fast model for quick suggestions (or default to fastest available)
        response, is_error = call_llm(messages, None)
        
        if is_error:
            return jsonify({"suggestions": ["What else?", "Do you agree?", "Tell us more!"]}), 200
        
        # Parse JSON response
        try:
            import re
            import json
            # Find JSON array in response
            match = re.search(r'\[.*?\]', response, re.DOTALL)
            if match:
                suggestions = json.loads(match.group())
                if isinstance(suggestions, list) and len(suggestions) >= 3:
                    # Truncate long suggestions and clean up
                    suggestions = [s.strip()[:40] for s in suggestions[:3] if s.strip()]
                    if len(suggestions) >= 3:
                        return jsonify({"suggestions": suggestions}), 200
        except Exception as e:
            app.logger.debug(f"JSON parse error: {e}")
            pass
        
        # Fallback
        return jsonify({"suggestions": ["What else?", "Do you agree?", "Tell us more!"]}), 200
        
    except Exception as e:
        app.logger.error(f"Suggestions error: {e}")
        return jsonify({"suggestions": ["What else?", "Do you agree?", "Tell us more!"]}), 200


@app.route('/api/suggestions', methods=['POST'])
def api_suggestions():
    """
    Generate contextual follow-up questions based on conversation history.
    Expects JSON body: { "figure_id": "einstein", "history": [...], "last_response": "..." }
    Returns: { "suggestions": ["question1", "question2", ...] }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        figure_id = data.get('figure_id')
        history = data.get('history', [])
        last_response = data.get('last_response', '')
        model = data.get('model')  # Optional model override
        
        if not figure_id:
            return jsonify({"error": "No figure_id provided"}), 400
        
        # Get figure data
        figure = get_figure(figure_id)
        if not figure:
            return jsonify({"error": "Figure not found"}), 404
        
        # Build a prompt to generate contextual questions
        conversation_context = ""
        if history:
            # Include last few exchanges for context
            recent_history = history[-4:] if len(history) > 4 else history
            for msg in recent_history:
                role = "User" if msg.get("role") == "user" else figure['name']
                conversation_context += f"{role}: {msg.get('content', '')}\n\n"
        
        if last_response:
            conversation_context += f"{figure['name']}: {last_response}\n\n"
        
        suggestion_prompt = f"""Based on this conversation with {figure['name']}, generate 3-4 engaging follow-up questions that a user might ask to continue the conversation naturally. The questions should:
1. Be contextually relevant to what was just discussed
2. Be engaging and encourage deeper conversation
3. Be phrased as if the user is speaking directly to {figure['name']}
4. Vary in depth and topic
5. Be concise (one sentence each)

Conversation so far:
{conversation_context}

Generate ONLY the questions, one per line, without numbering or bullets. Return them as a simple list."""

        messages = [
            {"role": "system", "content": "You are a helpful assistant that generates engaging conversation questions. Return only the questions, one per line."},
            {"role": "user", "content": suggestion_prompt}
        ]
        
        # Use a fast model for suggestions
        response_text, is_error = call_llm(messages, model or DEFAULT_MODEL)
        
        # If there's an error, use fallback suggestions
        if is_error:
            app.logger.warning(f"Failed to generate suggestions: {response_text}")
        
        # Parse the response into individual questions
        suggestions = []
        for line in response_text.strip().split('\n'):
            line = line.strip()
            # Remove numbering/bullets if present
            line = line.lstrip('0123456789.-•* ').strip()
            if line and len(line) > 10:  # Filter out very short lines
                suggestions.append(line)
        
        # Limit to 4 suggestions
        suggestions = suggestions[:4]
        
        # If we didn't get good suggestions, provide some generic ones
        if not suggestions:
            suggestions = [
                f"Tell me more about that.",
                f"What was your perspective on that?",
                f"How did that affect you?",
                f"What would you like to discuss next?"
            ]
        
        return jsonify({"suggestions": suggestions})
        
    except Exception as e:
        app.logger.error(f"Suggestions error: {e}")
        # Return generic fallback suggestions
        figure = get_figure(data.get('figure_id', ''))
        figure_name = figure['name'] if figure else "the spirit"
        return jsonify({
            "suggestions": [
                "Tell me more about that.",
                "What was your perspective on that?",
                "How did that affect you?",
                "What would you like to discuss next?"
            ]
        })


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=debug, host='0.0.0.0', port=port)

