# Integração WhatsApp — X Salgados

> **Última atualização:** 04/03/2026
> **Status:** MVP (recebe mensagem → cria pedido pendente)

---

## 1. VISÃO GERAL

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Cliente    │────▶│  Evolution API   │────▶│  X Salgados API  │────▶│   Supabase   │
│  (WhatsApp)  │     │  (ou Baileys)    │     │  POST /webhook   │     │  PostgreSQL  │
└──────────────┘     └──────────────────┘     └──────────────────┘     └──────────────┘
      📱                   🔄                       🖥️                      🗄️
  Envia texto         Captura msg             Processa payload         Salva pedido
  "50 coxinhas"       via WebSocket           Busca cliente            status=Pendente
                      Dispara webhook         Cria pedido
```

### Fluxo Detalhado

1. Cliente envia mensagem no WhatsApp para o número da empresa
2. **Evolution API** (ou Baileys wrapper) captura a mensagem via WebSocket do WhatsApp Web
3. Evolution API dispara um **POST** para `https://sua-api.com/api/whatsapp/webhook` com o payload da mensagem
4. O backend **responde 200 imediatamente** e processa de forma assíncrona:
   - Extrai e normaliza o telefone do remetente
   - Filtra mensagens irrelevantes (grupos, status, mídia)
   - Busca o cliente na tabela `clientes` pelo telefone
   - Se encontrado, cria um pedido com status **Pendente (1)**
5. Pedido aparece automaticamente no painel do Atendente/Admin

---

## 2. EVOLUTION API — CONFIGURAÇÃO

### 2.1 Instalação (Docker)

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA \
  atendai/evolution-api:latest
```

> Consulte a documentação oficial: [github.com/EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api)

### 2.2 Criar Instância e Conectar

```bash
# Criar instância
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{ "instanceName": "xsalgados", "integration": "WHATSAPP-BAILEYS" }'

# Obter QR Code para parear o celular
curl -X GET http://localhost:8080/instance/connect/xsalgados \
  -H "apikey: SUA_CHAVE_SECRETA"
```

### 2.3 Configurar Webhook

```bash
curl -X POST http://localhost:8080/webhook/set/xsalgados \
  -H "apikey: SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://sua-api.com/api/whatsapp/webhook",
      "headers": {
        "x-webhook-token": "SEU_TOKEN_WEBHOOK_AQUI"
      },
      "webhookByEvents": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

> ⚠️ Em desenvolvimento local, use [ngrok](https://ngrok.com/) ou [localtunnel](https://theboroer.github.io/localtunnel-www/) para expor `localhost:3000` à internet.

---

## 3. PAYLOAD ESPERADO

A Evolution API envia o seguinte payload no evento `MESSAGES_UPSERT`:

```json
{
  "event": "messages.upsert",
  "instance": "xsalgados",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0A1B2C3D4E5F6"
    },
    "pushName": "João Silva",
    "message": {
      "conversation": "Quero 50 coxinhas e 30 empadas"
    },
    "messageType": "conversation",
    "messageTimestamp": 1709571234
  }
}
```

### Campos Relevantes

| Campo | Uso |
|---|---|
| `data.key.remoteJid` | Telefone do remetente (formato `55XXXXXXXXXXX@s.whatsapp.net`) |
| `data.key.fromMe` | `true` = mensagem enviada pelo bot (ignorar) |
| `data.message.conversation` | Texto da mensagem (para futuro parser de IA) |
| `data.messageType` | Tipo da mensagem (`conversation`, `imageMessage`, etc.) |
| `event` | Tipo do evento (`messages.upsert` = nova mensagem) |

---

## 4. VARIÁVEIS DE AMBIENTE

Adicione ao `.env` do backend:

```env
# ─── WhatsApp Webhook ─────────────────────────────────────────
WHATSAPP_WEBHOOK_TOKEN=gere-um-token-seguro-aqui-min-32-chars
```

> Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 5. ARQUIVOS CRIADOS

| Arquivo | Responsabilidade |
|---|---|
| `src/controllers/whatsapp.controller.ts` | Recebe o POST, valida token, responde 200, delega ao service |
| `src/services/whatsapp.service.ts` | Normaliza telefone, filtra mensagens, busca cliente, cria pedido |
| `src/routes/index.ts` | Rota `POST /api/whatsapp/webhook` registrada (sem JWT) |

---

## 6. SEGURANÇA

| Medida | Implementação |
|---|---|
| Token de webhook | Header `x-webhook-token` comparado com `WHATSAPP_WEBHOOK_TOKEN` |
| Sem autenticação JWT | Rota pública — Evolution API não envia JWT |
| Filtro de mensagens | Ignora: grupos, status/broadcast, `fromMe`, mídia |
| Telefone não encontrado | Ignora silenciosamente (log de aviso) |
| Resposta rápida | Retorna 200 antes de processar (evita timeout do webhook) |

---

## 7. EXTENSÕES FUTURAS (TODO)

| Funcionalidade | Descrição |
|---|---|
| 🤖 Parser de IA | Usar OpenAI/Gemini para interpretar "50 coxinhas" → `{ produtoId: 1, quantidade: 50 }` |
| 📋 Parser Regex | Alternativa leve: regex para padrões como `\d+\s+\w+` |
| 💬 Resposta automática | Enviar confirmação ao cliente via Evolution API (`POST /message/sendText`) |
| 🔄 Fluxo conversacional | Bot pergunta "Qual endereço de entrega?" se o cliente não tiver endereço |
| 📊 Log de mensagens | Tabela `whatsapp_mensagens` para auditoria |
| ⏰ Rate limiting | Limitar mensagens por telefone para evitar flood |

---

## 8. TROUBLESHOOTING

| Problema | Solução |
|---|---|
| Webhook não recebe requests | Verificar se a URL é acessível externamente (usar `ngrok` em dev) |
| Token inválido (401) | Conferir `WHATSAPP_WEBHOOK_TOKEN` no `.env` e no header da Evolution API |
| Cliente não encontrado | Verificar se o telefone no campo `clientes.telefone` está no formato correto (apenas dígitos, sem `+55`) |
| Pedido não aparece no painel | Verificar logs do backend (`[WhatsApp]` prefix) |
| Evolution API desconecta | Reconectar via endpoint `/instance/connect/xsalgados` |
