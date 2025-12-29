# Gunicorn configuration for Railway deployment
# Optimized for Server-Sent Events (SSE) streaming

import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Worker processes - use gevent for async streaming support
worker_class = "gevent"
workers = 2

# Timeout settings for streaming
timeout = 120  # Allow longer connections for streaming
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Handle proxy headers from Railway
forwarded_allow_ips = "*"

# Graceful restart
graceful_timeout = 30

