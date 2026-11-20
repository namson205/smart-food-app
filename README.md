<div align="center">

# 🥗 SmartFood

**Ứng dụng Tư vấn Dinh dưỡng, Lập Lịch Trình Ăn Uống & Theo Dõi Calo Khoa Học**

[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TamaGUI](https://img.shields.io/badge/TamaGUI-3.3-FF6B6B)](https://tamagui.dev)
[![Supabase](https://img.shields.io/badge/Supabase-REST%20API-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Redux](https://img.shields.io/badge/Redux%20Toolkit-2.x-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org)

<img src="assets/icon.png" alt="SmartFood Logo" width="120" height="120" style="border-radius: 24px;" />

> *"Ăn đúng cách — Sống khỏe mỗi ngày"*

</div>

---

## 📖 Giới thiệu

**SmartFood** là ứng dụng di động thông minh giúp người dùng:
- 🎯 **Thiết lập mục tiêu** cân nặng dựa trên chỉ số cơ thể (BMR, TDEE)
- 🗓️ **Lập thực đơn 7 ngày** tự động bằng AI hoặc tùy chỉnh thủ công
- 📊 **Theo dõi calo thụ động** (Passive Tracking) — không cần bấm tick thủ công
- 🤖 **Tư vấn dinh dưỡng** qua chatbot Google Gemini AI
- 📈 **Thống kê khoa học** theo Ngày / Tuần / Tháng / Năm

Ứng dụng hướng đến người Việt Nam với kho dữ liệu **20+ món ăn truyền thống** kèm thông tin dinh dưỡng đầy đủ.

---

## ✨ Tính năng (11 chức năng)

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 1 | 🔐 **Đăng ký / Đăng nhập** | Tạo tài khoản, đăng nhập, lưu session |
| 2 | 📋 **Onboarding & Tính chỉ số** | Nhập thông số → tính BMR, TDEE, calo mục tiêu |
| 3 | 🎯 **Thiết lập mục tiêu cân nặng** | Nhập kg muốn giảm/tăng + số tuần → tạo lộ trình tự động |
| 4 | 🗓️ **Thực đơn 7 ngày** | Xem và quản lý lịch Sáng/Trưa/Chiều/Tối cho Thứ 2 → Chủ nhật |
| 5 | ⏱️ **Theo dõi tiến độ thời gian thực** | Tự động tính calo & kg dự kiến giảm theo giờ hiện tại |
| 6 | 📊 **Thống kê Analytics** | Biểu đồ calo, protein, carbs, fat theo Ngày/Tuần/Tháng/Năm |
| 7 | 🤖 **AI Gợi ý thực đơn** | Gemini tự động tạo lịch 7 ngày theo mục tiêu |
| 8 | 🔍 **Tìm kiếm & Bộ lọc** | Tìm theo tên, lọc theo khoảng calo, danh mục |
| 9 | 🍜 **Chi tiết món ăn** | Ảnh, bảng dinh dưỡng, nguyên liệu, công thức nấu |
| 10 | 🔖 **Lưu trữ cá nhân** | Bookmark món ăn hoặc cả lịch 7 ngày |
| 11 | 💬 **Chatbot AI Dinh dưỡng** | Hỏi đáp tự do với Gemini về dinh dưỡng & thực đơn |

---

## 🛠️ Tech Stack

| Hạng mục | Công nghệ | Lý do chọn |
|----------|-----------|------------|
| **Framework** | React Native + Expo SDK 58 | Cross-platform iOS/Android, dễ build & deploy |
| **Ngôn ngữ** | TypeScript 6.0 | Type-safe, tránh bug runtime |
| **Routing** | Expo Router (file-based) | Navigation khai báo qua cây thư mục `app/` |
| **UI Library** | TamaGUI 3.3 | Dark/Light mode, Responsive, Animation sẵn có |
| **State Management** | Redux Toolkit 2.x | Quản lý state toàn cục, DevTools |
| **HTTP Client** | Axios 1.x | Gọi Supabase REST API & Gemini API |
| **Backend / Database** | Supabase (PostgreSQL) | REST API chuẩn PostgREST, không cần server riêng |
| **AI** | Google Gemini Flash | Tư vấn dinh dưỡng, tạo thực đơn thông minh |
| **Icons** | @tamagui/lucide-icons | Bộ icon đồng bộ với TamaGUI |

---

## 📱 Màn hình (10–14 screens)

```
(auth) Stack
├── login.tsx          — Đăng nhập
├── register.tsx       — Đăng ký
└── onboarding.tsx     — Nhập chỉ số + mục tiêu (2 bước)

(tabs) Bottom Navigation
├── index.tsx          — 🏠 Dashboard (tiến độ hôm nay)
├── schedule.tsx       — 🗓️  Thực đơn 7 ngày
├── foods.tsx          — 🍜 Khám phá & tìm kiếm món
├── ai-chat.tsx        — 🤖 Trợ lý AI
└── profile.tsx        — 👤 Hồ sơ & bookmark

Standalone Screens
├── food/[id].tsx      — Chi tiết món ăn & công thức
└── analytics.tsx      — Biểu đồ thống kê
```

---

## 🗃️ Database Schema (Supabase)

```
users          — Thông tin người dùng & chỉ số dinh dưỡng (BMR, TDEE, mục tiêu)
foods          — Kho món ăn Việt Nam (calo, protein, carbs, fat, nguyên liệu, công thức)
schedules      — Thực đơn 7 ngày của user (user_id × day_of_week × meal_slot × food_id)
saved_items    — Bookmark món ăn hoặc snapshot lịch 7 ngày
```

> RLS (Row Level Security) đã tắt để gọi trực tiếp qua Axios với `apikey` header.

---

## 🏗️ Kiến trúc 3 Tầng

```
┌─────────────────────────────────────────────────────┐
│  TẦNG 1 — Presentation (app/)                       │
│  Expo Router Screens + TamaGUI Components           │
├─────────────────────────────────────────────────────┤
│  TẦNG 2 — Business Logic (src/store/ + src/utils/)  │
│  Redux Toolkit Slices + Pure Functions              │
├─────────────────────────────────────────────────────┤
│  TẦNG 3 — Data Layer (src/services/)                │
│  Axios Client + Supabase REST + Gemini API          │
└─────────────────────────────────────────────────────┘
```

**Nguyên tắc:**
- Màn hình **không gọi API trực tiếp** → chỉ dispatch Redux actions
- Business logic là **pure functions** → không có side effect, dễ giải thích
- API layer **tập trung một chỗ** → dễ bảo trì và debug

---

## 📂 Cấu trúc thư mục

```
smartfood-app/
├── app/                          # Tầng 1: Màn hình & Điều hướng (Expo Router)
│   ├── _layout.tsx               # Root: TamaGUI Provider + Redux Provider
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Dashboard
│   │   ├── schedule.tsx
│   │   ├── foods.tsx
│   │   ├── ai-chat.tsx
│   │   └── profile.tsx
│   ├── food/[id].tsx             # Dynamic route: chi tiết món ăn
│   └── analytics.tsx
│
├── src/
│   ├── types/
│   │   └── models.ts             # TypeScript interfaces (User, Food, MealSchedule...)
│   ├── services/
│   │   ├── axiosClient.ts        # Axios instances (Supabase + Gemini)
│   │   ├── foodService.ts        # CRUD: foods, schedules, saved_items
│   │   └── geminiService.ts      # AI: tạo lịch, chatbot, gợi ý món
│   ├── store/
│   │   ├── index.ts              # Redux store config
│   │   ├── authSlice.ts          # Auth state + BMR/TDEE
│   │   └── scheduleSlice.ts      # Lịch 7 ngày + saved items
│   ├── utils/
│   │   └── nutritionCalculator.ts # BMR, TDEE, Passive Tracking, Analytics
│   └── components/
│       ├── FoodCard.tsx
│       ├── MealSlotCard.tsx
│       └── ProgressSummary.tsx
│
├── assets/
│   └── default-food.png          # Ảnh fallback khi link Unsplash lỗi
├── supabase_setup.sql            # SQL script khởi tạo DB + 20 món mẫu
├── PROJECT_PLAN.md               # Kiến trúc + phân công cho 2 thành viên
└── .npmrc                        # legacy-peer-deps=true (tránh lỗi trên Windows)
```

---

## ⚙️ Hướng dẫn Cài đặt & Chạy

### Yêu cầu
- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`)
- Tài khoản [Supabase](https://supabase.com) (miễn phí)
- Gemini API Key từ [Google AI Studio](https://aistudio.google.com) (miễn phí)

### 1. Clone repository
```bash
git clone https://github.com/namson205/smart-food-app.git
cd smart-food-app
```

### 2. Cài dependencies
```bash
npm install
```

### 3. Khởi tạo Database Supabase
1. Tạo project mới trên [supabase.com](https://supabase.com)
2. Vào **SQL Editor** → paste toàn bộ nội dung file `supabase_setup.sql` → **Run**
3. Vào **Settings → API** → copy `Project URL` và `anon public key`

### 4. Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

> ⚠️ **Không commit file `.env` lên GitHub!** (đã có trong `.gitignore`)

### 5. Chạy ứng dụng
```bash
npm start          # Expo Dev Server
npm run android    # Android
npm run ios        # iOS (cần macOS)
```

Quét QR code bằng **Expo Go** trên điện thoại thật để xem ứng dụng.

---

## 🧮 Công thức Dinh dưỡng

### BMR — Mifflin-St Jeor
```
Nam: BMR = (10 × kg) + (6.25 × cm) - (5 × tuổi) + 5
Nữ: BMR = (10 × kg) + (6.25 × cm) - (5 × tuổi) - 161
```

### TDEE
```
TDEE = BMR × Hệ số vận động
  1.2   → Ít vận động
  1.375 → Nhẹ (1-3 ngày/tuần)
  1.55  → Trung bình (3-5 ngày/tuần)
  1.725 → Nhiều (6-7 ngày/tuần)
  1.9   → Rất nhiều (vận động viên)
```

### Mục tiêu calo & cảnh báo
```
Thâm hụt/ngày = (kg_mục_tiêu × 7700) / (số_tuần × 7)
Calo mục tiêu = TDEE - Thâm hụt/ngày
⚠️ Cảnh báo nếu |Thâm hụt| > 1,000 kcal/ngày
```

### Passive Tracking (mốc giờ)
| Buổi | Giờ | % Calo |
|------|-----|--------|
| 🌅 Sáng | 06:00 – 10:00 | 25% |
| ☀️ Trưa | 10:00 – 14:00 | 35% |
| 🌤️ Chiều | 14:00 – 18:00 | 10% |
| 🌙 Tối | 18:00 – 22:00 | 30% |

---

## 👥 Thành viên nhóm 

Trần Nam Sơn - 23651831
Lại Minh Quân

---

## 📄 License

MIT License — Dự án học thuật, môn **Lập trình Di động**.

---
