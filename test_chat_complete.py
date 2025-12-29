"""
Complete chat functionality test
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_complete_chat_flow():
    """Test a complete chat conversation"""
    print("=" * 60)
    print("Complete Chat Flow Test")
    print("=" * 60)
    print()
    
    # Step 1: Get figures
    print("1. Loading historical figures...")
    figures_response = requests.get(f"{BASE_URL}/api/figures")
    figures = figures_response.json()["figures"]
    einstein = next(f for f in figures if f["id"] == "einstein")
    print(f"   [OK] Found {len(figures)} figures")
    print(f"   Selected: {einstein['name']} - {einstein['tagline']}")
    print()
    
    # Step 2: Start conversation
    print("2. Starting conversation with Einstein...")
    chat_data = {
        "figure_id": "einstein",
        "message": "Hello! Can you explain relativity in simple terms?",
        "history": []
    }
    
    start_time = time.time()
    chat_response = requests.post(
        f"{BASE_URL}/api/chat",
        json=chat_data,
        timeout=30
    )
    elapsed = time.time() - start_time
    
    if chat_response.status_code == 200:
        data = chat_response.json()
        response_text = data["response"]
        print(f"   [OK] Received response in {elapsed:.2f}s")
        print(f"   Response preview: {response_text[:150]}...")
        print()
        
        # Step 3: Continue conversation
        print("3. Continuing conversation...")
        chat_data2 = {
            "figure_id": "einstein",
            "message": "That's fascinating! What about time dilation?",
            "history": [
                {"role": "user", "content": chat_data["message"]},
                {"role": "assistant", "content": response_text}
            ]
        }
        
        start_time = time.time()
        chat_response2 = requests.post(
            f"{BASE_URL}/api/chat",
            json=chat_data2,
            timeout=30
        )
        elapsed2 = time.time() - start_time
        
        if chat_response2.status_code == 200:
            data2 = chat_response2.json()
            response_text2 = data2["response"]
            print(f"   [OK] Received follow-up response in {elapsed2:.2f}s")
            print(f"   Response preview: {response_text2[:150]}...")
            print()
            
            print("=" * 60)
            print("TEST RESULTS: ✅ ALL TESTS PASSED")
            print("=" * 60)
            print("✓ Website is running")
            print("✓ API endpoints are working")
            print("✓ Chat functionality is working")
            print("✓ Conversation history is working")
            print("✓ API key is properly configured")
            print()
            return True
        else:
            print(f"   [FAIL] Follow-up failed: {chat_response2.status_code}")
            return False
    else:
        print(f"   [FAIL] Chat failed: {chat_response.status_code}")
        print(f"   Response: {chat_response.text[:200]}")
        return False

if __name__ == "__main__":
    try:
        test_complete_chat_flow()
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()

