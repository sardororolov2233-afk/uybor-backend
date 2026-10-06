const fs = require('fs');
let content = fs.readFileSync('src/index.ts', 'utf8');

const regex = /bot\.start\(\(ctx\) => \{\s*ctx\.reply\(\s*"Uybor ga xush kelibsiz! [^"]+"\s*\+\s*"E'lonlarni ko'rish uchun quyidagi tugmani bosing\.",\s*\{\s*parse_mode: 'HTML',\s*\.\.\.Markup\.inlineKeyboard\(\[\s*Markup\.button\.webApp\('Uybor ni ochish', process\.env\.FRONTEND_URL \|\| 'https:\/\/frontend-gules-tau-81\.vercel\.app'\)\s*\]\)\s*\}\s*\);\s*\}\);/m;

const newCode = `bot.start((ctx) => {
  const payload = ctx.payload;
  let url = process.env.FRONTEND_URL || 'https://frontend-gules-tau-81.vercel.app';
  if (payload && payload.startsWith('listing_')) {
    const listingId = payload.replace('listing_', '');
    url = \`\${url}/listing/\${listingId}\`;
  }
  
  ctx.reply(
    "Uybor ga xush kelibsiz! 🏡\\nE'lonlarni ko'rish uchun quyidagi tugmani bosing.",
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        Markup.button.webApp('Uybor ni ochish', url)
      ])
    }
  );
});

bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  if (!query || !query.startsWith('listing_')) return;

  try {
    const listingId = query.replace('listing_', '');
    const { supabase } = await import('./utils/supabase');
    const { data: listing } = await supabase.from('listings').select('*, users(username, phone_number)').eq('id', listingId).single();
    
    if (listing) {
      const priceStr = listing.price ? \`\${listing.price.toLocaleString()} \${listing.currency || 'y.e'}\` : '';
      let text = \`🏠 <b>\${listing.title}</b>\\n💰 Narxi: \${priceStr}\\n\\n\`;
      text += \`📍 Manzil: \${listing.address || 'Ko\\'rsatilmagan'}\\n\`;
      text += \`🚪 Xonalar: \${listing.rooms}\\n\`;
      if (listing.area) text += \`📐 Maydon: \${listing.area} m²\\n\`;
      text += \`\\nBatafsil ma'lumot uchun ilovani oching:\`;
      
      const hasImage = listing.images && listing.images.length > 0;
      const thumbUrl = hasImage ? listing.images[0] : 'https://placehold.co/600x400/png?text=UyBor';
      
      const replyMarkup = {
        inline_keyboard: [[
           { text: '👁 E\\'lonni ko\\'rish', url: \`https://t.me/UyBorN1_bot?startapp=listing_\${listing.id}\` }
        ]]
      };

      if (hasImage) {
        await ctx.answerInlineQuery([{
          type: 'photo',
          id: listing.id.toString(),
          photo_url: thumbUrl,
          thumbnail_url: thumbUrl,
          title: listing.title,
          caption: text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        }], { cache_time: 0 });
      } else {
        await ctx.answerInlineQuery([{
          type: 'article',
          id: listing.id.toString(),
          title: listing.title,
          description: \`\${priceStr} • \${listing.address || 'Manzil ko\\'rsatilmagan'}\`,
          thumbnail_url: thumbUrl,
          input_message_content: {
            message_text: text,
            parse_mode: 'HTML'
          },
          reply_markup: replyMarkup
        }], { cache_time: 0 });
      }
    }
  } catch (error) {
    console.error('Inline query error:', error);
  }
});`;

if (regex.test(content)) {
  content = content.replace(regex, newCode);
  fs.writeFileSync('src/index.ts', content);
  console.log('Replaced successfully');
} else {
  console.log('Regex did not match!');
}
