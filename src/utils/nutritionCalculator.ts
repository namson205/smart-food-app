/**
 * nutritionCalculator.ts — Toàn bộ logic tính toán dinh dưỡng thuần túy (Pure Functions)
 *
 * "Pure Function" = không có side effect, không gọi API, không đụng Redux.
 * Input → Tính toán → Output. Dễ test và dễ giải thích.
 *
 * Nội dung:
 *   1. calculateBMR     — Tính Basal Metabolic Rate (Mifflin-St Jeor)
 *   2. calculateTDEE    — Tính Total Daily Energy Expenditure
 *   3. calculateGoal    — Tính calo mục tiêu + cảnh báo
 *   4. getMealTimeProgress — Tính tiến độ từng buổi theo giờ thực tế
 *   5. calculateDailyProgress — Tính tiến độ cả ngày (Passive Tracking)
 *   6. getMacroTargets  — Tính Protein/Carbs/Fat mục tiêu từ calo
 *   7. getAnalyticsData — Tính dữ liệu cho màn hình Analytics
 *
 * Thành viên A viết file này.
 */

import {
  Food,
  MealSchedule,
  MealSlot,
  NutritionResult,
  DailyProgress,
  MEAL_TIME_WINDOWS,
  KCAL_PER_KG,
} from '../types/models';

// ============================================================
// 1. BMR — Basal Metabolic Rate (Công thức Mifflin-St Jeor)
// ============================================================

/**
 * calculateBMR — Tính lượng calo cơ thể đốt cháy khi nghỉ ngơi hoàn toàn
 *
 * Công thức Mifflin-St Jeor (chuẩn y tế hiện đại nhất):
 *   Nam: BMR = (10 × kg) + (6.25 × cm) - (5 × tuổi) + 5
 *   Nữ: BMR = (10 × kg) + (6.25 × cm) - (5 × tuổi) - 161
 *
 * @param weightKg - Cân nặng (kg)
 * @param heightCm - Chiều cao (cm)
 * @param age - Tuổi (năm)
 * @param gender - 'MALE' hoặc 'FEMALE'
 * @returns BMR (kcal/ngày), làm tròn 1 chữ số thập phân
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'MALE' | 'FEMALE'
): number {
  // Phần chung của công thức (giống nhau cho cả 2 giới)
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // Hằng số phân biệt giới tính
  const genderConstant = gender === 'MALE' ? 5 : -161;
  return Math.round((base + genderConstant) * 10) / 10;
}

// ============================================================
// 2. TDEE — Total Daily Energy Expenditure
// ============================================================

/**
 * calculateTDEE — Tính lượng calo tiêu hao thực tế mỗi ngày
 * dựa trên BMR và mức độ vận động (PAL)
 *
 * @param bmr - Kết quả của calculateBMR()
 * @param activityLevel - Hệ số vận động (1.2 | 1.375 | 1.55 | 1.725 | 1.9)
 * @returns TDEE (kcal/ngày), làm tròn số nguyên
 */
export function calculateTDEE(bmr: number, activityLevel: number): number {
  return Math.round(bmr * activityLevel);
}

// ============================================================
// 3. GOAL — Calo mục tiêu & Cảnh báo
// ============================================================

/**
 * calculateGoal — Tính calo mục tiêu/ngày và kiểm tra ngưỡng an toàn
 *
 * Quy tắc: 1 kg mỡ = 7,700 kcal
 * → Muốn giảm/tăng X kg trong N tuần:
 *   thâm_hụt/ngày = (X × 7700) / (N × 7)
 *
 * @param tdee - Kết quả của calculateTDEE()
 * @param targetWeightChange - Số kg muốn thay đổi (âm = giảm, dương = tăng)
 * @param targetWeeks - Số tuần để đạt mục tiêu
 * @returns NutritionResult với đầy đủ thông tin tính toán
 */
