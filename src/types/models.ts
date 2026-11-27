/**
 * models.ts — Hợp đồng dữ liệu (Type Contracts) dùng chung cho toàn bộ dự án
 *
 * File này định nghĩa TypeScript interfaces khớp 1-1 với schema Supabase.
 * Mọi component, service, và slice đều import từ đây để đảm bảo nhất quán.
 *
 * Thành viên A viết file này; Thành viên B import và dùng.
 */

// ============================================================
// CORE ENTITIES (khớp 1-1 với bảng Supabase)
// ============================================================

/**
 * Profile — Thông tin người dùng & chỉ số dinh dưỡng
 * Khớp với bảng `profiles` trên Supabase
 */
export interface Profile {
  id: string;             // UUID từ Supabase Auth
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: 'MALE' | 'FEMALE';
  age: number;            // tuổi (năm)
  height: number;         // chiều cao (cm)
  weight: number;         // cân nặng (kg)
  /**
   * Hệ số vận động (PAL — Physical Activity Level):
   * 1.2   = Ít vận động (văn phòng)
   * 1.375 = Nhẹ (tập 1-3 ngày/tuần)
   * 1.55  = Trung bình (tập 3-5 ngày/tuần)
   * 1.725 = Nhiều (tập 6-7 ngày/tuần)
   * 1.9   = Rất nhiều (vận động viên)
   */
  activity_level: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  goal_type: 'LOSE' | 'MAINTAIN' | 'GAIN';
  /**
   * Số kg muốn thay đổi:
   * - Dương (+) = muốn tăng cân
   * - Âm (-)   = muốn giảm cân
   * VD: -3 = muốn giảm 3kg, +2 = muốn tăng 2kg
   */
  target_weight_change: number;
  target_weeks: number;         // số tuần để đạt mục tiêu
  bmr: number;                  // Basal Metabolic Rate (kcal/ngày)
  tdee: number;                 // Total Daily Energy Expenditure (kcal/ngày)
  daily_calorie_target: number; // Calo mục tiêu/ngày = TDEE ± thâm hụt
  created_at?: string;          // ISO timestamp
}

/**
 * Ingredient — Nguyên liệu trong món ăn
 * Là phần tử của mảng Food.ingredients (JSONB trong Supabase)
 */
export interface Ingredient {
  name: string;   // Tên nguyên liệu, VD: "Thịt bò"
  amount: string; // Định lượng, VD: "200g" hoặc "2 muỗng canh"
}

/**
 * Food — Thông tin món ăn & dinh dưỡng
 * Khớp với bảng `foods` trên Supabase
 * Tất cả giá trị dinh dưỡng tính cho 1 khẩu phần (1 serving)
 */
export interface Food {
  id: string;
  name: string;
  category: string; // 'Món chính' | 'Món phụ' | 'Tráng miệng' | 'Nước uống' | 'Món ăn sáng'
  calories: number; // kcal / khẩu phần
  protein: number;  // gram
  carbs: number;    // gram (carbohydrate)
  fat: number;      // gram
  sugar: number;    // gram
  ingredients: Ingredient[];  // Danh sách nguyên liệu
  instructions: string[];     // Các bước nấu (mỗi phần tử là 1 bước)
  image_url: string | null;   // URL ảnh món ăn (Unsplash/Pexels)
  created_at?: string;
}

/**
 * MealSchedule — Một ô trong thời khóa biểu 7 ngày
 * Khớp với bảng `schedules` trên Supabase
 */
export interface MealSchedule {
  id: string;
  user_id: string;
  /**
   * Ngày trong tuần theo chuẩn Việt Nam:
   * 2 = Thứ 2, 3 = Thứ 3, ..., 7 = Thứ 7, 8 = Chủ nhật
   */
  day_of_week: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  meal_slot: MealSlot; // 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'DINNER'
  food_id: string;
  servings: number;   // Số khẩu phần (1 = 1 lần ăn bình thường)
  created_at?: string;
  food?: Food;        // Populated khi JOIN hoặc fetch riêng (không có trong DB raw)
}

/**
 * SavedItem — Mục đã lưu bookmark của người dùng
 * Khớp với bảng `saved_items` trên Supabase
 */
export interface SavedItem {
  id: string;
  user_id: string;
  item_type: 'FOOD' | 'SCHEDULE';
  food_id: string | null;         // Dùng khi item_type = 'FOOD'
  plan_title: string | null;      // Dùng khi item_type = 'SCHEDULE'
  plan_snapshot: SavedScheduleSnapshot | null; // Dùng khi item_type = 'SCHEDULE'
  created_at?: string;
  food?: Food;                    // Populated khi fetch
}

// ============================================================
// DERIVED / COMPOSITE TYPES (dùng trong business logic)
// ============================================================

/** Các buổi ăn trong ngày */
export type MealSlot = 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'DINNER';

