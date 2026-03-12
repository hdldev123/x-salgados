import { describe, it, expect, vi, beforeEach } from 'vitest';

// JWT_KEY must be set before importing auth.service (IIFE validation on module load)
process.env.JWT_KEY = 'test-secret-key-that-is-at-least-32-chars-ok!!';
process.env.JWT_ISSUER = 'XSalgadosApi';
process.env.JWT_AUDIENCE = 'XSalgadosApp';
process.env.JWT_EXPIRES_HOURS = '8';

// Use vi.hoisted so mock variables exist when the hoisted vi.mock() factory runs
const { mockSingle, mockIs, mockCompare } = vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockIs = vi.fn();
    const mockCompare = vi.fn();

    const chain = (): any => ({
        eq: vi.fn(() => chain()),
        is: (...args: any[]) => { mockIs(...args); return chain(); },
        single: mockSingle,
        select: vi.fn(() => chain()),
    });

    return { mockSingle, mockIs, mockCompare, chain };
});

vi.mock('../config/database', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn().mockReturnThis(),
                is: (...args: any[]) => { mockIs(...args); return { single: mockSingle }; },
                single: mockSingle,
            })),
        })),
    },
}));

vi.mock('bcrypt', () => ({
    default: { hash: vi.fn(async () => 'hash'), compare: mockCompare },
    hash: vi.fn(async () => 'hash'),
    compare: mockCompare,
}));

import { loginAsync } from '../services/auth.service';

beforeEach(() => vi.clearAllMocks());

describe('auth.loginAsync', () => {
    const dto = { email: 'user@test.com', senha: 'senha123' };

    it('retorna null quando email não é encontrado', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        expect(await loginAsync(dto)).toBeNull();
    });

    it('retorna null quando senha está incorreta', async () => {
        mockSingle.mockResolvedValueOnce({
            data: { id: 1, nome: 'João', email: dto.email, senha_hash: 'hash', perfil: 1, ativo: true },
            error: null,
        });
        mockCompare.mockResolvedValueOnce(false);
        expect(await loginAsync(dto)).toBeNull();
    });

    it('retorna token + dados quando credenciais são válidas', async () => {
        mockSingle.mockResolvedValueOnce({
            data: { id: 2, nome: 'Maria', email: dto.email, senha_hash: 'hash', perfil: 1, ativo: true },
            error: null,
        });
        mockCompare.mockResolvedValueOnce(true);
        const resultado = await loginAsync(dto);
        expect(resultado).not.toBeNull();
        expect(resultado?.token).toBeTruthy();
        expect(resultado?.usuario.id).toBe(2);
    });

    it('aplica filtro deleted_at IS NULL', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        await loginAsync(dto);
        expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });
});
