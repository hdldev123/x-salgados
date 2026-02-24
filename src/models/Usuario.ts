import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { PerfilUsuario } from './enums';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ name: 'senha_hash', type: 'varchar', length: 255 })
  senhaHash!: string;

  @Column({ type: 'int' })
  perfil!: PerfilUsuario;

  @CreateDateColumn({ name: 'data_criacao', type: 'timestamp', default: () => 'NOW()' })
  dataCriacao!: Date;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;
}
