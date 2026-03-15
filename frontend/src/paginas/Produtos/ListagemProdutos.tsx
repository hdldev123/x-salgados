import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { buscarProdutos, deletarProduto } from '../../servicos/apiProdutos';
import Tabela, { ColunaTabela } from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import Modal from '../../componentes/Modal/Modal';
import FormularioProduto from './FormularioProdutos';
import { Produto } from '../../types';

function ListagemProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState<boolean>(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarProdutos();
      setProdutos(dados.dados || []);
    } catch (err: any) {
      setErro(err.message || String(err));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const abrirModalFormulario = (produto: Produto | null) => {
    setProdutoEditando(produto);
    setModalAberto(true);
  };

  const fecharModalFormulario = () => {
    setProdutoEditando(null);
    setModalAberto(false);
  };

  const handleSucessoFormulario = () => {
    fecharModalFormulario();
    carregarProdutos();
  };

  const abrirModalExcluir = (produto: Produto) => {
    setProdutoParaExcluir(produto);
    setModalExcluirAberto(true);
  }

  const fecharModalExcluir = () => {
    setProdutoParaExcluir(null);
    setModalExcluirAberto(false);
  }

  const handleConfirmarExclusao = async () => {
    if (!produtoParaExcluir) return;
    try {
      await deletarProduto(produtoParaExcluir.id);
      fecharModalExcluir();
      carregarProdutos();
    } catch (error) {
      setErro("Falha ao excluir o produto.");
    }
  }

  const colunas: ColunaTabela<Produto>[] = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Categoria', chave: 'categoria' },
    { cabecalho: 'Preço', render: (produto) => `R$ ${produto.preco.toFixed(2)}` },
    {
      cabecalho: 'Estoque', render: (produto) => {
        const estoque = produto.estoque ?? 0;
        if (estoque === 0) {
          return (
            <span className="inline-flex items-center rounded-full bg-erro/10 px-2.5 py-0.5 text-xs font-semibold text-erro">
              Esgotado
            </span>
          );
        }
        if (estoque <= 500) {
          return (
            <span className="inline-flex items-center rounded-full bg-aviso/10 px-2.5 py-0.5 text-xs font-semibold text-aviso">
              {estoque}
            </span>
          );
        }
        return <span className="text-sm text-grafite-700">{estoque}</span>;
      }
    },
    {
      cabecalho: 'Status', render: (produto) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${produto.ativo
            ? 'bg-sucesso/10 text-sucesso'
            : 'bg-grafite-100 text-grafite-400'
          }`}>
          {produto.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      cabecalho: 'Ações', render: (produto) => (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center rounded-lg p-2 text-primary-500 transition-colors hover:bg-primary-50"
            onClick={() => abrirModalFormulario(produto)}
          >
            <FiEdit />
          </button>
          <button
            className="flex items-center justify-center rounded-lg p-2 text-erro transition-colors hover:bg-erro/10"
            onClick={() => abrirModalExcluir(produto)}
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
        <h1 className="text-3xl font-bold text-grafite-800">Produtos</h1>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl active:translate-y-0"
          onClick={() => abrirModalFormulario(null)}
        >
          <FiPlus />
          Adicionar Produto
        </button>
      </div>

      {carregando && <Spinner />}
      {erro && (
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}
      {!carregando && !erro && <Tabela<Produto> colunas={colunas} dados={produtos} />}

      <Modal
        estaAberto={modalAberto}
        aoFechar={fecharModalFormulario}
        titulo={produtoEditando ? "Editar Produto" : "Adicionar Produto"}
      >
        <FormularioProduto
          produto={produtoEditando}
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
            Tem certeza que deseja excluir o produto <strong className="text-grafite-800">{produtoParaExcluir?.nome}</strong>?
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

export default ListagemProdutos;
