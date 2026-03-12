const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://axrxjmuderxyhtroluih.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cnhqbXVkZXJ4eWh0cm9sdWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTQ4NDMxOTMsImV4cCI6MTk3MDQxOTE5M30.bU9A9Xo5RzPtz0Hk_O657zU7Ym0aR7wG_E--Z7B0lWY');
supabase.from('produtos').select('*').then(res => {
  console.log('TOTAL:', res.data.length);
  res.data.forEach(p => console.log(p.nome));
});
