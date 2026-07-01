import StorageService from '../core/storage.js';
import NvidiaAIProvider from '../providers/ai/NvidiaAIProvider.js';
import FakeAIProvider from '../providers/ai/FakeAIProvider.js';
import { AI_CONFIG } from '../core/aiConfig.js';

const AIService = (() => {
  let _provider = null;
  let _isFake = false;

  function _init() {
    if (_provider) return;
    if (AI_CONFIG.provider === 'nvidia') {
      _provider = new NvidiaAIProvider(StorageService.getProvider(), {
        model: AI_CONFIG.model,
        modelLabel: AI_CONFIG.modelLabel,
        proxyBase: AI_CONFIG.proxyBase || '/api/nvidia/v1',
      });
      _isFake = false;
    } else {
      _provider = new FakeAIProvider(StorageService.getProvider());
      _isFake = true;
    }
  }

  _init();

  function setProvider(p) { _provider = p; }

  async function analyze(query, onChunk = null) {
    if (!query || typeof query !== 'string') {
      return { text: 'Consulta inválida.', source: 'error' };
    }
    if (!_provider) {
      return { text: 'Assistente não inicializado. Tente novamente.', source: 'error' };
    }
    try {
      if (_isFake) {
        return await _provider.analyze(query.trim());
      }
      if (onChunk) {
        const result = await _provider.chat(query.trim(), onChunk);
        return { text: result.text, source: 'NVIDIA AI API' };
      }
      return await _provider.analyze(query.trim());
    } catch (err) {
      console.error('[AIService] analyze error:', err);
      return { text: err.message || 'Erro ao processar consulta. Tente novamente.', source: 'error' };
    }
  }

  function getModelName() {
    if (_isFake) return 'BusinessOS FakeAI v1.3';
    return AI_CONFIG.modelLabel || 'AI Assistant';
  }

  return { analyze, setProvider, getModelName };
})();

export default AIService;