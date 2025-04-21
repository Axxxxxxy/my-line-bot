const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const app = express();
require('dotenv').config();

// Flexメッセージのデータを読み込み (flexMessages.jsonから)
const flexMessageData = require('./flexMessages.json');

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

// 商品カタログ表示用のエンドポイント追加
app.get('/show-products', async (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).send('ユーザーIDが必要です');
  }
  
  try {
    // ユーザーにプッシュメッセージとして商品カタログを送信
    await client.pushMessage(userId, {
      type: "flex",
      altText: "商品のご案内",
      contents: flexMessageData
    });
    res.send('商品カタログを送信しました');
  } catch (error) {
    console.error('商品カタログ送信エラー:', error);
    res.status(500).send('エラーが発生しました');
  }
});

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

  // ✅ 商品カタログの表示（postback: action=show_products）
  if (event.type === 'postback' && event.postback.data === 'action=show_products') {
    try {
      // 商品カタログを返信
      return client.replyMessage(event.replyToken, {
        type: "flex",
        altText: "商品のご案内",
        contents: flexMessageData
      });
    } catch (error) {
      console.error('商品カタログ表示エラー:', error);
    }
  }

  // ✅ テキストで「商品」というキーワードがあれば商品カタログを表示
  if (event.type === 'message' && event.message.type === 'text' && event.message.text.includes('商品')) {
    try {
      // 商品カタログを返信
      return client.replyMessage(event.replyToken, {
        type: "flex",
        altText: "商品のご案内",
        contents: flexMessageData
      });
    } catch (error) {
      console.error('商品カタログ表示エラー:', error);
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