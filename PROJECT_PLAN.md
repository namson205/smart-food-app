# SmartFood App — Tài liệu Đồng bộ Kiến trúc & Phân công

> **Dành cho 2 thành viên nhóm** — Đọc kỹ toàn bộ file này trước khi code.  
> Cập nhật lần cuối: 2026-11-20

---

## 1. Tech Stack

| Hạng mục | Công nghệ |
|---|---|
| Framework | React Native + Expo (TypeScript) |
| Routing | Expo Router (file-based, `app/` dir) |
| UI Library | TamaGUI (Dark/Light mode, Responsive, Animation) |
| State Management | Redux Toolkit |
| HTTP Client | Axios (gọi Supabase REST API trực tiếp) |
| Backend / DB | Supabase (PostgreSQL, REST API) |
| AI | Google Gemini Flash (qua Axios) |
| Package Manager | npm (legacy-peer-deps=true trong .npmrc) |

---

## 2. Kiến trúc 3 Tầng (Layered Feature-based Architecture)

```
┌─────────────────────────────────────────────┐
│  TẦNG 1 — Presentation (app/)               │
│  Expo Router screens, TamaGUI components    │
├─────────────────────────────────────────────┤
│  TẦNG 2 — Business Logic (src/store/ + utils/)│
│  Redux Toolkit slices, pure functions       │
├─────────────────────────────────────────────┤
│  TẦNG 3 — Data / API (src/services/)        │
│  Axios client, Supabase REST, Gemini API    │
└─────────────────────────────────────────────┘
```

**Tại sao 3 tầng?**  
- Màn hình (Tầng 1) không gọi API trực tiếp → chỉ dispatch Redux actions.  
- Business logic (Tầng 2) thuần TypeScript, dễ test và giải thích.  
- API layer (Tầng 3) tập trung một chỗ, dễ đổi endpoint.

---

## 3. Cây thư mục đầy đủ

```
smartfood-app/
├── app/
│   ├── _layout.tsx               ← TamaGUI Provider + Redux Provider
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── onboarding.tsx        ← Nhập chỉ số + mục tiêu sau đăng ký
│   ├── (tabs)/
│   │   ├── _layout.tsx           ← Bottom Tab Navigator
│   │   ├── index.tsx             ← Dashboard (tiến độ thời gian thực)
│   │   ├── schedule.tsx          ← Thực đơn 7 ngày
│   │   ├── foods.tsx             ← Khám phá & tìm kiếm món
│   │   ├── ai-chat.tsx           ← Trợ lý AI Gemini
│   │   └── profile.tsx           ← Hồ sơ + bookmark + thống kê nhanh
│   ├── food/
│   │   └── [id].tsx              ← Chi tiết món ăn & công thức
│   └── analytics.tsx             ← Biểu đồ Ngày/Tuần/Tháng/Năm
│
├── src/
│   ├── types/
│   │   └── models.ts             ← Interface: User, Food, MealSchedule, SavedItem
│   ├── services/
│   │   ├── axiosClient.ts        ← Axios instance + Supabase headers
│   │   ├── foodService.ts        ← CRUD operations cho foods & schedules
│   │   └── geminiService.ts      ← Gọi Gemini Flash API
│   ├── store/
│   │   ├── index.ts              ← configureStore
│   │   ├── authSlice.ts          ← User state + BMR/TDEE
│   │   └── scheduleSlice.ts      ← Lịch 7 ngày + saved items
│   ├── utils/
│   │   └── nutritionCalculator.ts← BMR, TDEE, calo mục tiêu, tiến độ
│   └── components/
│       ├── FoodCard.tsx
│       ├── MealSlotCard.tsx
│       └── ProgressSummary.tsx
│
├── assets/
│   └── default-food.png          ← Ảnh fallback khi link Unsplash lỗi
├── supabase_setup.sql
├── PROJECT_PLAN.md               ← File này
└── .npmrc                        ← legacy-peer-deps=true
```

---

## 4. Database Schema (4 bảng Supabase)

