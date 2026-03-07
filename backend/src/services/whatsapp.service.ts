import { supabase } from '../config/database';
import * as pedidoService from './pedido.service';
import type { WASocket } from '@whiskeysockets/baileys';
import { StatusPedido, StatusPedidoLabel } from '../models/enums';
import type { PedidoDto } from '../dtos/pedido.dto';
import {
    EtapaConversa,
    obterEstado,
    definirEstado,
    limparEstado,
} from './bot-state.service';

// ─── Constantes ──────────────────────────────────────────────────────

/** Número WhatsApp do administrador que recebe as notificações de pedido */
const ADMIN_JID = '5532999269379@s.whatsapp.net';
// ─── Cache telefone → remoteJid ──────────────────────────────────

/**
 * Cache em memória que mapeia o telefone normalizado do cliente
 * para o remoteJid real usado pelo Baileys (pode ser @lid ou @s.whatsapp.net).
 *
 * É preenchido automaticamente toda vez que o cliente envia uma mensagem.
 * Usado para envio de notificações prolátivas sem depender de construir
 * o JID a partir do telefone (o que falha para contas com @lid).
 */
const jidCache = new Map<string, string>();

/**
 * Registra ou atualiza o remoteJid de um cliente no cache.
 * Deve ser chamado sempre que uma mensagem válida for recebida.
 */
function registrarJid(telefoneLimpo: string, remoteJid: string): void {
    jidCache.set(telefoneLimpo, remoteJid);
}

/**
 * Resolve o JID de envio para um telefone.
 * Prioriza o cache (JID real que o Baileys usa) e cai de volta
 * para a construção clássica @s.whatsapp.net como fallback.
 */
function resolverJid(telefoneLimpo: string): string {
    if (jidCache.has(telefoneLimpo)) {
        return jidCache.get(telefoneLimpo)!;
    }
    // Fallback: construir JID a partir do número
    const digits = telefoneLimpo.replace(/\D/g, '');
    const withCountry = digits.length <= 11 ? `55${digits}` : digits;
    return `${withCountry}@s.whatsapp.net`;
}
// ─── Tipos internos ──────────────────────────────────────────────────

/** Payload simplificado vindo do Baileys (evento messages.upsert) */
interface WhatsAppPayload {
    event?: string;
    instance?: string;
    data?: {
        key?: {
            remoteJid?: string;
            fromMe?: boolean;
            id?: string;
        };
        /**
         * JID com o número de telefone real (`XXXX@s.whatsapp.net`).
         * Pode diferir de `key.remoteJid` quando o WhatsApp usa @lid (Linked Identity).
         * Use este campo para buscar/cadastrar o cliente no banco.
         * Use `key.remoteJid` para enviar respostas.
         */
        phoneJid?: string;
        pushName?: string;
        message?: {
            conversation?: string;
            extendedTextMessage?: {
                text?: string;
            };
        };
        messageType?: string;
        messageTimestamp?: number;
    };
}

// ─── Utilitários ─────────────────────────────────────────────────────

/**
 * Envia uma mensagem de texto via Baileys para o JID informado.
 * Loga um aviso caso o socket não esteja conectado.
 *
 * @param jid  - Destinatário (ex: `5532999999999@s.whatsapp.net`)
 * @param text - Conteúdo da mensagem
 */
async function enviarMensagem(jid: string, text: string): Promise<void> {
    // Importação lazy para evitar dependência circular com baileys.service.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSocket, resolverJidParaEnvio } = require('./baileys.service') as {
        getSocket: () => WASocket | null;
        resolverJidParaEnvio: (jid: string) => string;
    };
    const sock = getSocket();
    if (!sock) {
        console.warn('[WhatsApp] Socket não disponível. Mensagem não enviada para', jid);
        return;
    }

    // @lid JIDs NÃO são entregáveis — converter para @s.whatsapp.net
    const jidEnvio = resolverJidParaEnvio(jid);

    if (jidEnvio.endsWith('@lid')) {
        console.warn(
            `[WhatsApp] ⚠️ JID @lid não resolvido: ${jid}. ` +
            `Mensagem pode não ser entregue. Aguardando sincronização de contatos.`,
        );
    }

    await sock.sendMessage(jidEnvio, { text });
    console.log(`[WhatsApp] 📤 Mensagem enviada para ${jidEnvio}${jidEnvio !== jid ? ` (lid: ${jid})` : ''}`);
}

