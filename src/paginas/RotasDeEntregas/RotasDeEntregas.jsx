import React, { useState, useEffect } from 'react';
import { buscarPedidos } from '../../servicos/apiPedidos';
import Spinner from '../../componentes/Spinner/Spinner';
import './RotasDeEntregas.css';

// Função para agrupar pedidos por CEP
const agruparPorCep = (pedidos) => {
  return pedidos.reduce((acc, pedido) => {
    const cep = pedido.cliente.endereco.split(',').pop().trim(); // Simples extração do CEP
    if (!acc[cep]) {
      acc[cep] = [];
    }
    acc[cep].push(pedido);
    return acc;
  }, {});
};

function RotasDeEntrega() {
  const [gruposDeEntrega, setGruposDeEntrega] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregarEntregas = async () => {
      setCarregando(true);
      try {
        // Busca apenas pedidos com status 'A_CAMINHO'
        const resposta = await buscarPedidos({ filtro: 'A_CAMINHO' });
        const grupos = agruparPorCep(resposta.dados);
        setGruposDeEntrega(grupos);
      } catch (err) {
        setErro("Não foi possível carregar as rotas de entrega.");
      } finally {
        setCarregando(false);
      }
    };
    carregarEntregas();
  }, []);

  return (
    <div>
      <h1 className="titulo-pagina">Rotas de Entrega do Dia</h1>
      {carregando && <Spinner />}
      {erro && <p className="mensagem-erro">{erro}</p>}
      {!carregando && Object.keys(gruposDeEntrega).length === 0 && (
          <p>Nenhuma entrega para hoje.</p>
      )}

      <div className="rotas-grid">
        {Object.entries(gruposDeEntrega).map(([cep, pedidos]) => (
          <div key={cep} className="rota-card">
            <h2 className="rota-cep">CEP: {cep}</h2>
            {pedidos.map(pedido => (
              <div key={pedido.id} className="pedido-card">
                <h3 className="pedido-cliente">{pedido.cliente.nome}</h3>
                <p className="pedido-endereco">{pedido.cliente.endereco}</p>
                <p className="pedido-total">Total: R$ {pedido.total.toFixed(2)}</p>
                <span className={`status-tag status-${pedido.status.toLowerCase()}`}>
                  {pedido.status}
                </span>
              </div>
            ))}
            <button className="concluir-rota">Concluir Rota</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RotasDeEntrega;
