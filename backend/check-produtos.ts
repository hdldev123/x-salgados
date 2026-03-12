import { supabase } from './src/config/database';

async function main() {
  const { data, count, error } = await supabase
    .from('produtos')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('ERRO:', error.message);
    process.exit(1);
  }

  console.log(`\nTOTAL DE PRODUTOS NO BANCO: ${count}\n`);
  for (const p of (data || [])) {
    console.log(`  [${p.id}] ${p.nome} | cat: ${p.categoria} | preco: ${p.preco} | ativo: ${p.ativo}`);
  }

  // Simular paginação default
  const { data: pag, count: cPag } = await supabase
    .from('produtos')
    .select('*', { count: 'exact' })
    .order('categoria', { ascending: true })
    .order('nome', { ascending: true })
    .range(0, 9);

  console.log(`\nPAGINAÇÃO DEFAULT (range 0-9): ${pag?.length} retornados de ${cPag} total\n`);
  process.exit(0);
}

main();
