import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted to the top of the file by Vitest before any variable declarations.
// We must use vi.hoisted() so the mock variables are available when the factory runs.
const { mockSingle, mockMaybeSingle, mockUpdate, mockFrom } = vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockMaybeSingle = vi.fn();

    const chain = (): any => ({
        eq: vi.fn(() => chain()),
        is: vi.fn(() => chain()),
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        select: vi.fn(() => chain()),
    });

    const mockUpdate = vi.fn(() => chain());
    const mockFrom = vi.fn(() => ({
        select: vi.fn(() => chain()),
        update: mockUpdate,
        insert: vi.fn(() => chain()),
    }));

    return { mockSingle, mockMaybeSingle, mockUpdate, mockFrom };
});

vi.mock('../config/database', () => ({
    supabase: { from: mockFrom },
}));

vi.mock('../services/auth.service', () => ({
    hashSenha: vi.fn(async (s: string) => `hashed:${s}`),
    verificarSenha: vi.fn(async () => true),
}));

import { excluirAsync, criarAsync } from '../services/usuario.service';
import { InvalidOperationError } from '../middlewares/error.middleware';

beforeEach(() => vi.clearAllMocks());

// ─── excluirAsync ─────────────────────────────────────────────────────
describe('excluirAsync', () => {
    it('lança InvalidOperationError ao excluir a si mesmo', async () => {
        await expect(excluirAsync(1, 1)).rejects.toThrow(InvalidOperationError);
    });

    it('chama update com deleted_at (string ISO) e ativo = false', async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: 2 }, error: null });
        const resultado = await excluirAsync(2, 1);
        expect(resultado).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ ativo: false }),
        );
        const calls = mockUpdate.mock.calls as any[];
        const payload = calls[0][0];
        expect(typeof payload.deleted_at).toBe('string');
    });

    it('retorna false quando usuário não existe', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        expect(await excluirAsync(99, 1)).toBe(false);
    });
});

// ─── criarAsync ──────────────────────────────────────────────────────
describe('criarAsync', () => {
    it('lança erro se email já está em uso por usuário ativo', async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: { id: 5 }, error: null });
        await expect(
            criarAsync({ nome: 'Novo', email: 'existente@test.com', senha: '123', perfil: 1 }),
        ).rejects.toThrow('Já existe um usuário cadastrado com este email.');
    });

    it('cria usuário quando email não está em uso', async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
        mockSingle.mockResolvedValueOnce({
            data: { id: 10, nome: 'Novo', email: 'novo@test.com', perfil: 1, data_criacao: new Date().toISOString(), ativo: true },
            error: null,
        });
        const resultado = await criarAsync({ nome: 'Novo', email: 'novo@test.com', senha: '123', perfil: 1 });
        expect(resultado.id).toBe(10);
    });
});