/**
 * Normaliza o número de telefone removendo sufixos do WhatsApp
 * e o código de país (55 Brasil).
 *
 * Exemplos:
 *   "5511999999999@s.whatsapp.net" → "11999999999"
 *   "5511999999999"                → "11999999999"
 *   "(11) 99999-9999"              → "11999999999"
 */
export function limparTelefone(raw: string): string {
    // Remove o sufixo @s.whatsapp.net, @c.us ou @lid (novo formato Linked ID do WA)
    let numero = raw.replace(/@(s\.whatsapp\.net|c\.us|lid)$/i, '');

    // Remove tudo que não for dígito
    numero = numero.replace(/\D/g, '');

    // Remove código do país Brasil (55) se presente e o número tiver > 11 dígitos
    if (numero.length > 11 && numero.startsWith('55')) {
        numero = numero.substring(2);
    }

    return numero;
}

/**
 * Extrai o texto da mensagem, suportando tanto `conversation`
 * quanto `extendedTextMessage.text`.
 */
function extrairTexto(payload: WhatsAppPayload): string | null {
    const msg = payload.data?.message;
    if (!msg) return null;
    return msg.conversation || msg.extendedTextMessage?.text || null;
}

/**
 * Verifica se a mensagem é válida para processamento.
 * Rejeita: mensagens de grupo, status/broadcast, enviadas pelo bot,
 * mensagens que não sejam de texto.
 */
export function ehMensagemValida(payload: WhatsAppPayload): boolean {
    // Deve ter dados básicos
    if (!payload.data?.key?.remoteJid) return false;

    const remoteJid = payload.data.key.remoteJid;

    // Ignorar mensagens enviadas pelo próprio bot
    if (payload.data.key.fromMe === true) return false;

    // Ignorar mensagens de grupo (@g.us)
    if (remoteJid.endsWith('@g.us')) return false;

    // Ignorar status/broadcast
    if (remoteJid === 'status@broadcast') return false;

    // Aceitar apenas mensagens de texto
    const tipo = payload.data.messageType;
    if (tipo && tipo !== 'conversation' && tipo !== 'extendedTextMessage') return false;

    // Deve ter texto
    const texto = extrairTexto(payload);
    if (!texto || texto.trim().length === 0) return false;

    return true;
}

/**
 * Busca um cliente no Supabase comparando o telefone normalizado.
 * Retorna o registro do cliente ou `null` se não encontrado.
 */
async function buscarClientePorTelefone(telefoneLimpo: string): Promise<any | null> {
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*');

    if (error || !clientes) {
        console.error('[WhatsApp] Erro ao buscar clientes:', error?.message);
        return null;
    }

    return clientes.find((c: any) => {
        const telBanco = (c.telefone || '').replace(/\D/g, '');
        return telBanco === telefoneLimpo
            || telBanco === `55${telefoneLimpo}`
            || `55${telBanco}` === telefoneLimpo;
    }) ?? null;
}

/**
 * Busca o pedido ativo mais recente de um cliente.
 * Pedido ativo = qualquer status EXCETO Entregue (5) e Cancelado (6).
 * Retorna o registro ou `null` se não existir pedido em aberto.
 */
async function buscarPedidoAtivo(clienteId: number): Promise<any | null> {
    const { data, error } = await supabase
        .from('pedidos')
        .select('id, status, data_criacao, observacoes')
        .eq('cliente_id', clienteId)
        .not('status', 'in', `(${StatusPedido.Entregue},${StatusPedido.Cancelado})`)
        .order('data_criacao', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[WhatsApp] Erro ao buscar pedido ativo:', error.message);
        return null;
    }
    return data ?? null;
}

