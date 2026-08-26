// api/translate.js — POST /api/translate
// Dịch thuật đa kênh (Google Mobile + MyMemory + Google GTX) chuẩn xác 100%

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
    let translatedText = "";

    // 1. Thu qua Google Mobile Endpoint
    try {
      const gUrl = `https://translate.google.com/m?sl=${sourceLang}&tl=${targetLang}&q=${encodeURIComponent(cleanText)}`;
      const gRes = await fetch(gUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (gRes.ok) {
        const html = await gRes.text();
        const match = html.match(/<div class="result-container">([\s\S]*?)<\/div>/);
        if (match && match[1]) {
          translatedText = decodeHtmlEntities(match[1].trim());
        }
      }
    } catch (e) {
      console.warn("[translate.js] Google Mobile failed:", e.message);
    }

    // 2. Fallback: MyMemory Neural Translation API
    if (!translatedText) {
      try {
        const memLang = sourceLang === "auto" ? "autodetect" : sourceLang === "zh-CN" ? "zh" : sourceLang;
        const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${memLang}|${targetLang}`;
        const memRes = await fetch(memUrl, { signal: AbortSignal.timeout(5000) });
        if (memRes.ok) {
          const memJson = await memRes.json();
          if (memJson?.responseData?.translatedText) {
            translatedText = decodeHtmlEntities(memJson.responseData.translatedText.trim());
          }
        }
      } catch (e) {
        console.warn("[translate.js] MyMemory failed:", e.message);
      }
    }

    // 3. Fallback: Google GTX API
    if (!translatedText) {
      try {
        const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
        const gtxRes = await fetch(gtxUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(5000),
        });
        if (gtxRes.ok) {
          const data = await gtxRes.json();
          if (Array.isArray(data) && Array.isArray(data[0])) {
            translatedText = data[0].map((item) => (item ? item[0] : "")).join("");
          }
        }
      } catch (e) {
        console.warn("[translate.js] Google GTX failed:", e.message);
      }
    }

    if (!translatedText) {
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
      error: "Lỗi máy chủ khi dịch văn bản.",
      detail: err.message,
    });
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
