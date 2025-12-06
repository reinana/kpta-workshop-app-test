// api/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // POST 以外は拒否
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    let prompt;

    // ① まず req.body から読んでみる（Next.js / Vercel が JSON パースしてくれている場合）
    if (req.body) {
      if (typeof req.body === "string") {
        try {
          const parsed = JSON.parse(req.body);
          prompt = parsed.prompt;
        } catch (_) {}
      } else if (typeof req.body === "object") {
        prompt = req.body.prompt;
      }
    }

    // ② まだ prompt が無ければ、自分でストリームから読む（Node の素の Serverless Function の場合）
    if (!prompt) {
      let bodyString = "";
      for await (const chunk of req) {
        bodyString += chunk;
      }
      if (bodyString) {
        const parsed = JSON.parse(bodyString);
        prompt = parsed.prompt;
      }
    }

    if (!prompt) {
      // ここで 400 を返していたので、今までこのルートに来ていたはず
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    // Gemini クライアント
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-001",
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.status(200).json({ text });
  } catch (err) {
    console.error("[/api/gemini] error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
