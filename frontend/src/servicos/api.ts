/// <reference types="vite/client" />
import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { ApiError } from '../types';

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
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// ─── INTERCEPTOR DE RESPONSE ───────────────────────────────────────────────────
// Trata erros padronizados do backend e faz logout automático no 401.

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<{ mensagem?: string; erros?: string[] }>) => {
    if (!error.response) {
      const erroRede: ApiError = {
        sucesso: false,
        mensagem: 'Erro de conexão. Verifique se o servidor está rodando.',
        erros: [],
        status: 0,
      };
      return Promise.reject(erroRede);
    }

    const { status, data } = error.response;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      const erroAuth: ApiError = {
        sucesso: false,
        mensagem: data?.mensagem || 'Sessão expirada. Faça login novamente.',
        erros: data?.erros || [],
        status: 401,
      };
      return Promise.reject(erroAuth);
    }

    const mensagem = data?.mensagem || `Erro ${status}: Algo deu errado.`;
    const erros = data?.erros || [];

    const erroApi: ApiError = {
      sucesso: false,
      mensagem,
      erros,
      status,
    };

    return Promise.reject(erroApi);
  }
);

export default api;