export function calculateGoal(
  tdee: number,
  targetWeightChange: number,
  targetWeeks: number
): Pick<NutritionResult, 'dailyCalorieTarget' | 'dailyDeficit' | 'isWarning' | 'projectedWeightChange'> {
  const totalDays = targetWeeks * 7;

  // Tổng kcal cần thâm hụt/dư thừa
  // Âm = cần đốt thêm (giảm cân), Dương = cần nạp thêm (tăng cân)
  const totalKcalDelta = targetWeightChange * KCAL_PER_KG;

  // Thâm hụt/dư thừa mỗi ngày
  // Âm = ăn ít hơn TDEE (giảm cân), Dương = ăn nhiều hơn TDEE (tăng cân)
  const dailyDeficit = Math.round(totalKcalDelta / totalDays);

  // Calo mục tiêu = TDEE + thâm hụt
  // VD: TDEE=2000, giảm 500/ngày → target = 1500
  // VD: TDEE=2000, tăng 300/ngày → target = 2300
  const dailyCalorieTarget = Math.round(tdee + dailyDeficit);

  // Cảnh báo nếu thâm hụt quá lớn (>1000 kcal/ngày không an toàn)
  const isWarning = Math.abs(dailyDeficit) > 1000;

  // Tính ngược lại: với mức thâm hụt này, bao nhiêu kg sẽ thay đổi sau N tuần?
  const projectedWeightChange = Math.round((dailyDeficit * totalDays / KCAL_PER_KG) * 10) / 10;

  return {
    dailyCalorieTarget,
    dailyDeficit,
    isWarning,
    projectedWeightChange,
  };
}

/**
 * calculateFullNutrition — Wrapper tiện lợi, tính toàn bộ BMR → TDEE → Goal
 * Gọi hàm này ở cuối màn hình Onboarding để lấy tất cả chỉ số một lần
 *
 * @param userData - Dữ liệu người dùng vừa nhập trong Onboarding
 * @returns NutritionResult đầy đủ
 */
export function calculateFullNutrition(userData: {
  gender: 'MALE' | 'FEMALE';
  age: number;
  height: number;
  weight: number;
  activity_level: number;
  target_weight_change: number;
  target_weeks: number;
}): NutritionResult {
  const bmr = calculateBMR(userData.weight, userData.height, userData.age, userData.gender);
  const tdee = calculateTDEE(bmr, userData.activity_level);
  const goalData = calculateGoal(tdee, userData.target_weight_change, userData.target_weeks);

  return {
    bmr,
    tdee,
    ...goalData,
  };
}

// ============================================================
// 4. MEAL TIME PROGRESS — Tiến độ từng buổi theo giờ thực tế
// ============================================================

/**
 * getMealSlotProgress — Tính % hoàn thành của 1 buổi dựa trên giờ hiện tại
 *
 * Logic:
 *   - Nếu giờ hiện tại < giờ bắt đầu buổi → 0% (chưa đến giờ)
 *   - Nếu giờ hiện tại trong giờ buổi → tỷ lệ theo phút đã qua
 *   - Nếu giờ hiện tại > giờ kết thúc buổi → 100% (buổi đã qua)
 *
 * @param slot - Buổi ăn cần kiểm tra
 * @param currentHour - Giờ hiện tại (0-23), lấy từ new Date().getHours()
 * @param currentMinute - Phút hiện tại (0-59), lấy từ new Date().getMinutes()
 * @returns Giá trị từ 0.0 đến 1.0 (0% đến 100%)
 */
export function getMealSlotProgress(
  slot: MealSlot,
  currentHour: number,
  currentMinute: number
): number {
  // Tìm cấu hình mốc giờ của buổi này
  const window = MEAL_TIME_WINDOWS.find((w) => w.slot === slot);
  if (!window) return 0;

  const { startHour, endHour } = window;
  const durationMinutes = (endHour - startHour) * 60; // Tổng thời gian buổi (phút)

  // Chuyển giờ:phút hiện tại thành số phút kể từ 00:00
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const startTotalMinutes = startHour * 60;
  const endTotalMinutes = endHour * 60;

  if (currentTotalMinutes < startTotalMinutes) {
    return 0; // Chưa đến giờ buổi này
  } else if (currentTotalMinutes >= endTotalMinutes) {
    return 1; // Buổi đã kết thúc hoàn toàn
  } else {
    // Đang trong giờ buổi này → tính tỷ lệ
    const elapsedMinutes = currentTotalMinutes - startTotalMinutes;
    return Math.min(elapsedMinutes / durationMinutes, 1);
  }
}

