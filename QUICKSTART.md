# Quick Start Guide - SeanceAI

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Set Up Environment Variable
Create a `.env` file in the project root:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Get your API key from: https://openrouter.ai/

### Step 3: Start the Server

**Option A: Use the enhanced startup script (recommended)**
```bash
python start_server.py
```

**Option B: Use the standard Flask command**
```bash
python app.py
```

### Step 4: Open Your Browser
Navigate to: **http://localhost:5000**

## ✅ Verify Everything Works

1. **Check the health endpoint:**
   - Visit: http://localhost:5000/api/health
   - Should return JSON with status information

2. **Check if figures load:**
   - The main page should show historical figures
   - If you see "Failed to summon the spirits", check the browser console (F12)

3. **Test a conversation:**
   - Click on any historical figure
   - Type a message and send it
   - You should receive a response

## 🔧 Troubleshooting

### Port Already in Use?
```bash
# Use a different port
set PORT=5001
python app.py
```

### API Key Not Working?
- Verify your `.env` file exists and contains `OPENROUTER_API_KEY=...`
- Make sure there are no spaces around the `=` sign
- Restart the server after changing `.env`

### Still Having Issues?
See `TROUBLESHOOTING.md` for detailed solutions.

## 📝 Available Scripts

- `python app.py` - Standard Flask server
- `python start_server.py` - Enhanced server with diagnostics
- Check `TROUBLESHOOTING.md` - Comprehensive troubleshooting guide

## 🌐 API Endpoints

- `GET /` - Main web page
- `GET /api/figures` - List all historical figures
- `GET /api/figures/<id>` - Get specific figure data
- `GET /api/models` - List available AI models
- `GET /api/health` - Health check endpoint
- `POST /api/chat` - Send chat message (non-streaming)
- `POST /api/chat/stream` - Send chat message (streaming)

## 💡 Tips

- Use the enhanced startup script (`start_server.py`) for better error messages
- Check browser console (F12) if something doesn't work
- The health endpoint (`/api/health`) shows configuration status
- Free models are available - no credit card required for testing!

