// api/translate.js — POST /api/translate
// Dịch thuật văn bản tự động sang tiếng Việt chuẩn xác

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const { text, sourceLang = "auto", targetLang = "vi" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Thiếu văn bản cần dịch." });
    }

    const cleanText = text.trim();

    // Dịch qua Google Translate Web Endpoint (miễn phí, nhanh, độ chính xác cao)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Dịch thất bại với status code: ${response.status}`);
    }

    const data = await response.json();
    let translatedText = "";

    if (Array.isArray(data) && Array.isArray(data[0])) {
      translatedText = data[0].map((item) => (item ? item[0] : "")).join("");
    } else {
      translatedText = cleanText;
    }

    return res.status(200).json({
      success: true,
      originalText: cleanText,
      translatedText: translatedText.trim(),
      sourceLang,
      targetLang,
    });
  } catch (err) {
    console.error("[translate.js] Error:", err);
    return res.status(500).json({
      error: "Lỗi khi dịch văn bản.",
      detail: err.message,
    });
  }
}
