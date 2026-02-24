import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Usuario } from '../models/Usuario';
import { Cliente } from '../models/Cliente';
import { Produto } from '../models/Produto';
import { Pedido } from '../models/Pedido';
import { ItemPedido } from '../models/ItemPedido';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '6543'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false, // Tabelas criadas via SQL manual (create_tables.sql)
  logging: process.env.NODE_ENV === 'development',
  entities: [Usuario, Cliente, Produto, Pedido, ItemPedido],
});
