import React, { useState, useEffect } from 'react';
import { criarCliente, atualizarCliente } from '../../servicos/apiClientes';

function FormularioCliente({ cliente, aoSalvar }) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData(cliente);
    } else {
      setFormData({ nome: '', email: '', telefone: '', endereco: '' });
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (cliente) {
        await atualizarCliente(cliente.id, formData);
      } else {
        await criarCliente(formData);
      }
      aoSalvar();
    } catch (error) {
      console.error("Falha ao salvar cliente:", error);
      // Tratar erro na UI
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-grupo">
        <label htmlFor="nome">Nome</label>
        <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
      </div>
      <div className="input-grupo">
        <label htmlFor="email">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} />
      </div>
      <div className="input-grupo">
        <label htmlFor="telefone">Telefone</label>
        <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} />
      </div>
      <div className="input-grupo">
        <label htmlFor="endereco">Endereço</label>
        <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} />
      </div>
      <div className="modal-acoes">
        <button type="submit" className="botao botao-primario">
          {cliente ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default FormularioCliente;
