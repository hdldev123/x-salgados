**CONTEXTO:**
Atue como Engenheiro de Software Sênior. Precisamos implementar a entrada de pedidos automatizada via WhatsApp no sistema "X Salgados" (Backend em Node.js com `@supabase/supabase-js`).

**OBJETIVO:**
Criar a arquitetura e o código inicial para receber mensagens de um Webhook do WhatsApp, localizar o cliente pelo telefone e inserir o Pedido como "Pendente (1)" no banco.

**TAREFAS DA IA:**
1. **Documentação Arquitetônica:** Crie um arquivo `INTEGRACAO_WHATSAPP.md`. Descreva como plugar um serviço de API não oficial de WhatsApp (como Evolution API ou Baileys) ao nosso webhook.
2. **Backend (Controller e Rota):** Crie `src/controllers/whatsapp.controller.ts` expondo um endpoint `POST /api/whatsapp/webhook`. Implemente segurança básica (ex: checagem de um token via Header).
3. **Backend (Regra de Negócio):** Crie `src/services/whatsapp.service.ts` com o método `processarMensagemAsync(payload)`.
   - **Fluxo com Supabase:** Receba o telefone do payload. Faça uma query: `supabase.from('clientes').select('*').eq('telefone', numeroLimpo).single()`.
   - Se o cliente existir, chame a função já existente `pedidoService.criarAsync()` passando o `cliente_id` e itens padrão (ou deixe um TODO claro de onde colocar um parser de IA/Expressões regulares para entender o texto "Quero 50 coxinhas").
4. Crie um mecanismo para ignorar mensagens que não sejam de clientes reais ou comandos não reconhecidos.