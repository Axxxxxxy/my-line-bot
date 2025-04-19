// 必要な道具を持ってくる
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const app = express();

// LINEボットの秘密の鍵を設定する
// あとでここに自分の鍵を入れるよ
const config = {
  channelAccessToken: 'nRggOpbPZ6ieHRjZNgROx+erc+dyXc5//iNknXfKGMqdRiGK2SzYjRAH/82YesDtA6VkZq3nXHutnv0WNC6DqK9yw9JMf2jl5qhca8t2MkcuvupnfkrtY9z8m4geSfGJ0zelnhSG9VXW1yYd61u1GgdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071e03582ee1954711512992614333be'
};

// LINEとおしゃべりするための電話みたいなもの
const client = new line.Client(config);

// LINEからのメッセージを受け取る入り口
app.post('/webhook', line.middleware(config), (req, res) => {
  // 届いたメッセージを全部処理する
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// メッセージを処理する係
async function handleEvent(event) {
      // FAQボタンのpostbackを受け取ったとき、GASにreplyTokenを送る
  if (event.type === 'postback' && event.postback.data === 'action=show_faq') {
    const GAS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbywYe3XO2E9evAcy8Gx7y66LVJWdgBA7Zq8uTyXVcDGYzm1cDyATFOmGUL7ymDrhQxXPQ/exec'; // ← あなたのGAS URLに変更
    const MAKE_WEBHOOK = 'https://hook.us2.make.com/6cakpvfpaxcm6x7mx3l98ez7bmjtwuu6'; // ← あなたのMake URLに差し替えて
    try {
      // GASに送る
      await axios.post(GAS_WEBHOOK, {
        replyToken: event.replyToken
      });
  
      await axios.post(
        MAKE_WEBHOOK,
        JSON.stringify({
          replyToken: event.replyToken,
          userId: event.source.userId,
          timestamp: event.timestamp,
          action: 'show_faq_clicked'
        }),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      return; // ここで処理を終える
    } catch (error) {
      console.error('Webhook送信エラー:', error);
    }
  }
  // 「FAQ」ボタンが押されたとき
  if (event.type === 'postback' && event.postback.data === 'show_faq') {
    // 「よくある質問」のボタンを3つ表示する
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'どのようなことでお困りですか？',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '支払い方法',
              text: '支払い方法'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message', 
              label: '返品ポリシー',
              text: '返品ポリシー'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '配達日数',
              text: '配達日数'
            }
          }
        ]
      }
    });
  }
  
  // 普通のメッセージが来たとき
  if (event.type === 'message' && event.message.type === 'text') {
    try {
      // メッセージをそのまま返す（あとでDifyと連携するよ）
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `「${event.message.text}」についてのお問い合わせですね。詳しくご説明します。`
      });
    } catch (error) {
      console.error('Error:', error);
      // エラーが起きたときのメッセージ
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'エラーが発生しました。しばらく経ってからもう一度お試しください。'
      });
    }
  }
  
  // その他のメッセージには何もしない
  return Promise.resolve(null);
}

// サーバーを起動する
const port = process.env.PORT || 1000;
app.listen(port, () => {
  console.log(`サーバーが起動しました：ポート ${port}`);
});