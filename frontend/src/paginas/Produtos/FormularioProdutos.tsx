import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { criarProduto, atualizarProduto, CriarProdutoDto } from '../../servicos/apiProdutos';
import { Produto } from '../../types';

interface FormularioProdutoProps {
  produto: Produto | null;
  aoSalvar: () => void;
}

function FormularioProduto({ produto, aoSalvar }: FormularioProdutoProps) {
  const [formData, setFormData] = useState<CriarProdutoDto>({
    nome: '',
    categoria: '',
    descricao: '',
    preco: 0,
    ativo: true,
    estoque: 0,
  });

  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setErro(null);
    if (produto) {
      setFormData({
        nome: produto.nome || '',
        categoria: produto.categoria || '',
        descricao: produto.descricao || '',
        preco: produto.preco || 0,
        ativo: produto.ativo ?? true,
        estoque: produto.estoque ?? 0,
      });
    } else {
      setFormData({ nome: '', categoria: '', descricao: '', preco: 0, ativo: true, estoque: 0 });
    }
  }, [produto]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let parsed: string | number | boolean;
    if (type === 'checkbox') {
      parsed = checked;
    } else if (type === 'number') {
      parsed = name === 'estoque' ? parseInt(value, 10) || 0 : parseFloat(value);
    } else {
      parsed = value;
    }

    setFormData(prevState => {
      const next = { ...prevState, [name]: parsed };
      // Auto-sync: estoque < 100 desativa (pedido mínimo = 100 unidades)
      if (name === 'estoque') {
        next.ativo = (parsed as number) >= 100;
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    try {
      if (produto) {
        await atualizarProduto(produto.id, formData);
      } else {
        await criarProduto(formData);
      }
      aoSalvar();
    } catch (error: any) {
      setErro(error.mensagem || 'Erro ao salvar produto.');
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
        <label htmlFor="categoria" className="mb-1.5 block text-sm font-medium text-grafite-700">Categoria</label>
        <input type="text" name="categoria" value={formData.categoria} onChange={handleChange} required className={inputClasses} />
      </div>
      <div className="mb-4">
        <label htmlFor="descricao" className="mb-1.5 block text-sm font-medium text-grafite-700">Descrição</label>
        <input type="text" name="descricao" value={formData.descricao} onChange={handleChange} className={inputClasses} />
      </div>
      <div className="mb-4">
        <label htmlFor="preco" className="mb-1.5 block text-sm font-medium text-grafite-700">Preço</label>
        <input type="number" name="preco" step="0.01" value={formData.preco} onChange={handleChange} required className={inputClasses} />
      </div>
      <div className="mb-4">
        <label htmlFor="estoque" className="mb-1.5 block text-sm font-medium text-grafite-700">Estoque</label>
        <input type="number" name="estoque" step="1" min="0" value={formData.estoque} onChange={handleChange} required className={inputClasses} />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          name="ativo"
          id="ativo"
          checked={formData.ativo}
          onChange={handleChange}
          className="h-4 w-4 rounded border-grafite-300 text-primary-500 focus:ring-primary-500"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-grafite-700">Produto ativo</label>
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-grafite-200 pt-4">
        {erro && (
          <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
            {erro}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl active:translate-y-0"
          >
            {produto ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default FormularioProduto;
