const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/uybor/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase.from('listings').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || {}));
}
main();
