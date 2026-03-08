import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize, authenticateWebhook } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

// Schemas Zod
import { LoginSchema } from '../dtos/auth.dto';
import { PaginacaoSchema } from '../dtos/common.dto';
import { CriarClienteSchema, AtualizarClienteSchema } from '../dtos/cliente.dto';
import { CriarProdutoSchema, AtualizarProdutoSchema } from '../dtos/produto.dto';
import { CriarPedidoSchema, AtualizarStatusSchema } from '../dtos/pedido.dto';
import { CriarUsuarioSchema, AtualizarUsuarioSchema, AlterarSenhaSchema } from '../dtos/usuario.dto';

// Controllers
import * as authController from '../controllers/auth.controller';
import * as clientesController from '../controllers/clientes.controller';
import * as produtosController from '../controllers/produtos.controller';
import * as pedidosController from '../controllers/pedidos.controller';
import * as usuariosController from '../controllers/usuarios.controller';
import * as entregasController from '../controllers/entregas.controller';
import * as dashboardController from '../controllers/dashboard.controller';
import * as whatsappController from '../controllers/whatsapp.controller';

const router = Router();

// ─── Rate Limiter — Login ────────────────────────────────────────────
// Máximo de 10 tentativas por IP a cada 15 minutos.
// Protege contra brute-force e credential stuffing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 10,                   // máximo de 10 requisições por IP dentro da janela
  standardHeaders: 'draft-7', // envia os headers RateLimit-* (RFC 6585)
  legacyHeaders: false,       // desativa os headers X-RateLimit-* antigos
  skipSuccessfulRequests: false, // conta também as tentativas bem-sucedidas
  message: {
    sucesso: false,
    mensagem: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
    erros: ['Limite de tentativas de login excedido.'],
  },
});

// ═══════════════════════════════════════════════════════════════════════
// AUTH — Público
// ═══════════════════════════════════════════════════════════════════════
router.post('/api/auth/login', loginLimiter, validate(LoginSchema), authController.login);

// ═══════════════════════════════════════════════════════════════════════
// CLIENTES — Admin + Atendente
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/api/clientes',
  authenticate,
  authorize('Administrador', 'Atendente'),
  validate(PaginacaoSchema, 'query'),
  clientesController.obterTodos,
);

router.get(
  '/api/clientes/:id',
  authenticate,
  authorize('Administrador', 'Atendente'),
  clientesController.obterPorId,
);

router.post(
  '/api/clientes',
  authenticate,
  authorize('Administrador', 'Atendente'),
  validate(CriarClienteSchema),
  clientesController.criar,
);

router.put(
  '/api/clientes/:id',
  authenticate,
  authorize('Administrador', 'Atendente'),
  validate(AtualizarClienteSchema),
  clientesController.atualizar,
);

router.delete(
  '/api/clientes/:id',
  authenticate,
  authorize('Administrador', 'Atendente'),
  clientesController.excluir,
);

// ═══════════════════════════════════════════════════════════════════════
// PRODUTOS — Leitura: qualquer autenticado | Escrita: Admin
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/api/produtos',
  authenticate,
  validate(PaginacaoSchema, 'query'),
  produtosController.obterTodos,
);

router.get(
  '/api/produtos/categorias',
  authenticate,
  produtosController.obterCategorias,
);

router.get(
  '/api/produtos/:id',
  authenticate,
  produtosController.obterPorId,
);

router.post(
  '/api/produtos',
  authenticate,
  authorize('Administrador'),
  validate(CriarProdutoSchema),
  produtosController.criar,
);

router.put(
  '/api/produtos/:id',
  authenticate,
  authorize('Administrador'),
  validate(AtualizarProdutoSchema),
  produtosController.atualizar,
);

router.delete(
  '/api/produtos/:id',
  authenticate,
  authorize('Administrador'),
  produtosController.excluir,
);

// ═══════════════════════════════════════════════════════════════════════
// PEDIDOS — Admin + Atendente
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/api/pedidos',
  authenticate,
  authorize('Administrador', 'Atendente'),
  validate(PaginacaoSchema, 'query'),
  pedidosController.obterTodos,
);

router.get(
  '/api/pedidos/:id',
  authenticate,
  authorize('Administrador', 'Atendente'),
  pedidosController.obterPorId,
);

router.post(
  '/api/pedidos',
  authenticate,
  authorize('Administrador', 'Atendente'),
  validate(CriarPedidoSchema),
  pedidosController.criar,
);

router.patch(
  '/api/pedidos/:id/status',
  authenticate,
  authorize('Administrador', 'Atendente', 'Entregador'),
  validate(AtualizarStatusSchema),
  pedidosController.atualizarStatus,
);

// ═══════════════════════════════════════════════════════════════════════
// USUÁRIOS — Admin
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/api/usuarios',
  authenticate,
  authorize('Administrador'),
  validate(PaginacaoSchema, 'query'),
  usuariosController.obterTodos,
);

router.get(
  '/api/usuarios/:id',
  authenticate,
  authorize('Administrador'),
  usuariosController.obterPorId,
);

router.post(
  '/api/usuarios',
  authenticate,
  authorize('Administrador'),
  validate(CriarUsuarioSchema),
  usuariosController.criar,
);

router.put(
  '/api/usuarios/:id',
  authenticate,
  authorize('Administrador'),
  validate(AtualizarUsuarioSchema),
  usuariosController.atualizar,
);

router.delete(
  '/api/usuarios/:id',
  authenticate,
  authorize('Administrador'),
  usuariosController.excluir,
);

router.patch(
  '/api/usuarios/:id/senha',
  authenticate,
  authorize('Administrador'),
  validate(AlterarSenhaSchema),
  usuariosController.alterarSenha,
);

// ═══════════════════════════════════════════════════════════════════════
// ENTREGAS — Admin + Entregador
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/api/entregas/lote',
  authenticate,
  authorize('Administrador', 'Entregador'),
  entregasController.obterLoteEntrega,
);

router.post(
  '/api/entregas/liberar-lote',
  authenticate,
  authorize('Administrador', 'Entregador'),
  entregasController.liberarLote,
);

router.get(
  '/api/entregas/em-transito',
  authenticate,
  authorize('Administrador', 'Entregador'),
  entregasController.obterPedidosEmTransito,
);

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD — Admin
// ═══════════════════════════════════════════════════════════════════════
router.get(
  '/api/dashboard/kpis',
  authenticate,
  authorize('Administrador'),
  dashboardController.obterKpis,
);

router.get(
  '/api/dashboard/pedidos-por-mes',
  authenticate,
  authorize('Administrador'),
  dashboardController.obterPedidosPorMes,
);

router.get(
  '/api/dashboard/distribuicao-status',
  authenticate,
  authorize('Administrador'),
  dashboardController.obterDistribuicaoStatus,
);

router.get(
  '/api/dashboard/completo',
  authenticate,
  authorize('Administrador'),
  dashboardController.obterDashboardCompleto,
);

// ═══════════════════════════════════════════════════════════════════════
// WHATSAPP WEBHOOK — Validado por token (WHATSAPP_WEBHOOK_TOKEN no .env)
// ═══════════════════════════════════════════════════════════════════════
router.post('/api/whatsapp/webhook', authenticateWebhook, whatsappController.receberWebhook);

export default router;
