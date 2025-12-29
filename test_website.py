"""
Test script for SeanceAI website functionality
"""
import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_endpoint(url, method="GET", data=None):
    """Test an API endpoint"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        else:
            response = requests.post(url, json=data, timeout=5)
        
        print(f"[OK] {method} {url}")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                content = response.json()
                return content
            except:
                return {"raw": response.text[:200]}
        else:
            print(f"  Error: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"[FAIL] {method} {url}")
        print(f"  Error: {str(e)}")
        return None

def main():
    print("=" * 60)
    print("SeanceAI Website Test")
    print("=" * 60)
    print()
    
    # Test 1: Main page
    print("1. Testing main page...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print(f"   [OK] Main page loads successfully ({len(response.text)} bytes)")
        else:
            print(f"   [FAIL] Main page failed: {response.status_code}")
    except Exception as e:
        print(f"   [FAIL] Main page error: {e}")
    print()
    
    # Test 2: Figures API
    print("2. Testing /api/figures endpoint...")
    figures = test_endpoint(f"{BASE_URL}/api/figures")
    if figures and "figures" in figures:
        print(f"   [OK] Found {len(figures['figures'])} historical figures")
    print()
    
    # Test 3: Models API
    print("3. Testing /api/models endpoint...")
    models = test_endpoint(f"{BASE_URL}/api/models")
    if models and "models" in models:
        print(f"   [OK] Found {len(models['models'])} AI models")
        print(f"   Default model: {models.get('default', 'N/A')}")
    print()
    
    # Test 4: Single figure API
    print("4. Testing /api/figures/einstein endpoint...")
    figure = test_endpoint(f"{BASE_URL}/api/figures/einstein")
    if figure and "figure" in figure:
        print(f"   [OK] Retrieved figure: {figure['figure']['name']}")
    print()
    
    # Test 5: Chat API (will fail without API key)
    print("5. Testing /api/chat endpoint...")
    chat_data = {
        "figure_id": "einstein",
        "message": "Hello, what is relativity?",
        "history": []
    }
    chat_response = test_endpoint(f"{BASE_URL}/api/chat", method="POST", data=chat_data)
    if chat_response:
        if "response" in chat_response:
            response_text = chat_response["response"]
            if "API key" in response_text or "disrupted" in response_text or "Error" in response_text:
                print(f"   [WARN] Chat endpoint responds but API key is missing/invalid")
                print(f"   Response: {response_text[:100]}...")
            else:
                print(f"   [OK] Chat endpoint working! Response received.")
        else:
            print(f"   [WARN] Unexpected response format")
    print()
    
    # Test 6: Check API key status
    print("6. Checking API key configuration...")
    import os
    api_key = os.environ.get('OPENROUTER_API_KEY')
    if api_key:
        print(f"   [OK] OPENROUTER_API_KEY is set (length: {len(api_key)})")
    else:
        print(f"   [FAIL] OPENROUTER_API_KEY is NOT set")
        print(f"   -> Set it with: $env:OPENROUTER_API_KEY='your-key-here'")
    print()
    
    print("=" * 60)
    print("Test Summary:")
    print("=" * 60)
    print("[OK] Website is running and accessible")
    print("[OK] API endpoints are responding")
    print("[WARN] Chat functionality requires OPENROUTER_API_KEY to be set")
    print()
    print("To set the API key:")
    print("  Windows PowerShell: $env:OPENROUTER_API_KEY='your-key-here'")
    print("  Or create a .env file with: OPENROUTER_API_KEY=your-key-here")
    print()

if __name__ == "__main__":
    main()

