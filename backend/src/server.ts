import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { testarConexao } from './config/database';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';

// ─── Configuração ────────────────────────────────────────────────────
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// ─── Middlewares de Segurança ─────────────────────────────────────────
// helmet adiciona headers HTTP de segurança: X-Frame-Options, HSTS,
// X-Content-Type-Options, Referrer-Policy, Content-Security-Policy, etc.
//
// SEC-006 (mitigação): enquanto o token JWT ainda vive no localStorage,
// a CSP abaixo reduz drasticamente a superfície de ataque XSS ao:
//   • Bloquear scripts inline (script-src 'self')
//   • Restringir de onde JS, CSS e imagens podem ser carregados
//   • Proibir plugins (object-src 'none')
//   • Bloquear redirecionamentos de base URL (base-uri 'self')
//
// TODO (Sprint futuro): migrar para cookies HttpOnly + CSRF token
// e remover a dependência de segurança crítica do localStorage.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // necessário para React inline styles
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [])],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    // HSTS: força HTTPS por 1 ano (ativar só em produção com HTTPS real)
    strictTransportSecurity: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  }),
);

app.use(express.json());


// CORS — equivale ao AddCors / UseCors("AllowFrontend") do .NET
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    message: 'API X Salgados - Online',
    timestamp: new Date().toISOString(),
  });
});

// ─── Rotas da API ────────────────────────────────────────────────────
app.use(routes);

// ─── Middleware global de erro (deve ser o último) ───────────────────
// Equivale ao ExceptionHandlingMiddleware do .NET
app.use(errorHandler);

// ─── Inicialização ───────────────────────────────────────────────────
// O servidor HTTP sobe IMEDIATAMENTE — não aguarda o banco.
// Isso garante que o /api-docs e o health check respondam na hora,
// mesmo que a conexão com o Supabase demore ou falhe.
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);

  // Swagger carregado de forma lazy (require após o servidor subir),
  // evitando que a compilação pesada do zod-to-json-schema + swagger-ui-express
  // atrase o startup do servidor.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const swaggerUi = require('swagger-ui-express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { swaggerDocument } = require('./config/swagger');
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customSiteTitle: 'X Salgados API Docs',
        swaggerOptions: {
          persistAuthorization: true,
          filter: true,
          displayRequestDuration: true,
        },
      }),
    );
    console.log(`📄 Swagger UI:  http://localhost:${PORT}/api-docs`);
  }
});

// Conexão com o Supabase em paralelo — erro aqui não derruba o processo.
testarConexao()
  .then((ok) => {
    if (ok) {
      console.log('✅ Banco de dados Supabase conectado com sucesso!');
    } else {
      console.error('⚠️  API rodando sem banco. Verifique SUPABASE_URL e SUPABASE_KEY no .env');
    }
  });

// Conexão com o WhatsApp via Baileys (se habilitado).
if (process.env.WHATSAPP_BAILEYS_ENABLED !== 'false') {
  import('./services/baileys.service')
    .then(({ iniciarBaileys }) => iniciarBaileys())
    .catch((err) => {
      console.error('⚠️  Erro ao iniciar Baileys:', err.message);
    });
}

export default app;
