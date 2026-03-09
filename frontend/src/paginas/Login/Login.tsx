import React, { useState, useContext } from 'react';
import { ContextoAutenticacao } from '../../contextos/ContextoAutenticacao';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useContext(ContextoAutenticacao);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    
    try {
      await login(email, senha);
      // O redirecionamento é feito dentro da função de login no contexto
    } catch (error) {
      setErro(error.message || 'Falha ao fazer login. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-grafite-100 via-grafite-50 to-primary-50 p-4">
      <div className="w-full max-w-md animate-slide-up rounded-2xl glass p-10 text-center shadow-glass">
        <div className="border-b border-grafite-200 px-6 py-5 text-center">
        <img 
          src="/logo.png" 
          alt="X Salgados" 
          className="mx-auto h-20 w-auto object-contain"
        />
      </div>
        <p className="mb-8 text-base text-grafite-400">
          Acesse o painel de gestão
        </p>
        
        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-grafite-700"
            >
              E-mail
            </label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              className="w-full rounded-xl border border-grafite-200 bg-white px-4 py-2.5 text-sm text-grafite-800 transition-all duration-200 placeholder:text-grafite-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="senha"
              className="mb-1.5 block text-sm font-medium text-grafite-700"
            >
              Senha
            </label>
            <input 
              type="password" 
              id="senha" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
              className="w-full rounded-xl border border-grafite-200 bg-white px-4 py-2.5 text-sm text-grafite-800 transition-all duration-200 placeholder:text-grafite-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>

          {erro && (
            <div className="mt-3 rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-left text-sm font-medium text-erro">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="mt-6 w-full rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
