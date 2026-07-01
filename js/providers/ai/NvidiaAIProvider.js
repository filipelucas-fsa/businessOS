/**
 * BusinessOS v1.3 — NvidiaAIProvider
 *
 * Real AI implementation using NVIDIA AI Foundation endpoints.
 * Supports streaming, business data context injection, and advanced error handling.
 */

export class NvidiaAIProvider {
  constructor(storageProvider, config) {
    this.storage = storageProvider;
    this.model = config.model || 'deepseek-ai/deepseek-v4-flash';
    this.modelLabel = config.modelLabel || 'DeepSeek V4 Flash (NVIDIA)';
    // Uses relative path (proxied by server.py locally or Vercel serverless function in production)
    // to avoid CORS issues. Set proxyBase to an absolute URL if needed.
    this.baseUrl = config.proxyBase || '/api/nvidia/v1';
    this._lastCall = 0;
    this._cooldown = 1000; // 1s anti-spam
    this._contextCache = null;
    this._contextCacheKey = '';
    this._contextCacheTime = 0;
  }

  /**
   * Builds system prompt with only the data relevant to the query.
   * Strategic queries load all data; simple queries load only what's needed.
   */
  async _buildContext(query) {
    const q = query.toLowerCase();

    // Determine which datasets are needed
    const needProducts   = q.includes('produto') || q.includes('estoque') || q.includes('ruptura');
    const needSales      = q.includes('venda') || q.includes('receita') || q.includes('faturamento') || q.includes('lucro');
    const needExpenses   = q.includes('financeiro') || q.includes('fluxo') || q.includes('caixa') || q.includes('despesa');
    const needCustomers  = q.includes('cliente') || q.includes('crm');
    const needAll        = q.includes('estratégic') || q.includes('auditoria') || q.includes('consultoria') ||
                           q.includes('melhoria') || q.includes('otimizar') || q.includes('crescimento') ||
                           q.includes('oportunidade') || (q.includes('aumentar') && q.includes('lucro')) ||
                           q.includes('diagnóstico');

    try {
      let contextParts = [];

      if (needAll) {
        const [products, customers, sales, expenses] = await Promise.all([
          this.storage.getProducts(),
          this.storage.getCustomers(),
          this.storage.getSales(),
          this.storage.getExpenses(),
        ]);
        contextParts.push(`Products (${products.length}): ` + products.slice(0, 30).map(p => `${p.name}: ${p.quantity} un. (min:${p.minStock}, R$${p.price})`).join('; '));
        contextParts.push(`Recent Sales (${sales.length}): ` + sales.slice(-20).map(s => `${s.productName} x${s.quantity} = R$${s.total}`).join('; '));
        contextParts.push(`Customers (${customers.length}): ${customers.filter(c => c.lastPurchase && Date.now() - c.lastPurchase < 30*86400000).length} active, ${customers.filter(c => !c.lastPurchase).length} never purchased`);
        const rev30 = sales.filter(s => s.createdAt > Date.now() - 30*86400000).reduce((a,s)=>a+(s.total||0),0);
        const exp30 = expenses.filter(e => e.createdAt > Date.now() - 30*86400000).reduce((a,e)=>a+(e.amount||0),0);
        contextParts.push(`Financial: Revenue 30d=R$${rev30.toFixed(2)}, Expenses 30d=R$${exp30.toFixed(2)}, Profit=R$${(rev30-exp30).toFixed(2)}`);
      } else {
        if (needProducts || (!needSales && !needExpenses && !needCustomers)) {
          const products = await this.storage.getProducts();
          contextParts.push(`Products (${products.length}): ` + products.slice(0, 20).map(p => `${p.name}: ${p.quantity} un. (min:${p.minStock})`).join('; '));
        }
        if (needSales) {
          const sales = await this.storage.getSales();
          contextParts.push(`Sales (${sales.length}): ` + sales.slice(-15).map(s => `${s.productName} x${s.quantity} = R$${s.total} (${s.payment})`).join('; '));
        }
        if (needExpenses) {
          const expenses = await this.storage.getExpenses();
          contextParts.push(`Expenses (${expenses.length}): ` + expenses.slice(-15).map(e => `${e.description} = R$${e.amount} (${e.category})`).join('; '));
        }
        if (needCustomers) {
          const customers = await this.storage.getCustomers();
          contextParts.push(`Customers (${customers.length}): top: ` + customers.sort((a,b)=>(b.totalSpent||0)-(a.totalSpent||0)).slice(0,5).map(c => `${c.name} (R$${(c.totalSpent||0).toFixed(2)})`).join(', '));
        }
        // If no specific intent matched, load minimal context (products only)
        if (contextParts.length === 0) {
          const products = await this.storage.getProducts();
          contextParts.push(`Products (${products.length}): ` + products.slice(0, 10).map(p => `${p.name}: ${p.quantity} un.`).join('; '));
        }
      }

      const contextStr = contextParts.join('\n');
      return `You are the BusinessOS Assistant, an expert business analyst.\nCurrent Business Data:\n${contextStr}\nRespond in Portuguese (Brazil). Be concise, professional, and use markdown formatting.`;
    } catch (e) {
      console.error('[NvidiaAIProvider] Context error:', e);
      return 'You are the BusinessOS Assistant. Respond in Portuguese (Brazil).';
    }
  }

