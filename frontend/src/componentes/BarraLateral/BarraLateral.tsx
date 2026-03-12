import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { ContextoAutenticacao } from '../../contextos/ContextoAutenticacao';
import {
  FiHome, FiClipboard, FiUsers, FiBox, FiUser, FiTruck, FiLogOut, FiXCircle
} from 'react-icons/fi';
import { RoleUsuario } from '../../types';

interface MenuItem {
  icone: React.ReactNode;
  texto: string;
  para: string;
  papeis: RoleUsuario[];
}

const menuItens: MenuItem[] = [
  { icone: <FiHome />, texto: "Dashboard", para: "/", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiClipboard />, texto: "Pedidos", para: "/pedidos", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiXCircle className="text-erro" />, texto: "Pedidos Cancelados", para: "/pedidos-cancelados", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiUsers />, texto: "Clientes", para: "/clientes", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiBox />, texto: "Produtos", para: "/produtos", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiUser />, texto: "Usuários", para: "/usuarios", papeis: ['ADMINISTRADOR'] },
  { icone: <FiTruck />, texto: "Rotas de Entrega", para: "/entregas", papeis: ['ENTREGADOR'] },
];

const BarraLateral: React.FC = () => {
  const contexto = useContext(ContextoAutenticacao);

  if (!contexto || !contexto.usuario) {
    return null;
  }

  const { usuario, logout } = contexto;

  return (
    <aside className="flex w-64 flex-col border-r border-grafite-200 bg-white shadow-soft">
      <div className="border-b border-grafite-200 px-6 py-5 text-center">
        <img
          src="/logo.png"
          alt="Rangô"
          className="mx-auto h-20 w-auto object-contain"
        />
      </div>

      <nav className="mt-4 flex-1 px-3">
        <ul className="space-y-1">
          {menuItens
            .filter(item => item.papeis.includes(usuario.role))
            .map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.para}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                      : 'text-grafite-500 hover:bg-primary-50 hover:text-primary-600 hover:translate-x-1'
                    }`
                  }
                  end={item.para === "/"}
                >
                  <span className="text-lg">{item.icone}</span>
                  <span>{item.texto}</span>
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-grafite-200 px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-grafite-800">{usuario.nome}</span>
          <span className="text-xs text-grafite-400">{usuario.role}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center rounded-lg p-2 text-grafite-400 transition-colors duration-200 hover:bg-erro/10 hover:text-erro"
          title="Sair"
        >
          <FiLogOut className="text-lg" />
        </button>
      </div>
    </aside>
  );
};

export default BarraLateral;
