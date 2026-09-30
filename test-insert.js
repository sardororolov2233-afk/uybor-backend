const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://njtcqsqviaraokedaaik.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdGNxc3F2aWFyYW9rZWRhYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY2NzcwNiwiZXhwIjoyMTA2MjQzNzA2fQ.eh_Hg2Xcc4pERDZawAbMCKi9tzgh5nYeaWsq_3r271Y'
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
