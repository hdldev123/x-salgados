import React from 'react';

/**
 * Componente de Tabela Reutilizável.
 * * @param {object} props
 * @param {Array<object>} props.colunas - Configuração das colunas. Ex: [{ cabecalho: 'Nome', chave: 'nome' }]
 * @param {Array<object>} props.dados - Os dados a serem exibidos na tabela.
 */
function Tabela({ colunas, dados }) {

  if (!dados || dados.length === 0) {
    return <p className="py-8 text-center text-grafite-400">Nenhum dado encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-grafite-200 bg-white shadow-soft">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {colunas.map((coluna, index) => (
              <th
                key={index}
                className="sticky top-0 z-10 border-b border-grafite-200 bg-grafite-50 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-grafite-600"
              >
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grafite-100">
          {dados.map((item, itemIndex) => (
            <tr
              key={item.id || itemIndex}
              className="transition-colors duration-150 hover:bg-primary-50/30"
            >
              {colunas.map((coluna, colunaIndex) => (
                <td
                  key={colunaIndex}
                  className="px-6 py-4 text-sm text-grafite-700"
                >
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
