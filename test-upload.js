const { createClient } = require('@supabase/supabase-js');
const { Buffer } = require('buffer');

const supabase = createClient(
  'https://njtcqsqviaraokedaaik.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdGNxc3F2aWFyYW9rZWRhYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY2NzcwNiwiZXhwIjoyMTA2MjQzNzA2fQ.eh_Hg2Xcc4pERDZawAbMCKi9tzgh5nYeaWsq_3r271Y'
);

async function testUpload() {
  const mimeType = 'image/png';
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = 'png';
  const fileName = `listings/test_${Date.now()}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('listing-images')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (uploadError) {
    console.error('Upload Error:', uploadError);
  } else {
    console.log('Upload Data:', uploadData);
    const { data: publicUrlData } = supabase.storage.from('listing-images').getPublicUrl(fileName);
    console.log('Public URL:', publicUrlData.publicUrl);
  }
}

testUpload();
