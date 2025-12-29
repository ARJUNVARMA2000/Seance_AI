"""
SeanceAI - Talk to History
Flask application for conversing with historical figures powered by AI.
"""

import os
import json
import logging
import requests
from flask import Flask, render_template, jsonify, request, Response
from dotenv import load_dotenv
from figures import get_all_figures, get_figure, get_system_prompt

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add CORS headers for better compatibility
@app.after_request
def after_request(response):
    """Add CORS and security headers."""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# Configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free"
MAX_HISTORY = 20  # Maximum number of messages to keep in history

# Available models - top weekly models from OpenRouter (mix of free and premium)
AVAILABLE_MODELS = [
    # Free tier - great for testing
    {"id": "google/gemini-2.0-flash-exp:free", "name": "Gemini 2.0 Flash (Free)", "tier": "free"},
    {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (Free)", "tier": "free"},
    {"id": "deepseek/deepseek-r1:free", "name": "DeepSeek R1 (Free)", "tier": "free"},
    {"id": "qwen/qwen-2.5-72b-instruct:free", "name": "Qwen 2.5 72B (Free)", "tier": "free"},
    {"id": "mistralai/mistral-small-3.1-24b-instruct:free", "name": "Mistral Small 3.1 (Free)", "tier": "free"},
    # Affordable premium - best value
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash", "tier": "cheap"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "tier": "cheap"},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku", "tier": "cheap"},
    {"id": "deepseek/deepseek-chat", "name": "DeepSeek V3", "tier": "cheap"},
    # Premium tier - top quality
    {"id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4", "tier": "premium"},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "tier": "premium"},
    {"id": "google/gemini-2.5-pro-preview", "name": "Gemini 2.5 Pro", "tier": "premium"},
    {"id": "anthropic/claude-opus-4", "name": "Claude Opus 4", "tier": "premium"},
]


def call_llm(messages: list, model: str = None) -> str:
    """
    Call the OpenRouter API with the given messages.
    Returns the AI response text or an error message.
    """
    if not OPENROUTER_API_KEY:
        return "Error: OpenRouter API key not configured. Please set the OPENROUTER_API_KEY environment variable."
    
    selected_model = model or DEFAULT_MODEL
    
    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": request.host_url,
                "X-Title": "SeanceAI - Talk to History"
            },
            json={
                "model": selected_model,
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.8
            },
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"]
        else:
            return "I apologize, but I seem to be having trouble formulating my thoughts. Could you perhaps rephrase your question?"
            
    except requests.exceptions.Timeout:
        return "The spirits seem distant at the moment. Please try again in a moment."
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        # Log more details in debug mode
        if app.debug:
            logger.error(f"Request details: {e.response.text if hasattr(e, 'response') and e.response else 'No response'}")
        return "I apologize, but something has disrupted our connection. Please try again."
    except (KeyError, IndexError) as e:
        logger.error(f"Unexpected API response format: {e}")
        if app.debug:
            logger.error(f"Response data: {data if 'data' in locals() else 'No data'}")
        return "The connection to the past seems unclear. Please try again."


def stream_llm(messages: list, model: str = None):
    """
    Stream response from OpenRouter API using Server-Sent Events.
    Yields SSE-formatted chunks as they arrive.
    """
    if not OPENROUTER_API_KEY:
        yield f"data: {json.dumps({'error': 'API key not configured'})}\n\n"
        return
    
    selected_model = model or DEFAULT_MODEL
    
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
                "model": selected_model,
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.8,
                "stream": True
            },
            timeout=60,
            stream=True
        )
        
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line_text = line.decode('utf-8')
                if line_text.startswith('data: '):
                    data_str = line_text[6:]  # Remove 'data: ' prefix
                    if data_str.strip() == '[DONE]':
                        yield f"data: {json.dumps({'done': True})}\n\n"
                        break
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data and len(data['choices']) > 0:
                            delta = data['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"
                    except json.JSONDecodeError:
                        continue
                        
    except requests.exceptions.Timeout:
        yield f"data: {json.dumps({'error': 'The spirits seem distant. Please try again.'})}\n\n"
    except requests.exceptions.RequestException as e:
        logger.error(f"Streaming API request failed: {e}")
        if app.debug:
            logger.error(f"Request details: {e.response.text if hasattr(e, 'response') and e.response else 'No response'}")
        yield f"data: {json.dumps({'error': 'Connection disrupted. Please try again.'})}\n\n"
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        yield f"data: {json.dumps({'error': 'An unexpected error occurred.'})}\n\n"


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
    """Health check endpoint."""
    api_key_set = bool(OPENROUTER_API_KEY)
    figures_count = len(get_all_figures())
    
    return jsonify({
        "status": "healthy",
        "api_key_configured": api_key_set,
        "figures_available": figures_count,
        "models_available": len(AVAILABLE_MODELS)
    })


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
        ai_response = call_llm(messages, model)
        
        return jsonify({
            "response": ai_response,
            "figure": figure
        })
        
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
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
        logger.error(f"Stream chat error: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    # Return HTML for browser requests, JSON for API requests
    if request.path.startswith('/api/'):
        return jsonify({"error": "Not found", "path": request.path}), 404
    # For non-API routes, return a simple HTML error page
    return render_template('index.html'), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    logger.error(f"Server error: {e}", exc_info=True)
    if request.path.startswith('/api/'):
        return jsonify({"error": "Internal server error"}), 500
    return render_template('index.html'), 500


@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {e}", exc_info=True)
    if request.path.startswith('/api/'):
        return jsonify({"error": "An unexpected error occurred"}), 500
    return render_template('index.html'), 500


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    
    # Log startup information
    logger.info("=" * 60)
    logger.info("SeanceAI - Starting Flask Server")
    logger.info("=" * 60)
    logger.info(f"Port: {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"API key configured: {bool(OPENROUTER_API_KEY)}")
    logger.info(f"Figures available: {len(get_all_figures())}")
    logger.info(f"Models available: {len(AVAILABLE_MODELS)}")
    logger.info("=" * 60)
    logger.info(f"Access the website at: http://localhost:{port}")
    logger.info("=" * 60)
    
    app.run(debug=debug, host='0.0.0.0', port=port)

