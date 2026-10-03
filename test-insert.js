require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  // get a random user
  const { data: users, error: userErr } = await supabase.from('users').select('id').limit(1);
  if (userErr || !users || users.length === 0) {
    console.error('No users found', userErr);
    return;
  }
  const user_id = users[0].id;
  
  const payload = {
    user_id,
    title: 'Test',
    description: 'Test',
    price: 1000,
    currency: 'USD',
    category: 'SALE',
    property_type: 'APARTMENT',
    rooms: 1,
    area: 50,
    address: 'Test',
    images: []
  };

  const { data, error } = await supabase.from('listings').insert(payload).select();
  console.log('Result:', { data, error });
}

testInsert();
