import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ItemPedido } from './ItemPedido';

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'varchar', length: 50 })
  categoria!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descricao!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  preco!: number;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'data_criacao', type: 'timestamp', default: () => 'NOW()' })
  dataCriacao!: Date;

  @OneToMany(() => ItemPedido, (item) => item.produto)
  itensPedido!: ItemPedido[];
}
