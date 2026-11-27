/**
 * geminiService.ts — Giao tiếp với Google Gemini Flash API qua Axios
 *
 * Hai chức năng chính:
 *   1. generateWeeklySchedule — AI tự động tạo lịch 7 ngày dựa trên mục tiêu
 *   2. chatWithNutritionist  — Hỏi đáp dinh dưỡng với Gemini (màn hình AI Chat)
 *
 * API endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
 * Docs: https://ai.google.dev/api/generate-content
 *
 * Thành viên A viết file này.
 */

import { geminiClient } from './axiosClient';
import { Food, MealSlot, ChatMessage, WeeklyScheduleSnapshot } from '../types/models';

// ============================================================
// TYPES
// ============================================================

/** Cấu trúc 1 phần trong Gemini message (theo Gemini API spec) */
interface GeminiPart {
  text: string;
}

/** Cấu trúc 1 message trong conversation history */
interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/** Request body gửi đến Gemini API */
interface GeminiRequestBody {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;       // 0.0-1.0 (thấp = chính xác hơn, cao = sáng tạo hơn)
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;   // Giới hạn độ dài phản hồi
  };
  systemInstruction?: {
    parts: GeminiPart[];
  };
}

/** Kết quả trả về từ Gemini API */
interface GeminiResponse {
  candidates: {
    content: {
      parts: GeminiPart[];
      role: string;
    };
    finishReason: string;
  }[];
}

// ============================================================
// SYSTEM PROMPT — Nhân cách AI chuyên gia dinh dưỡng
// ============================================================

const NUTRITIONIST_SYSTEM_PROMPT = `Bạn là chuyên gia dinh dưỡng SmartFood AI, một trợ lý thông minh chuyên về:
- Tư vấn chế độ ăn uống khoa học phù hợp người Việt Nam
- Phân tích và gợi ý thực đơn dựa trên mục tiêu cân nặng
- Giải thích các chỉ số dinh dưỡng (BMR, TDEE, Macro) dễ hiểu
- Cung cấp thông tin về các món ăn Việt Nam

Quy tắc trả lời:
- Trả lời bằng tiếng Việt, thân thiện và dễ hiểu
- Dùng số liệu cụ thể khi có thể
- Không đưa ra lời khuyên y tế chuyên sâu, hướng dẫn gặp bác sĩ nếu cần
- Giữ câu trả lời ngắn gọn (tối đa 200 từ) trừ khi được yêu cầu chi tiết`;

// ============================================================
// 1. GENERATE WEEKLY SCHEDULE — AI tạo lịch 7 ngày
// ============================================================

/**
 * generateWeeklyScheduleWithAI — Gọi Gemini để tạo thực đơn 7 ngày tự động
 *
 * Flow:
 *   1. Gửi prompt với danh sách món ăn + mục tiêu calo → Gemini
 *   2. Gemini trả về JSON mapping day → meal_slot → food_id
 *   3. Parse JSON và trả về WeeklyScheduleSnapshot
 *   4. Nếu Gemini lỗi → gọi fallback tạo lịch ngẫu nhiên
 *
 * @param dailyCalorieTarget - Calo mục tiêu/ngày của người dùng
 * @param goalType - 'LOSE' | 'MAINTAIN' | 'GAIN'
 * @param availableFoods - Danh sách món ăn từ DB Supabase
 * @returns WeeklyScheduleSnapshot (map day_of_week → meal_slot → Food)
 */
