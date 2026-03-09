import type { WASocket } from '@whiskeysockets/baileys';

// ─── Estado Global ───────────────────────────────────────────────────

let sock: WASocket | null = null;

/**
 * Mapeamento bidirecional LID ↔ telefone.
 *
 * Populado automaticamente pelo evento `contacts.upsert` do Baileys.
 * Necessário porque o WhatsApp envia `@lid` (Linked Identity) como
 * remoteJid, mas mensagens só podem ser ENTREGUES para `@s.whatsapp.net`.
 */
const lidParaPhone = new Map<string, string>();
const phoneParaLid = new Map<string, string>();

export function getSocket(): WASocket | null {
    return sock;
}

export function setSocket(newSock: WASocket | null): void {
    sock = newSock;
}

export function adicionarMapeamento(lidJid: string, phoneJid: string): void {
    lidParaPhone.set(lidJid, phoneJid);
    phoneParaLid.set(phoneJid, lidJid);
}

export function getTamanhoMapaLid(): number {
    return lidParaPhone.size;
}

export function hasMapeamentoLid(lidJid: string): boolean {
    return lidParaPhone.has(lidJid);
}

/**
 * Resolve um JID `@lid` para o JID de telefone real (`@s.whatsapp.net`).
 *
 * Fontes de resolução (em ordem de prioridade):
 * 1. Mapa `lidParaPhone` (populado por `contacts.upsert`)
 * 2. `sock.contacts` (fallback caso o mapa esteja incompleto)
 *
 * @param lidJid - JID no formato `XXXXXXXXXX@lid`
 * @returns JID de telefone real ou o `lidJid` original se não encontrado
 */
export function resolverLidParaTelefone(lidJid: string): string {
    if (!lidJid.endsWith('@lid')) return lidJid;

    // 1. Verificar mapa de contatos (fonte principal)
    if (lidParaPhone.has(lidJid)) {
        const resolved = lidParaPhone.get(lidJid)!;
        console.log(`[Baileys] @lid resolvido via mapa: ${lidJid} → ${resolved}`);
        return resolved;
    }

    // 2. Fallback: percorrer sock.contacts
    if (sock) {
        const contatos = ((sock as { contacts?: Record<string, { id?: string; lid?: string; phoneNumber?: string }> }).contacts ?? {});
        for (const c of Object.values(contatos)) {
            const cLid: string = c?.lid ?? '';
            const cPhone: string = c?.phoneNumber ?? '';
            const cId: string = c?.id ?? '';

            if (cLid === lidJid || cLid.split('@')[0] === lidJid.split('@')[0]) {
                const phoneJid = cPhone || (!cId.endsWith('@lid') ? cId : null);
                if (phoneJid) {
                    adicionarMapeamento(lidJid, phoneJid);
                    console.log(`[Baileys] @lid resolvido via contatos: ${lidJid} → ${phoneJid}`);
                    return phoneJid;
                }
            }
        }
    }

    console.warn(`[Baileys] ⚠️ Não foi possível resolver @lid ${lidJid}. Contatos: ${lidParaPhone.size}`);
    return lidJid;
}

/**
 * Converte um JID para formato entregável.
 * Se o JID é `@lid`, tenta converter para `@s.whatsapp.net`.
 * Exportada para uso pelo whatsapp.service.
 */
export function resolverJidParaEnvio(jid: string): string {
    if (!jid.endsWith('@lid')) return jid;
    return resolverLidParaTelefone(jid);
}
