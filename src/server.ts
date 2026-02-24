import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';

// ─── Configuração ────────────────────────────────────────────────────
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// ─── Middlewares Globais ─────────────────────────────────────────────
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
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Conexão com banco de dados estabelecida com sucesso!');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  });

export default app;
