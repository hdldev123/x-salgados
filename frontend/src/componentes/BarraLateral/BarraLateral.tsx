import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { ContextoAutenticacao } from '../../contextos/ContextoAutenticacao';
import { 
  FiHome, FiClipboard, FiUsers, FiBox, FiUser, FiTruck, FiLogOut 
} from 'react-icons/fi';

// Define os itens do menu com seus respectivos ícones, textos, rotas e papéis permitidos.
const menuItens = [
  { icone: <FiHome />, texto: "Dashboard", para: "/", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiClipboard />, texto: "Pedidos", para: "/pedidos", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiUsers />, texto: "Clientes", para: "/clientes", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiBox />, texto: "Produtos", para: "/produtos", papeis: ['ADMINISTRADOR', 'ATENDENTE'] },
  { icone: <FiUser />, texto: "Usuários", para: "/usuarios", papeis: ['ADMINISTRADOR'] },
  { icone: <FiTruck />, texto: "Rotas de Entrega", para: "/entregas", papeis: ['ENTREGADOR'] },
];

function BarraLateral() {
  const { usuario, logout } = useContext(ContextoAutenticacao);

  if (!usuario) {
    return null; // Não renderiza nada se não houver usuário
  }

  return (
    <aside className="flex w-64 flex-col border-r border-grafite-200 bg-white shadow-soft">
      {/* Logo */}
      <div className="border-b border-grafite-200 px-6 py-5 text-center">
        <img 
          src="/logo.png" 
          alt="X Salgados" 
          className="mx-auto h-20 w-auto object-contain"
        />
      </div>

      {/* Navegação */}
      <nav className="mt-4 flex-1 px-3">
        <ul className="space-y-1">
          {menuItens
            .filter(item => item.papeis.includes(usuario.role))
            .map((item, index) => (
              <li key={index}>
                <NavLink 
                  to={item.para} 
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
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

      {/* Informações do Usuário */}
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
}

export default BarraLateral;
