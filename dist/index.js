"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Main API Routes
app.use('/api', api_1.default);
// --- Telegraf Bot Setup ---
const botToken = process.env.BOT_TOKEN || 'dummy_token_for_dev';
const bot = new telegraf_1.Telegraf(botToken);
bot.start((ctx) => {
    ctx.reply('Uybor ga xush kelibsiz! 🏠\nE\'lonlarni ko\'rish uchun quyidagi tugmani bosing.', telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.webApp('Uybor ni ochish', 'https://frontend-gules-tau-81.vercel.app')
    ]));
});
bot.launch().then(() => {
    console.log('Telegraf bot launched successfully.');
}).catch(err => {
    console.log('Telegraf bot launch failed (likely due to dummy token):', err.message);
});
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
// --- Start Express Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express API is running on port ${PORT}`);
});
