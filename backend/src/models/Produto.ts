/**
 * Interface que representa uma linha da tabela `produtos`.
 */
export interface Produto {
  id: number;
  nome: string;
  categoria: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  estoque: number;
  data_criacao: string;
}
