"""
Enhanced server startup script with better error handling and diagnostics
"""
import os
import sys
import socket
import logging
from app import app
from figures import get_all_figures

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_port(port):
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result != 0

def main():
    print("=" * 60)
    print("SeanceAI - Starting Flask Server")
    print("=" * 60)
    
    # Check environment
    api_key = os.environ.get('OPENROUTER_API_KEY')
    if not api_key:
        print("\n[WARNING] OPENROUTER_API_KEY not found!")
        print("The app will start, but API calls will fail.")
        print("Create a .env file with: OPENROUTER_API_KEY=your_key_here\n")
    else:
        print(f"\n[OK] OPENROUTER_API_KEY found (length: {len(api_key)})")
    
    # Get port
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    # Check if port is available
    if not check_port(port):
        print(f"\n[ERROR] Port {port} is already in use!")
        print(f"Please stop the other application using port {port}")
        print("Or set a different port: set PORT=5001")
        sys.exit(1)
    
    print(f"\n[OK] Port {port} is available")
    print(f"[OK] Debug mode: {debug}")
    
    # Display startup info
    figures_count = len(get_all_figures())
    print("\n" + "=" * 60)
    print("Server Configuration:")
    print("=" * 60)
    print(f"  Port: {port}")
    print(f"  Debug mode: {debug}")
    print(f"  Historical figures: {figures_count}")
    print(f"  API key configured: {bool(api_key)}")
    print("=" * 60)
    print("\nServer starting...")
    print(f"\nAccess the website at: http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/api/health")
    print(f"Press CTRL+C to stop the server\n")
    print("=" * 60 + "\n")
    
    try:
        app.run(debug=debug, host='0.0.0.0', port=port, use_reloader=False)
    except KeyboardInterrupt:
        print("\n\n[INFO] Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

