import { notificarClienteStatusPedido } from './src/services/whatsapp.service';
import { supabase } from './src/config/database';
import { StatusPedido } from './src/models/enums';

async function mockNotify() {
    console.log("Starting mock notification...");
    try {
        // Find a client to test with
        const { data: cliente } = await supabase.from('clientes').select('*').limit(1).single();
        if (!cliente) {
            console.log("No client found in DB.");
            return;
        }

        console.log("Will try to notify client:", cliente.nome, "with id", cliente.id);

        const mockPedidoDTo = {
            id: 9999,
            clienteId: cliente.id,
            clienteNome: cliente.nome,
            clienteTelefone: cliente.telefone,
            dataCriacao: new Date().toISOString(),
            statusEnum: StatusPedido.Pendente,
            valorTotal: 50.00,
            enderecoEntrega: cliente.endereco,
            whatsappJid: cliente.whatsapp_jid,
            whatsappLid: cliente.whatsapp_lid
        } as any;

        // Ensure we force it to use whatsapp_lid or fallback to reproduce the bug
        // We will clear the whatsapp_jid to force it to use the lid fallback or phone fallback
        const updateData: any = { whatsapp_jid: null };
        if (!cliente.whatsapp_lid) {
            updateData.whatsapp_lid = "5511999999999@lid"; // Mock LID
        }

        await supabase.from('clientes').update(updateData).eq('id', cliente.id);

        console.log("Triggering notificarClienteStatusPedido...");
        await notificarClienteStatusPedido(mockPedidoDTo);
        console.log("Done.");

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

mockNotify();
