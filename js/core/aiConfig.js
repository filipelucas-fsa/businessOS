/**
 * BusinessOS v1.3 — AI_CONFIG
 *
 * Configuração central do provedor de IA.
 * Para trocar de modelo no futuro, altere apenas este arquivo.
 *
 * PROVIDERS suportados:
 *   - "nvidia"    → NVIDIA AI API (integrate.api.nvidia.com/v1)
 *
 * MODELOS testados na NVIDIA:
 *   - deepseek-ai/deepseek-v4-flash   → DeepSeek V4 Flash Free
 *
 * FUTURE: adicionar suporte a Gemini, Claude, OpenAI, Groq etc.
 *         Basta alterar `model` e `modelLabel`, e criar o provider correspondente.
 */
export const AI_CONFIG = {
  provider: 'nvidia',

  model: 'deepseek-ai/deepseek-v4-flash',
  modelLabel: 'DeepSeek V4 Flash (NVIDIA)',

  // For production (Vercel) this stays as-is.
  // For local dev, the Python server.py proxies this path.
  proxyBase: '/api/nvidia/v1',
};