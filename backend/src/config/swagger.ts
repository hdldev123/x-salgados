/**
 * Configuração central do Swagger / OpenAPI 3.0
 *
 * Estratégia: usamos `zod-to-json-schema` para converter nossos Zod schemas
 * diretamente em JSON Schema compatível com OpenAPI, evitando duplicação.
 * Os schemas de REQUEST são gerados automaticamente a partir dos DTOs.
 * Os schemas de RESPONSE são definidos manualmente (são interfaces TypeScript).
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { OpenAPIV3 } from 'openapi-types';

// ─── Importa todos os Zod schemas de input ──────────────────────────
import { LoginSchema } from '../dtos/auth.dto';
import { PaginacaoSchema } from '../dtos/common.dto';
import { CriarClienteSchema } from '../dtos/cliente.dto';
import { CriarProdutoSchema } from '../dtos/produto.dto';
import { CriarPedidoSchema, AtualizarStatusSchema } from '../dtos/pedido.dto';
import { CriarUsuarioSchema, AtualizarUsuarioSchema, AlterarSenhaSchema } from '../dtos/usuario.dto';

// ─── Utilitário: converte Zod schema → componente OpenAPI limpo ──────
// Remove $schema e outras propriedades internas do JSON Schema Draft 7
function zodToOpenApi(schema: Parameters<typeof zodToJsonSchema>[0]): OpenAPIV3.SchemaObject {
  const { $schema, ...openApiSchema } = zodToJsonSchema(schema, {
    target: 'openApi3',      // gera formato compatível com OpenAPI 3.0
    $refStrategy: 'none',    // sem referências circulares ($ref) — mantém inline
  }) as { $schema?: string } & OpenAPIV3.SchemaObject;

  return openApiSchema;
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS: gerados automaticamente dos nossos Zod DTOs
// ═══════════════════════════════════════════════════════════════════════
const inputSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  // Auth
  LoginInput: zodToOpenApi(LoginSchema),

  // Paginação (query string)
  PaginacaoInput: zodToOpenApi(PaginacaoSchema),

  // Clientes
  CriarClienteInput: zodToOpenApi(CriarClienteSchema),

  // Produtos
  CriarProdutoInput: zodToOpenApi(CriarProdutoSchema),

  // Pedidos
  CriarPedidoInput: zodToOpenApi(CriarPedidoSchema),
  AtualizarStatusInput: zodToOpenApi(AtualizarStatusSchema),

  // Usuários
  CriarUsuarioInput: zodToOpenApi(CriarUsuarioSchema),
  AtualizarUsuarioInput: zodToOpenApi(AtualizarUsuarioSchema),
  AlterarSenhaInput: zodToOpenApi(AlterarSenhaSchema),
};

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS: definidos manualmente para os responses (interfaces TypeScript)
// ═══════════════════════════════════════════════════════════════════════
const responseSchemas: Record<string, OpenAPIV3.SchemaObject> = {

  // ── Auth ──────────────────────────────────────────────────────────
  UsuarioLogado: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nome: { type: 'string', example: 'Hugo Garcia' },
      email: { type: 'string', format: 'email', example: 'hugo@xsalgados.com' },
      perfil: { type: 'string', enum: ['Administrador', 'Atendente', 'Entregador'] },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
      expiracao: { type: 'string', format: 'date-time' },
      usuario: { $ref: '#/components/schemas/UsuarioLogado' },
    },
  },

  // ── Paginação (genérica — os dados[] são sobrescritos por endpoint) ─
  ResultadoPaginado: {
    type: 'object',
    properties: {
      dados: { type: 'array', items: { type: 'object' } },
      pagina: { type: 'integer', example: 1 },
      tamanhoPagina: { type: 'integer', example: 10 },
      total: { type: 'integer', example: 42 },
      totalPaginas: { type: 'integer', example: 5 },
      temProxima: { type: 'boolean' },
      temAnterior: { type: 'boolean' },
    },
  },

  // ── Clientes ──────────────────────────────────────────────────────
  Cliente: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nome: { type: 'string', example: 'Maria Aparecida' },
      telefone: { type: 'string', example: '(11) 99999-9999' },
      email: { type: 'string', nullable: true, example: 'maria@email.com' },
      endereco: { type: 'string', nullable: true, example: 'Rua das Flores, 100' },
      cidade: { type: 'string', nullable: true, example: 'São Paulo' },
      cep: { type: 'string', nullable: true, example: '01310-100' },
      dataCriacao: { type: 'string', format: 'date-time' },
      totalPedidos: { type: 'integer', example: 5 },
    },
  },

  // ── Produtos ──────────────────────────────────────────────────────
  Produto: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nome: { type: 'string', example: 'Coxinha Frango' },
      categoria: { type: 'string', example: 'Salgados Fritos' },
      descricao: { type: 'string', nullable: true },
      preco: { type: 'number', format: 'float', example: 4.50 },
      ativo: { type: 'boolean', example: true },
      dataCriacao: { type: 'string', format: 'date-time' },
    },
  },

  // ── Pedidos ───────────────────────────────────────────────────────
  ItemPedidoResponse: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      produtoId: { type: 'integer', example: 3 },
      produtoNome: { type: 'string', example: 'Coxinha Frango' },
      quantidade: { type: 'integer', example: 10 },
      precoUnitario: { type: 'number', format: 'float', example: 4.50 },
      subtotal: { type: 'number', format: 'float', example: 45.00 },
    },
  },
  Pedido: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      clienteId: { type: 'integer', example: 2 },
      clienteNome: { type: 'string', example: 'Maria Aparecida' },
      clienteTelefone: { type: 'string', nullable: true, example: '(11) 99999-9999' },
      clienteEndereco: { type: 'string', nullable: true },
      dataCriacao: { type: 'string', format: 'date-time' },
      dataEntrega: { type: 'string', format: 'date-time', nullable: true },
      valorTotal: { type: 'number', format: 'float', example: 135.00 },
      status: { type: 'string', example: 'Pendente' },
      statusEnum: { type: 'integer', example: 1 },
      observacoes: { type: 'string', nullable: true },
      itens: { type: 'array', items: { $ref: '#/components/schemas/ItemPedidoResponse' } },
    },
  },
  PedidoResumo: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      clienteNome: { type: 'string', example: 'Maria Aparecida' },
      dataCriacao: { type: 'string', format: 'date-time' },
      dataEntrega: { type: 'string', format: 'date-time', nullable: true },
      valorTotal: { type: 'number', format: 'float', example: 135.00 },
      status: { type: 'string', example: 'Pendente' },
      statusEnum: { type: 'integer', example: 1 },
      quantidadeItens: { type: 'integer', example: 3 },
    },
  },

  // ── Usuários ──────────────────────────────────────────────────────
  Usuario: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nome: { type: 'string', example: 'Hugo Garcia' },
      email: { type: 'string', format: 'email' },
      perfil: { type: 'string', enum: ['Administrador', 'Atendente', 'Entregador'] },
      dataCriacao: { type: 'string', format: 'date-time' },
      ativo: { type: 'boolean', example: true },
    },
  },

  // ── Entregas ──────────────────────────────────────────────────────
  RotaEntrega: {
    type: 'object',
    properties: {
      pedidoId: { type: 'integer', example: 5 },
      clienteNome: { type: 'string', example: 'João Silva' },
      clienteTelefone: { type: 'string', example: '(11) 98888-8888' },
      endereco: { type: 'string', example: 'Av. Paulista, 900' },
      dataEntrega: { type: 'string', format: 'date-time' },
      valorTotal: { type: 'number', format: 'float', example: 72.00 },
    },
  },

  // ── Dashboard ──────────────────────────────────────────────────────
  KpisDashboard: {
    type: 'object',
    properties: {
      pedidosHoje: { type: 'integer', example: 15 },
      receitaHoje: { type: 'number', example: 675.00 },
      pedidosMes: { type: 'integer', example: 320 },
      receitaMes: { type: 'number', example: 14400.00 },
      clientesAtivos: { type: 'integer', example: 87 },
      produtosAtivos: { type: 'integer', example: 23 },
      pedidosPendentes: { type: 'integer', example: 4 },
      pedidosEmProducao: { type: 'integer', example: 6 },
    },
  },

  // ── Erros ─────────────────────────────────────────────────────────
  ErroValidacao: {
    type: 'object',
    properties: {
      sucesso: { type: 'boolean', example: false },
      mensagem: { type: 'string', example: 'Dados inválidos' },
      erros: { type: 'array', items: { type: 'string' }, example: ['Email inválido'] },
    },
  },
  ErroGenerico: {
    type: 'object',
    properties: {
      sucesso: { type: 'boolean', example: false },
      mensagem: { type: 'string', example: 'Não autorizado' },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
// PARÂMETROS REUTILIZÁVEIS
// ═══════════════════════════════════════════════════════════════════════
const parametros: Record<string, OpenAPIV3.ParameterObject> = {
  pathId: {
    name: 'id', in: 'path', required: true,
    schema: { type: 'integer', minimum: 1 },
    description: 'ID do recurso',
  },
  queryPagina: {
    name: 'pagina', in: 'query', required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: 'Número da página',
  },
  queryTamanhoPagina: {
    name: 'tamanhoPagina', in: 'query', required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    description: 'Itens por página',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// RESPOSTAS REUTILIZÁVEIS
// ═══════════════════════════════════════════════════════════════════════
function respostaOk(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, descricao = 'Sucesso'): OpenAPIV3.ResponseObject {
  return {
    description: descricao,
    content: { 'application/json': { schema } },
  };
}

function respostaCriado(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.ResponseObject {
  return { description: 'Criado com sucesso', content: { 'application/json': { schema } } };
}

const respostaErroValidacao: OpenAPIV3.ResponseObject = {
  description: 'Dados inválidos (422)',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroValidacao' } } },
};

const respostaNaoAutorizado: OpenAPIV3.ResponseObject = {
  description: 'Token ausente ou inválido (401)',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroGenerico' } } },
};

const respostaProibido: OpenAPIV3.ResponseObject = {
  description: 'Sem permissão para este recurso (403)',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroGenerico' } } },
};

const respostaNaoEncontrado: OpenAPIV3.ResponseObject = {
  description: 'Recurso não encontrado (404)',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroGenerico' } } },
};

// Atalho para marcar operação como protegida por JWT
const segurancaJwt: OpenAPIV3.SecurityRequirementObject[] = [{ bearerAuth: [] }];

// ═══════════════════════════════════════════════════════════════════════
// DOCUMENTO OPENAPI 3.0
// ═══════════════════════════════════════════════════════════════════════
export const swaggerDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',

  // ── Metadados da API ───────────────────────────────────────────────
  info: {
    title: 'Rangô API',
    version: '1.0.0',
    description: [
      '## API de Gestão de Pedidos — Rangô',
      '',

      '',
      '### Autenticação',
      'A maioria dos endpoints exige um **Bearer Token JWT**.',
      'Faça login em `POST /api/auth/login` e cole o token no botão **Authorize** acima.',
    ].join('\n'),
    contact: { name: 'Equipe Rangô' },
  },

  // ── Servidores ──────────────────────────────────────────────────────
  servers: [
    { url: 'http://localhost:3000', description: 'Desenvolvimento local' },
  ],

  // ── Esquema de Segurança Global ─────────────────────────────────────
  // Define o botão "Authorize" no Swagger UI para colar o JWT Bearer Token
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Cole o token retornado pelo endpoint de login. Ex: `eyJhbGci...`',
      },
    },
    schemas: {
      ...inputSchemas,    // schemas gerados automaticamente dos Zod DTOs
      ...responseSchemas, // schemas de response definidos manualmente
    },
    parameters: parametros,
  },

  // ── Tags (grupos no Swagger UI) ────────────────────────────────────
  tags: [
    { name: 'Auth', description: 'Autenticação — público' },
    { name: 'Clientes', description: 'Cadastro de clientes (Admin + Atendente)' },
    { name: 'Produtos', description: 'Catálogo de produtos' },
    { name: 'Pedidos', description: 'Gestão de pedidos (Admin + Atendente)' },
    { name: 'Usuários', description: 'Gestão de usuários do sistema (Admin)' },
    { name: 'Entregas', description: 'Rotas de entrega do dia' },
    { name: 'Dashboard', description: 'KPIs e relatórios gerenciais (Admin)' },
  ],

  // ══════════════════════════════════════════════════════════════════════
  // PATHS — todos os endpoints da API
  // ══════════════════════════════════════════════════════════════════════
  paths: {

    // ─────────────────────────────────────────────────────────────────
    // AUTH
    // ─────────────────────────────────────────────────────────────────
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: [
          'Autentica um usuário e retorna um **JWT Bearer Token**.',
          '',
          'Cole o token retornado no botão **Authorize** (canto superior direito) ',
          'para desbloquear os demais endpoints.',
        ].join('\n'),
        requestBody: {
          required: true,
          description: 'Credenciais do usuário',
          // ⬇ Schema gerado diretamente do nosso LoginSchema (Zod)
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/LoginResponse' }, 'Login realizado com sucesso'),
          '401': { description: 'Credenciais inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroGenerico' } } } },
          '422': respostaErroValidacao,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────
    // CLIENTES
    // ─────────────────────────────────────────────────────────────────
    '/api/clientes': {
      get: {
        tags: ['Clientes'],
        summary: 'Listar clientes',
        security: segurancaJwt,
        parameters: [
          { $ref: '#/components/parameters/queryPagina' },
          { $ref: '#/components/parameters/queryTamanhoPagina' },
          { name: 'busca', in: 'query', schema: { type: 'string' }, description: 'Filtro por nome, telefone ou email' },
        ],
        responses: {
          '200': respostaOk({
            allOf: [
              { $ref: '#/components/schemas/ResultadoPaginado' },
              { properties: { dados: { type: 'array', items: { $ref: '#/components/schemas/Cliente' } } } },
            ],
          }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
      post: {
        tags: ['Clientes'],
        summary: 'Criar cliente',
        security: segurancaJwt,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CriarClienteInput' } } },
        },
        responses: {
          '201': respostaCriado({ $ref: '#/components/schemas/Cliente' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
    },
    '/api/clientes/{id}': {
      get: {
        tags: ['Clientes'],
        summary: 'Buscar cliente por ID',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Cliente' }),
          '401': respostaNaoAutorizado,
          '404': respostaNaoEncontrado,
        },
      },
      put: {
        tags: ['Clientes'],
        summary: 'Atualizar cliente',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CriarClienteInput' } } },
        },
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Cliente' }),
          '401': respostaNaoAutorizado,
          '404': respostaNaoEncontrado,
          '422': respostaErroValidacao,
        },
      },
      delete: {
        tags: ['Clientes'],
        summary: 'Excluir cliente',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '204': { description: 'Excluído com sucesso' },
          '401': respostaNaoAutorizado,
          '404': respostaNaoEncontrado,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────
    // PRODUTOS
    // ─────────────────────────────────────────────────────────────────
    '/api/produtos': {
      get: {
        tags: ['Produtos'],
        summary: 'Listar produtos',
        security: segurancaJwt,
        parameters: [
          { $ref: '#/components/parameters/queryPagina' },
          { $ref: '#/components/parameters/queryTamanhoPagina' },
          { name: 'busca', in: 'query', schema: { type: 'string' }, description: 'Filtro por nome' },
          { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtro por categoria' },
          { name: 'ativo', in: 'query', schema: { type: 'boolean' }, description: 'Filtrar por status ativo/inativo' },
        ],
        responses: {
          '200': respostaOk({
            allOf: [
              { $ref: '#/components/schemas/ResultadoPaginado' },
              { properties: { dados: { type: 'array', items: { $ref: '#/components/schemas/Produto' } } } },
            ],
          }),
          '401': respostaNaoAutorizado,
        },
      },
      post: {
        tags: ['Produtos'],
        summary: 'Criar produto (Admin)',
        security: segurancaJwt,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CriarProdutoInput' } } },
        },
        responses: {
          '201': respostaCriado({ $ref: '#/components/schemas/Produto' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
    },
    '/api/produtos/categorias': {
      get: {
        tags: ['Produtos'],
        summary: 'Listar categorias disponíveis',
        security: segurancaJwt,
        responses: {
          '200': respostaOk({ type: 'array', items: { type: 'string' }, example: ['Salgados Fritos', 'Salgados Assados', 'Doces'] }),
          '401': respostaNaoAutorizado,
        },
      },
    },
    '/api/produtos/{id}': {
      get: {
        tags: ['Produtos'],
        summary: 'Buscar produto por ID',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Produto' }),
          '401': respostaNaoAutorizado,
          '404': respostaNaoEncontrado,
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualizar produto (Admin)',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CriarProdutoInput' } } },
        },
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Produto' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Excluir produto (Admin)',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '204': { description: 'Excluído com sucesso' },
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '404': respostaNaoEncontrado,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────
    // PEDIDOS
    // ─────────────────────────────────────────────────────────────────
    '/api/pedidos': {
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos',
        description: 'Retorna lista paginada de pedidos com filtros opcionais por status.',
        security: segurancaJwt,
        parameters: [
          { $ref: '#/components/parameters/queryPagina' },
          { $ref: '#/components/parameters/queryTamanhoPagina' },
          {
            name: 'status', in: 'query',
            schema: { type: 'integer', enum: [1, 2, 3, 4, 5, 6] },
            description: '1=Pendente, 2=EmProducao, 3=Pronto, 4=EmEntrega, 5=Entregue, 6=Cancelado',
          },
        ],
        responses: {
          '200': respostaOk({
            allOf: [
              { $ref: '#/components/schemas/ResultadoPaginado' },
              { properties: { dados: { type: 'array', items: { $ref: '#/components/schemas/PedidoResumo' } } } },
            ],
          }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
      post: {
        tags: ['Pedidos'],
        summary: 'Criar pedido',
        description: [
          'Cria um novo pedido com um ou mais itens.',
          '',
          'O `valorTotal` é calculado automaticamente pelo servidor com base ',
          'nos preços atuais dos produtos — não deve ser enviado no body.',
        ].join('\n'),
        security: segurancaJwt,
        requestBody: {
          required: true,
          description: 'Dados do pedido. Os preços são calculados automaticamente.',
          // ⬇ Schema derivado do CriarPedidoSchema (Zod) — itens e validações incluídas
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CriarPedidoInput' } } },
        },
        responses: {
          '201': respostaCriado({ $ref: '#/components/schemas/Pedido' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
    },
    '/api/pedidos/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Buscar pedido por ID',
        description: 'Retorna pedido completo com todos os itens e preços calculados.',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Pedido' }),
          '401': respostaNaoAutorizado,
          '404': respostaNaoEncontrado,
        },
      },
    },
    '/api/pedidos/{id}/status': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Atualizar status do pedido',
        description: 'Transições válidas: Pendente → EmProducao → Pronto → EmEntrega → Entregue. Cancelado pode ser definido de qualquer estado.',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarStatusInput' } } },
        },
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Pedido' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '404': respostaNaoEncontrado,
          '422': respostaErroValidacao,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────
    // USUÁRIOS
    // ─────────────────────────────────────────────────────────────────
    '/api/usuarios': {
      get: {
        tags: ['Usuários'],
        summary: 'Listar usuários (Admin)',
        security: segurancaJwt,
        parameters: [
          { $ref: '#/components/parameters/queryPagina' },
          { $ref: '#/components/parameters/queryTamanhoPagina' },
        ],
        responses: {
          '200': respostaOk({
            allOf: [
              { $ref: '#/components/schemas/ResultadoPaginado' },
              { properties: { dados: { type: 'array', items: { $ref: '#/components/schemas/Usuario' } } } },
            ],
          }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
      post: {
        tags: ['Usuários'],
        summary: 'Criar usuário (Admin)',
        security: segurancaJwt,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CriarUsuarioInput' } } },
        },
        responses: {
          '201': respostaCriado({ $ref: '#/components/schemas/Usuario' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
    },
    '/api/usuarios/{id}': {
      get: {
        tags: ['Usuários'],
        summary: 'Buscar usuário por ID (Admin)',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Usuario' }),
          '401': respostaNaoAutorizado,
          '404': respostaNaoEncontrado,
        },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualizar usuário (Admin)',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarUsuarioInput' } } },
        },
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/Usuario' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Excluir usuário (Admin)',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        responses: {
          '204': { description: 'Excluído com sucesso' },
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '404': respostaNaoEncontrado,
        },
      },
    },
    '/api/usuarios/{id}/senha': {
      patch: {
        tags: ['Usuários'],
        summary: 'Alterar senha (Admin)',
        security: segurancaJwt,
        parameters: [{ $ref: '#/components/parameters/pathId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AlterarSenhaInput' } } },
        },
        responses: {
          '200': { description: 'Senha alterada com sucesso' },
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
          '422': respostaErroValidacao,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────
    // ENTREGAS
    // ─────────────────────────────────────────────────────────────────
    '/api/entregas/rotas': {
      get: {
        tags: ['Entregas'],
        summary: 'Rotas de entrega do dia',
        description: 'Retorna todos os pedidos com status "Em Entrega" para o dia de hoje.',
        security: segurancaJwt,
        responses: {
          '200': respostaOk({ type: 'array', items: { $ref: '#/components/schemas/RotaEntrega' } }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────
    // DASHBOARD
    // ─────────────────────────────────────────────────────────────────
    '/api/dashboard/kpis': {
      get: {
        tags: ['Dashboard'],
        summary: 'KPIs gerais (Admin)',
        security: segurancaJwt,
        responses: {
          '200': respostaOk({ $ref: '#/components/schemas/KpisDashboard' }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
    },
    '/api/dashboard/pedidos-por-mes': {
      get: {
        tags: ['Dashboard'],
        summary: 'Pedidos por mês (Admin)',
        security: segurancaJwt,
        responses: {
          '200': respostaOk({
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mes: { type: 'string', example: '2026-01' },
                quantidade: { type: 'integer', example: 87 },
                receita: { type: 'number', example: 3915.00 },
              },
            },
          }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
    },
    '/api/dashboard/distribuicao-status': {
      get: {
        tags: ['Dashboard'],
        summary: 'Distribuição de pedidos por status (Admin)',
        security: segurancaJwt,
        responses: {
          '200': respostaOk({
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'Pendente' },
                quantidade: { type: 'integer', example: 12 },
              },
            },
          }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
    },
    '/api/dashboard/completo': {
      get: {
        tags: ['Dashboard'],
        summary: 'Dashboard completo em uma única chamada (Admin)',
        security: segurancaJwt,
        responses: {
          '200': respostaOk({
            type: 'object',
            properties: {
              kpis: { $ref: '#/components/schemas/KpisDashboard' },
              pedidosPorMes: { type: 'array', items: { type: 'object' } },
              distribuicaoStatus: { type: 'array', items: { type: 'object' } },
            },
          }),
          '401': respostaNaoAutorizado,
          '403': respostaProibido,
        },
      },
    },
  },
};
