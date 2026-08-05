export async function sendTelegramNotification(message: string, customBotToken?: string, customChatId?: string): Promise<boolean> {
  const botToken = customBotToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8983135896:AAFPPlz1ohjYvFbPSkbtDA81Qb-Zk451cFs';
  const chatId = customChatId || import.meta.env.VITE_TELEGRAM_CHAT_ID || '-5123687990';

  if (!botToken || !chatId) {
    console.warn('Telegram bot token or chat ID is missing.');
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Telegram notification', await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}
