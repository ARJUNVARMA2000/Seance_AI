# Troubleshooting Guide - SeanceAI

## Common Issues and Solutions

### 1. Website Won't Load / Connection Refused

**Symptoms:** Browser shows "Connection refused" or "This site can't be reached"

**Solutions:**
- Make sure the Flask server is running:
  ```bash
  python app.py
  ```
  Or use the enhanced startup script:
  ```bash
  python start_server.py
  ```

- Check if port 5000 is already in use:
  ```bash
  # Windows PowerShell
  netstat -ano | findstr :5000
  ```
  If another process is using it, either stop that process or use a different port:
  ```bash
  set PORT=5001
  python app.py
  ```

- Verify you're accessing the correct URL:
  - Local: `http://localhost:5000`
  - Not: `https://localhost:5000` (no HTTPS for local development)

### 2. Page Loads But Shows Blank/White Screen

**Symptoms:** Page loads but shows nothing or just a white screen

**Solutions:**
- Open browser Developer Tools (F12) and check the Console tab for JavaScript errors
- Check the Network tab to see if CSS/JS files are loading (status should be 200)
- Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache

### 3. Figures Don't Load / "Failed to summon the spirits"

**Symptoms:** Error message appears instead of historical figures

**Solutions:**
- Check browser console (F12) for error messages
- Verify the Flask server is running and accessible
- Test the API endpoint directly: `http://localhost:5000/api/figures`
  - Should return JSON with a "figures" array
- Check server logs for errors

### 4. Chat Doesn't Work / API Errors

**Symptoms:** Can select a figure but messages don't send or get responses

**Solutions:**
- Verify `OPENROUTER_API_KEY` is set in your `.env` file:
  ```
  OPENROUTER_API_KEY=your_actual_api_key_here
  ```
- Check if the API key is valid by testing it
- Check browser console (F12) for API error messages
- Check server terminal for error logs
- Verify internet connection (API calls require internet)

### 5. Static Files (CSS/JS) Not Loading

**Symptoms:** Page loads but looks unstyled, or JavaScript doesn't work

**Solutions:**
- Verify files exist:
  - `static/css/style.css`
  - `static/js/app.js`
- Check browser Network tab to see if files return 404
- Ensure Flask is serving static files (should work automatically)
- Try accessing directly: `http://localhost:5000/static/css/style.css`

### 6. Port Already in Use Error

**Symptoms:** Error message about port being in use

**Solutions:**
- Find what's using the port:
  ```bash
  # Windows PowerShell
  netstat -ano | findstr :5000
  ```
- Kill the process using Task Manager or:
  ```bash
  taskkill /PID <process_id> /F
  ```
- Or use a different port:
  ```bash
  set PORT=5001
  python app.py
  ```

## Diagnostic Steps

1. **Run the diagnostic script:**
   ```bash
   python test_app.py
   ```

2. **Test routes:**
   ```bash
   python test_routes.py
   ```

3. **Check server logs:**
   - Look at the terminal where Flask is running
   - Check for any error messages or stack traces

4. **Check browser console:**
   - Press F12 to open Developer Tools
   - Check Console tab for JavaScript errors
   - Check Network tab for failed requests

5. **Test API endpoints directly:**
   - `http://localhost:5000/` - Should show HTML page
   - `http://localhost:5000/api/figures` - Should return JSON
   - `http://localhost:5000/api/models` - Should return JSON

## Getting Help

If none of these solutions work:

1. Check the server terminal output for error messages
2. Check browser console (F12) for JavaScript errors
3. Verify all dependencies are installed: `pip install -r requirements.txt`
4. Make sure you're using Python 3.11 or higher

## Quick Start Checklist

- [ ] Python 3.11+ installed
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file created with `OPENROUTER_API_KEY`
- [ ] Flask server started: `python app.py`
- [ ] Browser accessing `http://localhost:5000`
- [ ] No port conflicts
- [ ] Internet connection (for API calls)

