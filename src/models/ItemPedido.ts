import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pedido } from './Pedido';
import { Produto } from './Produto';

@Entity('itens_pedido')
export class ItemPedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pedido_id', type: 'int' })
  pedidoId!: number;

  @Column({ name: 'produto_id', type: 'int' })
  produtoId!: number;

  @Column({ type: 'int' })
  quantidade!: number;

  @Column({ name: 'preco_unitario_snapshot', type: 'decimal', precision: 10, scale: 2 })
  precoUnitarioSnapshot!: number;

  // Relações
  @ManyToOne(() => Pedido, (pedido) => pedido.itens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: Pedido;

  @ManyToOne(() => Produto, (produto) => produto.itensPedido, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'produto_id' })
  produto!: Produto;
}