/**
 * Converte um número de telefone armazenado no banco para um JID do WhatsApp.
 * Ex: "32998336398" → "5532998336398@s.whatsapp.net"
 * @deprecated Prefira `resolverJid()` que usa o cache de JIDs reais.
 */
function telefoneParaJid(telefone: string): string {
    const digits = telefone.replace(/\D/g, '');
    const withCountry = digits.length <= 11 ? `55${digits}` : digits;
    return `${withCountry}@s.whatsapp.net`;
}

/**
 * Retorna o emoji e label amigável para o status do pedido.
 */
function labelStatusParaCliente(status: number): string {
    const emojis: Record<number, string> = {
        [StatusPedido.Pendente]:   '⏳ Pendente — aguardando início da produção',
        [StatusPedido.EmProducao]: '👨‍🍳 Em Produção — seu pedido está sendo preparado',
        [StatusPedido.Pronto]:     '✅ Pronto — seu pedido está pronto para entrega',
        [StatusPedido.EmEntrega]:  '🛵 A Caminho — seu pedido está a caminho!',
    };
    return emojis[status] ?? StatusPedidoLabel[status as StatusPedido] ?? 'Em andamento';
}

/**
 * Retorna uma mensagem complementar conforme o novo status.
 */
function obterMensagemComplementarStatus(status: StatusPedido): string {
    switch (status) {
        case StatusPedido.EmProducao:
            return 'Seu pedido está sendo preparado com carinho! 🧑‍🍳';
        case StatusPedido.Pronto:
            return 'Seu pedido está pronto e aguardando o entregador! 📦';
        case StatusPedido.EmEntrega:
            return 'O entregador está a caminho! Fique de olho. 🛵';
        case StatusPedido.Entregue:
            return (
                'Pedido entregue! Obrigado por escolher a *X Salgados*! 🧡\n\n' +
                'Qualquer hora pode fazer um novo pedido. 😊'
            );
        default:
            return '';
    }
}

// ─── Notificação de Status (chamada pelo controller) ─────────────────

/**
 * Envia uma notificação automática ao cliente quando o status do pedido
 * é alterado pelo painel administrativo.
 *
 * @param pedido - PedidoDto atualizado, com clienteTelefone e statusEnum
 */
export async function notificarClienteStatusPedido(pedido: PedidoDto): Promise<void> {
    if (!pedido.clienteTelefone) {
        console.warn(`[WhatsApp] Pedido #${pedido.id}: cliente sem telefone, notificação ignorada.`);
        return;
    }

    // Usa o cache de JID real (preenchido quando o cliente enviou mensagem anterior).
    // Se o cliente nunca enviou mensagem, cai no fallback @s.whatsapp.net.
    const telefoneLimpo = limparTelefone(pedido.clienteTelefone);
    const jid = resolverJid(telefoneLimpo);

    const statusLabel = labelStatusParaCliente(pedido.statusEnum);
    const complemento = obterMensagemComplementarStatus(pedido.statusEnum);

    const mensagem =
        `📦 *Atualização do seu pedido #${pedido.id}*\n\n` +
        `📌 *Status:* ${statusLabel}` +
        (complemento ? `\n\n${complemento}` : '');

    try {
        await enviarMensagem(jid, mensagem);
        console.log(`[WhatsApp] ✅ Cliente ${pedido.clienteNome} notificado sobre pedido #${pedido.id} (${statusLabel}).`);
    } catch (err: any) {
        console.error(`[WhatsApp] Falha ao notificar cliente sobre pedido #${pedido.id}:`, err.message);
    }
}

/**
 * Cadastra um novo cliente no Supabase e retorna o registro criado.
 * Retorna `null` se ocorrer erro na inserção.
 *
 * @param nome      - Nome completo informado pelo cliente
 * @param telefone  - Telefone normalizado (somente dígitos, sem código de país)
 * @param endereco  - Endereço de entrega informado pelo cliente
 */
async function cadastrarCliente(
    nome: string,
    telefone: string,
    endereco: string,
): Promise<any | null> {
    const { data, error } = await supabase
        .from('clientes')
        .insert({ nome, telefone, endereco })
        .select()
        .single();

    if (error) {
        console.error('[WhatsApp] Erro ao cadastrar cliente:', error.message);
        return null;
    }
    return data;
}

