import { describe, it, expect, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
    errorHandler,
    InvalidOperationError,
    NotFoundError,
    UnauthorizedError,
    ConflictError,
} from '../middlewares/error.middleware';

function buildRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe('Typed Error classes', () => {
    it('InvalidOperationError', () => {
        const e = new InvalidOperationError('msg');
        expect(e.name).toBe('InvalidOperationError');
        expect(e.message).toBe('msg');
    });
    it('NotFoundError', () => expect(new NotFoundError('x').name).toBe('NotFoundError'));
    it('UnauthorizedError', () => expect(new UnauthorizedError('x').name).toBe('UnauthorizedError'));
    it('ConflictError', () => expect(new ConflictError('x').name).toBe('ConflictError'));
});

describe('errorHandler', () => {
    const originalEnv = process.env.NODE_ENV;
    afterEach(() => { process.env.NODE_ENV = originalEnv; });

    it('InvalidOperationError → 400', () => {
        const res = buildRes();
        errorHandler(new InvalidOperationError('ruim'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('VALIDATION: prefix → 400 com mensagem limpa', () => {
        const res = buildRes();
        errorHandler(new Error('VALIDATION: campo obrigatório'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mensagem: 'campo obrigatório' }),
        );
    });

    it('NotFoundError → 404', () => {
        const res = buildRes();
        errorHandler(new NotFoundError('x'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('UnauthorizedError → 401', () => {
        const res = buildRes();
        errorHandler(new UnauthorizedError('x'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('ConflictError → 409', () => {
        const res = buildRes();
        errorHandler(new ConflictError('x'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('Error genérico → 500', () => {
        const res = buildRes();
        errorHandler(new Error('falha'), req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('em produção, mascara mensagem de erro interno', () => {
        process.env.NODE_ENV = 'production';
        const res = buildRes();
        errorHandler(new Error('segredo'), req, res, next);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mensagem: 'Ocorreu um erro interno. Tente novamente mais tarde.' }),
        );
    });

    it('resposta sempre tem sucesso = false', () => {
        const res = buildRes();
        errorHandler(new Error('x'), req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sucesso: false }));
    });
});
