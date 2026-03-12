/**
 * @module bot-state.service
 * @description Gerenciador de estados conversacionais persistido no banco de dados.
 *
 * Usa a tabela `sessoes_whatsapp` para rastrear o progresso do onboarding
 * de novos clientes, sobrevivendo a reinicializações do servidor.
 *
 * Estados:
 * - INICIAL: Cliente não cadastrado; bot pedirá o nome.
 * - AGUARDANDO_NOME: Bot aguarda o nome completo do cliente.
 * - AGUARDANDO_ENDERECO: Bot aguarda o endereço de entrega.
 * - MENU_QUANTIDADE: Bot exibe menu de quantidades e aguarda escolha.
 * - MENU_PRODUTO: Bot exibe menu de produtos e aguarda escolha.
 * - MENU_PEDIDO_ATIVO: Bot exibe menu de ações para pedido em aberto.
 *
 * Sessões com mais de 30 minutos de inatividade são tratadas como expiradas.
 */

import { supabase } from '../config/database';

// ─── Tipos ───────────────────────────────────────────────────────────

/** Etapas possíveis do fluxo de onboarding */
export enum EtapaConversa {
    INICIAL = 'INICIAL',
    AGUARDANDO_NOME = 'AGUARDANDO_NOME',
    AGUARDANDO_ENDERECO = 'AGUARDANDO_ENDERECO',
    MENU_QUANTIDADE = 'MENU_QUANTIDADE',
    MENU_PRODUTO = 'MENU_PRODUTO',
    MENU_PEDIDO_ATIVO = 'MENU_PEDIDO_ATIVO',
}

/** Dados coletados durante o onboarding / sessão */
export interface DadosOnboarding {
    nome?: string;
    endereco?: string;
    /** ID do pedido ativo — usado pelo menu interativo */
    pedidoAtivoId?: number;
    /** Quantidade escolhida no menu de quantidades — carregada para o menu de produtos */
    quantidadeEscolhida?: number;
}

/** Estado completo de uma conversa */
export interface ConversationState {
    etapa: EtapaConversa;
    dados: DadosOnboarding;
    /** Timestamp (ms) da última interação — usado para expirar conversas abandonadas */
    ultimaInteracao: number;
}

// ─── Configuração ────────────────────────────────────────────────────

/** Tempo máximo de inatividade antes de descartar o estado (30 minutos) */
const TTL_MS = 30 * 60 * 1000;

// ─── API Pública ─────────────────────────────────────────────────────

/**
 * Retorna o estado atual da conversa para um determinado telefone.
 * Se não houver estado ou ele estiver expirado, retorna `null`.
 */
export async function obterEstado(telefone: string): Promise<ConversationState | null> {
    const { data, error } = await supabase
        .from('sessoes_whatsapp')
        .select('etapa, dados, atualizado_em')
        .eq('telefone', telefone)
        .maybeSingle();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Erro ao obter estado do bot: ${error.message}`);
    }
    if (!data) return null;

    const ultimaInteracao = new Date(data.atualizado_em).getTime();

    // Expirar sessões abandonadas
    if (Date.now() - ultimaInteracao > TTL_MS) {
        await limparEstado(telefone);
        return null;
    }

    return {
        etapa: data.etapa as EtapaConversa,
        dados: (data.dados ?? {}) as DadosOnboarding,
        ultimaInteracao,
    };
}

/**
 * Cria ou atualiza o estado da conversa para um telefone.
 */
export async function definirEstado(
    telefone: string,
    etapa: EtapaConversa,
    dados?: Partial<DadosOnboarding>,
): Promise<void> {
    // Buscar dados existentes para mesclar
    const { data: existente } = await supabase
        .from('sessoes_whatsapp')
        .select('dados')
        .eq('telefone', telefone)
        .maybeSingle();

    const dadosMesclados = { ...(existente?.dados ?? {}), ...dados };

    const { error } = await supabase
        .from('sessoes_whatsapp')
        .upsert({
            telefone,
            etapa,
            dados: dadosMesclados,
            atualizado_em: new Date().toISOString(),
        }, { onConflict: 'telefone' });

    if (error) {
        console.error('[BotState] Erro ao salvar estado:', error.message);
    }
}

/**
 * Remove o estado da conversa do banco.
 * Deve ser chamado após o onboarding ser concluído com sucesso.
 */
export async function limparEstado(telefone: string): Promise<void> {
    const { error } = await supabase
        .from('sessoes_whatsapp')
        .delete()
        .eq('telefone', telefone);

    if (error) {
        console.error('[BotState] Erro ao limpar estado:', error.message);
    }
}