### 4.1 Bảng `users`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| `id` | UUID PK | gen_random_uuid() |
| `email` | TEXT UNIQUE | |
| `password` | TEXT | plain text (demo) |
| `full_name` | TEXT | |
| `gender` | TEXT | 'MALE' hoặc 'FEMALE' |
| `age` | INTEGER | tuổi |
| `height` | NUMERIC | cm |
| `weight` | NUMERIC | kg |
| `activity_level` | NUMERIC | 1.2 / 1.375 / 1.55 / 1.725 / 1.9 |
| `goal_type` | TEXT | 'LOSE' / 'MAINTAIN' / 'GAIN' |
| `target_weight_change` | NUMERIC | kg muốn thay đổi (+ tăng, - giảm) |
| `target_weeks` | INTEGER | số tuần để đạt mục tiêu |
| `bmr` | NUMERIC | kcal/ngày (tính sau onboarding) |
| `tdee` | NUMERIC | kcal/ngày |
| `daily_calorie_target` | NUMERIC | kcal/ngày (TDEE +/- thâm hụt) |

### 4.2 Bảng `foods`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| `id` | UUID PK | |
| `name` | TEXT | tên món |
| `category` | TEXT | 'Món chính' / 'Món phụ' / 'Tráng miệng' / 'Nước uống' / 'Món ăn sáng' |
| `calories` | NUMERIC | kcal / 1 khẩu phần |
| `protein` | NUMERIC | gram |
| `carbs` | NUMERIC | gram |
| `fat` | NUMERIC | gram |
| `sugar` | NUMERIC | gram |
| `ingredients` | JSONB | `[{"name": string, "amount": string}]` |
| `instructions` | JSONB | `[string]` — mảng các bước nấu |
| `image_url` | TEXT | Unsplash URL |

### 4.3 Bảng `schedules`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| `id` | UUID PK | |
| `user_id` | UUID FK→users | |
| `day_of_week` | INTEGER | 2=Thứ 2, ..., 8=Chủ nhật |
| `meal_slot` | TEXT | 'MORNING' / 'LUNCH' / 'AFTERNOON' / 'DINNER' |
| `food_id` | UUID FK→foods | |
| `servings` | NUMERIC | số khẩu phần (default 1) |

### 4.4 Bảng `saved_items`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| `id` | UUID PK | |
| `user_id` | UUID FK→users | |
| `item_type` | TEXT | 'FOOD' hoặc 'SCHEDULE' |
| `food_id` | UUID nullable | khi item_type = 'FOOD' |
| `plan_title` | TEXT nullable | khi item_type = 'SCHEDULE' |
| `plan_snapshot` | JSONB nullable | snapshot lịch 7 ngày |

---

## 5. Business Rules & User Flows (ĐÃ CHỐT)

### 5.1 Mốc giờ 4 buổi (dùng cho Passive Tracking — Tính năng #5)

| Buổi | Mã | Bắt đầu | Kết thúc | % Calo mục tiêu |
|------|----|---------|---------|----------------|
| Sáng | MORNING | 06:00 | 10:00 | 25% |
| Trưa | LUNCH | 10:00 | 14:00 | 35% |
| Chiều | AFTERNOON | 14:00 | 18:00 | 10% |
| Tối | DINNER | 18:00 | 22:00 | 30% |

**Logic tính calo đã nạp theo giờ thực tế:**
```
Nếu giờ hiện tại > giờ KẾT THÚC buổi  → buổi đó: 100% calo nạp
Nếu giờ hiện tại trong giờ buổi        → tỷ lệ = (phút_đã_qua / 240) × 100%
Nếu giờ hiện tại < giờ BẮT ĐẦU buổi  → 0% (chưa đến giờ)
Nếu sau 22:00                           → 100% tất cả buổi
Nếu trước 06:00                         → 0% tất cả buổi
```

**Logic tính kg giảm dự kiến:**
```
kg_du_kien = tong_calo_tham_hut_luy_ke / 7700
Trong đó:
  tong_calo_tham_hut_luy_ke = (TDEE - calo_da_nap) × so_ngay_da_co_lich
```

