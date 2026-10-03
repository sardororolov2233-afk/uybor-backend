require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteTestListings() {
  const { data, error } = await supabase.from('listings').delete().eq('title', 'Test');
  if (error) {
    console.error('Error deleting test listings:', error);
  } else {
    console.log('Successfully deleted test listings.');
  }
}

deleteTestListings();
