require('ts-node').register();
const { supabase } = require('./src/config/database');
supabase.from('produtos').select('*').then(res => {
  if (res.error) console.error(res.error);
  else {
    console.log('TOTAL PRODUTOS DB:', res.data.length);
    res.data.forEach(p => console.log('>', p.nome));
  }
});