### 5.2 Luồng User mới (New User Flow)

```
Mở app
  → Chưa có session?
      → (auth)/login.tsx
          → Chưa có tài khoản? → (auth)/register.tsx
              → Đăng ký thành công → (auth)/onboarding.tsx
                  → Nhập: giới tính, tuổi, chiều cao, cân nặng,
                           mức độ vận động, mục tiêu (LOSE/GAIN/MAINTAIN),
                           số kg muốn thay đổi, số tuần
                  → App tính BMR/TDEE/daily_calorie_target
                  → Gọi Gemini: tự động sinh lịch 7 ngày
                  → Lưu schedules vào Supabase
                  → Redirect → (tabs)/index.tsx (Dashboard)
  → Có session (AsyncStorage)?
      → Có schedules? → (tabs)/index.tsx
      → Chưa có schedules? → (auth)/onboarding.tsx
```

### 5.3 Công thức BMR (Mifflin-St Jeor — Tính năng #2)

```
Nam:   BMR = (10 × kg) + (6.25 × cm) - (5 × tuổi) + 5
Nữ:    BMR = (10 × kg) + (6.25 × cm) - (5 × tuổi) - 161
TDEE = BMR × activity_level
```

Hệ số vận động:
- 1.2   → Ít vận động (văn phòng, không tập)
- 1.375 → Nhẹ (tập 1-3 ngày/tuần)
- 1.55  → Trung bình (tập 3-5 ngày/tuần)
- 1.725 → Nhiều (tập 6-7 ngày/tuần)
- 1.9   → Vận động viên (tập 2 lần/ngày)

### 5.4 Tính Calo Mục tiêu & Cảnh báo (Tính năng #3)

```
1 kg mỡ = 7,700 kcal
thâm_hụt_mỗi_ngày = (target_weight_change × 7700) / (target_weeks × 7)
daily_calorie_target = TDEE - thâm_hụt_mỗi_ngày

CẢNH BÁO nếu |thâm_hụt_mỗi_ngày| > 1000 kcal/ngày
  → Hiển thị Alert: "Mức thâm hụt quá lớn! Khuyến nghị tối đa 1000 kcal/ngày"
```

**Tỷ lệ Calo theo buổi:**
- MORNING: 25% × daily_calorie_target
- LUNCH: 35% × daily_calorie_target
- AFTERNOON: 10% × daily_calorie_target
- DINNER: 30% × daily_calorie_target

### 5.5 Analytics — Tính on-the-fly (Tính năng #6)

Không cần bảng logs riêng. Tính dựa trên `schedules` hiện tại:
- **Hôm nay**: Tổng calo theo lịch × tiến độ buổi theo giờ thực tế
- **Tuần**: Trung bình calo 7 ngày trong lịch (day_of_week 2-8)
- **Tháng**: Lịch 7 ngày × 4.33 tuần (coi lịch lặp lại mỗi tuần)
- **Năm**: Lịch 7 ngày × 52 tuần

### 5.6 AI Recommendation Prompt Template (Tính năng #7)

```json
{
  "role": "user",
  "content": "Tôi cần thực đơn 7 ngày (Thứ 2 đến Chủ nhật).\n
  Mục tiêu calo mỗi ngày: {dailyCalorieTarget} kcal.\n
  Mục tiêu: {goalType} (LOSE=giảm cân, GAIN=tăng cân, MAINTAIN=duy trì).\n
  Danh sách món ăn có sẵn (JSON): {availableFoods}\n
  Hãy trả về JSON theo format: {\"2\": {\"MORNING\": \"<food_id>\", \"LUNCH\": \"<food_id>\", \"AFTERNOON\": \"<food_id>\", \"DINNER\": \"<food_id>\"}, \"3\": {...}, ...\"8\": {...}}\n
  Chỉ trả về JSON thuần, không giải thích."
}
```

**Fallback nếu Gemini lỗi:**  
Tự động chọn món ngẫu nhiên từ DB, ưu tiên món có calo gần với % mục tiêu từng buổi.

