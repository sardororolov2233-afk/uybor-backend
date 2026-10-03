require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Buffer } = require('buffer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