  /**
   * Standard non-streaming analysis.
   * For backward compatibility with AIService.analyze().
   */
  async analyze(query) {
    const result = await this.chat(query);
    return {
      text: result.text,
      source: 'NVIDIA AI API',
      data: result.data
    };
  }

  /**
   * Main chat method supporting streaming via callback.
   */
async chat(query, onChunk = null) {
     // 1. Rate limiting
     const now = Date.now();
     if (now - this._lastCall < this._cooldown) {
       throw new Error('Too many requests. Please wait a few seconds.');
     }
     this._lastCall = now;

     // 2. Validate configuration
     if (!this.baseUrl) {
       throw new Error('AI proxy not configured.');
     }

     const systemPrompt = await this._buildContext(query);

     try {
       const response = await fetch(`${this.baseUrl}/chat/completions`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           model: this.model,
           messages: [
             { role: 'system', content: systemPrompt },
             { role: 'user', content: query }
           ],
           stream: !!onChunk,
           temperature: 0.7,
           max_tokens: 1024
         })
       });

       // Development logging
       if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
         console.log('[NvidiaAIProvider]', {
           url: `${this.baseUrl}/chat/completions`,
           model: this.model,
           promptLength: systemPrompt.length + query.length,
           stream: !!onChunk
         });
       }

       if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         // Development error logging
         if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
           console.error('[NvidiaAIProvider] HTTP Error:', {
             status: response.status,
             statusText: response.statusText,
             errorData
           });
         }
         this._handleHttpError(response.status, errorData);
       }

       if (onChunk) {
         let fullText = '';
         const reader = response.body.getReader();
         const decoder = new TextDecoder();
         let buffer = '';

         while (true) {
           const { done, value } = await reader.read();
           if (done) break;

           buffer += decoder.decode(value, { stream: true });
           const lines = buffer.split('\n');
           buffer = lines.pop(); // keep incomplete line for next chunk

           for (const line of lines) {
             if (line.startsWith('data: ')) {
               const dataStr = line.slice(6).trim();
               if (dataStr === '[DONE]') continue;
               try {
                 const json = JSON.parse(dataStr);
                 const content = json.choices[0]?.delta?.content || '';
                 fullText += content;
                 onChunk(content);
               } catch (e) {
                 // Ignore partial JSON chunks
               }
             }
           }
         }
         return { text: fullText };
       } else {
         const json = await response.json();
         return { text: json.choices[0]?.message?.content || 'No response from AI.' };
       }

     } catch (err) {
       if (err.message.includes('Too many requests')) throw err;
       if (err.name === 'TypeError') throw new Error('Network error. Please check your connection and that the AI proxy is running.');
       throw err;
     }
   }

  _handleHttpError(status, data) {
    const msg = data.error?.message || '';
    if (status === 401) throw new Error('Invalid API Key. Please check your NVIDIA_API_KEY.');
    if (status === 403) throw new Error('Access forbidden. Your API key may not have access to this model.');
    if (status === 429) throw new Error('Rate limit reached. Please wait a few seconds before trying again.');
    if (status >= 500) throw new Error('NVIDIA API is currently unavailable. Please try again later.');
    throw new Error(`API Error (${status}): ${msg || 'Unexpected error occurred.'}`);
  }
}

export default NvidiaAIProvider;
