import axios from 'axios';

// ─── CONFIGURAÇÃO BASE DO AXIOS ────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 segundos
});

// ─── INTERCEPTOR DE REQUEST ────────────────────────────────────────────────────
// Injeta o JWT Bearer Token automaticamente em cada requisição.

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── INTERCEPTOR DE RESPONSE ───────────────────────────────────────────────────
// Trata erros padronizados do backend e faz logout automático no 401.

api.interceptors.response.use(
  (response) => {
    // Requisição bem-sucedida: retorna a response normalmente
    return response;
  },
  (error) => {
    // Se não tem resposta (erro de rede, timeout, etc.)
    if (!error.response) {
      const erroRede = new Error('Erro de conexão. Verifique se o servidor está rodando.');
      erroRede.mensagem = 'Erro de conexão. Verifique se o servidor está rodando.';
      erroRede.erros = [];
      return Promise.reject(erroRede);
    }

    const { status, data } = error.response;

    // 401 Unauthorized → Logout automático
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');

      // Só redireciona se não estiver na página de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      const erroAuth = new Error(data?.mensagem || 'Sessão expirada. Faça login novamente.');
      erroAuth.mensagem = data?.mensagem || 'Sessão expirada. Faça login novamente.';
      erroAuth.erros = data?.erros || [];
      erroAuth.status = 401;
      return Promise.reject(erroAuth);
    }

    // Erros do backend no formato padrão: { sucesso, mensagem, erros }
    const mensagem = data?.mensagem || `Erro ${status}: Algo deu errado.`;
    const erros = data?.erros || [];

    const erroApi = new Error(mensagem);
    erroApi.mensagem = mensagem;
    erroApi.erros = erros;
    erroApi.status = status;
    erroApi.sucesso = false;

    return Promise.reject(erroApi);
  }
);

export default api;
