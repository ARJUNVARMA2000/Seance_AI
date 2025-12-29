# Railway Deployment Guide

## Setting Up Your API Key on Railway

The chat functionality requires the `OPENROUTER_API_KEY` environment variable to be set in Railway.

### Steps to Configure:

1. **Go to your Railway project dashboard**
   - Navigate to your project on Railway
   - Click on your service

2. **Add Environment Variable**
   - Go to the "Variables" tab
   - Click "New Variable"
   - Name: `OPENROUTER_API_KEY`
   - Value: Your OpenRouter API key (starts with `sk-or-v1-...`)
   - Click "Add"

3. **Redeploy**
   - Railway should automatically redeploy when you add environment variables
   - If not, trigger a manual redeploy

### Verify Configuration

After deployment, you can check if the API key is configured correctly:

1. **Health Check Endpoint**
   - Visit: `https://your-app.railway.app/api/health`
   - Should show: `{"status": "healthy", "api_key_configured": true, ...}`
   - If `api_key_configured` is `false`, the API key is not set correctly

2. **Test Chat**
   - Try sending a message to any historical figure
   - If you see an error about "API key not configured", check:
     - The variable name is exactly `OPENROUTER_API_KEY` (case-sensitive)
     - The API key value is correct (no extra spaces)
     - The service has been redeployed after adding the variable

### Troubleshooting

**Error: "Chat is not working"**
- Check Railway logs: Go to your service → "Deployments" → Click on latest deployment → View logs
- Look for errors mentioning "OPENROUTER_API_KEY" or "API request failed"
- Verify the API key is set: Check `/api/health` endpoint

**Error: "API key not configured"**
- Double-check the environment variable name (must be exactly `OPENROUTER_API_KEY`)
- Ensure there are no spaces before/after the API key value
- Make sure you've redeployed after adding the variable

**Error: "Connection disrupted"**
- Check if your OpenRouter API key is valid
- Verify you have credits/quota on your OpenRouter account
- Check Railway logs for detailed error messages

### Getting an OpenRouter API Key

If you don't have an OpenRouter API key:

1. Go to https://openrouter.ai/
2. Sign up for an account
3. Go to "Keys" section
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)
6. Add it to Railway as described above

### Railway Configuration

The app uses the following Railway configuration (`railway.json`):

- **Builder**: NIXPACKS (auto-detects Python)
- **Start Command**: `gunicorn app:app`
- **Port**: Automatically set by Railway via `PORT` environment variable

Make sure your `requirements.txt` includes:
- `flask==3.0.0`
- `gunicorn==21.2.0`
- `requests==2.31.0`
- `python-dotenv==1.0.0`

