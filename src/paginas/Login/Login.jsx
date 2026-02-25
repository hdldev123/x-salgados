import React, { useState, useContext } from 'react';
import { ContextoAutenticacao } from '../../contextos/ContextoAutenticacao';
import './Login.css';

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
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-titulo">X Salgados</h1>
        <p className="login-subtitulo">Acesse o painel de gestão</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-grupo">
            <label htmlFor="email">E-mail</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
            />
          </div>
          <div className="input-grupo">
            <label htmlFor="senha">Senha</label>
            <input 
              type="password" 
              id="senha" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
            />
          </div>

          {erro && <p className="mensagem-erro">{erro}</p>}

          <button type="submit" className="botao botao-primario login-botao" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
