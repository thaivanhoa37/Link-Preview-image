// api/preview.js — GET /api/preview?id=<slug>  (routed via /s/:id)
// Phân biệt Bot Crawler và người dùng thật để phục vụ OG tags hoặc redirect

import { Redis } from "@upstash/redis";

// Khởi tạo Redis client từ Environment Variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Danh sách User-Agent của các Bot crawler mạng xã hội / messenger
const CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "telegrambot",
  "zalobot",
  "instagram",
  "threads",
  "whatsapp",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "vkshare",
  "msnbot",
  "skypeuripreview",
  "bingpreview",
];

/**
 * Kiểm tra xem User-Agent có phải Bot crawler không
 * @param {string} ua - User-Agent string
 * @returns {boolean}
 */
function isCrawler(ua = "") {
  const lowerUa = ua.toLowerCase();
  return CRAWLER_PATTERNS.some((pattern) => lowerUa.includes(pattern));
}

/**
 * Escape HTML để tránh XSS khi nhúng dữ liệu vào thẻ meta
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Tạo trang HTML cho BOT với đầy đủ OG meta tags
 */
function buildBotHtml({ title, description, imageUrl, shortUrl, targetUrl, fakeDomain }) {
  const safeTitle = escapeHtml(title);
  const safeDesc  = escapeHtml(description || title);
  const safeImage = escapeHtml(imageUrl);
  const safeUrl   = escapeHtml(shortUrl);

  // ── ẨN DOMAIN ──────────────────────────────────────────────────────────────
  // og:url quyết định domain hiển thị trên Facebook (dòng nhỏ bên dưới ảnh).
  // • Nếu có fakeDomain → dùng https://fakeDomain làm og:url
  // • Nếu không → dùng targetUrl để Facebook hiện domain đích (ví dụ facebook.com)
  //   thay vì domain Vercel của chúng ta.
  let displayUrl = safeUrl; // fallback
  if (fakeDomain && fakeDomain.trim()) {
    try {
      const fd = fakeDomain.trim().replace(/^https?:\/\//, "").split("/")[0];
      displayUrl = escapeHtml(`https://${fd}`);
    } catch {}
  } else if (targetUrl) {
    try {
      // Dùng origin của targetUrl làm og:url → Facebook chỉ hiện domain đích
      const u = new URL(targetUrl);
      displayUrl = escapeHtml(u.origin);
    } catch {}
  }

  // og:site_name để trống hoặc dùng domain đích (không để lộ "Link Preview")
  let siteName = "";
  if (fakeDomain && fakeDomain.trim()) {
    siteName = escapeHtml(fakeDomain.trim().replace(/^https?:\/\//, "").split("/")[0]);
  } else if (targetUrl) {
    try { siteName = escapeHtml(new URL(targetUrl).hostname); } catch {}
  }

  return `<!DOCTYPE html>
<html lang="vi" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Canonical: trỏ đến displayUrl để ẩn domain thật -->
  <link rel="canonical" href="${displayUrl}" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph (Facebook / Threads / Zalo / LinkedIn) -->
  <meta property="og:type"               content="website" />
  <!-- og:url = displayUrl → Facebook hiện domain này, KHÔNG phải domain Vercel -->
  <meta property="og:url"                content="${displayUrl}" />
  <meta property="og:title"              content="${safeTitle}" />
  <meta property="og:description"        content="${safeDesc}" />
  <meta property="og:image"              content="${safeImage}" />
  <meta property="og:image:type"         content="image/jpeg" />
  <meta property="og:image:width"        content="1200" />
  <meta property="og:image:height"       content="630" />
  <meta property="og:locale"             content="vi_VN" />
  ${siteName ? `<meta property="og:site_name" content="${siteName}" />` : "<!-- og:site_name ẩn -->"}

  <!-- Twitter Card (X / Telegram preview) -->
  <meta name="twitter:card"              content="summary_large_image" />
  <meta name="twitter:title"             content="${safeTitle}" />
  <meta name="twitter:description"       content="${safeDesc}" />
  <meta name="twitter:image"             content="${safeImage}" />

  <!-- WhatsApp / iMessage -->
  <meta itemprop="name"                  content="${safeTitle}" />
  <meta itemprop="description"           content="${safeDesc}" />
  <meta itemprop="image"                 content="${safeImage}" />
</head>
<body>
  <p>${safeTitle}</p>
</body>
</html>`;
}

/**
 * Tạo trang HTML redirect tức thì cho người dùng thật
 */
function buildUserRedirectHtml({ targetUrl, title }) {
  const safeTarget = escapeHtml(targetUrl);
  const safeTitle = escapeHtml(title || "Đang chuyển hướng...");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="0; url=${safeTarget}" />
  <title>${safeTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #fff;
    }
    .box {
      text-align: center;
      padding: 2rem;
      animation: fadeIn 0.4s ease;
    }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid rgba(255,255,255,0.2);
      border-top-color: #a78bfa;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    h1 { font-size: 1.2rem; font-weight: 500; margin-bottom: 0.5rem; color: #e2e8f0; }
    p  { font-size: 0.85rem; color: #94a3b8; }
    a  { color: #a78bfa; text-decoration: underline; }
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h1>Đang chuyển hướng…</h1>
    <p>Nếu không tự động chuyển, <a href="${safeTarget}">nhấp vào đây</a>.</p>
  </div>
  <script>
    (function () {
      try { window.location.replace("${targetUrl.replace(/"/g, '\\"')}"); }
      catch (e) { window.location.href = "${targetUrl.replace(/"/g, '\\"')}"; }
    })();
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing slug parameter.");
  }

  // Lấy dữ liệu từ Redis
  let linkData;
  try {
    const raw = await redis.get(`link:${id}`);
    if (!raw) {
      return res
        .status(404)
        .send(
          `<h1>404 — Link không tồn tại hoặc đã bị xóa.</h1><p>Slug: <code>${escapeHtml(id)}</code></p>`
        );
    }
    linkData = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error("[preview.js] Redis error:", err);
    return res.status(500).send("Lỗi máy chủ khi truy xuất dữ liệu.");
  }

  const { targetUrl, imageUrl, title, description, fakeDomain } = linkData;

  // Xây dựng short URL hiện tại
  const host =
    req.headers.host ||
    req.headers["x-forwarded-host"] ||
    "localhost:3000";
  const protocol =
    req.headers["x-forwarded-proto"] ||
    (host.includes("localhost") ? "http" : "https");
  const shortUrl = `${protocol}://${host}/s/${id}`;

  const ua = req.headers["user-agent"] || "";
  const bot = isCrawler(ua);

  // Thiết lập header cache: Bot không cache lâu, người dùng redirect thẳng
  if (bot) {
    // Cho phép cache OG tags trong 60 giây (đủ để Facebook lấy nhưng vẫn cập nhật được)
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(
      buildBotHtml({ title, description, imageUrl, shortUrl, targetUrl, fakeDomain })
    );
  } else {
    // Người dùng thật: không cache, redirect ngay
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(
      buildUserRedirectHtml({ targetUrl, title })
    );
  }
}
