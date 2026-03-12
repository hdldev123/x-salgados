import React from 'react';

export interface ColunaTabela<T> {
  cabecalho: string;
  chave?: keyof T;
  render?: (item: T) => React.ReactNode;
}

export interface TabelaProps<T> {
  colunas: ColunaTabela<T>[];
  dados: T[];
}

function Tabela<T extends { id?: number | string }>({ colunas, dados }: TabelaProps<T>) {

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
                  {coluna.render ? coluna.render(item) : (coluna.chave ? (item[coluna.chave] as unknown as React.ReactNode) : null)}
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
