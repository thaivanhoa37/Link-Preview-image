// api/douyin.js — POST /api/douyin
// Nhận link Douyin, trả về metadata + link video không watermark
// Sử dụng API công khai douyin.wtf (open-source)

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "Thiếu trường url (link video Douyin)." });
    }

    const videoUrl = url.trim();

    // Validate: phải là link Douyin hoặc TikTok
    const isDouyin = /douyin\.com|iesdouyin\.com/i.test(videoUrl);
    const isTikTok = /tiktok\.com/i.test(videoUrl);

    if (!isDouyin && !isTikTok) {
      return res.status(400).json({
        error: "Link không hợp lệ. Vui lòng dán link từ Douyin hoặc TikTok.",
      });
    }

    // Gọi API douyin.wtf để lấy metadata video
    const apiUrl = `https://api.douyin.wtf/api/hybrid/video_data?url=${encodeURIComponent(videoUrl)}`;

    const apiRes = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!apiRes.ok) {
      console.error("[douyin.js] API error status:", apiRes.status);
      return res.status(502).json({
        error: "Không thể kết nối API tải video. Vui lòng thử lại sau.",
        detail: `Status: ${apiRes.status}`,
      });
    }

    const apiData = await apiRes.json();

    if (!apiData || apiData.status === "failed") {
      return res.status(404).json({
        error: "Không tìm thấy video. Kiểm tra lại link Douyin.",
        detail: apiData?.message || "Video not found",
      });
    }

    // Parse dữ liệu trả về
    const data = apiData.data || apiData;

    // Lấy URL video không watermark
    let noWatermarkUrl = "";
    if (data.nwm_video_url) {
      noWatermarkUrl = data.nwm_video_url;
    } else if (data.video?.play_addr?.url_list?.length) {
      noWatermarkUrl = data.video.play_addr.url_list[0];
    } else if (data.nwm_video_url_HQ) {
      noWatermarkUrl = data.nwm_video_url_HQ;
    } else if (data.video_data?.nwm_video_url) {
      noWatermarkUrl = data.video_data.nwm_video_url;
    } else if (data.video_data?.nwm_video_url_HQ) {
      noWatermarkUrl = data.video_data.nwm_video_url_HQ;
    }

    // Lấy tiêu đề gốc
    const title = data.desc || data.title || data.share_info?.share_title || "";

    // Lấy thumbnail
    let thumbnail = "";
    if (data.video?.cover?.url_list?.length) {
      thumbnail = data.video.cover.url_list[0];
    } else if (data.cover || data.origin_cover) {
      thumbnail = data.cover || data.origin_cover;
    } else if (data.video_data?.cover) {
      thumbnail = data.video_data.cover;
    }

    // Lấy thông tin tác giả
    const author = data.author?.nickname || data.author?.unique_id || "";

    // Lấy thời lượng video (giây)
    const duration = data.video?.duration
      ? Math.round(data.video.duration / 1000)
      : data.duration || 0;

    // Tự động gợi ý hashtag tiếng Việt
    const suggestedHashtags = generateHashtags(title, data);

    return res.status(200).json({
      success: true,
      videoUrl: noWatermarkUrl,
      title,
      author,
      thumbnail,
      duration,
      suggestedHashtags,
      platform: isDouyin ? "douyin" : "tiktok",
    });
  } catch (err) {
    console.error("[douyin.js] Error:", err);
    return res.status(500).json({
      error: "Lỗi máy chủ khi xử lý video.",
      detail: err.message,
    });
  }
}

/**
 * Tự động gợi ý hashtag dựa trên nội dung video
 */
function generateHashtags(title, data) {
  const hashtags = new Set();

  // Hashtag mặc định cho Reels
  hashtags.add("viral");
  hashtags.add("reels");
  hashtags.add("fyp");
  hashtags.add("trending");

  // Trích xuất hashtag từ tiêu đề gốc
  const existingTags = title.match(/#[\w\u00C0-\u024F\u4e00-\u9fff]+/g) || [];
  existingTags.forEach((tag) => {
    const clean = tag.replace("#", "").toLowerCase();
    if (clean.length > 1 && clean.length < 30) {
      hashtags.add(clean);
    }
  });

  // Phân tích nội dung để gợi ý thêm
  const lowerTitle = (title || "").toLowerCase();

  const categoryMap = {
    // Làm đẹp
    "化妆|美妆|妆容|makeup|skincare|护肤|面膜|口红|眼影": ["makeup", "beauty", "lamdep", "trangdiem"],
    // Ẩm thực
    "美食|做饭|cooking|recipe|烹饪|food|吃|菜|饭|面|汤": ["food", "cooking", "amthuc", "monngon"],
    // Thời trang
    "穿搭|时尚|fashion|outfit|衣服|裙|dress|style": ["fashion", "thoitrang", "ootd", "style"],
    // Hài hước
    "搞笑|funny|humor|笑|段子|joke": ["funny", "haihuoc", "comedy"],
    // Nhảy / Dance
    "舞蹈|dance|dancing|choreography|跳舞": ["dance", "nhay", "dancer"],
    // Fitness / Gym
    "健身|gym|workout|exercise|运动|fit": ["fitness", "gym", "workout", "tapgym"],
    // Pet / Thú cưng
    "宠物|pet|cat|dog|猫|狗|动物": ["pet", "thucung", "cute"],
    // Du lịch
    "旅行|travel|旅游|景点|trip": ["travel", "dulich", "explore"],
    // Âm nhạc
    "音乐|music|唱歌|sing|song": ["music", "amnhac"],
    // DIY / Mẹo vặt
    "手工|diy|craft|hack|life|mẹo": ["diy", "meovat", "lifehack"],
  };

  for (const [patterns, tags] of Object.entries(categoryMap)) {
    const regex = new RegExp(patterns, "i");
    if (regex.test(lowerTitle)) {
      tags.forEach((t) => hashtags.add(t));
    }
  }

  // Giới hạn 15 hashtag
  return Array.from(hashtags).slice(0, 15);
}
