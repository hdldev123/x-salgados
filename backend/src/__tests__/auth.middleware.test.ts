import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ─── Set env before importing the middleware ─────────────────────────
process.env.JWT_KEY = 'test-secret-key-that-is-long-enough-32ch!!';
process.env.JWT_ISSUER = 'XSalgadosApi';
process.env.JWT_AUDIENCE = 'XSalgadosApp';

// src/__tests__/ → ../middlewares/ = src/middlewares/
import { authenticate, authorize, authenticateWebhook } from '../middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// ─── Helpers ─────────────────────────────────────────────────────────
function buildMocks(headers: Record<string, string> = {}, query: Record<string, string> = {}) {
    const req = { headers, query, socket: { remoteAddress: '127.0.0.1' } } as unknown as Request;
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;
    return { req, res, next };
}

function makeToken(payload: object = { id: 1, nome: 'João', email: 'j@j.com', perfil: 'Administrador' }) {
    return jwt.sign(payload, process.env.JWT_KEY!, {
        issuer: 'XSalgadosApi', audience: 'XSalgadosApp', expiresIn: '1h',
    });
}

// ─── authenticate ────────────────────────────────────────────────────
describe('authenticate', () => {
    it('sem header Authorization → 401', () => {
        const { req, res, next } = buildMocks();
        authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('header sem prefixo Bearer → 401', () => {
        const { req, res, next } = buildMocks({ authorization: 'Basic abc' });
        authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('token inválido → 401 com mensagem correta', () => {
        const { req, res, next } = buildMocks({ authorization: 'Bearer token-invalido' });
        authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mensagem: 'Token inválido ou expirado.' }),
        );
    });

    it('token válido → injeta req.usuario e chama next()', () => {
        const token = makeToken();
        const { req, res, next } = buildMocks({ authorization: `Bearer ${token}` });
        authenticate(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect((req as any).usuario).toMatchObject({ id: 1, perfil: 'Administrador' });
    });
});

// ─── authorize ───────────────────────────────────────────────────────
describe('authorize', () => {
    it('sem req.usuario → 401', () => {
        const { req, res, next } = buildMocks();
        authorize('Administrador')(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('perfil insuficiente → 403', () => {
        const { req, res, next } = buildMocks();
        (req as any).usuario = { id: 2, perfil: 'Atendente' };
        authorize('Administrador')(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('perfil permitido → chama next()', () => {
        const { req, res, next } = buildMocks();
        (req as any).usuario = { id: 1, perfil: 'Administrador' };
        authorize('Administrador', 'Atendente')(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('sem perfis restritos → qualquer autenticado passa', () => {
        const { req, res, next } = buildMocks();
        (req as any).usuario = { id: 3, perfil: 'Qualquer' };
        authorize()(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });
});

// ─── authenticateWebhook ─────────────────────────────────────────────
describe('authenticateWebhook', () => {
    const original = process.env.WHATSAPP_WEBHOOK_TOKEN;
    beforeEach(() => { delete process.env.WHATSAPP_WEBHOOK_TOKEN; });
    afterEach(() => {
        if (original) process.env.WHATSAPP_WEBHOOK_TOKEN = original;
        else delete process.env.WHATSAPP_WEBHOOK_TOKEN;
    });

    it('token não configurado → 500', () => {
        const { req, res, next } = buildMocks();
        authenticateWebhook(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('token errado → 401', () => {
        process.env.WHATSAPP_WEBHOOK_TOKEN = 'correct';
        const { req, res, next } = buildMocks({ 'x-webhook-token': 'wrong' });
        authenticateWebhook(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('token correto no header → next()', () => {
        process.env.WHATSAPP_WEBHOOK_TOKEN = 'correct';
        const { req, res, next } = buildMocks({ 'x-webhook-token': 'correct' });
        authenticateWebhook(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('token correto em query string → next()', () => {
        process.env.WHATSAPP_WEBHOOK_TOKEN = 'correct';
        const { req, res, next } = buildMocks({}, { token: 'correct' });
        authenticateWebhook(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });
});
