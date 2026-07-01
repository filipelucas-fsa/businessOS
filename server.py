#!/usr/bin/env python3
"""
BusinessOS v1.3 — Dev Server with API Proxy

Usage:
    python server.py

Serves static files AND proxies /api/nvidia/* to the NVIDIA API,
avoiding CORS issues in local development.
"""

import http.server
import json
import os
import sys
import urllib.request
import urllib.error
import socketserver
import time

PORT = int(os.environ.get('PORT', 8080))
NVIDIA_BASE = 'https://integrate.api.nvidia.com'


class ProxyHandler(http.server.SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self._cors_headers()
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/nvidia/'):
            self._proxy_post()
        else:
            self.send_error(404)

    def _log(self, msg):
        """Log with timestamp to stderr for visibility alongside server logs."""
        ts = time.strftime('%H:%M:%S')
        print(f'[proxy {ts}] {msg}', file=sys.stderr, flush=True)

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')

    def _proxy_post(self):
        # Read the request body first
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''

        # Strip /api/nvidia prefix so the path matches NVIDIA's API
        # e.g. /api/nvidia/v1/chat/completions → /v1/chat/completions
        nvidia_path = self.path[len('/api/nvidia'):]
        target = f'{NVIDIA_BASE}{nvidia_path}'

        headers = {
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
        }
        auth = self.headers.get('Authorization')
        if auth:
            headers['Authorization'] = auth

        self._log(f'POST {target}')
        self._log(f'Authorization: {"Bearer ***" if auth else "none"}')
        self._log(f'Content-Length: {len(body)}')

        try:
            req = urllib.request.Request(target, data=body, headers=headers, method='POST')
            resp = urllib.request.urlopen(req, timeout=60)

            self._log(f'Response: {resp.status}')
            self._log(f'Content-Type: {resp.headers.get("Content-Type", "?")}')

            self.send_response(resp.status)
            self._cors_headers()
            self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
            self.end_headers()

            total = 0
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
                total += len(chunk)

            self._log(f'Streamed {total} bytes OK')

        except urllib.error.HTTPError as e:
            self._log(f'HTTPError: {e.code} {e.reason}')
            error_body = e.read()
            self._log(f'Error body: {error_body[:500].decode("utf-8", errors="replace")}')

            self.send_response(e.code)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_body)

        except urllib.error.URLError as e:
            self._log(f'URLError: {e.reason}')
            reason_str = str(e.reason)
            self.send_response(502)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': reason_str}).encode())

        except Exception as e:
            self._log(f'Unexpected error: {type(e).__name__}: {e}')
            self.send_response(500)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.send_error(404)
            return
        super().do_GET()


if __name__ == '__main__':
    addr = ('', PORT)
    httpd = socketserver.TCPServer(addr, ProxyHandler)
    print(f'BusinessOS dev server at http://localhost:{PORT}', flush=True)
    print(f'Proxying /api/nvidia/* -> {NVIDIA_BASE}', flush=True)
    print(f'Press Ctrl+C to stop.', flush=True)
    httpd.serve_forever()
