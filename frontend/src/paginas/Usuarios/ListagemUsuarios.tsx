import React, { useState, useEffect, useCallback } from 'react';
import { buscarUsuarios } from '../../servicos/apiUsuarios';
import Tabela, { ColunaTabela } from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import { Usuario } from '../../types';

function ListagemUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarUsuarios();
      setUsuarios(dados.dados || []);
    } catch (err: any) {
      setErro(err.message || String(err));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const colunas: ColunaTabela<Usuario>[] = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Email', chave: 'email' },
    { cabecalho: 'Função', chave: 'role' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-grafite-800">Usuários</h1>
        {/* Botão de adicionar e modais podem ser adicionados aqui seguindo o padrão */}
      </div>

      {carregando && <Spinner />}
      {erro && (
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}
      {!carregando && !erro && <Tabela<Usuario> colunas={colunas} dados={usuarios} />}
    </div>
  );
}

export default ListagemUsuarios;
