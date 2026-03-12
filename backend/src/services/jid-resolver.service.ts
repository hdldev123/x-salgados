import type { WASocket } from '@whiskeysockets/baileys';
import { supabase } from '../config/database';

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
 * Aquece os mapas locais buscando LIDs salvos no banco de dados.
 * Utiliza paginação para contornar o limite padrão (1000) do PostgREST.
 */
export async function aquecerMapaLid(): Promise<void> {
    const TAMANHO_PAGINA = 1000;
    let pagina = 0;
    let buscouTudo = false;
    let adicionados = 0;

    console.log('[Baileys] 🔄 Aquecendo mapa LID↔Telefone a partir do banco de dados...');

    try {
        while (!buscouTudo) {
            const inicio = pagina * TAMANHO_PAGINA;
            const fim = inicio + TAMANHO_PAGINA - 1;

            const { data, error } = await supabase
                .from('clientes')
                .select('whatsapp_jid, whatsapp_lid')
                .not('whatsapp_lid', 'is', null)
                .not('whatsapp_jid', 'is', null)
                .range(inicio, fim);

            if (error) {
                console.error('[Baileys] Erro ao buscar mapeamentos no banco:', error.message);
                break;
            }

            if (!data || data.length === 0) {
                buscouTudo = true;
                break;
            }

            for (const c of data) {
                // Sobrescreve apenas se não existir para não quebrar uma sessão em memória recente
                if (!lidParaPhone.has(c.whatsapp_lid)) {
                    adicionarMapeamento(c.whatsapp_lid, c.whatsapp_jid);
                    adicionados++;
                }
            }

            if (data.length < TAMANHO_PAGINA) {
                buscouTudo = true;
            } else {
                pagina++;
            }
        }

        console.log(`[Baileys] 📇 Mapa aquecido com sucesso! Adicionados do DB: ${adicionados}. Tamanho atual: ${lidParaPhone.size}`);
    } catch (err: unknown) {
        console.error('[Baileys] Falha catastrofica ao aquecer mapa LID:', err instanceof Error ? err.message : err);
    }
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