/**
 * Envia uma notificação para o administrador da loja com os dados do pedido.
 *
 * @param clienteNome   - Nome do cliente
 * @param endereco      - Endereço de entrega
 * @param textoPedido   - Texto original da mensagem do cliente (solicitação)
 */
async function notificarAdministrador(
    clienteNome: string,
    endereco: string | null,
    textoPedido: string,
): Promise<void> {
    const mensagem =
        `📋 *Novo Pedido via WhatsApp*\n\n` +
        `👤 *Cliente:* ${clienteNome}\n` +
        `📍 *Endereço:* ${endereco || 'Não informado'}\n` +
        `📝 *Pedido:* ${textoPedido}`;

    try {
        await enviarMensagem(ADMIN_JID, mensagem);
        console.log('[WhatsApp] ✅ Notificação enviada ao administrador.');
    } catch (err: any) {
        console.error('[WhatsApp] Falha ao notificar administrador:', err.message);
    }
}

// ─── Fluxo de Onboarding (novo cliente) ──────────────────────────────

/**
 * Gerencia o fluxo conversacional de cadastro para clientes não registrados.
 *
 * Etapas:
 * 1. INICIAL → Solicita o nome → transita para AGUARDANDO_NOME
 * 2. AGUARDANDO_NOME → Salva nome, solicita endereço → transita para AGUARDANDO_ENDERECO
 * 3. AGUARDANDO_ENDERECO → Cadastra cliente no Supabase → retorna ao fluxo de pedido
 *
 * @param remoteJid    - JID do remetente
 * @param texto        - Texto da mensagem atual
 * @param nomeContato  - pushName recebido do WhatsApp (usado apenas no log)
 * @returns O cliente recém-cadastrado ou `null` se ainda estiver em onboarding
 */
async function processarOnboarding(
    remoteJid: string,
    texto: string,
    nomeContato: string,
    telefoneLimpo: string,
): Promise<any | null> {
    const estado = obterEstado(remoteJid);
    const etapaAtual = estado?.etapa ?? EtapaConversa.INICIAL;

    switch (etapaAtual) {
        // ── Primeiro contato: pedir o nome
        case EtapaConversa.INICIAL: {
            definirEstado(remoteJid, EtapaConversa.AGUARDANDO_NOME);

            await enviarMensagem(
                remoteJid,
                `Olá! 👋 Bem-vindo(a) à *X Salgados*!\n\n` +
                `Ainda não temos seu cadastro. Vamos resolver isso rapidinho!\n\n` +
                `Por favor, me diga o seu *nome completo*:`,
            );

            console.log(`[WhatsApp] Onboarding iniciado para ${nomeContato} (${remoteJid}).`);
            return null;
        }

        // ── Recebeu o nome: pedir endereço
        case EtapaConversa.AGUARDANDO_NOME: {
            const nome = texto.trim();

            if (nome.length < 2) {
                await enviarMensagem(
                    remoteJid,
                    `Hmm, não entendi. Por favor, envie seu *nome completo*:`,
                );
                return null;
            }

            definirEstado(remoteJid, EtapaConversa.AGUARDANDO_ENDERECO, { nome });

            await enviarMensagem(
                remoteJid,
                `Prazer, *${nome}*! 😊\n\nAgora preciso do seu *endereço de entrega* (rua, número, bairro):`,
            );

            console.log(`[WhatsApp] Nome coletado: "${nome}" para ${remoteJid}.`);
            return null;
        }

        // ── Recebeu o endereço: cadastrar e seguir para pedido
        case EtapaConversa.AGUARDANDO_ENDERECO: {
            const endereco = texto.trim();

            if (endereco.length < 5) {
                await enviarMensagem(
                    remoteJid,
                    `O endereço parece muito curto. Por favor, envie o endereço completo (rua, número, bairro):`,
                );
                return null;
            }

            const nome = estado!.dados.nome!;

            const novoCliente = await cadastrarCliente(nome, telefoneLimpo, endereco);

            if (!novoCliente) {
                // Falha no banco — limpar estado para não prender o usuário
                limparEstado(remoteJid);
                await enviarMensagem(
                    remoteJid,
                    `Desculpe, tivemos um problema técnico ao salvar seu cadastro. 😔\n` +
                    `Por favor, tente novamente em alguns instantes.`,
                );
                return null;
            }

            // Onboarding concluído — limpar estado
            limparEstado(remoteJid);

            await enviarMensagem(
                remoteJid,
                `Cadastro realizado com sucesso! 🎉\n\n` +
                `*${nome}*, agora você pode fazer seu pedido.\n` +
                `Me diga o que deseja pedir (ex: "50 coxinhas e 30 risoles"):`,
            );

            console.log(`[WhatsApp] ✅ Cliente cadastrado: ${nome} (ID: ${novoCliente.id}).`);
            return novoCliente;
        }

        default:
            limparEstado(remoteJid);
            return null;
    }
}

