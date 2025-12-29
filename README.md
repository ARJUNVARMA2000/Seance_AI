# SeanceAI - Talk to History

A browser-based web application where users can have conversations with famous historical figures powered by AI. The AI roleplays as historical figures with accurate personalities, speaking styles, and knowledge limited to their era.

## Features

- **12 Historical Figures**: Einstein, Cleopatra, da Vinci, Lincoln, Curie, Caesar, Shakespeare, Tesla, Socrates, Genghis Khan, Napoleon, Queen Elizabeth I
- **Authentic Personas**: Each figure has unique personality, speaking style, and era-appropriate knowledge
- **Museum-Themed UI**: Dark, elegant design with gold accents
- **Mobile Responsive**: Works on all device sizes
- **Conversation History**: Maintains context for natural dialogue

## Tech Stack

- **Backend**: Python 3.11+ with Flask
- **Frontend**: HTML/CSS/JavaScript (no framework)
- **AI**: OpenRouter API (Llama 3.1 8B free tier)
- **Deployment**: Railway.app ready

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/ARJUNVARMA2000/Seance_AI.git
cd Seance_AI
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenRouter API key
```

5. Run the development server:
```bash
python app.py
```

6. Open http://localhost:5000 in your browser

## Deployment to Railway

1. Fork this repository
2. Create a new project on [Railway.app](https://railway.app)
3. Connect your GitHub repository
4. Add environment variable: `OPENROUTER_API_KEY`
5. Deploy!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serve main HTML page |
| GET | `/api/figures` | Return list of all figures |
| GET | `/api/figures/<id>` | Return single figure data |
| POST | `/api/chat` | Send message, receive AI response |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `FLASK_DEBUG` | Set to `true` for development |

## License

MIT License

