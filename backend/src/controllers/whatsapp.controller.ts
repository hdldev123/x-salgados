import { Request, Response, NextFunction } from 'express';
import * as whatsappService from '../services/whatsapp.service';

/**
 * POST /api/whatsapp/webhook
 *
 * Recebe mensagens do WhatsApp (Baileys / Evolution API).
 * A autenticação por token é feita pelo middleware `authenticateWebhook`
 * antes de chegar aqui — ver `routes/index.ts` e `middlewares/auth.middleware.ts`.
 *
 * Fluxo:
 * 1. Responde 200 imediatamente (evita timeout da Evolution API / Baileys)
 * 2. Processa a mensagem de forma assíncrona (fire-and-forget)
 */
export async function receberWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    // Responder imediatamente — o processamento ocorre em background
    res.status(200).json({
        sucesso: true,
        mensagem: 'Mensagem recebida.',
    });

    // Fire-and-forget: não bloqueia a resposta
    whatsappService.processarMensagemAsync(req.body).catch((err) => {
        console.error('[WhatsApp] Erro no processamento em background:', err.message);
    });
}
