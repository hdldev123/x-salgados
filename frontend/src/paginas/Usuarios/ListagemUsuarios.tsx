import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { buscarUsuarios, deletarUsuario } from '../../servicos/apiUsuarios';
import Tabela, { ColunaTabela } from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import Modal from '../../componentes/Modal/Modal';
import FormularioUsuarios from './FormularioUsuarios';
import { Usuario } from '../../types';

const LABEL_ROLE: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  ATENDENTE: 'Atendente',
  ENTREGADOR: 'Entregador',
};

function ListagemUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState<boolean>(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarUsuarios();
      setUsuarios(dados.dados || []);
    } catch (err: any) {
      setErro(err.mensagem || err.message || String(err));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const abrirModalFormulario = (usuario: Usuario | null) => {
    setUsuarioEditando(usuario);
    setModalAberto(true);
  };

  const fecharModalFormulario = () => {
    setUsuarioEditando(null);
    setModalAberto(false);
  };

  const handleSucessoFormulario = () => {
    fecharModalFormulario();
    carregarUsuarios();
  };

  const abrirModalExcluir = (usuario: Usuario) => {
    setErroExclusao(null);
    setUsuarioParaExcluir(usuario);
    setModalExcluirAberto(true);
  };

  const fecharModalExcluir = () => {
    setErroExclusao(null);
    setUsuarioParaExcluir(null);
    setModalExcluirAberto(false);
  };

  const handleConfirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;
    setErroExclusao(null);
    try {
      await deletarUsuario(usuarioParaExcluir.id);
      fecharModalExcluir();
      carregarUsuarios();
    } catch (error: any) {
      const msg = error.mensagem || error.response?.data?.mensagem || 'Erro ao excluir usuário.';
      setErroExclusao(msg);
    }
  };

  const colunas: ColunaTabela<Usuario>[] = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Email', chave: 'email' },
    {
      cabecalho: 'Função',
      render: (u) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          u.role === 'ADMINISTRADOR'
            ? 'bg-primary-100 text-primary-700'
            : u.role === 'ENTREGADOR'
              ? 'bg-info/10 text-info'
              : 'bg-grafite-100 text-grafite-600'
        }`}>
          {LABEL_ROLE[u.role] || u.role}
        </span>
      ),
    },
    {
      cabecalho: 'Ações',
      render: (usuario) => (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center rounded-lg p-2 text-primary-500 transition-colors hover:bg-primary-50"
            onClick={() => abrirModalFormulario(usuario)}
            title="Editar"
          >
            <FiEdit />
          </button>
          <button
            className="flex items-center justify-center rounded-lg p-2 text-erro transition-colors hover:bg-erro/10"
            onClick={() => abrirModalExcluir(usuario)}
            title="Excluir"
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-grafite-800">Usuários</h1>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl active:translate-y-0"
          onClick={() => abrirModalFormulario(null)}
        >
          <FiPlus />
          Adicionar Usuário
        </button>
      </div>

      {carregando && <Spinner />}
      {erro && (
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}
      {!carregando && !erro && <Tabela<Usuario> colunas={colunas} dados={usuarios} />}

      {/* Modal de criar/editar */}
      <Modal
        estaAberto={modalAberto}
        aoFechar={fecharModalFormulario}
        titulo={usuarioEditando ? 'Editar Usuário' : 'Adicionar Usuário'}
      >
        <FormularioUsuarios
          usuario={usuarioEditando}
          aoSalvar={handleSucessoFormulario}
        />
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        estaAberto={modalExcluirAberto}
        aoFechar={fecharModalExcluir}
        titulo="Confirmar Exclusão"
      >
        <div>
          <p className="text-sm text-grafite-600">
            Tem certeza que deseja excluir o usuário{' '}
            <strong className="text-grafite-800">{usuarioParaExcluir?.nome}</strong>?
          </p>
          <p className="mt-2 text-xs text-grafite-400">
            O usuário será desativado e não poderá mais acessar o sistema.
          </p>
          {erroExclusao && (
            <div className="mt-4 rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
              {erroExclusao}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3 border-t border-grafite-200 pt-4">
            <button
              className="rounded-xl border border-grafite-300 px-5 py-2 text-sm font-medium text-grafite-600 transition-colors hover:bg-grafite-50"
              onClick={fecharModalExcluir}
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-erro px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700"
              onClick={handleConfirmarExclusao}
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ListagemUsuarios;
