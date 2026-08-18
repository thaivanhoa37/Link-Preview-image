// api/create.js — POST /api/create
// Nhận dữ liệu từ Dashboard, lưu vào Upstash Redis, trả về short URL

import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";

// Khởi tạo Redis client từ Environment Variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // Chỉ chấp nhận POST
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const { targetUrl, imageUrl, title, description, fakeDomain } = req.body;

    // Validate bắt buộc
    if (!targetUrl || !imageUrl || !title) {
      return res.status(400).json({
        error: "Thiếu trường bắt buộc: targetUrl, imageUrl, title.",
      });
    }

    // Validate URL format
    try {
      new URL(targetUrl);
      new URL(imageUrl);
    } catch {
      return res
        .status(400)
        .json({ error: "targetUrl hoặc imageUrl không phải URL hợp lệ." });
    }

    // Validate fakeDomain nếu có (chỉ nhận tên miền, không nhận path nguy hiểm)
    let cleanFakeDomain = "";
    if (fakeDomain && fakeDomain.trim()) {
      cleanFakeDomain = fakeDomain.trim().replace(/^https?:\/\//, "").split("/")[0];
    }

    // Tạo slug ngẫu nhiên 6 ký tự (URL-safe)
    const slug = nanoid(6);
    const key = `link:${slug}`;

    // Dữ liệu lưu trữ
    const linkData = {
      targetUrl: targetUrl.trim(),
      imageUrl: imageUrl.trim(),
      title: title.trim(),
      description: (description || "").trim(),
      fakeDomain: cleanFakeDomain,
      createdAt: new Date().toISOString(),
    };

    // Lưu vĩnh viễn vào Redis (không có TTL)
    await redis.set(key, JSON.stringify(linkData));

    // Xây dựng short URL
    const host = req.headers.host || req.headers["x-forwarded-host"];
    const protocol =
      req.headers["x-forwarded-proto"] ||
      (host.includes("localhost") ? "http" : "https");
    const shortUrl = `${protocol}://${host}/s/${slug}`;

    return res.status(201).json({
      success: true,
      slug,
      shortUrl,
      debuggerUrl: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(shortUrl)}`,
    });
  } catch (err) {
    console.error("[create.js] Error:", err);
    return res.status(500).json({
      error: "Lỗi máy chủ. Kiểm tra biến môi trường Redis.",
      detail: err.message,
    });
  }
}
