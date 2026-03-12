import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSingle, mockFrom } = vi.hoisted(() => {
    const mockSingle = vi.fn();

    const chain = (): any => ({
        eq: vi.fn(() => chain()),
        is: vi.fn(() => chain()),
        single: mockSingle,
        order: vi.fn(() => chain()),
        range: vi.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
    });

    const mockFrom = vi.fn(() => ({ select: vi.fn(() => chain()) }));

    return { mockSingle, mockFrom };
});

vi.mock('../config/database', () => ({
    supabase: { from: mockFrom },
}));

import { obterPorIdAsync, obterCategoriasAsync } from '../services/produto.service';

beforeEach(() => vi.clearAllMocks());

describe('produto.obterPorIdAsync', () => {
    it('retorna null quando produto não existe', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        expect(await obterPorIdAsync(999)).toBeNull();
    });

    it('mapeia preco para Number mesmo vindo como string do banco', async () => {
        mockSingle.mockResolvedValueOnce({
            data: {
                id: 1, nome: 'Coxinha', categoria: 'Salgado',
                descricao: null, preco: '2.50', ativo: true,
                data_criacao: '2024-01-01',
            },
            error: null,
        });
        const produto = await obterPorIdAsync(1);
        expect(produto?.preco).toBe(2.5);
        expect(typeof produto?.preco).toBe('number');
    });
});

describe('produto.obterCategoriasAsync', () => {
    it('deduplica e ordena categorias alfabeticamente', async () => {
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockResolvedValueOnce({
                data: [
                    { categoria: 'Salgado' }, { categoria: 'Doce' },
                    { categoria: 'Salgado' }, { categoria: 'Bebida' },
                ],
                error: null,
            }),
        });
        expect(await obterCategoriasAsync()).toEqual(['Bebida', 'Doce', 'Salgado']);
    });

    it('lança erro quando Supabase retorna error', async () => {
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Falha DB' } }),
        });
        await expect(obterCategoriasAsync()).rejects.toThrow('Falha DB');
    });
});
