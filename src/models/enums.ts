// Enums mapeados do C# — valores numéricos idênticos ao banco de dados

export enum PerfilUsuario {
  Administrador = 1,
  Atendente = 2,
  Entregador = 3,
}

export enum StatusPedido {
  Pendente = 1,
  EmProducao = 2,
  Pronto = 3,
  EmEntrega = 4,
  Entregue = 5,
  Cancelado = 6,
}

/** Mapa de label legível para cada status */
export const StatusPedidoLabel: Record<StatusPedido, string> = {
  [StatusPedido.Pendente]: 'Pendente',
  [StatusPedido.EmProducao]: 'Em Produção',
  [StatusPedido.Pronto]: 'Pronto',
  [StatusPedido.EmEntrega]: 'Em Entrega',
  [StatusPedido.Entregue]: 'Entregue',
  [StatusPedido.Cancelado]: 'Cancelado',
};

/** Mapa de label legível para cada perfil */
export const PerfilUsuarioLabel: Record<PerfilUsuario, string> = {
  [PerfilUsuario.Administrador]: 'Administrador',
  [PerfilUsuario.Atendente]: 'Atendente',
  [PerfilUsuario.Entregador]: 'Entregador',
};