/**
 * SavedScheduleSnapshot — Bản lưu lịch 7 ngày (saved_items.plan_snapshot)
 * Key là day_of_week dạng string ("2" đến "8")
 */
export type SavedScheduleSnapshot = Record<string, Partial<Record<MealSlot, {
  food_id: string;
  servings: number;
}>>>;

export type WeeklyScheduleSnapshot = {
  [dayOfWeek: string]: Partial<Record<MealSlot, Food>>;
};

/**
 * WeeklySchedule — Lịch 7 ngày đầy đủ với objects
 * Dùng trong Redux state để hiển thị lên màn hình schedule
 */
export type WeeklySchedule = {
  [dayOfWeek: string]: Partial<Record<MealSlot, MealSchedule>>;
};

/**
 * MealTimeWindow — Cấu hình mốc giờ cho từng buổi ăn
 * Dùng trong nutritionCalculator để tính Passive Tracking
 */
export interface MealTimeWindow {
  slot: MealSlot;
  startHour: number; // Giờ bắt đầu buổi (0-23)
  endHour: number;   // Giờ kết thúc buổi (0-23)
  caloriePct: number; // Tỷ lệ calo mục tiêu buổi đó (0.25, 0.35, 0.10, 0.30)
}

/**
 * NutritionResult — Kết quả tính toán từ nutritionCalculator
 * Trả về sau khi người dùng hoàn thành Onboarding
 */
export interface NutritionResult {
  bmr: number;                  // Calo cơ bản
  tdee: number;                 // Calo tiêu hao thực tế
  dailyCalorieTarget: number;   // Calo mục tiêu mỗi ngày
  dailyDeficit: number;         // Thâm hụt/dư thừa (âm = thâm hụt = giảm cân)
  isWarning: boolean;           // true nếu |dailyDeficit| > 1000 kcal
  projectedWeightChange: number; // Số kg sẽ thay đổi sau target_weeks
}

/**
 * DailyProgress — Kết quả Passive Tracking theo giờ thực tế
 * Hiển thị trên Dashboard (tabs/index.tsx)
 */
export interface DailyProgress {
  consumedCalories: number;    // Calo đã "nạp" theo tiến độ thời gian
  consumedProtein: number;     // gram đạm đã nạp
  consumedCarbs: number;       // gram tinh bột đã nạp
  consumedFat: number;         // gram béo đã nạp
  consumedSugar: number;       // gram đường đã nạp
  targetCalories: number;      // Calo mục tiêu ngày hôm nay
  progressPct: number;         // Phần trăm đã hoàn thành (0-100)
  projectedWeightChange: number; // kg dự kiến đã giảm/tăng (tích lũy)
  completedSlots: MealSlot[];  // Các buổi đã qua, VD: ['MORNING', 'LUNCH']
  currentSlot: MealSlot | null; // Buổi hiện tại đang diễn ra
}

/**
 * ChatMessage — Tin nhắn trong màn hình AI Chat
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'model'; // 'model' = Gemini
  content: string;
  timestamp: Date;
}

/**
 * ActivityLevelOption — Option hiển thị trong UI Onboarding
 */
export interface ActivityLevelOption {
  value: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  label: string;
  description: string;
}

/** Danh sách activity level options để hiển thị trong Picker */
export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelOption[] = [
  { value: 1.2,   label: 'Ít vận động',      description: 'Ngồi văn phòng, không tập thể dục' },
  { value: 1.375, label: 'Nhẹ',              description: 'Tập thể dục nhẹ 1-3 ngày/tuần' },
  { value: 1.55,  label: 'Trung bình',       description: 'Tập thể dục vừa 3-5 ngày/tuần' },
  { value: 1.725, label: 'Nhiều',            description: 'Tập nặng 6-7 ngày/tuần' },
  { value: 1.9,   label: 'Rất nhiều',        description: 'Vận động viên, tập 2 lần/ngày' },
];

/** Hằng số mốc giờ 4 buổi — dùng trong nutritionCalculator và toàn app */
export const MEAL_TIME_WINDOWS: MealTimeWindow[] = [
  { slot: 'MORNING',   startHour: 6,  endHour: 10, caloriePct: 0.25 },
  { slot: 'LUNCH',     startHour: 10, endHour: 14, caloriePct: 0.35 },
  { slot: 'AFTERNOON', startHour: 14, endHour: 18, caloriePct: 0.10 },
  { slot: 'DINNER',    startHour: 18, endHour: 22, caloriePct: 0.30 },
];

/** Mapping day_of_week number → tên tiếng Việt */
export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

/** Mapping MealSlot → tên tiếng Việt */
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  MORNING:   'Bữa Sáng',
  LUNCH:     'Bữa Trưa',
  AFTERNOON: 'Bữa Chiều',
  DINNER:    'Bữa Tối',
};

/** Hằng số 1 kg mỡ = bao nhiêu kcal */
export const KCAL_PER_KG = 7700;
