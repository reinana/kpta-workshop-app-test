// api/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS対応（念のため）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONSリクエスト（プレフライト）はすぐに返す
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST以外は拒否
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;

    // req.body が空、または読み取れていない場合、手動でストリームから読み込む
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        try {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString();
            if (rawBody) {
                body = JSON.parse(rawBody);
            }
        } catch (readError) {
            console.warn("Manual body read failed:", readError);
        }
    }

    // 文字列で来ている場合はJSONパースを試みる
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch (e) {
            // パース失敗
        }
    }

    // デバッグ用：bodyの中身を確認するためのガード
    const { prompt } = body || {};

    if (!prompt) {
      console.error("Payload Error. Received body:", body);
      // フロントエンドの「ネットワーク」タブで詳細が見えるように返します
      return res.status(400).json({ 
          error: "prompt is required", 
          debug_received_body: body,
          debug_type: typeof body
      });
    }

    // --- APIキー確認 ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
    }

    // --- Gemini SDK 呼び出し ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-001" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Gemini handler error:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}