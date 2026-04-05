"""Run HTTP server from this directory so / serves index.html (no directory listing)."""
import http.server
import os
import socket
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)

PORT = int(os.environ.get("PORT", "8000"))
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
sys.stdout.write(f"Open in browser: http://localhost:{PORT}/\n")
lip = _lan_ip()
if lip:
    sys.stdout.write(f"From phone/other PC (same Wi-Fi): http://{lip}:{PORT}/\n")
sys.stdout.flush()
http.server.HTTPServer((HOST, PORT), http.server.SimpleHTTPRequestHandler).serve_forever()
