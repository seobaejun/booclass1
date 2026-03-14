"""Run HTTP server from this directory so / serves index.html (no directory listing)."""
import http.server
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)
sys.stdout.write(f"Serving from: {DIR}\n")
sys.stdout.write("Server running at http://127.0.0.1:8080\n")
sys.stdout.flush()
http.server.HTTPServer(("127.0.0.1", 8080), http.server.SimpleHTTPRequestHandler).serve_forever()
