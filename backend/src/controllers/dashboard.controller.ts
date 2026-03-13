import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { gerarInsightDeNegocio, chatComIA, MensagemChat } from '../services/ai.service';

/**
 * GET /api/dashboard/kpis
 */
export async function obterKpis(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const kpis = await dashboardService.obterKpisAsync();
    res.json(kpis);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/pedidos-por-mes
 */
export async function obterPedidosPorMes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const meses = req.query.meses ? parseInt(req.query.meses as string) : 6;
    const dados = await dashboardService.obterPedidosPorMesAsync(meses);
    res.json(dados);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/distribuicao-status
 */
export async function obterDistribuicaoStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dados = await dashboardService.obterDistribuicaoStatusAsync();
    res.json(dados);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/completo
 */
export async function obterDashboardCompleto(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await dashboardService.obterDashboardCompletoAsync();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/insight
 * Rota separada e não-bloqueante para gerar insight de IA.
 * Se a IA falhar, retorna uma mensagem padrão amigável.
 */
export async function obterInsightIA(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const [kpis, produtos] = await Promise.all([
      dashboardService.obterKpisAsync(),
      dashboardService.obterProdutosMaisVendidosAsync(),
    ]);

    const insight = await gerarInsightDeNegocio({
      receitaHoje: kpis.receitaHoje,
      receitaTotal: kpis.receitaTotal,
      pedidosHoje: kpis.pedidosHoje,
      totalPedidos: kpis.totalPedidos,
      totalPedidosConcluidos: kpis.totalPedidosConcluidos,
      totalPedidosCancelados: kpis.totalPedidosCancelados,
      receitaCancelada: kpis.receitaCancelada,
      produtosMaisVendidos: produtos,
    });

    res.json({ insight });
  } catch (error) {
    // Resiliência: mesmo se o banco falhar, não quebramos a tela
    console.error('[Dashboard Insight] Erro:', error);
    res.json({ insight: '💡 Dica do dia: Continue focando na qualidade e no atendimento para fidelizar seus clientes! Pequenos ajustes no cardápio podem trazer grandes resultados.' });
  }
}

/**
 * POST /api/dashboard/chat
 * Chat livre com a IA usando contexto das métricas da loja.
 * Body: { mensagem: string, historico?: { role: 'user'|'assistant', content: string }[] }
 */
export async function chatIA(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { mensagem, historico = [] } = req.body as {
      mensagem: string;
      historico: MensagemChat[];
    };

    if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length === 0) {
      res.status(400).json({ erro: 'O campo mensagem é obrigatório.' });
      return;
    }

    const [kpis, produtos] = await Promise.all([
      dashboardService.obterKpisAsync(),
      dashboardService.obterProdutosMaisVendidosAsync(),
    ]);

    const resposta = await chatComIA(mensagem.trim(), {
      receitaHoje: kpis.receitaHoje,
      receitaTotal: kpis.receitaTotal,
      pedidosHoje: kpis.pedidosHoje,
      totalPedidos: kpis.totalPedidos,
      totalPedidosConcluidos: kpis.totalPedidosConcluidos,
      totalPedidosCancelados: kpis.totalPedidosCancelados,
      receitaCancelada: kpis.receitaCancelada,
      produtosMaisVendidos: produtos,
    }, historico);

    res.json({ resposta });
  } catch (error) {
    console.error('[Chat IA] Erro:', error);
    res.json({ resposta: '🤖 Não consegui processar sua pergunta agora. Tente novamente em instantes.' });
  }
}