export async function generateWeeklyScheduleWithAI(
  dailyCalorieTarget: number,
  goalType: 'LOSE' | 'MAINTAIN' | 'GAIN',
  availableFoods: Food[]
): Promise<WeeklyScheduleSnapshot> {
  // Rút gọn food list để tránh vượt token limit Gemini
  // Chỉ gửi id, name, calories, category
  const foodSummary = availableFoods.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    calories: f.calories,
  }));

  const goalDescriptions = {
    LOSE: 'giảm cân (ưu tiên món ít calo, nhiều đạm)',
    MAINTAIN: 'duy trì cân nặng (cân bằng dinh dưỡng)',
    GAIN: 'tăng cân (ưu tiên món nhiều calo, nhiều đạm)',
  };

  // Prompt yêu cầu Gemini trả về JSON thuần (không markdown, không giải thích)
  const prompt = `Tạo thực đơn 7 ngày (Thứ 2 đến Chủ nhật) cho người dùng có mục tiêu:
- Calo mục tiêu mỗi ngày: ${dailyCalorieTarget} kcal
- Mục tiêu: ${goalDescriptions[goalType]}
- Phân bổ calo theo buổi: Sáng 25%, Trưa 35%, Chiều 10%, Tối 30%

Danh sách món ăn có sẵn (JSON):
${JSON.stringify(foodSummary, null, 2)}

Hãy trả về JSON THUẦN theo format sau (không có markdown, không giải thích thêm):
{
  "2": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"},
  "3": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"},
  "4": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"},
  "5": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"},
  "6": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"},
  "7": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"},
  "8": {"MORNING": "<food_id>", "LUNCH": "<food_id>", "AFTERNOON": "<food_id>", "DINNER": "<food_id>"}
}

Chỉ dùng food_id có trong danh sách trên. Chỉ trả về JSON, không thêm gì khác.`;

  try {
    const requestBody: GeminiRequestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,       // Thấp để kết quả nhất quán, dễ parse
        maxOutputTokens: 2048,
      },
    };

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const response = await geminiClient.post<GeminiResponse>(
      `/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      requestBody
    );

    // Lấy text từ response
    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON từ response (loại bỏ markdown code block nếu có)
    const jsonText = rawText
      .replace(/```json\n?/g, '')  // Xóa ```json
      .replace(/```\n?/g, '')       // Xóa ```
      .trim();

    // Parse JSON mapping (day_of_week → meal_slot → food_id)
    const scheduleIdMap: Record<string, Record<string, string>> = JSON.parse(jsonText);

    // Chuyển từ food_id sang Food object
    const foodMap = new Map(availableFoods.map((f) => [f.id, f]));
    const snapshot: WeeklyScheduleSnapshot = {};

    for (const [day, slots] of Object.entries(scheduleIdMap)) {
      snapshot[day] = {};
      for (const [slot, foodId] of Object.entries(slots)) {
        const food = foodMap.get(foodId);
        if (food) {
          snapshot[day][slot as MealSlot] = food;
        }
      }
    }

    console.log('✅ [Gemini] Tạo lịch 7 ngày thành công');
    return snapshot;

  } catch (error) {
    // Fallback: tạo lịch ngẫu nhiên nếu Gemini lỗi
    console.warn('⚠️ [Gemini] Lỗi, dùng fallback tạo lịch ngẫu nhiên:', error);
    return generateFallbackSchedule(availableFoods, dailyCalorieTarget);
  }
}

// ============================================================
// 2. CHAT WITH NUTRITIONIST — Hỏi đáp AI
// ============================================================

/**
 * chatWithNutritionist — Gửi tin nhắn đến Gemini và nhận tư vấn dinh dưỡng
 *
 * Hỗ trợ multi-turn conversation (gửi kèm lịch sử chat)
 *
 * @param userMessage - Tin nhắn người dùng vừa nhập
 * @param chatHistory - Lịch sử cuộc trò chuyện (để Gemini có context)
 * @param userContext - Thông tin người dùng để Gemini tư vấn chính xác hơn
 * @returns Phản hồi từ Gemini dạng string
 */
