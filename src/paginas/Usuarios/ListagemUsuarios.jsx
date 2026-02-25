import React, { useState, useEffect, useCallback } from 'react';
import { buscarUsuarios } from '../../servicos/apiUsuarios';
import Tabela from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import '../PaginasListagem.css';

function ListagemUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarUsuarios();
      setUsuarios(dados.dados);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const colunas = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Email', chave: 'email' },
    { cabecalho: 'Função', chave: 'role' },
  ];

  return (
    <div>
      <div className="cabecalho-pagina">
        <h1 className="titulo-pagina">Usuários</h1>
        {/* Botão de adicionar e modais podem ser adicionados aqui seguindo o padrão */}
      </div>

      {carregando && <Spinner />}
      {erro && <p className="mensagem-erro">{erro}</p>}
      {!carregando && !erro && <Tabela colunas={colunas} dados={usuarios} />}
    </div>
  );
}

export default ListagemUsuarios;
