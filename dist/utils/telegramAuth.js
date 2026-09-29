"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramWebAppData = verifyTelegramWebAppData;
const crypto_1 = __importDefault(require("crypto"));
function verifyTelegramWebAppData(telegramInitData, botToken) {
    try {
        const initData = new URLSearchParams(telegramInitData);
        const hash = initData.get('hash');
        if (!hash)
            return null;
        let dataToCheck = [];
        initData.sort();
        initData.forEach((val, key) => {
            if (key !== 'hash') {
                dataToCheck.push(`${key}=${val}`);
            }
        });
        const secret = crypto_1.default.createHmac('sha256', 'WebAppData').update(botToken);
        const _hash = crypto_1.default.createHmac('sha256', secret.digest()).update(dataToCheck.join('\n')).digest('hex');
        if (hash === _hash) {
            const user = JSON.parse(initData.get('user') || '{}');
            return user;
        }
        return null;
    }
    catch (error) {
        console.error("Error verifying telegram data", error);
        return null;
    }
}
