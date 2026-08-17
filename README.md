# 🚀 Dynamic Open Graph Link Shortener

Ứng dụng web rút gọn link xem trước động (Dynamic OG Link Shortener), hỗ trợ upload & cắt ảnh trực tiếp, tự động tối ưu tỉ lệ ảnh hiển thị lớn (1.91:1) trên **Facebook**, **Instagram**, và **Threads**.

---

## 🌟 Tính năng nổi bật

- ✂️ **Upload & Cắt ảnh trực tiếp**: Hỗ trợ kéo thả ảnh (JPG, PNG, WEBP), xoay, lật, cắt tự do hoặc khóa tỉ lệ chuẩn 1.91:1 (1200×630px).
- ☁️ **Lưu trữ ảnh miễn phí vĩnh viễn**: Tự động lưu ảnh đã cắt lên **imgBB CDN**.
- ⚡ **Lưu trữ dữ liệu vĩnh viễn**: Sử dụng **Upstash Redis** miễn phí.
- 🤖 **Serverless SSR & Bot Detection**: Tự động phân biệt Facebook Bot (để trả OG Meta Tags) và người dùng thực (chuyển hướng 302 ngay lập tức đến link gốc).
- 👁️ **Live Preview 3 Nền tảng**: Mô phỏng trực quan khung hiển thị bài đăng trên **Facebook** (ảnh lớn + icon `i`), **Instagram**, và **Threads**.
- 📋 **Sao chép 1-Click & Lịch sử**: Lưu lịch sử tạo link trên trình duyệt (`localStorage`) và liên kết kiểm tra nhanh qua **Facebook Debugger**.

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: HTML5, Vanilla CSS, TailwindCSS (CDN), Cropper.js
- **Backend / Serverless**: Vercel Serverless Functions (Node.js)
- **Database**: Upstash Redis (REST API)
- **Image Hosting**: imgBB API

---

## 📋 Yêu cầu biến môi trường (Environment Variables)

Cần thiết lập 3 biến môi trường sau trên **Vercel** hoặc file `.env.local` khi chạy local:

| Tên biến | Mô tả | Cách lấy |
| --- | --- | --- |
| `IMGBB_API_KEY` | Key gọi API upload ảnh lên imgBB | Đăng ký tại [imgbb.com](https://imgbb.com) → Lấy key tại [api.imgbb.com](https://api.imgbb.com) |
| `UPSTASH_REDIS_REST_URL` | URL kết nối database Upstash Redis | Đăng ký tại [upstash.com](https://upstash.com) → Tạo DB (Redis) → Copy URL ở tab REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Token xác thực Upstash Redis | Copy Token ở tab REST API trong Upstash Dashboard |

---

## 🚀 Hướng dẫn Cài đặt & Deploy

### 1. Chạy trên máy cục bộ (Local Development)

1. **Clone dự án hoặc mở thư mục code**:
   ```bash
   cd "Link Preview image"
   ```

2. **Cài đặt các gói phụ thuộc**:
   ```bash
   npm install
   ```

3. **Tạo file môi trường `.env.local`**:
   Sao chép file `.env.example` thành `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Điền đầy đủ 3 giá trị `IMGBB_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` vào file `.env.local`.

4. **Khởi chạy Vercel Dev**:
   ```bash
   npx vercel dev
   ```
   Mở trình duyệt truy cập: `http://localhost:3000`

---

### 2. Deploy trực tiếp lên Vercel (Miễn phí)

1. Push mã nguồn dự án lên kho chứa **GitHub**.
2. Truy cập [vercel.com/new](https://vercel.com/new) và chọn Import repository GitHub của bạn.
3. Ở phần **Environment Variables**, thêm 3 biến môi trường đã chuẩn bị ở trên.
4. Nhấn **Deploy**. Sau 1-2 phút, dự án sẽ có domain dạng `https://your-project.vercel.app`.

---

## 📋 Hướng dẫn Đăng bài Facebook (Xóa link chữ vẫn giữ ảnh lớn)

1. Nhập thông tin, upload ảnh và tạo link rút gọn từ ứng dụng.
2. Sao chép đường dẫn ngắn được tạo (ví dụ: `https://your-domain.vercel.app/x7k9p2`).
3. Dán đường dẫn vào ô soạn bài viết của Facebook/Threads và **chờ khung preview hiển thị ảnh lớn**.
4. **Xóa đường dẫn chữ trong ô soạn thảo** — khung preview ảnh vẫn được giữ nguyên.
5. Viết caption tùy ý và nhấn **Đăng**.

---

## 📁 Cấu trúc thư mục dự án

```text
├── api/
│   ├── create.js      # API tạo slug và lưu dữ liệu vào Redis
│   ├── preview.js     # SSR kiểm tra Bot / Chuyển hướng người dùng
│   └── upload.js      # API nhận base64 & upload ảnh lên imgBB CDN
├── public/
│   └── index.html     # Giao diện chính (Dashboard, Cropper, Live Preview)
├── .env.example       # Template mẫu biến môi trường
├── .gitignore         # Danh sách file bỏ qua khi commit Git
├── package.json       # Danh sách phụ thuộc Node.js
├── README.md          # Tài liệu hướng dẫn sử dụng
└── vercel.json        # Cấu hình routing & rewrites cho Vercel
```
