/**
 * Serviço de IA — Gera insights de negócio.
 * Providers suportados (em ordem de prioridade):
 *   0. Grok  (GROK_API_KEY)  — xAI, rápido e perspicaz
 *   1. Groq  (GROQ_API_KEY)  — gratuito, rápido
 *   2. Gemini (GEMINI_API_KEY) — Google AI
 *   3. OpenAI (OPENAI_API_KEY) — pago
 *
 * Segurança: as chaves residem exclusivamente no backend (.env).
 * Resiliência: qualquer falha retorna mensagem padrão amigável.
 */

import OpenAI from 'openai';

const PROMPT_SISTEMA = `Você é o Grok, um consultor de negócios afiado e perspicaz para restaurantes. Analise estas métricas de vendas de hoje e forneça 1 dica curta (máximo 2 frases) de negócio ou marketing para aumentar os lucros. Seja direto, sagaz e use emojis.`;

const MENSAGEM_PADRAO =
  '💡 Dica do dia: Continue focando na qualidade e no atendimento para fidelizar seus clientes! Pequenos ajustes no cardápio podem trazer grandes resultados.';

export interface MetricasInsight {
  receitaHoje: number;
  receitaTotal: number;
  pedidosHoje: number;
  totalPedidos: number;
  totalPedidosConcluidos: number;
  totalPedidosCancelados: number;
  receitaCancelada: number;
  produtosMaisVendidos: { nome: string; quantidadeVendida: number }[];
}

/**
 * Tenta gerar um insight em ordem: Grok (xAI) → Groq → Gemini → OpenAI → fallback.
 */
export async function gerarInsightDeNegocio(metricas: MetricasInsight): Promise<string> {
  const resumo = montarResumo(metricas);

  // 0) Grok (xAI) — prioridade máxima
  const grokKey = process.env.GROK_API_KEY;
  if (grokKey) {
    try {
      return await chamarGrok(grokKey, resumo);
    } catch (err) {
      console.error('[AI Service] Erro ao chamar Grok (xAI):', err);
    }
  }

  // 1) Groq (gratuito)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      return await chamarGroq(groqKey, resumo);
    } catch (err) {
      console.error('[AI Service] Erro ao chamar Groq:', err);
    }
  }

  // 2) Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      return await chamarGemini(geminiKey, resumo);
    } catch (err) {
      console.error('[AI Service] Erro ao chamar Gemini:', err);
    }
  }

  // 3) OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      return await chamarOpenAI(openaiKey, resumo);
    } catch (err) {
      console.error('[AI Service] Erro ao chamar OpenAI:', err);
    }
  }

  if (!grokKey && !groqKey && !geminiKey && !openaiKey) {
    console.warn('[AI Service] Nenhuma chave de IA configurada. Usando mensagem padrão.');
  }

  return MENSAGEM_PADRAO;
}

// ─── Chat com a IA ───────────────────────────────────────────────────────────────

export interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

const PROMPT_CHAT_SISTEMA = (resumo: string) =>
  `Você é um consultor inteligente de restaurantes chamado "Rangô IA". Você tem acesso às métricas atuais da loja e ajuda o gerente a tomar decisões de negócio.

Métricas atuais da loja:
${resumo}

Responda de forma direta, amigável e prática. Use emojis quando apropriado. Máximo 3 frases por resposta.`;

/**
 * Responde a uma mensagem do gerente no chat, com contexto das métricas da loja.
 */
