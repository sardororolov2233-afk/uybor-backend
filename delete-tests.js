const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://njtcqsqviaraokedaaik.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdGNxc3F2aWFyYW9rZWRhYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY2NzcwNiwiZXhwIjoyMTA2MjQzNzA2fQ.eh_Hg2Xcc4pERDZawAbMCKi9tzgh5nYeaWsq_3r271Y'
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
