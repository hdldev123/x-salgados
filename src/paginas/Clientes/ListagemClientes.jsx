import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { buscarClientes, deletarCliente } from '../../servicos/apiClientes';
import Tabela from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import Modal from '../../componentes/Modal/Modal';
import FormularioCliente from './FormularioClientes';
import '../PaginasListagem.css';

function ListagemClientes() {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);

  const carregarClientes = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarClientes();
      setClientes(dados.dados);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const abrirModalFormulario = (cliente) => {
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

  const abrirModalExcluir = (cliente) => {
    setClienteParaExcluir(cliente);
    setModalExcluirAberto(true);
  }

  const fecharModalExcluir = () => {
      setClienteParaExcluir(null);
      setModalExcluirAberto(false);
  }

  const handleConfirmarExclusao = async () => {
      if(!clienteParaExcluir) return;
      try {
        await deletarCliente(clienteParaExcluir.id);
        fecharModalExcluir();
        carregarClientes();
      } catch (error) {
          setErro("Falha ao excluir o cliente.");
      }
  }


  const colunas = [
    { cabecalho: 'Nome', chave: 'nome' },
    { cabecalho: 'Email', chave: 'email' },
    { cabecalho: 'Telefone', chave: 'telefone' },
    { cabecalho: 'Ações', render: (cliente) => (
      <div className="acoes-tabela">
        <button className='botao-icone' onClick={() => abrirModalFormulario(cliente)}><FiEdit/></button>
        <button className='botao-icone botao-icone-perigo' onClick={() => abrirModalExcluir(cliente)}><FiTrash2/></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="cabecalho-pagina">
        <h1 className="titulo-pagina">Clientes</h1>
        <button className="botao botao-primario" onClick={() => abrirModalFormulario(null)}>
          <FiPlus />
          Adicionar Cliente
        </button>
      </div>

      {carregando && <Spinner />}
      {erro && <p className="mensagem-erro">{erro}</p>}
      {!carregando && !erro && <Tabela colunas={colunas} dados={clientes} />}

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
            <p>Tem certeza que deseja excluir o cliente <strong>{clienteParaExcluir?.nome}</strong>?</p>
            <div className='modal-acoes'>
                <button className='botao botao-secundario' onClick={fecharModalExcluir}>Cancelar</button>
                <button className='botao botao-perigo' onClick={handleConfirmarExclusao}>Confirmar</button>
            </div>
        </div>
      </Modal>

    </div>
  );
}

export default ListagemClientes;
