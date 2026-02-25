import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { buscarProdutos, deletarProduto } from '../../servicos/apiProdutos';
import Tabela from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import Modal from '../../componentes/Modal/Modal';
import FormularioProduto from './FormularioProdutos';
import '../PaginasListagem.css';

function ListagemProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarProdutos();
      setProdutos(dados.dados);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const abrirModalFormulario = (produto) => {
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

  const abrirModalExcluir = (produto) => {
    setProdutoParaExcluir(produto);
    setModalExcluirAberto(true);
  }

  const fecharModalExcluir = () => {
      setProdutoParaExcluir(null);
      setModalExcluirAberto(false);
  }

  const handleConfirmarExclusao = async () => {
      if(!produtoParaExcluir) return;
      try {
        await deletarProduto(produtoParaExcluir.id);
        fecharModalExcluir();
        carregarProdutos();
      } catch (error) {
          setErro("Falha ao excluir o produto.");
      }
  }

  const colunas = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Preço', render: (produto) => `R$ ${produto.preco.toFixed(2)}` },
    { cabecalho: 'Estoque', chave: 'estoque' },
    { cabecalho: 'Ações', render: (produto) => (
      <div className="acoes-tabela">
        <button className='botao-icone' onClick={() => abrirModalFormulario(produto)}><FiEdit/></button>
        <button className='botao-icone botao-icone-perigo' onClick={() => abrirModalExcluir(produto)}><FiTrash2/></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="cabecalho-pagina">
        <h1 className="titulo-pagina">Produtos</h1>
        <button className="botao botao-primario" onClick={() => abrirModalFormulario(null)}>
          <FiPlus />
          Adicionar Produto
        </button>
      </div>

      {carregando && <Spinner />}
      {erro && <p className="mensagem-erro">{erro}</p>}
      {!carregando && !erro && <Tabela colunas={colunas} dados={produtos} />}

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
            <p>Tem certeza que deseja excluir o produto <strong>{produtoParaExcluir?.nome}</strong>?</p>
            <div className='modal-acoes'>
                <button className='botao botao-secundario' onClick={fecharModalExcluir}>Cancelar</button>
                <button className='botao botao-perigo' onClick={handleConfirmarExclusao}>Confirmar</button>
            </div>
        </div>
      </Modal>

    </div>
  );
}

export default ListagemProdutos;