/**
 * getCompletedAndCurrentSlots — Xác định buổi nào đã qua và buổi nào đang diễn ra
 *
 * @param currentHour - Giờ hiện tại
 * @returns Object chứa danh sách buổi đã xong và buổi đang diễn ra
 */
export function getCompletedAndCurrentSlots(currentHour: number): {
  completedSlots: MealSlot[];
  currentSlot: MealSlot | null;
} {
  const completedSlots: MealSlot[] = [];
  let currentSlot: MealSlot | null = null;

  for (const window of MEAL_TIME_WINDOWS) {
    if (currentHour >= window.endHour) {
      completedSlots.push(window.slot); // Buổi này đã qua hoàn toàn
    } else if (currentHour >= window.startHour && currentHour < window.endHour) {
      currentSlot = window.slot; // Đang trong buổi này
    }
  }

  return { completedSlots, currentSlot };
}

// ============================================================
// 5. DAILY PROGRESS — Passive Tracking (Tính năng #5)
// ============================================================

/**
 * calculateDailyProgress — Tính tiến độ dinh dưỡng hôm nay theo giờ thực tế
 *
 * Đây là hàm core của tính năng Passive Tracking:
 * "Không cần người dùng bấm tick, app tự biết bữa nào đã qua"
 *
 * @param todaySchedule - Lịch hôm nay: map từ MealSlot → Food (và số servings)
 * @param dailyCalorieTarget - Calo mục tiêu ngày hôm nay (từ Profile.daily_calorie_target)
 * @param tdee - TDEE của người dùng (để tính thâm hụt tích lũy)
 * @param daysSinceStart - Số ngày kể từ ngày bắt đầu dùng app (để tính kg tích lũy)
 * @param now - Thời điểm hiện tại (default: new Date(), có thể mock để test)
 * @returns DailyProgress với đầy đủ chỉ số
 */
export function calculateDailyProgress(
  todaySchedule: Partial<Record<MealSlot, { food: Food; servings: number }>>,
  dailyCalorieTarget: number,
  tdee: number,
  daysSinceStart: number = 1,
  now: Date = new Date()
): DailyProgress {
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Khởi tạo tổng các chỉ số dinh dưỡng
  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;
  let consumedSugar = 0;

  // Duyệt qua từng buổi để tính calo đã nạp
  for (const window of MEAL_TIME_WINDOWS) {
    const slot = window.slot;
    const slotData = todaySchedule[slot];

    if (!slotData) continue; // Không có món cho buổi này

    // Tính % tiến độ của buổi này theo giờ thực tế
    const progress = getMealSlotProgress(slot, currentHour, currentMinute);

    if (progress === 0) continue; // Chưa đến giờ ăn, không tính

    const { food, servings } = slotData;
    // Nhân số servings và % tiến độ vào lượng dinh dưỡng
    consumedCalories += food.calories * servings * progress;
    consumedProtein  += food.protein  * servings * progress;
    consumedCarbs    += food.carbs    * servings * progress;
    consumedFat      += food.fat      * servings * progress;
    consumedSugar    += food.sugar    * servings * progress;
  }

  // Làm tròn để hiển thị đẹp
  consumedCalories = Math.round(consumedCalories);
  consumedProtein  = Math.round(consumedProtein * 10) / 10;
  consumedCarbs    = Math.round(consumedCarbs * 10) / 10;
  consumedFat      = Math.round(consumedFat * 10) / 10;
  consumedSugar    = Math.round(consumedSugar * 10) / 10;

  // Phần trăm hoàn thành so với mục tiêu hôm nay
  const progressPct = dailyCalorieTarget > 0
    ? Math.min(Math.round((consumedCalories / dailyCalorieTarget) * 100), 100)
    : 0;

  // Tính số kg đã giảm/tăng tích lũy
  // = (tổng thâm hụt qua các ngày) / 7700
  // Giả sử mỗi ngày người dùng ăn theo lịch → thâm hụt = TDEE - dailyCalorieTarget
  const dailyDeficit = tdee - dailyCalorieTarget; // Dương = thâm hụt = giảm cân
  const totalKcalDeficitCumulative = dailyDeficit * (daysSinceStart - 1) + (tdee - consumedCalories);
  const projectedWeightChange = Math.round((totalKcalDeficitCumulative / KCAL_PER_KG) * 1000) / 1000; // kg, 3 chữ số

  const { completedSlots, currentSlot } = getCompletedAndCurrentSlots(currentHour);

  return {
    consumedCalories,
    consumedProtein,
    consumedCarbs,
    consumedFat,
    consumedSugar,
    targetCalories: dailyCalorieTarget,
    progressPct,
    projectedWeightChange, // Dương = đã giảm, Âm = đã tăng
    completedSlots,
    currentSlot,
  };
}

