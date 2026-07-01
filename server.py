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


def _load_env_local(path='.env.local'):
    """
    Minimal .env.local loader (no external dependencies).
    Populates os.environ so NVIDIA_API_KEY is available to the proxy,
    mirroring how Vercel injects environment variables in production.
    Does not overwrite variables already set in the real environment.
    """
    if not os.path.isfile(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_env_local()
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY', '')


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

        # The API key is injected here, server-side, from NVIDIA_API_KEY
        # (loaded from .env.local). The browser never sends it — mirrors
        # the security model of api/nvidia/[...path].js on Vercel.
        if not NVIDIA_API_KEY:
            self._log('ERROR: NVIDIA_API_KEY not set. Create a .env.local with NVIDIA_API_KEY=nvapi-...')
            self.send_response(500)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'NVIDIA_API_KEY not configured. Set it in .env.local for local dev.'
            }).encode())
            return

        headers = {
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
            'Authorization': f'Bearer {NVIDIA_API_KEY}',
        }

        self._log(f'POST {target}')
        self._log('Authorization: Bearer *** (from .env.local)')
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
