"""
SeanceAI - Talk to History
Flask application for conversing with historical figures powered by AI.
"""

import os
import json
import requests
from flask import Flask, render_template, jsonify, request, Response
from dotenv import load_dotenv
from figures import get_all_figures, get_figure, get_system_prompt

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free"
MAX_HISTORY = 20  # Maximum number of messages to keep in history

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
        app.logger.error(f"API request failed: {e}")
        return "I apologize, but something has disrupted our connection. Please try again."
    except (KeyError, IndexError) as e:
        app.logger.error(f"Unexpected API response format: {e}")
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
        app.logger.error(f"Streaming API request failed: {e}")
        yield f"data: {json.dumps({'error': 'Connection disrupted. Please try again.'})}\n\n"
    except Exception as e:
        app.logger.error(f"Streaming error: {e}")
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
        response_text = call_llm(messages, model or DEFAULT_MODEL)
        
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