// ─── Processamento Principal ─────────────────────────────────────────

/**
 * Processa uma mensagem recebida do WhatsApp.
 *
 * Fluxo:
 * 1. Valida e filtra a mensagem
 * 2. Normaliza o telefone do remetente
 * 3. Verifica se há estado de onboarding pendente
 * 4. Busca o cliente na tabela `clientes`
 * 5. Se **não encontrado**, inicia o fluxo de onboarding
 * 6. Se **encontrado** (ou recém-cadastrado), cria o pedido placeholder
 * 7. Notifica o administrador via WhatsApp com o resumo do pedido
 *
 * Esta função NÃO lança exceções — todo erro é capturado e logado.
 */
export async function processarMensagemAsync(payload: WhatsAppPayload): Promise<void> {
    try {
        // ── 1. Filtrar mensagens irrelevantes
        if (!ehMensagemValida(payload)) {
            console.log('[WhatsApp] Mensagem ignorada (grupo, status, mídia ou fromMe).');
            return;
        }

        const remoteJid = payload.data!.key!.remoteJid!;
        // phoneJid é o JID com o número real; fallback para remoteJid se não disponível
        const phoneJid = payload.data?.phoneJid || remoteJid;
        const texto = extrairTexto(payload)!;
        const nomeContato = payload.data?.pushName ?? 'Desconhecido';

        console.log(`[WhatsApp] Mensagem recebida de ${nomeContato} (${remoteJid}): "${texto}"`);

        // ── 2. Resolver @lid e normalizar telefone
        //    Tenta resolver o @lid para @s.whatsapp.net usando o mapa de contatos.
        //    Se não conseguir, usamos o phoneJid como recebido (pode ser @lid).
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { resolverJidParaEnvio } = require('./baileys.service') as {
            resolverJidParaEnvio: (jid: string) => string;
        };
        const phoneJidResolvido = resolverJidParaEnvio(phoneJid);
        const telefoneLimpo = limparTelefone(phoneJidResolvido);

        if (telefoneLimpo.length < 10) {
            console.warn(`[WhatsApp] Telefone inválido após normalização: "${telefoneLimpo}" (original: ${remoteJid})`);
            return;
        }

        // ── 2a. Registrar mapeamento telefone → JID de envio (para notificações futuras)
        //    Preferir o JID @s.whatsapp.net resolvido (entregável) ao @lid original.
        const jidParaCache = phoneJidResolvido.endsWith('@s.whatsapp.net')
            ? phoneJidResolvido
            : remoteJid;
        registrarJid(telefoneLimpo, jidParaCache);

        // ── 2b. Se o @lid foi resolvido e o cliente tem telefone errado no banco, corrigir
        if (phoneJidResolvido !== phoneJid) {
            const telErrado = limparTelefone(phoneJid);
            if (telErrado !== telefoneLimpo) {
                const { error: updateErr } = await supabase
                    .from('clientes')
                    .update({ telefone: telefoneLimpo })
                    .eq('telefone', telErrado);
                if (!updateErr) {
                    console.log(`[WhatsApp] 📱 Telefone do cliente corrigido no banco: ${telErrado} → ${telefoneLimpo}`);
                }
            }
        }

        // ── 3. Verificar se há onboarding em andamento
        const estadoAtual = obterEstado(remoteJid);

        if (estadoAtual) {
            // Cliente está no meio do cadastro — processar onboarding
            const clienteOnboarding = await processarOnboarding(remoteJid, texto, nomeContato, telefoneLimpo);

            if (!clienteOnboarding) {
                // Onboarding ainda em andamento; aguardando próxima resposta
                return;
            }

            // Onboarding acabou de ser concluído, mas a mensagem atual era o endereço.
            // O próximo texto do cliente será o pedido de fato.
            return;
        }

        // ── 4. Buscar cliente cadastrado
        let cliente = await buscarClientePorTelefone(telefoneLimpo);

        // ── 5. Cliente não existe → iniciar onboarding
        if (!cliente) {
            await processarOnboarding(remoteJid, texto, nomeContato, telefoneLimpo);
            return;
        }

        console.log(`[WhatsApp] Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);

        // ── 6. Verificar se já existe um pedido ativo para este cliente
        const pedidoAtivo = await buscarPedidoAtivo(cliente.id);

        if (pedidoAtivo) {
            const statusLabel = labelStatusParaCliente(pedidoAtivo.status);
            await enviarMensagem(
                remoteJid,
                `Olá, *${cliente.nome}*! 👋\n\n` +
                `Você já tem um pedido em aberto:\n` +
                `📦 *Pedido #${pedidoAtivo.id}*\n` +
                `📌 *Status:* ${statusLabel}\n\n` +
                `Assim que seu pedido for entregue, você poderá fazer um novo pedido. 😊`,
            );
            console.log(`[WhatsApp] Cliente ${cliente.nome} já tem pedido ativo #${pedidoAtivo.id} (status: ${pedidoAtivo.status}). Ignorando novo pedido.`);
            return;
        }

        // ── 7. Criar pedido (placeholder — MVP)
        const { data: produtoPlaceholder, error: produtoError } = await supabase
            .from('produtos')
            .select('id, preco')
            .eq('ativo', true)
            .order('id', { ascending: true })
            .limit(1)
            .single();

        if (produtoError || !produtoPlaceholder) {
            console.error('[WhatsApp] Nenhum produto ativo encontrado para criar pedido placeholder.');
            await enviarMensagem(
                remoteJid,
                `Desculpe, estamos com um problema técnico no momento. Tente novamente mais tarde. 🙏`,
            );
            return;
        }

        const pedidoInput = {
            clienteId: cliente.id,
            observacoes: `[Via WhatsApp] ${texto}`,
            itens: [
                {
                    produtoId: produtoPlaceholder.id,
                    quantidade: 1,
                },
            ],
        };

        const { pedido, erros } = await pedidoService.criarAsync(pedidoInput);

        if (erros && erros.length > 0) {
            console.error(`[WhatsApp] Erro ao criar pedido para ${cliente.nome}:`, erros);
            await enviarMensagem(
                remoteJid,
                `Desculpe, não conseguimos registrar seu pedido agora. Tente novamente em instantes. 🙏`,
            );
            return;
        }

        console.log(
            `[WhatsApp] ✅ Pedido #${pedido?.id} criado com sucesso para ${cliente.nome} ` +
            `(valor: R$ ${pedido?.valorTotal.toFixed(2)})`,
        );

        // Confirmar recebimento para o cliente
        await enviarMensagem(
            remoteJid,
            `✅ Pedido recebido, *${cliente.nome}*!\n\n` +
            `Seu pedido foi registrado e será preparado em breve.\n` +
            `Obrigado por escolher a *X Salgados*! 🧡`,
        );

        // ── 7. Notificar o administrador
        await notificarAdministrador(cliente.nome, cliente.endereco, texto);

    } catch (error: any) {
        console.error('[WhatsApp] Erro inesperado ao processar mensagem:', error.message);
    }
}
