# Issue Summary: Character Switching API Failure

## Problem Identified ✅

**Root Cause:** Rate Limiting from OpenRouter API

The free model `google/gemini-2.0-flash-exp:free` has strict rate limits. After the first API request succeeds, subsequent requests (including when switching characters) return **HTTP 429 (Too Many Requests)**.

## Test Results

### Direct API Test
- ✅ First request: SUCCESS (HTTP 200)
- ❌ Second request: FAILED (HTTP 429 - Rate Limited)
- ❌ Third request: FAILED (HTTP 429 - Rate Limited)

### Error Message from OpenRouter
```
"google/gemini-2.0-flash-exp:free is temporarily rate-limited upstream. 
Please retry shortly, or add your own key to accumulate your rate limits"
```

## Why This Affects Character Switching

1. **First character works:** First API call succeeds ✅
2. **Switching characters:** Triggers a new API call
3. **Rate limit hit:** The new call immediately hits the rate limit (HTTP 429) ❌
4. **User sees error:** Generic error message displayed

## Current Error Handling

The Flask app catches HTTP 429 errors but returns a generic error message:
- **Current message:** "I apologize, but something has disrupted our connection. Please check your API key configuration."
- **Problem:** This message is misleading - it's not an API key issue, it's a rate limit issue

## Code Flow

1. User switches character → Frontend calls `/api/chat` or `/api/chat/stream`
2. Flask calls `call_llm()` → Makes request to OpenRouter API
3. OpenRouter returns HTTP 429 → `raise_for_status()` raises `HTTPError`
4. Error caught by `except requests.exceptions.HTTPError` (line 97)
5. Returns generic error message (line 106)

## What Needs to Be Fixed

### Issue 1: Error Message Not User-Friendly
- HTTP 429 errors should return a specific message about rate limiting
- Current message suggests API key issue (misleading)

### Issue 2: No Retry Logic
- Should implement exponential backoff for rate-limited requests
- Should retry after a delay (e.g., 5-10 seconds)

### Issue 3: No Rate Limit Detection
- Should detect rate limit errors specifically
- Should show appropriate UI message
- Could display countdown timer for rate limit reset

### Issue 4: Model Selection
- Free models have strict rate limits
- Should consider using models with higher rate limits
- Should allow users to select models with better rate limits

## Files Involved

- **`app.py`** (lines 97-109): Error handling for HTTP errors
  - Needs to specifically handle HTTP 429
  - Needs better error messages for rate limiting
  
- **`static/js/app.js`** (lines 348-400): Frontend request handling
  - Could add retry logic for rate-limited requests
  - Could show better error messages to users

## Recommended Next Steps

1. **Fix error handling** to specifically detect and handle HTTP 429
2. **Add retry logic** with exponential backoff for rate-limited requests
3. **Improve error messages** to be user-friendly and accurate
4. **Consider model alternatives** with better rate limits
5. **Add rate limit detection** in the UI

## Testing

To reproduce:
1. Start the Flask server
2. Make a chat request (works)
3. Switch to a new character
4. Make another chat request (fails with rate limit)

To verify fix:
- Run `test_openrouter_direct.py` to see rate limiting in action
- Check that HTTP 429 errors are properly handled
- Verify error messages are user-friendly