### 5.7 Authentication (Tính năng #1)

| Action | Axios call |
|--------|-----------|
| Đăng ký | `POST /users` với body `{email, password, full_name, gender, age, height, weight}` |
| Đăng nhập | `GET /users?email=eq.{email}&password=eq.{password}&select=*` |
| Session | Lưu `user.id` và `user` object vào Redux + AsyncStorage |
| Logout | Xóa AsyncStorage, reset Redux state |

---

## 6. Danh sách 11 Chức năng & Màn hình tương ứng

| # | Chức năng | Màn hình | File |
|---|-----------|---------|------|
| 1 | Đăng nhập / Đăng ký | Login, Register | `(auth)/login.tsx`, `(auth)/register.tsx` |
| 2 | Onboarding & Tính chỉ số | Onboarding | `(auth)/onboarding.tsx` |
| 3 | Thiết lập mục tiêu + tạo lịch tự động | Onboarding (step 2) | `(auth)/onboarding.tsx` |
| 4 | Thực đơn 7 ngày | Schedule | `(tabs)/schedule.tsx` |
| 5 | Theo dõi tiến độ thời gian thực | Dashboard | `(tabs)/index.tsx` |
| 6 | Thống kê Analytics | Analytics | `analytics.tsx` |
| 7 | Gợi ý AI & Tư vấn dinh dưỡng | AI Chat | `(tabs)/ai-chat.tsx` |
| 8 | Tìm kiếm & Bộ lọc | Foods | `(tabs)/foods.tsx` |
| 9 | Chi tiết món ăn & Công thức | Food Detail | `food/[id].tsx` |
| 10 | Lưu trữ cá nhân (Bookmark) | Profile | `(tabs)/profile.tsx` |
| 11 | CRUD thực đơn + Chatbot AI | Schedule + AI Chat | `(tabs)/schedule.tsx`, `(tabs)/ai-chat.tsx` |

---

## 7. TypeScript Interfaces (src/types/models.ts)

```typescript
// User — khớp 1-1 với bảng users trên Supabase
interface User {
  id: string;
  email: string;
  password: string;
  full_name: string;
  gender: 'MALE' | 'FEMALE';
  age: number;
  height: number;         // cm
  weight: number;         // kg
  activity_level: number; // 1.2 | 1.375 | 1.55 | 1.725 | 1.9
  goal_type: 'LOSE' | 'MAINTAIN' | 'GAIN';
  target_weight_change: number; // kg
  target_weeks: number;
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
  created_at?: string;
}

// Food — khớp 1-1 với bảng foods trên Supabase
interface Food {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  ingredients: Ingredient[];
  instructions: string[];
  image_url: string | null;
  created_at?: string;
}

// Ingredient — element trong mảng ingredients của Food
interface Ingredient {
  name: string;
  amount: string;
}

// MealSchedule — khớp 1-1 với bảng schedules trên Supabase
interface MealSchedule {
  id: string;
  user_id: string;
  day_of_week: number; // 2-8
  meal_slot: 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'DINNER';
  food_id: string;
  servings: number;
  created_at?: string;
  // Populated via JOIN (không có trong DB, tự add khi fetch)
  food?: Food;
}

// SavedItem — khớp 1-1 với bảng saved_items trên Supabase
interface SavedItem {
  id: string;
  user_id: string;
  item_type: 'FOOD' | 'SCHEDULE';
  food_id: string | null;
  plan_title: string | null;
  plan_snapshot: WeeklyScheduleSnapshot | null;
  created_at?: string;
  // Populated
  food?: Food;
}

// WeeklyScheduleSnapshot — cấu trúc của plan_snapshot trong saved_items
// Key: day_of_week (string "2"-"8")
type WeeklyScheduleSnapshot = {
  [dayOfWeek: string]: {
    MORNING?: Food;
    LUNCH?: Food;
    AFTERNOON?: Food;
    DINNER?: Food;
  };
};

// NutritionResult — kết quả tính toán từ nutritionCalculator.ts
interface NutritionResult {
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  dailyDeficit: number;    // âm = thâm hụt, dương = dư thừa
  isWarning: boolean;      // true nếu |dailyDeficit| > 1000
  projectedWeightChange: number; // kg sau target_weeks
}

// MealTimeWindow — mốc giờ của từng buổi
interface MealTimeWindow {
  slot: 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'DINNER';
  startHour: number;
  endHour: number;
  caloriePct: number; // 0.25, 0.35, 0.10, 0.30
}

// DailyProgress — kết quả Passive Tracking
interface DailyProgress {
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  consumedSugar: number;
  targetCalories: number;
  progressPct: number;         // 0-100
  projectedWeightLoss: number; // kg tích lũy (giá trị dương = đã giảm)
  completedSlots: string[];    // ['MORNING', 'LUNCH']
}
```

