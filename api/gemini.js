// api/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // POST 以外は拒否
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // --- リクエストボディの取得 ---
    // Vercelは自動的にreq.bodyをパースしてくれますが、念のため文字列の場合も考慮します。
    // 以前の複雑なストリーム読み込み処理は削除し、Vercelの標準機能に任せます。
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // bodyが空の場合のガード
    const { prompt } = body || {};

    if (!prompt) {
      console.error("Error: Prompt is missing in the request body.", body);
      return res.status(400).json({ error: "prompt is required" });
    }

    // --- APIキー確認 ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return res
        .status(500)
        .json({ error: "Server config error: GEMINI_API_KEY is missing" });
    }

    // --- Gemini SDK 呼び出し ---
    const genAI = new GoogleGenerativeAI(apiKey);
    // 指定されたモデルを使用
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-001",
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // --- フロントに返す ---
    return res.status(200).json({ text });
  } catch (err) {
    console.error("Gemini handler error:", err);
    // エラーの詳細をログに残しつつ、クライアントには500を返す
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}