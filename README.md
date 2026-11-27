# SmartFood (Foodemon)

Ứng dụng Expo/React Native giúp khám phá món Việt, lên thực đơn 7 ngày và ước tính calo theo khẩu phần. Hiện có màn hình **Kho món ăn** để kiểm tra kết nối Supabase. Xem [kế hoạch triển khai](PROJECT_PLAN.md) để biết luồng Auth, onboarding, lịch, dashboard, bookmark và AI.

## Tạo Supabase chung cho nhóm

1. Một bạn tạo project `foodemon-dev` trong [Supabase Dashboard](https://supabase.com/dashboard), chọn organization của nhóm, chọn vùng gần người dùng dự kiến và lưu mật khẩu database trong trình quản lý mật khẩu. Bật Data API nếu được hỏi.
2. Trong **SQL Editor → New query**, dán toàn bộ [supabase_setup.sql](supabase_setup.sql) và bấm **Run** một lần trên project mới. Nếu đã chạy script cũ trên một DB có dữ liệu, cần lập migration riêng trước khi chuyển. Kiểm tra **Table Editor** có `profiles`, `foods`, `schedules`, `saved_items`; `foods` có 20 món mẫu.
3. Vào **Organization Settings → Team** để mời bạn cùng nhóm qua email nếu bạn ấy cần quản lý database. Chọn quyền thấp nhất đủ dùng trong các vai trò gói hiện tại hỗ trợ. Nếu chỉ cần chạy app, hai bạn chỉ cần cùng URL và publishable key. Mỗi bạn dùng tài khoản riêng khi đăng nhập Dashboard. [Quyền thành viên Supabase](https://supabase.com/docs/guides/platform/access-control)
4. Mở **Connect** ở Dashboard và lấy **Project URL** cùng **Publishable key** (`sb_publishable_…`). Trên cả hai máy, chạy `cp .env.example .env.local` từ thư mục gốc rồi điền cùng hai giá trị. `.env.local` đã được Git bỏ qua. Chỉ đặt key publishable trong app. Mật khẩu DB, Supabase secret key, `service_role` và Gemini key thuộc cấu hình quản trị hoặc phía server. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

## Chạy và kiểm tra

```bash
npm ci
npm start
```

Mở bản iOS hoặc Android bằng thiết bị phù hợp với Expo SDK 58. Màn hình **Kho món ăn** phải hiển thị danh sách 20 món. Có thể kiểm tra Data API độc lập với Expo bằng cách điền URL và publishable key vào lệnh sau.

```bash
curl --fail-with-body \
  'https://YOUR_PROJECT_REF.supabase.co/rest/v1/foods?select=id,name,calories&limit=3' \
  -H 'apikey: sb_publishable_REPLACE_ME'
```

Nếu REST trả về danh sách mà app chưa tải được, kiểm tra tên biến trong `.env.local` rồi reload app. Với lỗi 401, kiểm tra URL và key thuộc cùng project. Với lỗi bảng hoặc quyền, kiểm tra Data API và kết quả chạy SQL.

```bash
npm run lint
npx tsc --noEmit
```

## Dữ liệu và cấu trúc

- `src/app/` chứa route Expo Router đang chạy. `App.tsx` và `index.ts` là scaffold cũ; entry point trong `package.json` là `expo-router/entry`.
- `src/services/` chứa Axios client, API đọc món và prototype Gemini chưa nối vào giao diện. `src/types/` và `src/utils/` chứa hợp đồng dữ liệu và tính toán.
- Supabase Auth quản lý tài khoản. Bảng `profiles` lưu thông tin onboarding liên kết bằng ID Auth. `schedules` và `saved_items` thuộc từng người dùng. Bảng `foods` cho phép đọc chung qua app. Quản lý dữ liệu mẫu từ Dashboard bằng tài khoản nhóm có quyền phù hợp.
- Sau lần khởi tạo, cập nhật schema qua các migration có thứ tự trong Git. Khi có màn hình Auth, dùng hai tài khoản thử để kiểm tra lịch và bookmark chỉ hiển thị cho chủ sở hữu.

## Thành viên

- Trần Nam Sơn — 23651831
- Lại Minh Quân

[MIT License](LICENSE) · Dự án môn Lập trình Di động
