import React, { useState, useEffect } from 'react';
import { criarProduto, atualizarProduto } from '../../servicos/apiProdutos';

function FormularioProduto({ produto, aoSalvar }) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    estoque: 0,
  });

  useEffect(() => {
    if (produto) {
      setFormData(produto);
    } else {
      setFormData({ nome: '', descricao: '', preco: 0, estoque: 0 });
    }
  }, [produto]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevState => ({ 
        ...prevState, 
        [name]: type === 'number' ? parseFloat(value) : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (produto) {
        await atualizarProduto(produto.id, formData);
      } else {
        await criarProduto(formData);
      }
      aoSalvar();
    } catch (error) {
      console.error("Falha ao salvar produto:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-grupo">
        <label htmlFor="nome">Nome</label>
        <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
      </div>
      <div className="input-grupo">
        <label htmlFor="descricao">Descrição</label>
        <input type="text" name="descricao" value={formData.descricao} onChange={handleChange} />
      </div>
      <div className="input-grupo">
        <label htmlFor="preco">Preço</label>
        <input type="number" name="preco" step="0.01" value={formData.preco} onChange={handleChange} />
      </div>
       <div className="input-grupo">
        <label htmlFor="estoque">Estoque</label>
        <input type="number" name="estoque" value={formData.estoque} onChange={handleChange} />
      </div>
      <div className="modal-acoes">
        <button type="submit" className="botao botao-primario">
          {produto ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default FormularioProduto;
