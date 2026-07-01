/**
 * BusinessOS v1.3 — NVIDIA API Proxy (Vercel Serverless Function)
 *
 * Proxies requests from the browser to the NVIDIA AI API server-side.
 * The API key is read from the NVIDIA_API_KEY environment variable
 * and is NEVER exposed to the client.
 *
 * Supports:
 *   - POST /api/nvidia/v1/chat/completions (streaming + non-streaming)
 *   - CORS preflight (OPTIONS)
 *   - Error forwarding from NVIDIA API
 *
 * Local dev: `vercel dev` (reads NVIDIA_API_KEY from .env.local)
 * Production: Vercel env var NVIDIA_API_KEY
 */

const NVIDIA_BASE = 'https://integrate.api.nvidia.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[nvidia-proxy] NVIDIA_API_KEY not configured');
    return res.status(500).json({
      error: 'NVIDIA_API_KEY not configured. Set it in Vercel Environment Variables or .env.local for dev.',
    });
  }

  const segments = Array.isArray(req.query.path)
    ? req.query.path.join('/')
    : (req.query.path || '');
  const targetUrl = `${NVIDIA_BASE}/${segments}`;

  console.log(`[nvidia-proxy] POST ${targetUrl}`);
  console.log(`[nvidia-proxy] Model: ${req.body?.model || 'unknown'}`);
  console.log(`[nvidia-proxy] Stream: ${!!req.body?.stream}`);
  console.log(`[nvidia-proxy] Prompt length: ${JSON.stringify(req.body?.messages || []).length}`);

  const isStream = req.body?.stream === true;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': isStream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    console.log(`[nvidia-proxy] NVIDIA responded: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
      }
      console.error(`[nvidia-proxy] Error from NVIDIA: ${response.status}`, JSON.stringify(errorBody).slice(0, 500));
      res.setHeader('Content-Type', 'application/json');
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(response.status).json(errorBody);
    }

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (streamErr) {
        console.error('[nvidia-proxy] Stream error:', streamErr.message);
      } finally {
        res.end();
      }
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error(`[nvidia-proxy] Fetch error: ${err.name}: ${err.message}`);

    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return res.status(502).json({ error: 'Network error connecting to NVIDIA API.' });
    }
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'NVIDIA API request timed out.' });
    }

    return res.status(502).json({ error: `Proxy error: ${err.message}` });
  }
}
