import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX } from 'react-icons/fi';

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
      {/* Backdrop com Glassmorphism */}
      <div
        className="fixed inset-0 z-[1000] bg-grafite-900/50 backdrop-blur-sm"
        onClick={aoFechar}
      />

      {/* Container do Modal com Glassmorphism */}
      <div className="fixed left-1/2 top-1/2 z-[1001] w-[90%] max-w-xl -translate-x-1/2 -translate-y-1/2 animate-slide-up rounded-2xl glass p-8 shadow-glass max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="mb-6 flex items-center justify-between border-b border-grafite-200 pb-4">
          <h2 className="text-xl font-semibold text-grafite-800">{titulo}</h2>
          <button
            onClick={aoFechar}
            className="flex items-center justify-center rounded-lg p-2 text-grafite-400 transition-colors duration-200 hover:bg-erro/10 hover:text-erro"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Conteúdo */}
        <div>{children}</div>
      </div>
    </>,
    document.getElementById('modal-root')
  );
}

export default Modal;
