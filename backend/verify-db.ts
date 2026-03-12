import { supabase } from './src/config/database';
async function main() {
  const { data, count } = await supabase.from('produtos').select('*', { count: 'exact' });
  console.log(`TOTAL PRODUTOS: ${count}`);
  for (const p of (data || [])) console.log(`  [${p.id}] ${p.nome} | ${p.categoria} | R$${p.preco} | ativo=${p.ativo}`);
  
  const { count: cClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
  console.log(`\nTOTAL CLIENTES: ${cClientes}`);
  
  const { count: cPedidos } = await supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('status', 6);
  console.log(`PEDIDOS CANCELADOS (status=6): ${cPedidos}`);
  
  process.exit(0);
}
main();
