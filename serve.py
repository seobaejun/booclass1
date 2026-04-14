"""Run HTTP server from this directory so / serves index.html (no directory listing)."""
import http.server
import os
import socket
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)

# Default avoids 8000 (often used by other local apps). Override with PORT=...
DEFAULT_SERVE_PORT = 8888
PORT = int(os.environ.get("PORT", str(DEFAULT_SERVE_PORT)))
# 0.0.0.0: localhost + other devices on same LAN (dev only)
HOST = os.environ.get("SERVE_HOST", "0.0.0.0")


def _lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


sys.stdout.write(f"Serving from: {DIR}\n")
sys.stdout.write(f"Open in browser: http://127.0.0.1:{PORT}/  (or http://localhost:{PORT}/)\n")
lip = _lan_ip()
if lip:
    sys.stdout.write(f"From phone/other PC (same Wi-Fi): http://{lip}:{PORT}/\n")
sys.stdout.flush()
# Handles several concurrent browser connections (favicon, prefetch, etc.).
server = http.server.ThreadingHTTPServer((HOST, PORT), http.server.SimpleHTTPRequestHandler)
server.daemon_threads = True
server.serve_forever()
