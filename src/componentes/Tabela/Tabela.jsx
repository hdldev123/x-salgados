import React from 'react';
import './Tabela.css';

/**
 * Componente de Tabela Reutilizável.
 * * @param {object} props
 * @param {Array<object>} props.colunas - Configuração das colunas. Ex: [{ cabecalho: 'Nome', chave: 'nome' }]
 * @param {Array<object>} props.dados - Os dados a serem exibidos na tabela.
 */
function Tabela({ colunas, dados }) {

  if (!dados || dados.length === 0) {
    return <p>Nenhum dado encontrado.</p>;
  }

  return (
    <div className="tabela-container">
      <table className="tabela">
        <thead>
          <tr>
            {colunas.map((coluna, index) => (
              <th key={index}>{coluna.cabecalho}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((item, itemIndex) => (
            <tr key={item.id || itemIndex}>
              {colunas.map((coluna, colunaIndex) => (
                <td key={colunaIndex}>
                  {coluna.render ? coluna.render(item) : item[coluna.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Tabela;
