import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSingle, mockIn, mockRpc, mockFrom } = vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockIn = vi.fn();

    const chain = (): any => ({
        eq: vi.fn(() => chain()),
        is: vi.fn(() => chain()),
        single: mockSingle,
        select: vi.fn(() => chain()),
        in: mockIn,
    });

    const mockRpc = vi.fn();
    const mockFrom = vi.fn(() => chain());

    return { mockSingle, mockIn, mockRpc, mockFrom };
});

vi.mock('../config/database', () => ({
    supabase: { from: mockFrom, rpc: mockRpc },
}));

import { criarAsync } from '../services/pedido.service';

beforeEach(() => vi.clearAllMocks());

describe('pedido.criarAsync', () => {
    const dto = { clienteId: 1, itens: [{ produtoId: 10, quantidade: 2 }] };

    it('retorna erros quando cliente não encontrado', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        const { pedido, erros } = await criarAsync(dto as any);
        expect(pedido).toBeNull();
        expect(erros).toContain('Cliente não encontrado.');
    });

    it('retorna erros quando produto não existe', async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null });
        mockIn.mockResolvedValueOnce({ data: [], error: null });
        const { erros } = await criarAsync(dto as any);
        expect(erros).toEqual(
            expect.arrayContaining([expect.stringContaining('Produtos não encontrados')]),
        );
    });

    it('retorna erros quando produto está inativo', async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null });
        mockIn.mockResolvedValueOnce({
            data: [{ id: 10, nome: 'Salgado', preco: 1.5, ativo: false }],
            error: null,
        });
        const { erros } = await criarAsync(dto as any);
        expect(erros).toEqual(
            expect.arrayContaining([expect.stringContaining('Produtos inativos')]),
        );
    });

    it('lança erro quando a RPC falha', async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null });
        mockIn.mockResolvedValueOnce({
            data: [{ id: 10, nome: 'Salgado', preco: 1.5, ativo: true }],
            error: null,
        });
        mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
        await expect(criarAsync(dto as any)).rejects.toThrow('db error');
    });

    it('retorna pedido quando RPC é bem-sucedida', async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null });
        mockIn.mockResolvedValueOnce({
            data: [{ id: 10, nome: 'Salgado', preco: 1.5, ativo: true }],
            error: null,
        });
        mockRpc.mockResolvedValueOnce({ data: 42, error: null });
        mockSingle.mockResolvedValueOnce({
            data: {
                id: 42, cliente_id: 1, valor_total: 3, status: 1,
                data_criacao: new Date().toISOString(), data_entrega: null,
                observacoes: null,
                clientes: { nome: 'Teste', telefone: null, endereco: null },
                itens_pedido: [],
            },
            error: null,
        });
        const { pedido, erros } = await criarAsync(dto as any);
        expect(erros).toBeNull();
        expect(pedido?.id).toBe(42);
        expect(mockRpc).toHaveBeenCalledWith(
            'criar_pedido_atomico',
            expect.objectContaining({ p_cliente_id: 1 }),
        );
    });
});
