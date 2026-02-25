import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { ContextoAutenticacao } from '../../contextos/ContextoAutenticacao';
import './BarraLateral.css';
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
    <aside className="barra-lateral">
      <div className="logo-container">
        <h1 className="logo-texto">X Salgados</h1>
      </div>
      <nav className="navegacao-principal">
        <ul>
          {menuItens
            .filter(item => item.papeis.includes(usuario.role)) // Filtra itens com base no papel do usuário
            .map((item, index) => (
              <li key={index}>
                <NavLink 
                  to={item.para} 
                  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                  end={item.para === "/"} // 'end' garante que a home só fica ativa na rota exata
                >
                  {item.icone}
                  <span>{item.texto}</span>
                </NavLink>
              </li>
          ))}
        </ul>
      </nav>
      <div className="usuario-info">
        <div className='usuario-detalhes'>
            <span className="usuario-nome">{usuario.nome}</span>
            <span className="usuario-papel">{usuario.role}</span>
        </div>
        <button onClick={logout} className="botao-logout" title="Sair">
          <FiLogOut />
        </button>
      </div>
    </aside>
  );
}

export default BarraLateral;
