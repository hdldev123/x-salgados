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
      // Tratar erro na UI
    }
  };

  const inputClasses = "w-full rounded-xl border border-grafite-200 bg-white px-4 py-2.5 text-sm text-grafite-800 transition-all duration-200 placeholder:text-grafite-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none";

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="nome" className="mb-1.5 block text-sm font-medium text-grafite-700">Nome</label>
        <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className={inputClasses} />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-grafite-700">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} />
      </div>
      <div className="mb-4">
        <label htmlFor="telefone" className="mb-1.5 block text-sm font-medium text-grafite-700">Telefone</label>
        <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} className={inputClasses} />
      </div>
      <div className="mb-4">
        <label htmlFor="endereco" className="mb-1.5 block text-sm font-medium text-grafite-700">Endereço</label>
        <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className={inputClasses} />
      </div>
      <div className="mt-6 flex justify-end border-t border-grafite-200 pt-4">
        <button
          type="submit"
          className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl active:translate-y-0"
        >
          {cliente ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default FormularioCliente;
