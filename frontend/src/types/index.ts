/**
 * Definições de tipos e interfaces para o frontend Rangô.
 * Documenta os contratos entre frontend e backend.
 */

// ─── ENUMS / CONSTANTES ────────────────────────────────────────────────────────

export enum StatusPedido {
  Pendente = 1,
  EmProducao = 2,
  Pronto = 3,
  EmEntrega = 4,
  Entregue = 5,
  Cancelado = 6,
}

// Map the old strings to numeric values just in case some legacy code relies on it, or define string literal types of the status labels if needed.
// Based on typical enum vs string union mapping:
export const STATUS_PEDIDO = {
  PENDENTE: 'PENDENTE',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  A_CAMINHO: 'A_CAMINHO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
};

export const ROLES_USUARIO = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ATENDENTE: 'ATENDENTE',
  ENTREGADOR: 'ENTREGADOR',
};

export type RoleUsuario = 'ADMINISTRADOR' | 'ATENDENTE' | 'ENTREGADOR';

// ─── INTERFACES / TYPEDEF ──────────────────────────────────────────────────────

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: RoleUsuario;
  ativo?: boolean;
  dataCriacao?: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
  expiracao: string;
}

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  cep?: string;
  dataCriacao?: string;
  totalPedidos?: number;
  whatsapp_jid?: string;
  whatsapp_lid?: string;
}

export interface Produto {
  id: number;
  nome: string;
  categoria?: string;
  descricao?: string;
  preco: number;
  ativo?: boolean;
  estoque?: number;
  dataCriacao?: string;
}

export interface ItemPedido {
  id: number;
  produtoId: number;
  produtoNome?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal?: number;
}

export interface Pedido {
  id: number;
  clienteId: number;
  cliente?: Partial<Cliente>;
  dataPedido: string;
  dataEntrega?: string;
  total: number;
  status: string | number; // Backwards compatible with legacy frontend
  observacoes?: string;
  itens?: ItemPedido[];
}

export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  totalItens?: number;
  pagina?: number;
  tamanhoPagina?: number;
  totalPaginas?: number;
}

export interface DashboardKPIs {
  receitaTotal: number;
  totalPedidos: number;
  totalClientes: number;
  pedidosPendentes: number;
  pedidosHoje: number;
  receitaHoje: number;
  totalPedidosConcluidos: number;
  totalPedidosCancelados: number;
  receitaCancelada: number;
}

export interface PedidosPorMes {
  ano: number;
  mes: number;
  mesNome: string;
  totalPedidos: number;
  receitaTotal: number;
}

export interface DistribuicaoStatus {
  status: string;
  quantidade: number;
  percentual: number;
}

export interface ProdutoMaisVendido {
  nome: string;
  quantidadeVendida: number;
}

export interface ApiError {
  sucesso: false;
  mensagem: string;
  erros: string[];
  status: number;
}

// A generic wrapper for common API responses
export interface ApiResponse<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  mensagem?: string;
}