// ============================================================
// 6. MACRO TARGETS — Phân bổ Protein/Carbs/Fat từ calo mục tiêu
// ============================================================

/**
 * getMacroTargets — Tính lượng Macro (đạm, tinh bột, béo) mục tiêu mỗi ngày
 *
 * Tỷ lệ macro chuẩn:
 *   Protein: 25% calo → 1g protein = 4 kcal
 *   Carbs:   45% calo → 1g carbs = 4 kcal
 *   Fat:     30% calo → 1g fat = 9 kcal
 *
 * @param dailyCalorieTarget - Calo mục tiêu/ngày
 * @returns Object chứa protein/carbs/fat tính theo gram
 */
export function getMacroTargets(dailyCalorieTarget: number): {
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  return {
    proteinG: Math.round((dailyCalorieTarget * 0.25) / 4),  // 25% calo / 4 kcal/g
    carbsG:   Math.round((dailyCalorieTarget * 0.45) / 4),  // 45% calo / 4 kcal/g
    fatG:     Math.round((dailyCalorieTarget * 0.30) / 9),  // 30% calo / 9 kcal/g
  };
}

// ============================================================
// 7. ANALYTICS — Dữ liệu cho màn hình Thống kê
// ============================================================

/** Dữ liệu cho 1 điểm trong biểu đồ analytics */
export interface AnalyticsDataPoint {
  label: string;    // Nhãn trục X: "T2", "T3"... hoặc "Tuần 1"...
  calories: number; // Tổng calo
  protein: number;  // gram đạm
  carbs: number;    // gram tinh bột
  fat: number;      // gram béo
}

/**
 * calculateWeeklyAnalytics — Tính dữ liệu thống kê cho view Tuần
 *
 * Logic: Lịch 7 ngày (Thứ 2→CN) là đơn vị tuần, tính calo từng ngày.
 * Calo mỗi ngày = tổng (food.calories × servings) của 4 buổi.
 *
 * @param schedules - Toàn bộ lịch của user (array MealSchedule có food đã populate)
 * @returns Mảng 7 phần tử, mỗi phần tử là dữ liệu 1 ngày trong tuần
 */
