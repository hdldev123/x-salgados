import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { criarUsuario, atualizarUsuario, CriarUsuarioDto, AtualizarUsuarioDto } from '../../servicos/apiUsuarios';
import { Usuario, RoleUsuario, ROLES_USUARIO } from '../../types';

interface FormularioUsuariosProps {
  usuario: Usuario | null;
  aoSalvar: () => void;
}

const OPCOES_PERFIL: { valor: RoleUsuario; label: string }[] = [
  { valor: 'ATENDENTE', label: 'Atendente' },
  { valor: 'ADMINISTRADOR', label: 'Administrador' },
  { valor: 'ENTREGADOR', label: 'Entregador' },
];

function FormularioUsuarios({ usuario, aoSalvar }: FormularioUsuariosProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'ATENDENTE' as RoleUsuario,
    ativo: true,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setErro(null);
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        senha: '',
        role: usuario.role || 'ATENDENTE',
        ativo: usuario.ativo ?? true,
      });
    } else {
      setFormData({ nome: '', email: '', senha: '', role: 'ATENDENTE', ativo: true });
    }
  }, [usuario]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      if (usuario) {
        const payload: AtualizarUsuarioDto = {
          nome: formData.nome,
          email: formData.email,
          perfil: formData.role,
          ativo: formData.ativo,
        };
        await atualizarUsuario(usuario.id, payload);
      } else {
        if (!formData.senha || formData.senha.length < 6) {
          setErro('Senha deve ter no mínimo 6 caracteres.');
          setSalvando(false);
          return;
        }
        const payload: CriarUsuarioDto = {
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          perfil: formData.role,
        };
        await criarUsuario(payload);
      }
      aoSalvar();
    } catch (error: any) {
      setErro(error.mensagem || error.message || 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  const inputClasses =
    'w-full rounded-xl border border-grafite-200 bg-white px-4 py-2.5 text-sm text-grafite-800 transition-all duration-200 placeholder:text-grafite-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none';

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="nome" className="mb-1.5 block text-sm font-medium text-grafite-700">
          Nome
        </label>
        <input
          type="text"
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          required
          className={inputClasses}
          placeholder="Nome completo"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-grafite-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={inputClasses}
          placeholder="email@exemplo.com"
        />
      </div>

      {/* Senha — obrigatória apenas ao criar */}
      {!usuario && (
        <div className="mb-4">
          <label htmlFor="senha" className="mb-1.5 block text-sm font-medium text-grafite-700">
            Senha
          </label>
          <input
            type="password"
            id="senha"
            name="senha"
            value={formData.senha}
            onChange={handleChange}
            required
            minLength={6}
            className={inputClasses}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      )}

      {/* Seletor de papel (RBAC) */}
      <div className="mb-4">
        <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-grafite-700">
          Papel / Função
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className={inputClasses}
        >
          {OPCOES_PERFIL.map(opcao => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-grafite-400">
          {formData.role === 'ADMINISTRADOR' && 'Acesso total: dashboard, produtos, usuários e pedidos.'}
          {formData.role === 'ATENDENTE' && 'Acesso restrito: apenas gestão de pedidos e clientes.'}
          {formData.role === 'ENTREGADOR' && 'Acesso restrito: apenas rotas de entrega.'}
        </p>
      </div>

      {/* Status ativo — apenas ao editar */}
      {usuario && (
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="ativo"
            checked={formData.ativo}
            onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
            className="h-4 w-4 rounded border-grafite-300 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="ativo" className="text-sm font-medium text-grafite-700">
            Usuário ativo
          </label>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 border-t border-grafite-200 pt-4">
        {erro && (
          <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
            {erro}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : usuario ? 'Atualizar' : 'Criar Usuário'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default FormularioUsuarios;
