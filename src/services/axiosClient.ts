import { create } from 'axios';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseClient = create({
  baseURL: supabaseUrl ? `${supabaseUrl}/rest/v1` : undefined,
  headers: {
    apikey: publishableKey,
    Prefer: 'return=representation',
  },
  timeout: 15000,
});

supabaseClient.interceptors.request.use((config) => {
  if (!supabaseUrl || !publishableKey?.startsWith('sb_publishable_')) {
    throw new Error('Hãy cấu hình URL và publishable key trong .env.local.');
  }
  return config;
});

// Prototype hiện chưa được nối vào luồng của app.
export const geminiClient = create({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  timeout: 30000,
});

// ============================================================
// HELPER FUNCTIONS — Tiện ích tái sử dụng
// ============================================================

/**
 * buildSupabaseQuery — Xây dựng query string cho Supabase PostgREST
 *
 * @example
 * // GET /foods?category=eq.Món chính&calories=lte.500&order=calories.asc
 * buildSupabaseQuery({ category: 'eq.Món chính', calories: 'lte.500', order: 'calories.asc' })
 */
export function buildSupabaseQuery(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/**
 * supabaseHeaders — Header đặc biệt cho từng loại operation
 * Dùng khi cần override Prefer header cho từng request
 */
export const supabaseHeaders = {
  /** Dùng khi POST: trả về object vừa tạo (default) */
  returnRepresentation: { Prefer: 'return=representation' },
  /** Dùng khi DELETE: không trả về gì */
  returnMinimal: { Prefer: 'return=minimal' },
  /** Dùng khi cần UPSERT (INSERT hoặc UPDATE nếu đã tồn tại) */
  upsert: { Prefer: 'return=representation,resolution=merge-duplicates' },
};
