import crypto from 'crypto';

export function verifyTelegramWebAppData(telegramInitData: string, botToken: string): any {
  try {
    const initData = new URLSearchParams(telegramInitData);
    const hash = initData.get('hash');
    
    if (!hash) return null;

    let dataToCheck: string[] = [];
    initData.sort();
    initData.forEach((val, key) => {
      if (key !== 'hash') {
        dataToCheck.push(`${key}=${val}`);
      }
    });

    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken);
    const _hash = crypto.createHmac('sha256', secret.digest()).update(dataToCheck.join('\n')).digest('hex');

    if (hash === _hash) {
      const user = JSON.parse(initData.get('user') || '{}');
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying telegram data", error);
    return null;
  }
}
