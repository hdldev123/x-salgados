import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Cliente } from './Cliente';
import { ItemPedido } from './ItemPedido';
import { StatusPedido } from './enums';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'cliente_id', type: 'int' })
  clienteId!: number;

  @CreateDateColumn({ name: 'data_criacao', type: 'timestamp', default: () => 'NOW()' })
  dataCriacao!: Date;

  @Column({ name: 'data_entrega', type: 'timestamp', nullable: true })
  dataEntrega!: Date | null;

  @Column({ name: 'valor_total', type: 'decimal', precision: 10, scale: 2 })
  valorTotal!: number;

  @Column({ type: 'int' })
  status!: StatusPedido;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacoes!: string | null;

  // Relações
  @ManyToOne(() => Cliente, (cliente) => cliente.pedidos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cliente_id' })
  cliente!: Cliente;

  @OneToMany(() => ItemPedido, (item) => item.pedido, { cascade: true })
  itens!: ItemPedido[];
}
