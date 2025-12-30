# ☽ SeanceAI - Commune with the Minds of History

> **Step into a digital séance and converse with the greatest minds humanity has ever known.** From Einstein's thought experiments to Cleopatra's political wisdom, from da Vinci's boundless curiosity to Lincoln's moral clarity—experience history through authentic, AI-powered conversations.

[![Live Demo](https://img.shields.io/badge/🚀-Try%20Live%20Demo-blue?style=for-the-badge)](https://your-demo-url.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

---

## ✨ What Makes This Special?

**SeanceAI isn't just another chatbot.** It's a meticulously crafted experience that brings history to life through authentic roleplay, era-appropriate knowledge, and genuine personality. Each historical figure speaks in their own voice, knows only what they would have known in their lifetime, and reacts with the curiosity and wonder appropriate to their time.

### 🎭 Two Unique Modes

**🔮 Seance Mode** - Have intimate, one-on-one conversations with legendary figures. Ask Einstein about relativity, discuss philosophy with Socrates, or learn about ancient Egypt from Cleopatra herself.

**🍷 Dinner Party Mode** - Invite 2-5 historical figures to the same conversation. Watch as Einstein debates with Newton, or witness Cleopatra and Caesar discuss strategy. Each guest responds authentically, creating dynamic multi-perspective dialogues.

---

## 🌟 Features That Bring History to Life

### 🎨 **Immersive Museum-Themed Experience**
- Elegant dark UI with gold accents that feels like stepping into a grand museum
- Beautiful SVG portraits for 60+ historical figures
- Smooth animations and thoughtful interactions
- Fully responsive—works beautifully on desktop, tablet, and mobile

### 🧠 **Authentic Historical Personas**
- Each figure has unique personality traits, speaking styles, and vocabulary
- Era-appropriate knowledge—figures don't know about events after their death
- Genuine reactions to modern concepts (they'll ask you to explain!)
- References to real historical experiences, works, and relationships

### 🎯 **Smart Conversation Features**
- **Contextual Suggestions** - AI-generated follow-up questions based on your conversation
- **Conversation History** - Maintains context for natural, flowing dialogue
- **Save & Resume** - Bookmark your favorite conversations and return anytime
- **Export Options** - Download conversations as text files

### 🤖 **Flexible AI Models**
- Choose from free and premium AI models
- Automatic fallback system handles rate limits gracefully
- Streaming responses for real-time conversation feel
- Optimized for both speed and quality

### 📚 **60+ Historical Figures Across Eras**
- **Ancient World**: Cleopatra, Caesar, Socrates, Archimedes, Aristotle
- **Renaissance**: Leonardo da Vinci, Galileo, Copernicus
- **19th Century**: Lincoln, Darwin, Tesla, Curie, Napoleon
- **Modern Era**: Einstein, Turing, Hawking, Feynman, Sagan
- **And many more** - Scientists, philosophers, leaders, artists, mathematicians

---

## 📸 See It In Action

**Experience the magic yourself:** [Try the live demo](#) or [run it locally](#-quick-start-for-developers)

### Screenshots

![Figure Selection](docs/screenshots/figure-selection.png)
*Browse 60+ historical figures across different eras. Search by name or filter by historical period.*

![Seance Mode - Conversation with Einstein](docs/screenshots/seance-einstein.png)
*Having a deep conversation about relativity with Albert Einstein. Each figure has unique starter questions to help you begin.*

![Dinner Party Selection](docs/screenshots/dinner-party-selection.png)
*Select 2-5 historical figures to invite to your dinner party. Use quick selection buttons or choose individual guests.*

![Dinner Party Mode](docs/screenshots/dinner-party.png)
*Hosting a dinner party with Einstein, Newton, and Curie. Watch as they discuss, debate, and respond to your questions together.*

### What You'll Experience

- **🎭 Authentic Conversations** - Each figure speaks in their unique voice with era-appropriate knowledge
- **🍷 Dynamic Dinner Parties** - Watch historical figures debate and discuss with each other
- **🎨 Beautiful Interface** - Museum-themed design that makes every conversation feel special
- **📱 Works Everywhere** - Seamless experience on desktop, tablet, and mobile devices

---

## 🚀 Quick Start (For Developers)

### Prerequisites
- Python 3.11 or higher
- An OpenRouter API key ([Get one free here](https://openrouter.ai/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ARJUNVARMA2000/Seance_AI.git
cd Seance_AI
```

2. **Create a virtual environment**
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
# Create a .env file in the project root
echo OPENROUTER_API_KEY=your_key_here > .env
```

5. **Run the development server**
```bash
python app.py
```

6. **Open your browser**
Navigate to `http://localhost:5000` and start conversing with history!

> 💡 **Pro Tip:** Check out [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions and troubleshooting.

---

## 🏗️ Tech Stack

**Backend**
- Python 3.11+ with Flask
- OpenRouter API for AI model access
- Server-Sent Events (SSE) for streaming responses
- Intelligent retry logic with model fallback

**Frontend**
- Vanilla JavaScript (no framework dependencies)
- Modern CSS with custom properties
- Responsive design with mobile-first approach
- LocalStorage for conversation persistence

**AI Models**
- Primary: Gemini 2.0 Flash (Free tier)
- Fallbacks: Llama 3.3 70B, Qwen 2.5 72B, DeepSeek R1
- Premium options: GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro

**Deployment**
- Railway.app ready (see `railway.json`)
- Fly.io configuration included
- Environment-based configuration

---

## 📖 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve main HTML page |
| `GET` | `/api/figures` | Return list of all historical figures |
| `GET` | `/api/figures/<id>` | Return single figure data |
| `GET` | `/api/models` | List available AI models |
| `GET` | `/api/health` | Health check endpoint |
| `POST` | `/api/chat` | Send message, receive AI response |
| `POST` | `/api/chat/stream` | Streaming chat endpoint (SSE) |
| `POST` | `/api/dinner-party/chat` | Multi-figure conversation |
| `POST` | `/api/suggestions` | Get contextual follow-up questions |

### Example Request

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "figure_id": "einstein",
    "message": "What is your theory of relativity?",
    "history": []
  }'
```

---

## 🌐 Deployment

### Railway.app (Recommended)

1. Fork this repository
2. Create a new project on [Railway.app](https://railway.app)
3. Connect your GitHub repository
4. Add environment variable: `OPENROUTER_API_KEY`
5. Deploy! Railway will automatically detect the Flask app

### Fly.io

1. Install the [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/)
2. Run `fly launch` (uses `fly.toml` configuration)
3. Set secrets: `fly secrets set OPENROUTER_API_KEY=your_key`

### Other Platforms

The app is standard Flask and should work on any platform that supports Python:
- Heroku
- Render
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Google Cloud Run

---

## 🤝 Contributing

We welcome contributions! Whether you want to:
- Add new historical figures
- Improve conversation quality
- Enhance the UI/UX
- Fix bugs or optimize performance
- Write documentation

**Getting Started:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

**Adding a New Historical Figure:**
1. Add figure data to `figures.py` in the `HISTORICAL_FIGURES` dictionary
2. Create an SVG portrait in `static/images/figures/`
3. Ensure the system prompt captures their personality and era-appropriate knowledge
4. Test conversations to verify authenticity

**Code Style:**
- Follow PEP 8 for Python code
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and modular

---

## 🎓 Educational Use

SeanceAI is perfect for:
- **History Education** - Students can interact with historical figures they're studying
- **Critical Thinking** - Understanding different perspectives and historical context
- **Language Learning** - Practice conversations in different styles and eras
- **Creative Writing** - Get inspiration from historical voices and perspectives

> ⚠️ **Important:** This is an educational entertainment tool. While we strive for historical accuracy in personalities and knowledge, the AI responses are generated and should not be used as primary historical sources.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenRouter** for providing access to multiple AI models
- **Historical Research** - All figure personalities and knowledge are based on documented historical sources
- **The Open Source Community** - Built with amazing open-source tools

---

## 💬 Connect & Support

- **Creator**: [Arjun Varma](https://github.com/ARJUNVARMA2000)
- **Issues**: Found a bug or have a feature request? [Open an issue](https://github.com/ARJUNVARMA2000/Seance_AI/issues)
- **Discussions**: Have questions or ideas? [Start a discussion](https://github.com/ARJUNVARMA2000/Seance_AI/discussions)

---

<div align="center">

**⭐ If you find SeanceAI fascinating, please consider giving it a star! ⭐**

*"The past is never dead. It's not even past."* — William Faulkner

</div>
