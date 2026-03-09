import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WASocket,
    proto,
    fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import * as whatsappService from './whatsapp.service';
import { WhatsAppPayload } from './whatsapp.service';
import path from 'path';

import {
    setSocket,
    getSocket,
    adicionarMapeamento,
    getTamanhoMapaLid,
    hasMapeamentoLid,
    resolverLidParaTelefone
} from './jid-resolver.service';

// ─── Estado Global ───────────────────────────────────────────────────

/**
 * Diretório onde as credenciais de sessão do WhatsApp são salvas.
 * Isso evita ter que escanear o QR Code a cada reinício.
 */
const AUTH_DIR = path.join(__dirname, '..', '..', 'auth_whatsapp');

/** Logger silencioso para evitar poluir o terminal */
const logger = pino({ level: 'silent' });

// ─── Inicialização ───────────────────────────────────────────────────

/**
 * Inicia a conexão com o WhatsApp via Baileys.
 *
 * - Exibe QR Code no terminal para pareamento
 * - Persiste a sessão em disco (pasta auth_whatsapp/)
 * - Reconecta automaticamente em caso de desconexão
 * - Ao receber mensagem, encaminha para whatsappService.processarMensagemAsync()
 */
export async function iniciarBaileys(): Promise<void> {
    console.log('[Baileys] 🔄 Iniciando conexão com WhatsApp...');

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Busca a versão mais recente do protocolo WhatsApp Web
    // para evitar erro 405 (Connection Failure)
    const { version } = await fetchLatestBaileysVersion();
    console.log(`[Baileys] Usando versão do protocolo WA: ${version.join('.')}`);

    const sock = makeWASocket({
        auth: state,
        version,
        browser: ['X Salgados', 'Chrome', '22.0'],
        logger,
    });
    setSocket(sock);

    // ── Salvar credenciais quando atualizadas
    sock.ev.on('creds.update', saveCreds);

    // ── Eventos de conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n[Baileys] 📱 QR Code gerado! Escaneie com o WhatsApp do número da empresa:\n');
            qrcode.generate(qr, { small: true });
            console.log('');
        }

        if (connection === 'open') {
            console.log('[Baileys] ✅ Conectado ao WhatsApp com sucesso!');

            // Fallback: popular mapa LID↔telefone a partir de sock.contacts
            // (pode já estar disponível se a sessão já estava autenticada)
            setTimeout(() => {
                if (!sock) return;
                const contatos = ((sock as { contacts?: Record<string, { id?: string; lid?: string; phoneNumber?: string }> }).contacts ?? {});
                let novos = 0;
                for (const c of Object.values(contatos)) {
                    const phoneJid = c?.phoneNumber || (!c?.id?.endsWith('@lid') ? c?.id : null);
                    const lidJid = c?.lid || (c?.id?.endsWith('@lid') ? c?.id : null);
                    if (phoneJid && lidJid && !hasMapeamentoLid(lidJid)) {
                        adicionarMapeamento(lidJid, phoneJid);
                        novos++;
                    }
                }
                console.log(
                    `[Baileys] 📇 Contatos na inicialização: ${Object.keys(contatos).length} total, ` +
                    `${novos} novos mapeamentos, ${getTamanhoMapaLid()} LID↔telefone no mapa.`,
                );
            }, 5000);
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const errorMsg = (lastDisconnect?.error as Boom)?.message || 'desconhecido';
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`[Baileys] Conexão fechada. Motivo: ${errorMsg} (código: ${statusCode})`);

            if (shouldReconnect) {
                console.log('[Baileys] ⚠️  Reconectando em 3 segundos...');
                setTimeout(() => iniciarBaileys(), 3000);
            } else {
                console.log('[Baileys] ❌ Deslogado do WhatsApp. Limpando sessão e gerando novo QR Code...');
                const fs = require('fs');
                if (fs.existsSync(AUTH_DIR)) {
                    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                }
                setTimeout(() => iniciarBaileys(), 3000);
            }
        }
    });

    // ── Sincronizar contatos (necessário para resolver @lid → telefone)
    sock.ev.on('contacts.upsert', (contacts) => {
        for (const contact of contacts) {
            const phoneJid = contact.phoneNumber
                || (!contact.id.endsWith('@lid') ? contact.id : null);
            const lidJid = contact.lid
                || (contact.id.endsWith('@lid') ? contact.id : null);

            if (phoneJid && lidJid) {
                adicionarMapeamento(lidJid, phoneJid);
            }
        }
        console.log(`[Baileys] 📇 Contatos sincronizados: ${getTamanhoMapaLid()} mapeamentos LID↔telefone.`);
    });

    sock.ev.on('contacts.update', (updates) => {
        for (const contact of updates) {
            const contactTyped = contact as { id?: string; lid?: string; phoneNumber?: string };
            const phoneJid = contactTyped.phoneNumber
                || (!contactTyped.id?.endsWith('@lid') ? contactTyped.id : null);
            const lidJid = contactTyped.lid
                || (contactTyped.id?.endsWith('@lid') ? contactTyped.id : null);

            if (phoneJid && lidJid) {
                adicionarMapeamento(lidJid, phoneJid);
            }
        }
    });

    // ── Processar mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        // Apenas processar notificações de novas mensagens
        if (type !== 'notify') return;

        for (const msg of messages) {
            const payload = baileysParaPayload(msg);

            // Processar de forma assíncrona (fire-and-forget)
            whatsappService.processarMensagemAsync(payload).catch((err) => {
                console.error('[Baileys] Erro ao processar mensagem:', err.message);
            });
        }
    });
}