export function calculateWeeklyAnalytics(schedules: MealSchedule[]): AnalyticsDataPoint[] {
  const dayLabels: Record<number, string> = {
    2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN',
  };

  return [2, 3, 4, 5, 6, 7, 8].map((day) => {
    // Lấy tất cả slot của ngày này
    const daySchedules = schedules.filter((s) => s.day_of_week === day);

    // Tính tổng dinh dưỡng của ngày
    const totals = daySchedules.reduce(
      (acc, schedule) => {
        const food = schedule.food;
        if (!food) return acc;
        const factor = schedule.servings;
        return {
          calories: acc.calories + food.calories * factor,
          protein:  acc.protein  + food.protein  * factor,
          carbs:    acc.carbs    + food.carbs     * factor,
          fat:      acc.fat      + food.fat       * factor,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      label: dayLabels[day],
      calories: Math.round(totals.calories),
      protein:  Math.round(totals.protein * 10) / 10,
      carbs:    Math.round(totals.carbs * 10) / 10,
      fat:      Math.round(totals.fat * 10) / 10,
    };
  });
}

/**
 * calculateMonthlyAnalytics — Tính dữ liệu thống kê cho view Tháng
 *
 * Logic: Lịch 7 ngày lặp lại mỗi tuần → 1 tháng ≈ 4 tuần.
 * Dữ liệu mỗi tuần = trung bình ngày × 7.
 *
 * @param weeklyData - Kết quả từ calculateWeeklyAnalytics()
 * @returns Mảng 4 phần tử (Tuần 1-4 trong tháng)
 */
export function calculateMonthlyAnalytics(weeklyData: AnalyticsDataPoint[]): AnalyticsDataPoint[] {
  // Tổng cả tuần
  const weekTotal = weeklyData.reduce(
    (acc, day) => ({
      label: '',
      calories: acc.calories + day.calories,
      protein:  acc.protein  + day.protein,
      carbs:    acc.carbs    + day.carbs,
      fat:      acc.fat      + day.fat,
    }),
    { label: '', calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Trả về 4 tuần trong tháng (lịch lặp lại)
  return [1, 2, 3, 4].map((week) => ({
    label: `Tuần ${week}`,
    calories: Math.round(weekTotal.calories),
    protein:  Math.round(weekTotal.protein * 10) / 10,
    carbs:    Math.round(weekTotal.carbs * 10) / 10,
    fat:      Math.round(weekTotal.fat * 10) / 10,
  }));
}

/**
 * calculateYearlyAnalytics — Tính dữ liệu thống kê cho view Năm
 *
 * Logic: Mỗi tháng = 4.33 tuần, lịch 7 ngày lặp lại.
 *
 * @param weeklyData - Kết quả từ calculateWeeklyAnalytics()
 * @returns Mảng 12 phần tử (12 tháng trong năm)
 */
export function calculateYearlyAnalytics(weeklyData: AnalyticsDataPoint[]): AnalyticsDataPoint[] {
  const monthLabels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const WEEKS_PER_MONTH = 4.33;

  const weekTotal = weeklyData.reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein:  acc.protein  + day.protein,
      carbs:    acc.carbs    + day.carbs,
      fat:      acc.fat      + day.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return monthLabels.map((month) => ({
    label: month,
    calories: Math.round(weekTotal.calories * WEEKS_PER_MONTH),
    protein:  Math.round(weekTotal.protein  * WEEKS_PER_MONTH * 10) / 10,
    carbs:    Math.round(weekTotal.carbs    * WEEKS_PER_MONTH * 10) / 10,
    fat:      Math.round(weekTotal.fat      * WEEKS_PER_MONTH * 10) / 10,
  }));
}

// ============================================================
// 8. UTILITY HELPERS
// ============================================================

/**
 * getDayOfWeekFromDate — Chuyển JS Date sang day_of_week theo quy ước của app
 *
 * JS Date.getDay(): 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
 * App quy ước:      2=Thứ 2, ..., 7=Thứ 7, 8=Chủ nhật
 *
 * @param date - Ngày cần chuyển đổi (default: hôm nay)
 * @returns day_of_week từ 2 đến 8
 */
export function getDayOfWeekFromDate(date: Date = new Date()): 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  const jsDay = date.getDay(); // 0 = Chủ nhật
  // Chủ nhật (0) → 8, còn lại +1 (Thứ 2 = 1 → 2, Thứ 7 = 6 → 7)
  return (jsDay === 0 ? 8 : jsDay + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/**
 * formatCalories — Format số calo để hiển thị đẹp trên UI
 * @example formatCalories(1823.7) → "1,824 kcal"
 */
export function formatCalories(calories: number): string {
  return `${Math.round(calories).toLocaleString('vi-VN')} kcal`;
}

/**
 * formatWeight — Format số kg để hiển thị
 * @example formatWeight(0.0012) → "1.2g" (dưới 1g thì hiện gram)
 * @example formatWeight(1.23) → "1.23 kg"
 */
export function formatWeight(kg: number): string {
  if (Math.abs(kg) < 0.001) return '0 g';
  if (Math.abs(kg) < 1) return `${Math.round(kg * 1000)} g`;
  return `${kg.toFixed(2)} kg`;
}

/**
 * getBMICategory — Phân loại BMI
 * @param weightKg - Cân nặng (kg)
 * @param heightCm - Chiều cao (cm)
 */
export function getBMICategory(weightKg: number, heightCm: number): {
  bmi: number;
  category: string;
  color: string; // Màu để hiển thị trên UI
} {
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  if (bmi < 18.5)      return { bmi, category: 'Thiếu cân',     color: '#3B82F6' }; // blue
  if (bmi < 25)        return { bmi, category: 'Bình thường',   color: '#22C55E' }; // green
  if (bmi < 30)        return { bmi, category: 'Thừa cân',      color: '#F59E0B' }; // amber
  return               { bmi, category: 'Béo phì',        color: '#EF4444' }; // red
}
