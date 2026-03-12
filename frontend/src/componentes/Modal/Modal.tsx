import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  estaAberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ estaAberto, aoFechar, titulo, children }) => {
  useEffect(() => {
    if (estaAberto) {
      document.body.classList.add('modal-aberto');
    } else {
      document.body.classList.remove('modal-aberto');
    }
    return () => {
      document.body.classList.remove('modal-aberto');
    };
  }, [estaAberto]);

  if (!estaAberto) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-[1000] bg-grafite-900/50 backdrop-blur-sm"
        onClick={aoFechar}
      />

      <div className="fixed left-1/2 top-1/2 z-[1001] w-[90%] max-w-xl -translate-x-1/2 -translate-y-1/2 animate-slide-up rounded-2xl glass p-8 shadow-glass max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between border-b border-grafite-200 pb-4">
          <h2 className="text-xl font-semibold text-grafite-800">{titulo}</h2>
          <button
            onClick={aoFechar}
            className="flex items-center justify-center rounded-lg p-2 text-grafite-400 transition-colors duration-200 hover:bg-erro/10 hover:text-erro"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </>,
    modalRoot
  );
};

export default Modal;
