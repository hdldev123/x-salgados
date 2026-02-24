import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Pedido } from './Pedido';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'varchar', length: 20 })
  telefone!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endereco!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cidade!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cep!: string | null;

  @CreateDateColumn({ name: 'data_criacao', type: 'timestamp', default: () => 'NOW()' })
  dataCriacao!: Date;

  @OneToMany(() => Pedido, (pedido) => pedido.cliente)
  pedidos!: Pedido[];
}
