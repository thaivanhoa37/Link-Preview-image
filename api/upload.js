// api/upload.js — POST /api/upload
// Nhận ảnh đã cắt (base64 JPEG) từ client, upload lên imgBB, trả về URL công khai
//
// Setup: Thêm biến môi trường IMGBB_API_KEY vào Vercel
// Lấy key miễn phí tại: https://api.imgbb.com/

import FormData from "form-data";

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Thiếu biến môi trường IMGBB_API_KEY. Hãy tạo tài khoản tại https://imgbb.com và lấy API key.",
    });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "Thiếu trường imageData (base64)." });
    }

    // Tách phần base64 thuần (bỏ "data:image/jpeg;base64," prefix)
    const base64 = imageData.includes(",")
      ? imageData.split(",")[1]
      : imageData;

    // Giới hạn kích thước: ~8MB base64 string ≈ ~6MB ảnh gốc
    const MAX_BASE64_LEN = 8 * 1024 * 1024;
    if (base64.length > MAX_BASE64_LEN) {
      return res.status(400).json({
        error: "Ảnh quá lớn. Vui lòng chọn ảnh dưới 6MB.",
      });
    }

    // Gọi imgBB API bằng native fetch (Node 18+)
    const form = new URLSearchParams();
    form.append("key", apiKey);
    form.append("image", base64);
    form.append("name", `og_${Date.now()}`);
    // Lưu vĩnh viễn (không đặt expiration)

    const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const imgbbData = await imgbbRes.json();

    if (!imgbbRes.ok || !imgbbData.success) {
      console.error("[upload.js] imgBB error:", imgbbData);
      return res.status(502).json({
        error: "imgBB từ chối upload. Kiểm tra lại IMGBB_API_KEY.",
        detail: imgbbData?.error?.message || JSON.stringify(imgbbData),
      });
    }

    const { url, display_url, thumb } = imgbbData.data;

    return res.status(200).json({
      success: true,
      // url: direct link (permanent, public)
      url,
      displayUrl: display_url,
      thumbUrl: thumb?.url || display_url,
    });
  } catch (err) {
    console.error("[upload.js] Error:", err);
    return res.status(500).json({
      error: "Lỗi máy chủ khi upload ảnh.",
      detail: err.message,
    });
  }
}
