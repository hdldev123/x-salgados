import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ContextoAutenticacao } from '../../contextos/ContextoAutenticacao';
import {
  FiHome, FiClipboard, FiUsers, FiBox, FiUser, FiTruck, FiLogOut, FiXCircle, FiChevronDown, FiList, FiX
} from 'react-icons/fi';
import { RoleUsuario } from '../../types';

interface MenuItem {
  icone: React.ReactNode;
  texto: string;
  para: string;
  papeis: RoleUsuario[];
}

interface MenuItemComSub {
  icone: React.ReactNode;
  texto: string;
  papeis: RoleUsuario[];
  filhos: MenuItem[];
}

type ItemMenu = MenuItem | MenuItemComSub;

function temFilhos(item: ItemMenu): item is MenuItemComSub {
  return 'filhos' in item;
}

const menuItens: ItemMenu[] = [
  { icone: <FiHome />, texto: "Dashboard", para: "/", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  {
    icone: <FiClipboard />,
    texto: "Pedidos",
    papeis: ['ADMINISTRADOR', 'ATENDENTE'],
    filhos: [
      { icone: <FiList />, texto: "Todos os Pedidos", para: "/pedidos", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
      { icone: <FiXCircle className="text-erro" />, texto: "Cancelados", para: "/pedidos-cancelados", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
    ],
  },
  { icone: <FiUsers />, texto: "Clientes", para: "/clientes", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiBox />, texto: "Produtos", para: "/produtos", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiUser />, texto: "Usuários", para: "/usuarios", papeis: ['ADMINISTRADOR'] },
  { icone: <FiTruck />, texto: "Rotas de Entrega", para: "/entregas", papeis: ['ENTREGADOR'] },
];

interface BarraLateralProps {
  aberto: boolean;
  onFechar: () => void;
}

const BarraLateral: React.FC<BarraLateralProps> = ({ aberto, onFechar }) => {
  const contexto = useContext(ContextoAutenticacao);
  const location = useLocation();

  const pedidosAtivo = location.pathname.startsWith('/pedidos');
  const [pedidosAberto, setPedidosAberto] = useState(pedidosAtivo);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    onFechar();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!contexto || !contexto.usuario) {
    return null;
  }

  const { usuario, logout } = contexto;

  const conteudoMenu = (
    <>
      {/* Logo — visível apenas no sidebar (desktop e drawer mobile) */}
      <div className="border-b border-grafite-200 px-6 py-5 text-center">
        <div className="flex items-center justify-between lg:justify-center">
          <img
            src="/logo.png"
            alt="Rangô"
            className="h-16 w-auto object-contain lg:h-20"
          />
          {/* Botão fechar — apenas no mobile */}
          <button
            onClick={onFechar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-grafite-400 transition-colors hover:bg-grafite-100 hover:text-grafite-600 lg:hidden"
            aria-label="Fechar menu"
          >
            <FiX className="text-xl" />
          </button>
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {menuItens
            .filter(item => item.papeis.some(p => usuario.role === p))
            .map((item, index) => {
              if (temFilhos(item)) {
                const ativo = item.filhos.some(f => location.pathname.startsWith(f.para));
                const subAberto = pedidosAberto;
                return (
                  <li key={index}>
                    <button
                      onClick={() => setPedidosAberto((v) => !v)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        ativo
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-grafite-500 hover:bg-primary-50 hover:text-primary-600'
                      }`}
                    >
                      <span className="text-lg">{item.icone}</span>
                      <span className="flex-1 text-left">{item.texto}</span>
                      <FiChevronDown
                        className={`text-base transition-transform duration-200 ${subAberto ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {subAberto && (
                      <ul className="mt-1 space-y-1 pl-4">
                        {item.filhos
                          .filter(f => f.papeis.some(p => usuario.role === p))
                          .map((filho, fi) => (
                            <li key={fi}>
                              <NavLink
                                to={filho.para}
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    isActive
                                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                                      : 'text-grafite-500 hover:bg-primary-50 hover:text-primary-600 hover:translate-x-1'
                                  }`
                                }
                              >
                                <span className="text-base">{filho.icone}</span>
                                <span>{filho.texto}</span>
                              </NavLink>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={index}>
                  <NavLink
                    to={(item as MenuItem).para}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                        : 'text-grafite-500 hover:bg-primary-50 hover:text-primary-600 hover:translate-x-1'
                      }`
                    }
                    end={(item as MenuItem).para === "/"}
                  >
                    <span className="text-lg">{item.icone}</span>
                    <span>{item.texto}</span>
                  </NavLink>
                </li>
              );
            })}
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
    </>
  );

  return (
    <>
      {/* ─── Overlay escuro (mobile only) ─── */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onFechar}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar como Drawer (mobile) / Fixa (desktop) ─── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-grafite-200 bg-white shadow-soft
          transition-transform duration-300 ease-in-out
          ${aberto ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:z-auto lg:translate-x-0 lg:transition-none
        `}
      >
        {conteudoMenu}
      </aside>
    </>
  );
};

export default BarraLateral;
