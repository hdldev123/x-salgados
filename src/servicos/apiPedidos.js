import { simularLatencia } from './api';
import pedidosMock from '../mock/pedidos.json';
import clientesMock from '../mock/clientes.json';

// Pré-processa os pedidos para incluir os dados do cliente
const pedidosCompletos = pedidosMock.map(pedido => ({
    ...pedido,
    cliente: clientesMock.find(c => c.id === pedido.clienteId)
}));

export const buscarPedidos = (params = {}) => {
    return simularLatencia(() => {
        let dadosFiltrados = [...pedidosCompletos];

        if (params.filtro) {
            dadosFiltrados = dadosFiltrados.filter(p => 
                p.status.toLowerCase() === params.filtro.toLowerCase()
            );
        }

        return {
            dados: dadosFiltrados,
            totalItens: dadosFiltrados.length,
        };
    });
};

// Nova função para atualizar status do pedido
export const atualizarStatusPedido = (pedidoId, novoStatus) => {
    return simularLatencia(() => {
        // Encontrar o pedido no array original
        const indicePedidoOriginal = pedidosMock.findIndex(p => p.id === pedidoId);
        
        if (indicePedidoOriginal === -1) {
            throw new Error('Pedido não encontrado');
        }

        // Atualizar o status no mock original
        pedidosMock[indicePedidoOriginal].status = novoStatus;
        
        // Atualizar também na lista de pedidos completos
        const indicePedidoCompleto = pedidosCompletos.findIndex(p => p.id === pedidoId);
        if (indicePedidoCompleto !== -1) {
            pedidosCompletos[indicePedidoCompleto].status = novoStatus;
        }

        return {
            sucesso: true,
            pedido: pedidosCompletos[indicePedidoCompleto],
            mensagem: 'Status do pedido atualizado com sucesso'
        };
    });
};

// Função para buscar pedidos por status específico (útil para rotas)
export const buscarPedidosPorStatus = (status) => {
    return simularLatencia(() => {
        const pedidosFiltrados = pedidosCompletos.filter(p => p.status === status);
        
        return {
            dados: pedidosFiltrados,
            totalItens: pedidosFiltrados.length,
        };
    });
};
