import { z } from 'zod';
import { StatusPedido } from '../models/enums';

// ─── Item do Pedido (entrada) ────────────────────────────────────────
export const ItemPedidoSchema = z.object({
  produtoId: z
    .number({ required_error: 'Produto é obrigatório' })
    .int('Produto deve ser um ID inteiro'),
  quantidade: z
    .number({ required_error: 'Quantidade é obrigatória' })
    .int('Quantidade deve ser um inteiro')
    .min(1, 'Quantidade deve ser entre 1 e 9999')
    .max(9999, 'Quantidade deve ser entre 1 e 9999'),
});
export type ItemPedidoInputDto = z.infer<typeof ItemPedidoSchema>;

// ─── Criar Pedido ────────────────────────────────────────────────────
export const CriarPedidoSchema = z.object({
  clienteId: z
    .number({ required_error: 'Cliente é obrigatório' })
    .int('Cliente deve ser um ID inteiro'),
  dataEntrega: z.coerce.date().nullish(),
  observacoes: z
    .string()
    .max(500, 'Observações deve ter no máximo 500 caracteres')
    .nullish(),
  itens: z
    .array(ItemPedidoSchema, { required_error: 'Itens são obrigatórios' })
    .min(1, 'Pedido deve ter pelo menos 1 item'),
});
export type CriarPedidoDto = z.infer<typeof CriarPedidoSchema>;

// ─── Atualizar Status ────────────────────────────────────────────────
export const AtualizarStatusSchema = z.object({
  status: z
    .nativeEnum(StatusPedido, { required_error: 'Status é obrigatório' }),
});
export type AtualizarStatusDto = z.infer<typeof AtualizarStatusSchema>;

// ─── Response DTOs ──────────────────────────────────────────────────
export interface ItemPedidoResponseDto {
  id: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface PedidoDto {
  id: number;
  clienteId: number;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteEndereco: string | null;
  dataCriacao: Date;
  dataEntrega: Date | null;
  valorTotal: number;
  status: string;
  statusEnum: StatusPedido;
  observacoes: string | null;
  itens: ItemPedidoResponseDto[];
}

export interface PedidoResumoDto {
  id: number;
  clienteNome: string;
  dataCriacao: Date;
  dataEntrega: Date | null;
  valorTotal: number;
  status: string;
  statusEnum: StatusPedido;
  quantidadeItens: number;
}
