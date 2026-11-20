/**
 * axiosClient.ts — Cấu hình Axios instance để giao tiếp với Supabase REST API
 *
 * Tại sao dùng Axios thay vì Supabase JS SDK?
 * → Yêu cầu của môn học là phải dùng Axios để gọi HTTP API.
 * → Supabase cung cấp REST API chuẩn PostgREST, chỉ cần thêm 2 header:
 *     apikey: <anon_key>
 *     Authorization: Bearer <anon_key>
 *
 * Thành viên A viết file này.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================================
// ENVIRONMENT VARIABLES
// Lấy từ file .env (không commit lên Git)
// Expo tự động expose biến có prefix EXPO_PUBLIC_
// ============================================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Kiểm tra sớm để báo lỗi rõ ràng thay vì lỗi mờ ám sau này
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Thiếu biến môi trường Supabase! Hãy kiểm tra file .env:\n' +
    '   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...'
  );
}

// ============================================================
// SUPABASE AXIOS INSTANCE
// Dùng cho mọi request đến Supabase REST API
// ============================================================

/**
 * supabaseClient — Axios instance đã cấu hình sẵn cho Supabase
 *
 * Cách sử dụng:
 *   import { supabaseClient } from '../services/axiosClient';
 *   const response = await supabaseClient.get('/foods?category=eq.Món chính');
 *
 * PostgREST Query Syntax:
 *   ?column=eq.value       → WHERE column = 'value'
 *   ?column=ilike.%text%   → WHERE column ILIKE '%text%' (tìm kiếm không phân biệt hoa thường)
 *   ?column=gte.100        → WHERE column >= 100
 *   ?column=lte.500        → WHERE column <= 500
 *   ?select=*              → SELECT * (mặc định)
 *   ?select=id,name        → SELECT id, name
 *   ?order=calories.asc    → ORDER BY calories ASC
 *   ?limit=20&offset=0     → LIMIT 20 OFFSET 0
 */
export const supabaseClient: AxiosInstance = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`, // Supabase REST API endpoint
  headers: {
    'Content-Type': 'application/json',
    // Header bắt buộc của Supabase REST API
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    // Prefer: return=representation → server trả về object vừa tạo/sửa
    // (cần thiết khi POST/PUT để lấy id và data mới)
    'Prefer': 'return=representation',
  },
  timeout: 15000, // 15 giây timeout
});

// ============================================================
// GEMINI API AXIOS INSTANCE (tách riêng vì baseURL khác)
// ============================================================
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY as string;

/**
 * geminiClient — Axios instance đã cấu hình sẵn cho Google Gemini API
 *
 * Cách sử dụng:
 *   import { geminiClient } from '../services/axiosClient';
 *   const response = await geminiClient.post('/models/gemini-2.0-flash:generateContent?key=...', body);
 */
export const geminiClient: AxiosInstance = axios.create({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Gemini có thể chậm hơn, để 30 giây
});

// ============================================================
// INTERCEPTORS — Logging & Error Handling
// ============================================================

/**
 * REQUEST INTERCEPTOR (Supabase)
 * Log mọi request để debug dễ dàng khi demo
 */
supabaseClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (__DEV__) {
      console.log(`🌐 [Supabase] ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data) console.log('📤 Body:', JSON.stringify(config.data, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR (Supabase)
 * Xử lý lỗi tập trung: log lỗi và ném ra message thân thiện
 */
supabaseClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (__DEV__) {
      console.log(`✅ [Supabase] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error(
        `❌ [Supabase] ${error.response?.status} ${error.config?.url}`,
        error.response?.data
      );
    }
    // Trả ra message có nghĩa thay vì object error khó đọc
    const message =
      error.response?.data?.message ||
      error.response?.data?.hint ||
      error.message ||
      'Lỗi kết nối mạng';
    return Promise.reject(new Error(message));
  }
);

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