export async function chatComIA(
  mensagem: string,
  metricas: MetricasInsight,
  historico: MensagemChat[] = [],
): Promise<string> {
  const resumo = montarResumo(metricas);
  const sistemaPrompt = PROMPT_CHAT_SISTEMA(resumo);

  const mensagens = [
    { role: 'system' as const, content: sistemaPrompt },
    ...historico.slice(-10), // mantém últimas 10 mensagens para contexto
    { role: 'user' as const, content: mensagem },
  ];

  // 0) Grok (xAI)
  const grokKey = process.env.GROK_API_KEY;
  if (grokKey) {
    try {
      return await chamarGrokChat(grokKey, mensagens);
    } catch (err) {
      console.error('[AI Chat] Erro Grok (xAI):', err);
    }
  }

  // 1) Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      return await chamarGroqChat(groqKey, mensagens);
    } catch (err) {
      console.error('[AI Chat] Erro Groq:', err);
    }
  }

  // 2) OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      return await chamarOpenAIChat(openaiKey, mensagens);
    } catch (err) {
      console.error('[AI Chat] Erro OpenAI:', err);
    }
  }

  return '🤖 Desculpe, não consegui processar sua pergunta agora. Tente novamente em instantes.';
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function montarResumo(m: MetricasInsight): string {
  const produtos = m.produtosMaisVendidos
    .map((p) => `${p.nome}: ${p.quantidadeVendida} un.`)
    .join(', ');

  return [
    `Receita hoje: R$ ${m.receitaHoje.toFixed(2)}`,
    `Receita total acumulada: R$ ${m.receitaTotal.toFixed(2)}`,
    `Pedidos hoje: ${m.pedidosHoje}`,
    `Total pedidos: ${m.totalPedidos}`,
    `Concluídos: ${m.totalPedidosConcluidos}`,
    `Cancelados: ${m.totalPedidosCancelados} (perda: R$ ${m.receitaCancelada.toFixed(2)})`,
    `Produtos mais vendidos: ${produtos || 'nenhum dado'}`,
  ].join(' | ');
}

// ─── Grok — xAI (via SDK openai) ────────────────────────────────────────────────

function criarClienteGrok(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
}

async function chamarGrok(apiKey: string, resumoVendas: string): Promise<string> {
  const client = criarClienteGrok(apiKey);
  const completion = await client.chat.completions.create({
    model: 'grok-2-latest',
    max_tokens: 200,
    temperature: 0.7,
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: `Métricas de vendas:\n${resumoVendas}` },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || MENSAGEM_PADRAO;
}

async function chamarGrokChat(
  apiKey: string,
  mensagens: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const client = criarClienteGrok(apiKey);
  const completion = await client.chat.completions.create({
    model: 'grok-2-latest',
    max_tokens: 300,
    temperature: 0.7,
    messages: mensagens,
  });
  return completion.choices[0]?.message?.content?.trim() || MENSAGEM_PADRAO;
}

// ─── Groq (gratuito, rápido) ────────────────────────────────────────────────────

async function chamarGroq(apiKey: string, resumoVendas: string): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const body = {
    model: 'llama-3.3-70b-versatile',
    max_tokens: 200,
    temperature: 0.7,
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: `Métricas de vendas:\n${resumoVendas}` },
    ],
  };

  return await _fetchOpenAICompat(url, apiKey, body);
}

async function chamarGroqChat(
  apiKey: string,
  mensagens: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  return await _fetchOpenAICompat('https://api.groq.com/openai/v1/chat/completions', apiKey, {
    model: 'llama-3.3-70b-versatile',
    max_tokens: 300,
    temperature: 0.7,
    messages: mensagens,
  });
}

// ─── Gemini (Google AI) ─────────────────────────────────────────────────────────

async function chamarGemini(apiKey: string, resumoVendas: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: `${PROMPT_SISTEMA}\n\nMétricas:\n${resumoVendas}` },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.7,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || MENSAGEM_PADRAO;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── OpenAI ─────────────────────────────────────────────────────────────────────

async function chamarOpenAI(apiKey: string, resumoVendas: string): Promise<string> {
  return await _fetchOpenAICompat('https://api.openai.com/v1/chat/completions', apiKey, {
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0.7,
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: `Métricas de vendas:\n${resumoVendas}` },
    ],
  });
}

async function chamarOpenAIChat(
  apiKey: string,
  mensagens: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  return await _fetchOpenAICompat('https://api.openai.com/v1/chat/completions', apiKey, {
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0.7,
    messages: mensagens,
  });
}

// ─── Shared fetch helper (OpenAI-compatible API) ─────────────────────────────────

async function _fetchOpenAICompat(
  url: string,
  apiKey: string,
  body: object,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json() as any;
    const text = data?.choices?.[0]?.message?.content;
    return text?.trim() || MENSAGEM_PADRAO;
  } finally {
    clearTimeout(timeout);
  }
}