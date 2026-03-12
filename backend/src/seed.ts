import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { supabase } from './config/database';
import { PerfilUsuario } from './models/enums';

dotenv.config();

const BCRYPT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Testar conexão
  const { error: testError } = await supabase.from('usuarios').select('id', { count: 'exact', head: true });
  if (testError) {
    console.error('❌ Erro ao conectar ao Supabase:', testError.message);
    process.exit(1);
  }
  console.log('✅ Conexão com Supabase estabelecida.');

  const usuariosPadrao = [
    {
      nome: 'Administrador',
      email: 'admin@xsalgados.com',
      senhaPlana: 'admin123',
      perfil: PerfilUsuario.Administrador,
    },
    {
      nome: 'Atendente',
      email: 'atendente@xsalgados.com',
      senhaPlana: 'atendente123',
      perfil: PerfilUsuario.Atendente,
    },
    {
      nome: 'Entregador',
      email: 'entregador@xsalgados.com',
      senhaPlana: 'entregador123',
      perfil: PerfilUsuario.Entregador,
    }
  ];

  for (const usuario of usuariosPadrao) {
    console.log(`\nProcessando usuário: ${usuario.nome}...`);

    // Verifica se o usuário já existe
    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', usuario.email)
      .maybeSingle();

    const senhaHash = await bcrypt.hash(usuario.senhaPlana, BCRYPT_ROUNDS);

    if (usuarioExistente) {
      console.log(`⚠️  Usuário ${usuario.nome} já existe. Atualizando senha para "${usuario.senhaPlana}"...`);
      const { error } = await supabase
        .from('usuarios')
        .update({ senha_hash: senhaHash })
        .eq('id', usuarioExistente.id);

      if (error) throw new Error(error.message);
      console.log(`✅ Senha do ${usuario.nome} atualizada.`);
    } else {
      const { error } = await supabase
        .from('usuarios')
        .insert({
          nome: usuario.nome,
          email: usuario.email,
          senha_hash: senhaHash,
          perfil: usuario.perfil,
          ativo: true,
        });

      if (error) throw new Error(error.message);
      console.log(`✅ Usuário ${usuario.nome} criado com sucesso!`);
    }
  }

  console.log('');
  console.log('📋 Credenciais de acesso atualizadas:');
  for (const usuario of usuariosPadrao) {
    console.log(`   [${usuario.perfil}]`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Senha: ${usuario.senhaPlana}`);
    console.log('');
  }

  console.log('\n📦 Gerando pedidos de teste para o Lote de Entrega...');

  // 1. Criar um Cliente de Teste
  let clienteId;
  const { data: clienteExistente } = await supabase.from('clientes').select('id').limit(1).maybeSingle();
  if (clienteExistente) {
    clienteId = clienteExistente.id;
  } else {
    const { data: novoCliente, error: errC } = await supabase.from('clientes')
      .insert({ nome: 'Festa da Empresa SA', telefone: '11999999999', endereco: 'Av. Teste, 1000' })
      .select('id').single();
    if (errC) console.error('Erro Cliente:', errC);
    clienteId = novoCliente?.id;
  }

  // 2. Criar/Atualizar Produtos Base
  const produtosPadrao = [
    { nome: 'Coxinha', categoria: 'Salgados Fritos', preco: 1.20, ativo: true },
    { nome: 'Risole', categoria: 'Salgados Fritos', preco: 1.20, ativo: true },
    { nome: 'Pastel', categoria: 'Salgados Fritos', preco: 1.50, ativo: true },
    { nome: 'Empada de Frango', categoria: 'Salgados Assados', preco: 2.00, ativo: true },
    { nome: 'Esfiha de Carne', categoria: 'Salgados Assados', preco: 1.80, ativo: true },
    { nome: 'Bolinha de Queijo', categoria: 'Salgados Fritos', preco: 1.30, ativo: true },
    { nome: 'Kibe', categoria: 'Salgados Fritos', preco: 1.50, ativo: true },
    { nome: 'Enrolado de Salsicha', categoria: 'Salgados Assados', preco: 1.50, ativo: true },
    { nome: 'Mini Pizza', categoria: 'Salgados Assados', preco: 2.50, ativo: true },
    { nome: 'Churros', categoria: 'Doces', preco: 3.00, ativo: true },
  ];

  for (const prod of produtosPadrao) {
    const { data: existente } = await supabase
      .from('produtos')
      .select('id')
      .eq('nome', prod.nome)
      .maybeSingle();

    if (existente) {
      console.log(`⚠️  Produto "${prod.nome}" já existe (ID: ${existente.id}).`);
    } else {
      const { error: errP } = await supabase.from('produtos').insert(prod);
      if (errP) console.error(`Erro ao criar produto "${prod.nome}":`, errP.message);
      else console.log(`✅ Produto "${prod.nome}" criado (R$ ${prod.preco.toFixed(2)}).`);
    }
  }

  // Buscar o primeiro produto para os pedidos de teste
  let produtoId;
  const { data: primeiroProduto } = await supabase.from('produtos').select('id').limit(1).maybeSingle();
  produtoId = primeiroProduto?.id;

  // 3. Criar 3 Pedidos Prontos (Status 3), cada um com 350 salgados (Total = 1050 salgados)
  if (clienteId && produtoId) {
    for (let i = 1; i <= 3; i++) {
      const dataEntrega = new Date().toISOString(); // Hoje para aparecer nas rotas/entregas
      const { data: pedido, error: errPed } = await supabase.from('pedidos')
        .insert({
          cliente_id: clienteId,
          status: 3, // 3 = Pronto
          valor_total: 210.00,
          data_entrega: dataEntrega
        }).select('id').single();

      if (pedido) {
        await supabase.from('itens_pedido').insert({
          pedido_id: pedido.id,
          produto_id: produtoId,
          quantidade: 350, // 3 pedidos x 350 = 1050 salgados
          preco_unitario_snapshot: 0.60
        });
      }
    }
    console.log('✅ 3 Pedidos de grande volume criados com status "Pronto" (Total de 1050 itens).');
  }

  console.log('🌱 Seed finalizado!');
}

seed().catch((error) => {
  console.error('❌ Erro no seed:', error);
  process.exit(1);
});
