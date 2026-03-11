import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { buscarClientes, deletarCliente } from '../../servicos/apiClientes';
import Tabela, { ColunaTabela } from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import Modal from '../../componentes/Modal/Modal';
import FormularioCliente from './FormularioClientes';
import { Cliente } from '../../types';

function ListagemClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState<boolean>(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);

  const carregarClientes = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarClientes();
      setClientes(dados.dados || []);
    } catch (err: any) {
      setErro(err.message || String(err));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const abrirModalFormulario = (cliente: Cliente | null) => {
    setClienteEditando(cliente);
    setModalAberto(true);
  };

  const fecharModalFormulario = () => {
    setClienteEditando(null);
    setModalAberto(false);
  };

  const handleSucessoFormulario = () => {
    fecharModalFormulario();
    carregarClientes(); // Recarrega a lista
  };

  const abrirModalExcluir = (cliente: Cliente) => {
    setClienteParaExcluir(cliente);
    setModalExcluirAberto(true);
  }

  const fecharModalExcluir = () => {
    setClienteParaExcluir(null);
    setModalExcluirAberto(false);
  }

  const handleConfirmarExclusao = async () => {
    if (!clienteParaExcluir) return;
    try {
      await deletarCliente(clienteParaExcluir.id);
      fecharModalExcluir();
      carregarClientes();
    } catch (error: any) {
      if (error.mensagem) {
        setErro(error.mensagem);
      } else {
        setErro("Falha ao excluir o cliente.");
      }
    }
  }

  const colunas: ColunaTabela<Cliente>[] = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Email', chave: 'email' },
    { cabecalho: 'Telefone', chave: 'telefone' },
    {
      cabecalho: 'Ações', render: (cliente) => (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center rounded-lg p-2 text-primary-500 transition-colors hover:bg-primary-50"
            onClick={() => abrirModalFormulario(cliente)}
          >
            <FiEdit />
          </button>
          <button
            className="flex items-center justify-center rounded-lg p-2 text-erro transition-colors hover:bg-erro/10"
            onClick={() => abrirModalExcluir(cliente)}
          >
            <FiTrash2 />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-grafite-800">Clientes</h1>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl active:translate-y-0"
          onClick={() => abrirModalFormulario(null)}
        >
          <FiPlus />
          Adicionar Cliente
        </button>
      </div>

      {carregando && <Spinner />}
      {erro && (
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}
      {!carregando && !erro && <Tabela<Cliente> colunas={colunas} dados={clientes} />}

      <Modal
        estaAberto={modalAberto}
        aoFechar={fecharModalFormulario}
        titulo={clienteEditando ? "Editar Cliente" : "Adicionar Cliente"}
      >
        <FormularioCliente
          cliente={clienteEditando}
          aoSalvar={handleSucessoFormulario}
        />
      </Modal>

      <Modal
        estaAberto={modalExcluirAberto}
        aoFechar={fecharModalExcluir}
        titulo="Confirmar Exclusão"
      >
        <div>
          <p className="text-sm text-grafite-600">
            Tem certeza que deseja excluir o cliente <strong className="text-grafite-800">{clienteParaExcluir?.nome}</strong>?
          </p>
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
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default ListagemClientes;
