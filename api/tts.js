// api/tts.js — POST /api/tts
// Lồng tiếng AI tiếng Việt chất lượng cao (Microsoft Edge Neural TTS)
// Trả về audio/mp3 base64 + mảng phụ đề timing (WordBoundary)

import { EdgeTTS } from "edge-tts-universal";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const {
      text,
      voice = "vi-VN-HoaiMyNeural", // vi-VN-HoaiMyNeural (Nữ), vi-VN-NamMinhNeural (Nam)
      rate = "+0%",                  // vd: "+10%", "-10%"
      pitch = "+0Hz",                // vd: "+2Hz", "-2Hz"
      volume = "+0%"
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Thiếu văn bản cần lồng tiếng." });
    }

    const cleanText = text.trim();

    // Khởi tạo Edge TTS
    const tts = new EdgeTTS(cleanText, voice, {
      rate: rate.startsWith("+") || rate.startsWith("-") ? rate : `+${rate}`,
      pitch: pitch.startsWith("+") || pitch.startsWith("-") ? pitch : `+${pitch}`,
      volume: volume.startsWith("+") || volume.startsWith("-") ? volume : `+${volume}`,
    });

    const result = await tts.synthesize();

    if (!result || !result.audio) {
      throw new Error("Không tạo được dữ liệu âm thanh từ TTS.");
    }

    const arrayBuffer = await result.audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString("base64");

    // Xử lý subtitles / word boundaries
    // offset và duration tính bằng 100ns (ticks). 1s = 10,000,000 ticks
    const subtitles = (result.subtitle || []).map((sub) => ({
      text: sub.text,
      startSeconds: sub.offset ? sub.offset / 10000000 : 0,
      durationSeconds: sub.duration ? sub.duration / 10000000 : 0,
      endSeconds: (sub.offset && sub.duration) ? (sub.offset + sub.duration) / 10000000 : 0,
    }));

    return res.status(200).json({
      success: true,
      audioData: `data:audio/mp3;base64,${audioBase64}`,
      voice,
      subtitles,
      text: cleanText,
    });
  } catch (err) {
    console.error("[tts.js] Error:", err);
    return res.status(500).json({
      error: "Lỗi khi tạo giọng đọc lồng tiếng AI.",
      detail: err.message,
    });
  }
}
