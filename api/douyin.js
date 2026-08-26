// api/douyin.js — POST /api/douyin
// Hỗ trợ tải thông tin & video từ Douyin/TikTok qua nhiều cổng fallback

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "Thiếu link video Douyin / TikTok." });
    }

    const rawInput = url.trim();

    // 1. Nếu người dùng dán trực tiếp link file video (.mp4, .webm, cdn video)
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(rawInput) || rawInput.includes("douyinvod.com") || rawInput.includes("tiktokcdn.com")) {
      return res.status(200).json({
        success: true,
        videoUrl: rawInput,
        title: "Video tải trực tiếp",
        author: "User",
        thumbnail: "",
        duration: 30,
        suggestedHashtags: ["reels", "viral", "trending", "fyp"],
        platform: "direct",
      });
    }

    // 2. Thử cổng TikWM API (Hỗ trợ TikTok và một số định dạng Douyin)
    try {
      const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(rawInput)}`;
      const tikwmRes = await fetch(tikwmUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (tikwmRes.ok) {
        const json = await tikwmRes.json();
        if (json && json.code === 0 && json.data) {
          const d = json.data;
          const videoUrl = d.play || d.wmplay || d.hdplay;
          const title = d.title || "";
          const thumbnail = d.cover || d.origin_cover;
          const author = d.author?.nickname || d.author?.unique_id || "";
          const duration = d.duration || 0;

          return res.status(200).json({
            success: true,
            videoUrl,
            title,
            author,
            thumbnail,
            duration,
            suggestedHashtags: generateHashtags(title),
            platform: "tiktok",
          });
        }
      }
    } catch (e) {
      console.warn("[douyin.js] TikWM fallback failed:", e.message);
    }

    // 3. Thử cổng douyin.wtf API
    try {
      const wtfUrl = `https://douyin.wtf/api/hybrid/video_data?url=${encodeURIComponent(rawInput)}&minimal=false`;
      const wtfRes = await fetch(wtfUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (wtfRes.ok) {
        const json = await wtfRes.json();
        const data = json?.data || json;
        let noWatermarkUrl = data?.nwm_video_url || data?.video?.play_addr?.url_list?.[0] || data?.nwm_video_url_HQ || data?.video_data?.nwm_video_url;

        if (noWatermarkUrl) {
          const title = data.desc || data.title || "";
          const thumbnail = data.video?.cover?.url_list?.[0] || data.cover || "";
          const author = data.author?.nickname || "";
          const duration = data.video?.duration ? Math.round(data.video.duration / 1000) : 0;

          return res.status(200).json({
            success: true,
            videoUrl: noWatermarkUrl,
            title,
            author,
            thumbnail,
            duration,
            suggestedHashtags: generateHashtags(title),
            platform: "douyin",
          });
        }
      }
    } catch (e) {
      console.warn("[douyin.js] Douyin.wtf fallback failed:", e.message);
    }

    // 4. Nếu các cổng tự động đều bị giới hạn bởi hệ thống bảo vệ của Douyin:
    // Trả về thông báo hướng dẫn rõ ràng kèm chế độ chọn file video trực tiếp
    return res.status(422).json({
      error: "Hệ thống bảo mật của Douyin hiện đang chặn kết nối tự động.",
      tip: "Bạn có thể: 1) Tải video Douyin về máy rồi bấm 'Tải lên video từ máy' ở bên dưới để dùng full tính năng Lồng tiếng & Dịch phụ đề, hoặc 2) Thử link TikTok khác.",
    });
  } catch (err) {
    console.error("[douyin.js] Server Error:", err);
    return res.status(500).json({
      error: "Lỗi máy chủ khi kết nối đến dịch vụ video.",
      detail: err.message,
    });
  }
}

function generateHashtags(title = "") {
  const hashtags = new Set(["reels", "viral", "trending", "fyp", "xuhuong"]);
  const existingTags = title.match(/#[\w\u00C0-\u024F\u4e00-\u9fff]+/g) || [];
  existingTags.forEach((tag) => {
    const clean = tag.replace("#", "").toLowerCase();
    if (clean.length > 1 && clean.length < 30) hashtags.add(clean);
  });

  const lower = title.toLowerCase();
  if (/makeup|beauty|làm đẹp|trang điểm|skincare|mỹ phẩm/.test(lower)) {
    ["makeup", "beauty", "lamdep", "goclamdep"].forEach((t) => hashtags.add(t));
  }
  if (/ẩm thực|nấu ăn|món ngon|food|cooking|ăn uống/.test(lower)) {
    ["food", "monngon", "amthuc", "cooking"].forEach((t) => hashtags.add(t));
  }
  if (/thời trang|outfit|quần áo|phối đồ|fashion/.test(lower)) {
    ["fashion", "thoitrang", "outfit", "ootd"].forEach((t) => hashtags.add(t));
  }
  if (/hài|hài hước|vui|cười|funny|troll/.test(lower)) {
    ["haihuoc", "funny", "giaitri", "cuoivobung"].forEach((t) => hashtags.add(t));
  }
  if (/mẹo|tips|hack|review|chia sẻ|hướng dẫn/.test(lower)) {
    ["meovat", "review", "chiase", "huongdan"].forEach((t) => hashtags.add(t));
  }

  return Array.from(hashtags).slice(0, 15);
}