---

## 8. Phân công File cho 2 Thành viên

### Thành viên A — Backend & Core Logic

| File | Nhiệm vụ |
|------|---------|
| `src/types/models.ts` | Định nghĩa toàn bộ interfaces |
| `src/services/axiosClient.ts` | Cấu hình Axios + Supabase headers |
| `src/services/foodService.ts` | CRUD: foods, schedules, saved_items |
| `src/services/geminiService.ts` | Gọi Gemini Flash API |
| `src/utils/nutritionCalculator.ts` | BMR, TDEE, Passive Tracking |
| `src/store/index.ts` | Redux store config |
| `src/store/authSlice.ts` | Auth state + thunks |
| `src/store/scheduleSlice.ts` | Schedule state + thunks |
| `supabase_setup.sql` | Chạy SQL trên Supabase dashboard |

### Thành viên B — UI & Screens

| File | Nhiệm vụ |
|------|---------|
| `app/_layout.tsx` | Root layout: TamaGUI + Redux Provider |
| `app/(auth)/_layout.tsx` | Auth stack layout |
| `app/(auth)/login.tsx` | Màn hình đăng nhập |
| `app/(auth)/register.tsx` | Màn hình đăng ký |
| `app/(auth)/onboarding.tsx` | Nhập chỉ số + mục tiêu |
| `app/(tabs)/_layout.tsx` | Tab bar config |
| `app/(tabs)/index.tsx` | Dashboard (tiến độ) |
| `app/(tabs)/schedule.tsx` | Lịch 7 ngày |
| `app/(tabs)/foods.tsx` | Khám phá & tìm kiếm |
| `app/(tabs)/ai-chat.tsx` | Chatbot AI |
| `app/(tabs)/profile.tsx` | Hồ sơ & bookmark |
| `app/food/[id].tsx` | Chi tiết món ăn |
| `app/analytics.tsx` | Biểu đồ thống kê |
| `src/components/FoodCard.tsx` | Card món ăn |
| `src/components/MealSlotCard.tsx` | Card buổi ăn |
| `src/components/ProgressSummary.tsx` | Tóm tắt tiến độ |

---

## 9. Environment Variables (.env)

Tạo file `.env` ở thư mục gốc (không commit lên Git):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

Truy cập trong code: `process.env.EXPO_PUBLIC_SUPABASE_URL`  
> **Lưu ý:** Thêm `.env` vào `.gitignore` trước khi push!

---

## 10. Git Workflow cho 2 Thành viên

```bash
# Thành viên A làm core logic
git checkout -b feature/core-logic
# ... code xong ...
git add src/types src/services src/utils src/store
git commit -m "feat: add core logic - types, services, store, utils"
git push origin feature/core-logic

# Thành viên B làm UI
git checkout -b feature/ui-screens
# ... code xong ...
git add app/ src/components/
git commit -m "feat: add all screens and UI components"
git push origin feature/ui-screens

# Merge vào main (do team leader)
git checkout main
git merge feature/core-logic
git merge feature/ui-screens  # ít conflict vì tách file rõ ràng
```

---

*Tài liệu này được đồng bộ với code bởi AI Agent. Mọi thay đổi kiến trúc phải cập nhật vào file này trước.*