// ─── Conversor de Formato ────────────────────────────────────────────

/**
 * Converte uma mensagem raw do Baileys para o formato de payload
 * que o whatsappService.processarMensagemAsync() espera.
 *
 * Inclui o campo `phoneJid` com o JID de telefone real (sem @lid),
 * que deve ser usado para identificar/cadastrar o cliente no banco,
 * enquanto `remoteJid` é mantido para envio de respostas.
 */
function baileysParaPayload(msg: proto.IWebMessageInfo): WhatsAppPayload {
    let conversation: string | undefined;
    let extendedText: string | undefined;
    let messageType = 'unknown';

    if (msg.message?.conversation) {
        conversation = msg.message.conversation;
        messageType = 'conversation';
    } else if (msg.message?.extendedTextMessage?.text) {
        extendedText = msg.message.extendedTextMessage.text;
        messageType = 'extendedTextMessage';
    } else if (msg.message?.imageMessage) {
        messageType = 'imageMessage';
    } else if (msg.message?.videoMessage) {
        messageType = 'videoMessage';
    } else if (msg.message?.audioMessage) {
        messageType = 'audioMessage';
    } else if (msg.message?.documentMessage) {
        messageType = 'documentMessage';
    }

    const remoteJid = msg.key?.remoteJid || '';

    // Resolve @lid → telefone real para uso interno (busca/cadastro no banco)
    const phoneJid = remoteJid.endsWith('@lid')
        ? resolverLidParaTelefone(remoteJid)
        : remoteJid;

    return {
        event: 'messages.upsert',
        instance: 'baileys-local',
        data: {
            key: {
                remoteJid,
                fromMe: msg.key?.fromMe || false,
                id: msg.key?.id || '',
            },
            // phoneJid: JID com o número real do telefone para lookup/cadastro no banco.
            // Pode ser igual a remoteJid quando não é @lid.
            phoneJid,
            pushName: msg.pushName || 'Desconhecido',
            message: {
                conversation,
                extendedTextMessage: extendedText ? { text: extendedText } : undefined,
            },
            messageType,
            messageTimestamp: typeof msg.messageTimestamp === 'number'
                ? msg.messageTimestamp
                : Date.now() / 1000,
        },
    };
}

