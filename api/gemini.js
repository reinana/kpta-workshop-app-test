// api/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // POST 以外は拒否
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // --- リクエストボディの取得（環境によって req.body があったり無かったりするので両方対応） ---
    let body = {};

    if (req.body) {
      // vercel dev など、すでに body がパースされている場合
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } else {
      // 本番の Serverless Function など、ストリームから読む場合
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const bodyString = Buffer.concat(chunks).toString();
      body = bodyString ? JSON.parse(bodyString) : {};
    }

    const { prompt } = body;

    if (!prompt) {
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-001",
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // --- フロントに返す ---
    return res.status(200).json({ text });
  } catch (err) {
    console.error("Gemini handler error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
