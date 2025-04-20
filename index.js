const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const app = express();
require('dotenv').config();

// LINE bot 設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);
// LINE SDKのmiddlewareは、rawBodyが必要なので express.json() より先
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});
// JSON解析は /webhook 以外で必要な場合のみ使う
app.use(express.json());

// 各Webhook送信先
const GAS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbywYe3XO2E9evAcy8Gx7y66LVJWdgBA7Zq8uTyXVcDGYzm1cDyATFOmGUL7ymDrhQxXPQ/exec';
const MAKE_WEBHOOK = 'https://hook.us2.make.com/6cakpvfpaxcm6x7mx3l98ez7bmjtwuu6'; // ←差し替えて

// メイン処理
async function handleEvent(event) {
  if (!event.replyToken || event.replyToken.match(/^000000/)) {
    return;
  }

  // ✅ FAQボタン押下（postback：action=show_faq）
  if (event.type === 'postback' && event.postback.data === 'action=show_faq') {
    try {
      // Makeに通知
      await axios.post(MAKE_WEBHOOK, {
        replyToken: event.replyToken,
        userId: event.source.userId,
        timestamp: event.timestamp,
        action: 'show_faq_clicked'
      }, { headers: { 'Content-Type': 'application/json' } });

      // GASに通知（クイックリプライ返信用）
      await axios.post(GAS_WEBHOOK, {
        replyToken: event.replyToken
      });

      return;
    } catch (error) {
      console.error('FAQ処理エラー:', error);
    }
  }

  // ✅ ユーザーの自由入力（テキストメッセージ）
  if (event.type === 'message' && event.message.type === 'text') {
    try {
      await axios.post(MAKE_WEBHOOK, {
        replyToken: event.replyToken,
        userId: event.source.userId,
        timestamp: event.timestamp,
        messageText: event.message.text,
        action: 'user_message'
      }, { headers: { 'Content-Type': 'application/json' } });

      return;
    } catch (error) {
      console.error('自由入力処理エラー:', error);
    }
  }

  // その他のイベントは無視
  return Promise.resolve(null);
}

// 起動
const port = process.env.PORT || 1000;
app.listen(port, () => {
  console.log(`サーバーが起動しました：ポート ${port}`);
});