export async function chatWithNutritionist(
  userMessage: string,
  chatHistory: ChatMessage[],
  userContext?: {
    dailyCalorieTarget?: number;
    goalType?: 'LOSE' | 'MAINTAIN' | 'GAIN';
    bmr?: number;
    tdee?: number;
  }
): Promise<string> {
  // Thêm context người dùng vào system prompt nếu có
  let systemPrompt = NUTRITIONIST_SYSTEM_PROMPT;
  if (userContext) {
    systemPrompt += `\n\nThông tin người dùng hiện tại:
- Mục tiêu calo/ngày: ${userContext.dailyCalorieTarget ?? 'chưa thiết lập'} kcal
- Mục tiêu: ${userContext.goalType === 'LOSE' ? 'Giảm cân' : userContext.goalType === 'GAIN' ? 'Tăng cân' : 'Duy trì cân nặng'}
- BMR: ${userContext.bmr ?? 'chưa tính'} kcal/ngày
- TDEE: ${userContext.tdee ?? 'chưa tính'} kcal/ngày`;
  }

  // Chuyển ChatMessage[] → GeminiMessage[] (format API)
  // Chỉ lấy 10 tin nhắn gần nhất để tránh vượt token limit
  const recentHistory = chatHistory.slice(-10);
  const contents: GeminiMessage[] = recentHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  // Thêm tin nhắn mới nhất của user
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const requestBody: GeminiRequestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,       // Cao hơn một chút để câu trả lời tự nhiên hơn
      maxOutputTokens: 1024,
    },
  };

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const response = await geminiClient.post<GeminiResponse>(
    `/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    requestBody
  );

  const replyText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) throw new Error('Gemini không trả về phản hồi');

  return replyText;
}

// ============================================================
// 3. FOOD RECOMMENDATION — Gợi ý món theo calo còn lại
// ============================================================

/**
 * recommendFoodsByCalories — Gọi Gemini để gợi ý món theo calo còn lại trong ngày
 *
 * @param remainingCalories - Calo còn trống trong ngày
 * @param availableFoods - Danh sách món có trong DB
 * @param currentMealSlot - Buổi ăn hiện tại
 * @returns Danh sách Food được gợi ý (tối đa 3 món)
 */
export async function recommendFoodsByCalories(
  remainingCalories: number,
  availableFoods: Food[],
  currentMealSlot: MealSlot
): Promise<Food[]> {
  const slotNames: Record<MealSlot, string> = {
    MORNING: 'bữa sáng',
    LUNCH: 'bữa trưa',
    AFTERNOON: 'bữa chiều',
    DINNER: 'bữa tối',
  };

  const foodSummary = availableFoods.map((f) => ({
    id: f.id,
    name: f.name,
    calories: f.calories,
    category: f.category,
  }));

  const prompt = `Người dùng còn ${remainingCalories} kcal trong ngày hôm nay cho ${slotNames[currentMealSlot]}.
Hãy gợi ý 3 món ăn phù hợp nhất từ danh sách sau:
${JSON.stringify(foodSummary)}

Trả về JSON array gồm 3 food_id: ["id1", "id2", "id3"]
Chỉ trả về JSON, không thêm gì khác.`;

  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const response = await geminiClient.post<GeminiResponse>(
      `/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
      }
    );

    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendedIds: string[] = JSON.parse(jsonText);

    const foodMap = new Map(availableFoods.map((f) => [f.id, f]));
    return recommendedIds
      .map((id) => foodMap.get(id))
      .filter((f): f is Food => f !== undefined)
      .slice(0, 3);

  } catch (error) {
    console.warn('⚠️ [Gemini] Lỗi gợi ý món, dùng fallback:', error);
    // Fallback: trả về 3 món có calo gần với remainingCalories nhất
    return availableFoods
      .sort((a, b) => Math.abs(a.calories - remainingCalories) - Math.abs(b.calories - remainingCalories))
      .slice(0, 3);
  }
}

// ============================================================
// FALLBACK — Tạo lịch ngẫu nhiên khi Gemini lỗi
// ============================================================

/**
 * generateFallbackSchedule — Tạo lịch 7 ngày ngẫu nhiên (không dùng AI)
 *
 * Logic: Với mỗi buổi, chọn món ăn có calories gần nhất với
 * % calo mục tiêu buổi đó (Sáng 25%, Trưa 35%, Chiều 10%, Tối 30%)
 *
 * @param foods - Danh sách món ăn từ DB
 * @param dailyCalorieTarget - Calo mục tiêu/ngày
 * @returns WeeklyScheduleSnapshot
 */
function generateFallbackSchedule(foods: Food[], dailyCalorieTarget: number): WeeklyScheduleSnapshot {
  const mealTargets: Record<MealSlot, number> = {
    MORNING:   dailyCalorieTarget * 0.25,
    LUNCH:     dailyCalorieTarget * 0.35,
    AFTERNOON: dailyCalorieTarget * 0.10,
    DINNER:    dailyCalorieTarget * 0.30,
  };

  const slots: MealSlot[] = ['MORNING', 'LUNCH', 'AFTERNOON', 'DINNER'];
  const snapshot: WeeklyScheduleSnapshot = {};

  for (let day = 2; day <= 8; day++) {
    snapshot[String(day)] = {};
    for (const slot of slots) {
      const target = mealTargets[slot];
      // Tìm món có calo gần target nhất
      const bestFood = foods.reduce((best, food) =>
        Math.abs(food.calories - target) < Math.abs(best.calories - target) ? food : best
      );
      snapshot[String(day)][slot] = bestFood;
    }
  }

  return snapshot;
}
