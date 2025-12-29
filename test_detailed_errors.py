"""
Detailed test to capture exact errors when switching characters
"""
import requests
import json
import time
import traceback

BASE_URL = "http://localhost:5000"

def test_chat_detailed(figure_id, message, history=None, model=None):
    """Test a chat request with detailed error reporting"""
    if history is None:
        history = []
    
    data = {
        "figure_id": figure_id,
        "message": message,
        "history": history
    }
    
    if model:
        data["model"] = model
    
    try:
        print(f"\n  Request details:")
        print(f"    Figure: {figure_id}")
        print(f"    Message: {message}")
        print(f"    History length: {len(history)}")
        print(f"    Model: {model or 'default'}")
        
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=data,
            timeout=30
        )
        
        print(f"  Response status: {response.status_code}")
        print(f"  Response headers: {dict(response.headers)}")
        
        result = response.json()
        print(f"  Response keys: {list(result.keys())}")
        
        if "response" in result:
            response_text = result["response"]
            if len(response_text) == 74 and "disrupted" in response_text:
                print(f"  [ERROR DETECTED] Got error message: {response_text}")
                return {"success": False, "error": "API returned error message", "response": response_text}
            else:
                print(f"  [OK] Got valid response ({len(response_text)} chars)")
                return {"success": True, "response": response_text}
        elif "error" in result:
            print(f"  [ERROR] API error: {result['error']}")
            return {"success": False, "error": result['error']}
        else:
            print(f"  [ERROR] Unexpected response format: {result}")
            return {"success": False, "error": "Unexpected format"}
            
    except requests.exceptions.Timeout:
        print(f"  [ERROR] Request timed out")
        return {"success": False, "error": "Timeout"}
    except requests.exceptions.ConnectionError as e:
        print(f"  [ERROR] Connection error: {e}")
        return {"success": False, "error": f"Connection error: {e}"}
    except Exception as e:
        print(f"  [ERROR] Exception: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}

def main():
    print("=" * 70)
    print("Detailed Character Switching Test")
    print("=" * 70)
    
    # Test: Switch from Einstein to Shakespeare
    print("\n" + "="*70)
    print("Test 1: First character (Einstein)")
    print("="*70)
    
    result1 = test_chat_detailed("einstein", "Hello, what is relativity?")
    
    if result1.get("success"):
        print("\n[OK] First message succeeded")
    else:
        print("\n[FAIL] First message failed!")
        return
    
    time.sleep(2)
    
    print("\n" + "="*70)
    print("Test 2: Second message to same character (Einstein)")
    print("="*70)
    
    history1 = [
        {"role": "user", "content": "Hello, what is relativity?"},
        {"role": "assistant", "content": result1['response']}
    ]
    result2 = test_chat_detailed("einstein", "Tell me more", history1)
    
    time.sleep(2)
    
    print("\n" + "="*70)
    print("Test 3: SWITCHING to new character (Shakespeare)")
    print("="*70)
    print("  [NOTE] This simulates what happens when user clicks a new character")
    print("  [NOTE] Frontend resets conversationHistory = []")
    
    # Fresh conversation (history reset)
    result3 = test_chat_detailed("shakespeare", "Tell me about your plays", history=[])
    
    if not result3.get("success"):
        print("\n" + "="*70)
        print("[ISSUE REPRODUCED]")
        print("="*70)
        print("The API failed when switching to a new character!")
        print(f"Error: {result3.get('error', 'Unknown')}")
        print(f"Response: {result3.get('response', 'N/A')}")
    else:
        print("\n[OK] Character switch succeeded")
    
    time.sleep(2)
    
    print("\n" + "="*70)
    print("Test 4: Second message to new character (Shakespeare)")
    print("="*70)
    
    if result3.get("success"):
        history2 = [
            {"role": "user", "content": "Tell me about your plays"},
            {"role": "assistant", "content": result3['response']}
        ]
        result4 = test_chat_detailed("shakespeare", "Tell me more", history2)
    
    print("\n" + "="*70)
    print("Test Summary")
    print("="*70)
    print(f"Test 1 (Einstein - first): {'OK' if result1.get('success') else 'FAIL'}")
    print(f"Test 2 (Einstein - second): {'OK' if result2.get('success') else 'FAIL'}")
    print(f"Test 3 (Shakespeare - first/switch): {'OK' if result3.get('success') else 'FAIL'}")
    if result3.get("success"):
        print(f"Test 4 (Shakespeare - second): {'OK' if result4.get('success') else 'FAIL'}")

if __name__ == "__main__":
    main()

