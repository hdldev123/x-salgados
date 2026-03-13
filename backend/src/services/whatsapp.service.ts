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
import { getSocket, resolverJidParaEnvio } from './jid-resolver.service';

// ─── Constantes ──────────────────────────────────────────────────────

/**
 * JID WhatsApp do administrador que recebe notificações de novos pedidos.
 * Formato esperado: "5511999999999@s.whatsapp.net"
 * Configurado em WHATSAPP_ADMIN_JID no .env.
 */
const ADMIN_JID = process.env.WHATSAPP_ADMIN_JID ?? null;

if (!ADMIN_JID) {
    console.error(
        '[WhatsApp] ⚠️  WHATSAPP_ADMIN_JID não configurado no .env. ' +
        'Notificações de novos pedidos ao administrador estão DESATIVADAS.',
    );
}

// ─── Persistência de JID (banco de dados) ────────────────────────────

/**
 * Salva o JID (@s.whatsapp.net) e LID (@lid) na tabela clientes.
 * Chamado sempre que uma mensagem válida é recebida.
 */
async function salvarJidCliente(
    clienteId: number | null,
    telefoneLimpo: string,
    whatsappJid: string | null,
    whatsappLid: string | null,
): Promise<void> {
    const updates: Record<string, string | null> = {};
    if (whatsappJid) updates.whatsapp_jid = whatsappJid;
    if (whatsappLid) updates.whatsapp_lid = whatsappLid;
    if (Object.keys(updates).length === 0) return;

    // Preferir update por ID (mais confiável)
    if (clienteId) {
        const { error } = await supabase
            .from('clientes')
            .update(updates)
            .eq('id', clienteId);
        if (!error) return;
    }

    // Fallback: update por telefone
    const { error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('telefone', telefoneLimpo);

    if (error) {
        await supabase
            .from('clientes')
            .update(updates)
            .eq('telefone', `55${telefoneLimpo}`);
    }
}

/**
 * Resolve o JID de envio para um telefone, consultando o banco.
 * Prioriza whatsapp_jid persistido e cai de volta para construção padrão.
 */
async function resolverJid(telefoneLimpo: string): Promise<string> {
    // Buscar JID persistido no banco
    const { data } = await supabase
        .from('clientes')
        .select('whatsapp_jid')
        .or(`telefone.eq.${telefoneLimpo},telefone.eq.55${telefoneLimpo}`)
        .not('whatsapp_jid', 'is', null)
        .limit(1)
        .maybeSingle();

    if (data?.whatsapp_jid) {
        return data.whatsapp_jid;
    }

    // Fallback: construir JID a partir do número
    const digits = telefoneLimpo.replace(/\D/g, '');
    const withCountry = digits.length <= 11 ? `55${digits}` : digits;
    return `${withCountry}@s.whatsapp.net`;
}

// ─── Log de Mensagens (auditoria) ────────────────────────────────────

/**
 * Grava uma mensagem na tabela whatsapp_mensagens para auditoria.
 */
async function logarMensagem(
    clienteId: number | null,
    remoteJid: string,
    texto: string,
    direcao: 'INBOUND' | 'OUTBOUND',
): Promise<void> {
    const { error } = await supabase
        .from('whatsapp_mensagens')
        .insert({
            cliente_id: clienteId,
            remote_jid: remoteJid,
            texto,
            direcao,
        });

    if (error) {
        console.error('[WhatsApp] Erro ao logar mensagem:', error.message);
    }
}
// ─── Tipos internos ──────────────────────────────────────────────────

/** Payload simplificado vindo do Baileys (evento messages.upsert) */
export interface WhatsAppPayload {
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

export interface ClienteWhatsappBanco {
    id: number;
    nome: string;
    telefone: string;
    endereco: string | null;
    whatsapp_jid: string | null;
    whatsapp_lid: string | null;
}

export interface PedidoAtivoBanco {
    id: number;
    status: number;
    data_criacao: string;
    observacoes: string | null;
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
    const sock = getSocket();
    if (!sock) {
        console.warn('[WhatsApp] Socket não disponível. Mensagem não enviada para', jid);
        return;
    }

    // @lid JIDs NÃO são entregáveis em novos contatos — tentar converter para @s.whatsapp.net
    const jidEnvio = resolverJidParaEnvio(jid);

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
 * Busca um cliente no Supabase comparando o telefone normalizado ou whatsapp_lid.
 *
 * Variantes de telefone cobertas (mesma lógica do código anterior, agora no banco):
 *   - telBanco === telefoneLimpo          → número idêntico
 *   - telBanco === `55${telefoneLimpo}`   → banco tem DDI, JID não tem
 *   - telefoneLimpo === `55${telBanco}`   → JID tem DDI, banco não tem
 *
 * A query `.or()` + `.limit(1).maybeSingle()` substitui o full table scan anterior,
 * reduzindo o trabalho de O(N clientes) em JS para uma busca indexada no Postgres.
 */
async function buscarClientePorTelefone(telefoneLimpo: string, whatsappLid?: string | null): Promise<ClienteWhatsappBanco | null> {
    // Monta os filtros de telefone cobrindo as três variantes de normalização
    const telComDdi = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`;
    const telSemDdi = telefoneLimpo.startsWith('55') ? telefoneLimpo.slice(2) : telefoneLimpo;

    // Filtros: telefone exato | com DDI | sem DDI | lid (fallback)
    const filtros = [
        `telefone.eq.${telefoneLimpo}`,
        `telefone.eq.${telComDdi}`,
        `telefone.eq.${telSemDdi}`,
        ...(whatsappLid ? [`whatsapp_lid.eq.${whatsappLid}`] : []),
    ].join(',');

    const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, endereco, whatsapp_jid, whatsapp_lid')
        .or(filtros)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[WhatsApp] Erro ao buscar cliente por telefone:', error.message);
        return null;
    }

    if (data && whatsappLid && data.whatsapp_lid === whatsappLid) {
        console.log(`[WhatsApp] Cliente encontrado via whatsapp_lid: ${whatsappLid}`);
    }

    return data;
}


/**
 * Busca o pedido ativo mais recente de um cliente.
 * Pedido ativo = qualquer status EXCETO Entregue (5) e Cancelado (6).
 * Retorna o registro ou `null` se não existir pedido em aberto.
 */
async function buscarPedidoAtivo(clienteId: number): Promise<PedidoAtivoBanco | null> {
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
        [StatusPedido.Pendente]: '⏳ Pendente — aguardando início da produção',
        [StatusPedido.EmProducao]: '👨‍🍳 Em Produção — seu pedido está sendo preparado',
        [StatusPedido.Pronto]: '✅ Pronto — seu pedido está pronto para entrega',
        [StatusPedido.EmEntrega]: '🛵 A Caminho — seu pedido está a caminho!',
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
                'Pedido entregue! Obrigado por escolher a *Rangô*! 🧡\n\n' +
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

    if (!pedido.clienteId) {
        console.warn(`[WhatsApp] Pedido #${pedido.id}: clienteId ausente, notificação ignorada.`);
        return;
    }

    // Buscar JIDs persistidos e telefone diretamente do cliente no banco.
    // Prioridade: whatsapp_jid (@s.whatsapp.net real) → whatsapp_lid (@lid) → construir do telefone.
    const { data: clienteDb } = await supabase
        .from('clientes')
        .select('whatsapp_jid, whatsapp_lid, telefone')
        .eq('id', pedido.clienteId)
        .maybeSingle();

    let jid: string;
    if (clienteDb?.whatsapp_jid) {
        // Caso ideal: JID real do @s.whatsapp.net persistido
        jid = clienteDb.whatsapp_jid;
        console.log(`[WhatsApp] Usando whatsapp_jid para pedido #${pedido.id}: ${jid}`);
    } else if (clienteDb?.whatsapp_lid) {
        // Segundo caso: temos o @lid — enviarMensagem tentará resolver para @s.whatsapp.net
        // via resolverJidParaEnvio. Se não resolver, envia direto ao @lid (sessão Signal válida).
        jid = clienteDb.whatsapp_lid;
        console.log(`[WhatsApp] Usando whatsapp_lid para pedido #${pedido.id}: ${jid}`);
    } else {
        // Último recurso: construir a partir do telefone.
        // ATENÇÃO: só funciona se o campo telefone contém o número real (não dígitos de @lid).
        const tel = (clienteDb?.telefone ?? pedido.clienteTelefone).replace(/\D/g, '');
        const withCountry = tel.length <= 11 ? `55${tel}` : tel;
        jid = `${withCountry}@s.whatsapp.net`;
        console.log(`[WhatsApp] Fallback telefone para pedido #${pedido.id}: ${jid}`);
    }

    const statusLabel = labelStatusParaCliente(pedido.statusEnum);
    const complemento = obterMensagemComplementarStatus(pedido.statusEnum);

    const mensagem =
        `📦 *Atualização do seu pedido #${pedido.id}*\n\n` +
        `📌 *Status:* ${statusLabel}` +
        (complemento ? `\n\n${complemento}` : '');

    try {
        await enviarMensagem(jid, mensagem);
        console.log(`[WhatsApp] ✅ Cliente ${pedido.clienteNome} notificado sobre pedido #${pedido.id} (${statusLabel}).`);
    } catch (error: unknown) {
        console.error(`[WhatsApp] Falha ao notificar cliente sobre pedido #${pedido.id}:`, error instanceof Error ? error.message : error);
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
): Promise<ClienteWhatsappBanco | null> {
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
    if (!ADMIN_JID) {
        console.warn('[WhatsApp] Notificação ao administrador ignorada — WHATSAPP_ADMIN_JID não configurado.');
        return;
    }

    const mensagem =
        `📋 *Novo Pedido via WhatsApp*\n\n` +
        `👤 *Cliente:* ${clienteNome}\n` +
        `📍 *Endereço:* ${endereco || 'Não informado'}\n` +
        `📝 *Pedido:* ${textoPedido}`;

    try {
        await enviarMensagem(ADMIN_JID, mensagem);
        console.log('[WhatsApp] ✅ Notificação enviada ao administrador.');
    } catch (error: unknown) {
        console.error('[WhatsApp] Falha ao notificar administrador:', error instanceof Error ? error.message : error);
    }
}

// ─── Menus de Criação de Pedido (Quantidade → Produto) ──────────────

/** Opções fixas de quantidade mínima */
const OPCOES_QUANTIDADE: readonly number[] = [100, 300, 500, 1000];

/**
 * Envia o menu numérico de quantidades.
 */
async function enviarMenuQuantidade(remoteJid: string, nomeCliente: string): Promise<void> {
    const linhas = OPCOES_QUANTIDADE.map((q, i) => `*[${i + 1}]* ${q} unidades`).join('\n');

    await enviarMensagem(
        remoteJid,
        `Ok, *${nomeCliente}*! Vamos montar seu pedido. 🛒\n\n` +
        `Primeiro, escolha a *quantidade*:\n\n` +
        `${linhas}\n\n` +
        `_Responda com o número da opção desejada._`,
    );
}

/**
 * Processa a resposta do menu de quantidade.
 * Valida o input (1-4) e transita para MENU_PRODUTO.
 */
async function processarMenuQuantidade(
    remoteJid: string,
    texto: string,
    cliente: ClienteWhatsappBanco,
    telefoneLimpo: string,
): Promise<void> {
    const opcao = parseInt(texto.trim(), 10);

    if (isNaN(opcao) || opcao < 1 || opcao > OPCOES_QUANTIDADE.length) {
        await enviarMensagem(
            remoteJid,
            `Hmm, não entendi. 🤔\nPor favor, responda apenas com o *número* da opção:\n\n` +
            OPCOES_QUANTIDADE.map((q, i) => `*[${i + 1}]* ${q} unidades`).join('\n'),
        );
        return; // Mantém no MENU_QUANTIDADE
    }

    const quantidade = OPCOES_QUANTIDADE[opcao - 1];

    // Salvar quantidade na sessão e transitar para MENU_PRODUTO
    await definirEstado(telefoneLimpo, EtapaConversa.MENU_PRODUTO, { quantidadeEscolhida: quantidade });
    await enviarMenuProduto(remoteJid, quantidade);
    console.log(`[WhatsApp] Quantidade ${quantidade} selecionada por ${cliente.nome}.`);
}

/**
 * Busca produtos ativos do banco e envia menu dinâmico.
 */
async function enviarMenuProduto(remoteJid: string, quantidade: number): Promise<void> {
    const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome, preco')
        .eq('ativo', true)
        .order('nome', { ascending: true });

    if (error || !produtos || produtos.length === 0) {
        await enviarMensagem(
            remoteJid,
            `Desculpe, estamos sem produtos disponíveis no momento. 😔\nTente novamente mais tarde.`,
        );
        return;
    }

    const linhas = produtos.map((p, i) =>
        `*[${i + 1}]* ${p.nome} — R$ ${Number(p.preco).toFixed(2)}/un`,
    ).join('\n');

    await enviarMensagem(
        remoteJid,
        `Ótimo! *${quantidade} unidades* selecionadas. 📦\n\n` +
        `Agora escolha o *produto*:\n\n` +
        `${linhas}\n\n` +
        `_Responda com o número da opção desejada._`,
    );
}

/**
 * Processa a escolha de produto e finaliza o pedido.
 * Valida o input, chama `pedidoService.criarAsync` com produtoId e quantidade exatos.
 */
async function processarMenuProdutoEFinalizar(
    remoteJid: string,
    texto: string,
    cliente: ClienteWhatsappBanco,
    telefoneLimpo: string,
    quantidade: number,
): Promise<void> {
    // Buscar produtos ativos para validar o input
    const { data: produtos, error: dbErr } = await supabase
        .from('produtos')
        .select('id, nome, preco')
        .eq('ativo', true)
        .order('nome', { ascending: true });

    if (dbErr || !produtos || produtos.length === 0) {
        await limparEstado(telefoneLimpo);
        await enviarMensagem(
            remoteJid,
            `Desculpe, estamos sem produtos disponíveis no momento. 😔\nTente novamente mais tarde.`,
        );
        return;
    }

    const opcao = parseInt(texto.trim(), 10);

    if (isNaN(opcao) || opcao < 1 || opcao > produtos.length) {
        const linhas = produtos.map((p, i) =>
            `*[${i + 1}]* ${p.nome} — R$ ${Number(p.preco).toFixed(2)}/un`,
        ).join('\n');

        await enviarMensagem(
            remoteJid,
            `Hmm, não entendi. 🤔\nPor favor, responda apenas com o *número* do produto:\n\n` +
            `${linhas}`,
        );
        return; // Mantém no MENU_PRODUTO
    }

    const produtoEscolhido = produtos[opcao - 1];

    // Criar pedido com valores exatos
    const pedidoInput = {
        clienteId: cliente.id,
        observacoes: `[Via WhatsApp] ${quantidade}x ${produtoEscolhido.nome}`,
        itens: [{ produtoId: produtoEscolhido.id, quantidade }],
    };

    const { pedido, erros } = await pedidoService.criarAsync(pedidoInput);

    if (erros || !pedido) {
        await enviarMensagem(
            remoteJid,
            `Desculpe, *${cliente.nome}*, tivemos um problema ao registrar seu pedido. 😔\nPor favor, tente novamente.`,
        );
        console.error('[WhatsApp] Erro ao criar pedido:', erros);
        await limparEstado(telefoneLimpo);
        return;
    }

    await limparEstado(telefoneLimpo);

    const valorFormatado = pedido.valorTotal != null
        ? `R$ ${Number(pedido.valorTotal).toFixed(2)}`
        : 'a calcular';

    await enviarMensagem(
        remoteJid,
        `✅ Pedido registrado com sucesso!\n\n` +
        `📋 *Pedido #${pedido.id}*\n` +
        `🛒 *${quantidade}x ${produtoEscolhido.nome}*\n` +
        `💰 *Valor Total:* ${valorFormatado}\n\n` +
        `Vamos preparar tudo com carinho! Você receberá atualizações por aqui. 😊`,
    );

    console.log(`[WhatsApp] ✅ Pedido #${pedido.id} criado para ${cliente.nome} (${quantidade}x ${produtoEscolhido.nome}).`);

    // Notificar administrador
    await notificarAdministrador(cliente.nome, cliente.endereco ?? null, `${quantidade}x ${produtoEscolhido.nome}`);
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
): Promise<ClienteWhatsappBanco | null> {
    const estado = await obterEstado(telefoneLimpo);
    const etapaAtual = estado?.etapa ?? EtapaConversa.INICIAL;

    switch (etapaAtual) {
        // ── Primeiro contato: pedir o nome
        case EtapaConversa.INICIAL: {
            await definirEstado(telefoneLimpo, EtapaConversa.AGUARDANDO_NOME);

            await enviarMensagem(
                remoteJid,
                `Olá! 👋 Bem-vindo(a) à *Rangô*!\n\n` +
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

            await definirEstado(telefoneLimpo, EtapaConversa.AGUARDANDO_ENDERECO, { nome });

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
                await limparEstado(telefoneLimpo);
                await enviarMensagem(
                    remoteJid,
                    `Desculpe, tivemos um problema técnico ao salvar seu cadastro. 😔\n` +
                    `Por favor, tente novamente em alguns instantes.`,
                );
                return null;
            }

            // Onboarding concluído — transitar para menu de quantidade
            await definirEstado(telefoneLimpo, EtapaConversa.MENU_QUANTIDADE);

            await enviarMensagem(
                remoteJid,
                `Cadastro realizado com sucesso! 🎉\n\n` +
                `*${nome}*, agora vamos montar seu pedido!`,
            );
            await enviarMenuQuantidade(remoteJid, nome);

            console.log(`[WhatsApp] ✅ Cliente cadastrado: ${nome} (ID: ${novoCliente.id}).`);
            return novoCliente;
        }

        default:
            await limparEstado(telefoneLimpo);
            return null;
    }
}

// ─── Menu Interativo de Pedido Ativo ─────────────────────────────────

/**
 * Monta e envia o menu numérico para clientes com pedido ativo.
 */
async function enviarMenuPedidoAtivo(
    remoteJid: string,
    nomeCliente: string,
    pedidoAtivo: PedidoAtivoBanco,
): Promise<void> {
    const statusLabel = labelStatusParaCliente(pedidoAtivo.status);

    await enviarMensagem(
        remoteJid,
        `Olá, *${nomeCliente}*! 👋\n\n` +
        `Você tem um pedido em aberto:\n` +
        `📦 *Pedido #${pedidoAtivo.id}*\n` +
        `📌 *Status:* ${statusLabel}\n\n` +
        `O que deseja fazer?\n\n` +
        `*[1]* 📋 Ver Status Atual\n` +
        `*[2]* ❌ Cancelar Pedido\n` +
        `*[3]* ✏️ Editar Pedido\n` +
        `*[4]* 🆕 Fazer um Novo Pedido\n\n` +
        `_Responda com o número da opção desejada._`,
    );
}

/**
 * Processa a resposta numérica do menu de pedido ativo.
 *
 * Valida o input e executa a ação correspondente.
 * Se o input for inválido, repete o menu sem alterar o estado.
 */
async function processarMenuPedidoAtivo(
    remoteJid: string,
    texto: string,
    cliente: ClienteWhatsappBanco,
    telefoneLimpo: string,
    pedidoId: number,
): Promise<void> {
    const opcao = texto.trim();

    switch (opcao) {
        // ── Opção 1: Ver Status Atual ────────────────────────────
        case '1': {
            const pedido = await buscarPedidoAtivo(cliente.id);

            if (!pedido || pedido.id !== pedidoId) {
                await limparEstado(telefoneLimpo);
                await enviarMensagem(
                    remoteJid,
                    `O pedido #${pedidoId} não está mais ativo. 🤔\n` +
                    `Envie uma mensagem para começar um novo pedido!`,
                );
                return;
            }

            const statusLabel = labelStatusParaCliente(pedido.status);
            await enviarMensagem(
                remoteJid,
                `📦 *Pedido #${pedido.id}*\n` +
                `📌 *Status:* ${statusLabel}\n` +
                (pedido.observacoes ? `📝 *Obs:* ${pedido.observacoes}\n` : '') +
                `\n_Envie outro número para escolher uma opção:_\n\n` +
                `*[1]* 📋 Ver Status Atual\n` +
                `*[2]* ❌ Cancelar Pedido\n` +
                `*[3]* ✏️ Editar Pedido\n` +
                `*[4]* 🆕 Fazer um Novo Pedido`,
            );
            // Manter no estado MENU_PEDIDO_ATIVO
            console.log(`[WhatsApp] Opção 1: Status do pedido #${pedido.id} enviado para ${cliente.nome}.`);
            return;
        }

        // ── Opção 2: Cancelar Pedido (somente se Pendente) ────────
        case '2': {
            // Re-buscar pedido para garantir integridade
            const { data: pedidoDb, error } = await supabase
                .from('pedidos')
                .select('id, cliente_id, status')
                .eq('id', pedidoId)
                .single();

            if (error || !pedidoDb) {
                await limparEstado(telefoneLimpo);
                await enviarMensagem(
                    remoteJid,
                    `Não foi possível encontrar o pedido #${pedidoId}. 😔\n` +
                    `Envie uma mensagem para começar um novo pedido!`,
                );
                console.warn(`[WhatsApp] Cancelar: pedido #${pedidoId} não encontrado no banco.`);
                return;
            }

            // Segurança: validar que o pedido pertence ao cliente
            if (pedidoDb.cliente_id !== cliente.id) {
                await limparEstado(telefoneLimpo);
                await enviarMensagem(
                    remoteJid,
                    `Desculpe, não foi possível processar esta solicitação. 🔒\n` +
                    `Envie uma mensagem para começar um novo pedido!`,
                );
                console.error(`[WhatsApp] ⚠️ SEGURANÇA: Cliente ${cliente.id} tentou cancelar pedido #${pedidoId} que pertence ao cliente ${pedidoDb.cliente_id}.`);
                return;
            }

            // Apenas pedidos com status Pendente podem ser cancelados pelo bot
            if (pedidoDb.status !== StatusPedido.Pendente) {
                await limparEstado(telefoneLimpo);
                await enviarMensagem(
                    remoteJid,
                    `Seu pedido já começou a ser preparado e não pode ser cancelado por aqui. ` +
                    `Por favor, entre em contato urgente com o nosso atendente pelo e-mail rangosuporte@gmail.com.`,
                );
                console.log(`[WhatsApp] Cancelamento bloqueado: pedido #${pedidoId} está no status ${pedidoDb.status} (não é Pendente). Cliente ${cliente.nome}.`);
                return;
            }

            // Executar cancelamento via service (reusa lógica existente)
            await pedidoService.atualizarStatusAsync(pedidoId, { status: StatusPedido.Cancelado });

            await limparEstado(telefoneLimpo);
            await enviarMensagem(
                remoteJid,
                `✅ Pedido #${pedidoId} foi *cancelado* com sucesso.\n\n` +
                `Sempre que quiser, é só mandar uma mensagem para fazer um novo pedido! 😊`,
            );
            console.log(`[WhatsApp] Pedido #${pedidoId} cancelado pelo cliente ${cliente.nome} (ID: ${cliente.id}).`);
            return;
        }

        // ── Opção 3: Editar Pedido → direcionar para e-mail de suporte ─
        case '3': {
            await limparEstado(telefoneLimpo);
            await enviarMensagem(
                remoteJid,
                `Para alterar itens do seu pedido, precisamos da ajuda de um humano para garantir que tudo saia perfeito! ` +
                `Por favor, entre em contato com o nosso atendente através do e-mail rangosuporte@gmail.com.`,
            );
            console.log(`[WhatsApp] Opção 3: Cliente ${cliente.nome} direcionado ao e-mail de suporte para editar pedido #${pedidoId}.`);
            return;
        }

        // ── Opção 4: Fazer um Novo Pedido ────────────────────────
        case '4': {
            await definirEstado(telefoneLimpo, EtapaConversa.MENU_QUANTIDADE);
            await enviarMensagem(
                remoteJid,
                `Certo, *${cliente.nome}*! 🛒\n\n` +
                `Seu pedido anterior (#${pedidoId}) continua em andamento.\n` +
                `Vamos montar seu novo pedido!`,
            );
            await enviarMenuQuantidade(remoteJid, cliente.nome);
            console.log(`[WhatsApp] Opção 4: Cliente ${cliente.nome} iniciou novo pedido (pedido ativo #${pedidoId} mantido).`);
            return;
        }

        // ── Input inválido → repetir menu ────────────────────────
        default: {
            const pedido = await buscarPedidoAtivo(cliente.id);

            if (!pedido) {
                await limparEstado(telefoneLimpo);
                await enviarMensagem(
                    remoteJid,
                    `Parece que seu pedido já foi finalizado! 🎉\n` +
                    `Envie uma mensagem para fazer um novo pedido. 😊`,
                );
                return;
            }

            await enviarMensagem(
                remoteJid,
                `Hmm, não entendi. 🤔\n` +
                `Por favor, responda apenas com o *número* da opção desejada:\n\n` +
                `*[1]* 📋 Ver Status Atual\n` +
                `*[2]* ❌ Cancelar Pedido\n` +
                `*[3]* ✏️ Editar Pedido\n` +
                `*[4]* 🆕 Fazer um Novo Pedido`,
            );
            // Manter no estado MENU_PEDIDO_ATIVO (não altera nada)
            console.log(`[WhatsApp] Input inválido "${opcao}" de ${cliente.nome}. Menu repetido.`);
            return;
        }
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
        const phoneJidResolvido = resolverJidParaEnvio(phoneJid);
        const telefoneLimpo = limparTelefone(phoneJidResolvido);

        if (telefoneLimpo.length < 10) {
            console.warn(`[WhatsApp] Telefone inválido após normalização: "${telefoneLimpo}" (original: ${remoteJid})`);
            return;
        }

        // ── 2a. Persistir JIDs no banco (para sobreviver a reinicializações)
        const whatsappJid = phoneJidResolvido.endsWith('@s.whatsapp.net') ? phoneJidResolvido : null;
        const whatsappLid = remoteJid.endsWith('@lid') ? remoteJid : null;
        // Nota: clienteId será preenchido depois, quando soubermos quem é o cliente.
        //       Por enquanto, mark para salvar após buscar o cliente.

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
        //    IMPORTANTE: MENU_QUANTIDADE, MENU_PRODUTO e MENU_PEDIDO_ATIVO não são onboarding.
        const estadoAtual = await obterEstado(telefoneLimpo);

        if (estadoAtual && estadoAtual.etapa !== EtapaConversa.MENU_QUANTIDADE && estadoAtual.etapa !== EtapaConversa.MENU_PRODUTO && estadoAtual.etapa !== EtapaConversa.MENU_PEDIDO_ATIVO) {
            // Cliente está no meio do cadastro — processar onboarding
            const clienteOnboarding = await processarOnboarding(remoteJid, texto, nomeContato, telefoneLimpo);

            if (!clienteOnboarding) {
                // Onboarding ainda em andamento; aguardando próxima resposta
                // Logar mensagem inbound sem clienteId (ainda não cadastrado)
                logarMensagem(null, remoteJid, texto, 'INBOUND').catch(() => { });
                return;
            }

            // Onboarding acabou de ser concluído, mas a mensagem atual era o endereço.
            // O próximo texto do cliente será o pedido de fato.
            logarMensagem(clienteOnboarding.id, remoteJid, texto, 'INBOUND').catch(() => { });
            return;
        }

        // ── 4. Buscar cliente cadastrado (por telefone ou por whatsapp_lid como fallback)
        const cliente = await buscarClientePorTelefone(telefoneLimpo, whatsappLid);

        // ── 5. Cliente não existe → iniciar onboarding
        if (!cliente) {
            await processarOnboarding(remoteJid, texto, nomeContato, telefoneLimpo);
            logarMensagem(null, remoteJid, texto, 'INBOUND').catch(() => { });
            return;
        }

        console.log(`[WhatsApp] Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);

        // Persistir JIDs no banco agora que sabemos o clienteId
        salvarJidCliente(cliente.id, telefoneLimpo, whatsappJid, whatsappLid).catch(() => { });

        // Logar mensagem inbound
        logarMensagem(cliente.id, remoteJid, texto, 'INBOUND').catch(() => { });

        // ── 6. Verificar se está no menu de pedido ativo
        if (estadoAtual?.etapa === EtapaConversa.MENU_PEDIDO_ATIVO) {
            const pedidoIdMenu = estadoAtual.dados.pedidoAtivoId;
            if (pedidoIdMenu) {
                await processarMenuPedidoAtivo(remoteJid, texto, cliente, telefoneLimpo, pedidoIdMenu);
            } else {
                // Estado corrompido — limpar e reprocessar
                await limparEstado(telefoneLimpo);
                console.warn('[WhatsApp] Estado MENU_PEDIDO_ATIVO sem pedidoAtivoId. Limpando sessão.');
            }
            return;
        }

        // ── 7. Sessão tem precedência: verificar se está no menu de quantidade
        //    (ANTES de buscarPedidoAtivo para evitar loop quando cliente
        //     escolhe "Novo Pedido" mas ainda possui um pedido ativo no banco)
        if (estadoAtual?.etapa === EtapaConversa.MENU_QUANTIDADE) {
            await processarMenuQuantidade(remoteJid, texto, cliente, telefoneLimpo);
            return;
        }

        // ── 8. Sessão tem precedência: verificar se está no menu de produto
        if (estadoAtual?.etapa === EtapaConversa.MENU_PRODUTO) {
            const quantidade = estadoAtual.dados.quantidadeEscolhida;
            if (!quantidade) {
                // Estado corrompido — reiniciar fluxo
                await definirEstado(telefoneLimpo, EtapaConversa.MENU_QUANTIDADE);
                await enviarMenuQuantidade(remoteJid, cliente.nome);
                console.warn('[WhatsApp] Estado MENU_PRODUTO sem quantidadeEscolhida. Reiniciando fluxo.');
                return;
            }
            await processarMenuProdutoEFinalizar(remoteJid, texto, cliente, telefoneLimpo, quantidade);
            return;
        }

        // ── 9. Verificar se já existe um pedido ativo para este cliente
        //    (Só é alcançado se NÃO há sessão de menu ativa — sem risco de loop)
        const pedidoAtivo = await buscarPedidoAtivo(cliente.id);

        if (pedidoAtivo) {
            // Salvar estado e enviar menu interativo
            await definirEstado(telefoneLimpo, EtapaConversa.MENU_PEDIDO_ATIVO, {
                pedidoAtivoId: pedidoAtivo.id,
            });
            await enviarMenuPedidoAtivo(remoteJid, cliente.nome, pedidoAtivo);
            console.log(`[WhatsApp] Menu de pedido ativo enviado para ${cliente.nome} (Pedido #${pedidoAtivo.id}).`);
            return;
        }

        // ── 10. Cliente retornando sem pedido ativo → saudar e mostrar menu de quantidade
        await definirEstado(telefoneLimpo, EtapaConversa.MENU_QUANTIDADE);
        await enviarMensagem(
            remoteJid,
            `Olá, *${cliente.nome}*! 👋 Bem-vindo(a) de volta à *Rangô*!`,
        );
        await enviarMenuQuantidade(remoteJid, cliente.nome);
        console.log(`[WhatsApp] Cliente ${cliente.nome} retornou. Menu de quantidade enviado.`);

    } catch (error: unknown) {
        console.error('[WhatsApp] Erro inesperado ao processar mensagem:', error instanceof Error ? error.message : error);
    }
}
