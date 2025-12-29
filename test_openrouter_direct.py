"""
Test OpenRouter API directly to identify the actual error
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free"

def test_openrouter_direct(messages, model=None):
    """Test OpenRouter API directly"""
    selected_model = model or DEFAULT_MODEL
    
    print(f"\nTesting OpenRouter API directly:")
    print(f"  Model: {selected_model}")
    print(f"  Messages: {len(messages)}")
    print(f"  API Key: {'Set' if OPENROUTER_API_KEY else 'NOT SET'}")
    if OPENROUTER_API_KEY:
        print(f"  API Key length: {len(OPENROUTER_API_KEY)}")
        print(f"  API Key starts with: {OPENROUTER_API_KEY[:15]}...")
    
    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
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
        
        print(f"\n  Response Status: {response.status_code}")
        print(f"  Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response Keys: {list(data.keys())}")
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0]["message"]["content"]
                print(f"  [SUCCESS] Got response ({len(content)} chars)")
                print(f"  Preview: {content[:100]}...")
                return True
            else:
                print(f"  [ERROR] No choices in response")
                print(f"  Full response: {json.dumps(data, indent=2)}")
                return False
        else:
            print(f"  [ERROR] HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"  Response text: {response.text[:500]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"  [ERROR] Request timed out")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"  [ERROR] HTTP Error: {e}")
        if e.response:
            print(f"  Status: {e.response.status_code}")
            try:
                error_data = e.response.json()
                print(f"  Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"  Response text: {e.response.text[:500]}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Request Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"  [ERROR] Unexpected Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 70)
    print("Direct OpenRouter API Test")
    print("=" * 70)
    
    # Test 1: Simple message
    print("\n" + "="*70)
    print("Test 1: Simple message")
    print("="*70)
    messages1 = [
        {"role": "system", "content": "You are Albert Einstein."},
        {"role": "user", "content": "Hello, what is relativity?"}
    ]
    result1 = test_openrouter_direct(messages1)
    
    import time
    time.sleep(2)
    
    # Test 2: Another message (simulating character switch)
    print("\n" + "="*70)
    print("Test 2: Another message (simulating character switch)")
    print("="*70)
    messages2 = [
        {"role": "system", "content": "You are William Shakespeare."},
        {"role": "user", "content": "Tell me about your plays"}
    ]
    result2 = test_openrouter_direct(messages2)
    
    time.sleep(2)
    
    # Test 3: Third message
    print("\n" + "="*70)
    print("Test 3: Third message")
    print("="*70)
    messages3 = [
        {"role": "system", "content": "You are Julius Caesar."},
        {"role": "user", "content": "What was your greatest victory?"}
    ]
    result3 = test_openrouter_direct(messages3)
    
    # Summary
    print("\n" + "="*70)
    print("Summary")
    print("="*70)
    print(f"Test 1: {'PASS' if result1 else 'FAIL'}")
    print(f"Test 2: {'PASS' if result2 else 'FAIL'}")
    print(f"Test 3: {'PASS' if result3 else 'FAIL'}")
    
    if not result1:
        print("\n[ISSUE] Even the first direct API call failed!")
        print("This suggests the issue is with the OpenRouter API itself,")
        print("not with the Flask application or character switching.")
    elif not result2 or not result3:
        print("\n[ISSUE] Subsequent API calls failed!")
        print("This suggests rate limiting or connection issues.")

if __name__ == "__main__":
    main()

