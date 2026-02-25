import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX } from 'react-icons/fi';
import './Modal.css';

/**
 * Componente reutilizável de Modal.
 * Renderiza seu conteúdo em um portal, fora da árvore DOM principal,
 * para evitar problemas de `z-index` e contexto de empilhamento.
 * * @param {object} props
 * @param {boolean} props.estaAberto - Controla a visibilidade do modal.
 * @param {function} props.aoFechar - Função para fechar o modal.
 * @param {string} props.titulo - Título exibido no cabeçalho do modal.
 * @param {React.ReactNode} props.children - Conteúdo a ser renderizado dentro do modal.
 */
function Modal({ estaAberto, aoFechar, titulo, children }) {
  // Efeito para adicionar e remover a classe no body, prevenindo scroll da página principal
  // quando o modal está aberto.
  useEffect(() => {
    if (estaAberto) {
      document.body.classList.add('modal-aberto');
    } else {
      document.body.classList.remove('modal-aberto');
    }
    // Função de limpeza para garantir que a classe seja removida se o componente for desmontado
    return () => {
      document.body.classList.remove('modal-aberto');
    };
  }, [estaAberto]);
  
  // O modal não é renderizado se não estiver aberto.
  if (!estaAberto) return null;

  // Usa ReactDOM.createPortal para renderizar o modal no elemento 'modal-root' do index.html.
  return ReactDOM.createPortal(
    <>
      <div className="modal-backdrop" onClick={aoFechar} />
      <div className="modal-container">
        <div className="modal-cabecalho">
          <h2 className="modal-titulo">{titulo}</h2>
          <button onClick={aoFechar} className="modal-botao-fechar">
            <FiX />
          </button>
        </div>
        <div className="modal-conteudo">
          {children}
        </div>
      </div>
    </>,
    document.getElementById('modal-root')
  );
}

export default Modal;
