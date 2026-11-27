# Đóng góp cho Foodemon

Đọc [AGENTS.md](AGENTS.md) để biết quy tắc kỹ thuật và [PROJECT_PLAN.md](PROJECT_PLAN.md) để biết thứ tự triển khai. File này hướng dẫn hai thành viên phối hợp trên cùng repo và Supabase. Mốc hiện tại là **đăng ký và đăng nhập bằng email**.

## Phạm vi mốc đầu

1. Khi mở app, khôi phục phiên. Nếu chưa có phiên, mở **Đăng nhập** và cho chuyển sang **Đăng ký**. Các tab, bao gồm Kho món ăn, nằm sau đăng nhập.
2. Người dùng đăng ký bằng email và mật khẩu. Nếu Supabase yêu cầu xác nhận email, app hướng dẫn mở email xác nhận rồi quay lại đăng nhập. Nếu Supabase trả về phiên ngay, app xử lý giống sau khi đăng nhập thành công.
3. Khi đăng nhập thành công hoặc mở lại app, app khôi phục phiên và kiểm tra hồ sơ. Có hồ sơ thì vào **Dashboard**. Chưa có hồ sơ thì vào màn hình chờ onboarding. Lỗi tải hồ sơ có thông báo và nút thử lại.
4. Khi đăng xuất, app xóa phiên và dữ liệu riêng tư đã lưu trong bộ nhớ, rồi quay về **Đăng nhập**.

Luồng xác nhận email của mốc này dùng trang xác nhận do Supabase cấu hình và thao tác quay lại app để đăng nhập. Ở mốc Auth có thể dùng màn hình tạm cho Onboarding và Dashboard. Khi triển khai onboarding, nút **Hoàn tất** sẽ lưu hồ sơ và thực đơn đầu tiên rồi mở Dashboard.

## Phân công và bàn giao

| Phần việc | Frontend · `feature/auth-ui` | Backend · `feature/auth-api` |
|---|---|---|
| Đăng ký và đăng nhập | Form, kiểm tra trường nhập, nút gửi, trạng thái chờ, lỗi và thông báo xác nhận email | Tích hợp Supabase Auth, chuẩn hóa kết quả và lỗi cho UI |
| Phiên và đăng xuất | Hiển thị trạng thái đang khôi phục phiên, nút đăng xuất và điều hướng | Khôi phục, làm mới và xóa phiên, cung cấp trạng thái dùng chung |
| Hồ sơ | Hiển thị màn hình chờ onboarding hoặc lỗi có nút thử lại | Đọc `profiles` theo phiên hiện tại qua Axios. Phân biệt thiếu hồ sơ với lỗi truy cập hoặc lỗi mạng |
| File chính | Route trong `src/app/`, UI dùng lại trong `src/components/` | Auth service, logic trạng thái và hợp đồng kiểu ngoài `src/app/` |

Chốt giao diện sau trong PR backend trước khi hai bên ghép code. Đây là hợp đồng đề xuất cho mốc này. Nếu cần sửa tên hoặc cấu trúc, cập nhật bảng này trong cùng PR để frontend có thể đồng bộ.

| Thao tác hoặc dữ liệu | Hợp đồng |
|---|---|
| `signUp({ email, password })` | Thành công với kết quả `confirmation_required` hoặc `signed_in`. |
| `signIn({ email, password })` | Thành công với kết quả `signed_in`. |
| `signOut()` | Báo thành công sau khi phiên đã được xóa; báo lỗi nếu thao tác thất bại. |
| Trạng thái phiên cho UI | `restoring`, `signed_out` hoặc `signed_in` có `userId`. Kèm lỗi riêng khi khôi phục thất bại để UI cho thử lại. |
| Trạng thái hồ sơ khi có phiên | `loading`, `missing`, `ready` có `Profile`, hoặc `error` có thông tin để hiển thị và thử lại. |
| Lỗi gửi form | Mã lỗi ổn định và thông báo tiếng Việt. Thống nhất các trường hợp thường gặp gồm thông tin đăng nhập sai, email chưa xác nhận, dữ liệu nhập không hợp lệ, giới hạn yêu cầu, lỗi mạng và lỗi bất ngờ. |

Frontend có thể dùng dữ liệu giả theo hợp đồng trong lúc backend triển khai. Khi tích hợp, thay nguồn giả bằng service thật và kiểm tra cả trạng thái tải lẫn lỗi. Tên branch nào sở hữu file dùng chung như layout hoặc kiểu dữ liệu nên được thống nhất trước khi sửa.

Hai bên dùng cùng URL và publishable key trong `.env.local`, với tài khoản thử riêng. Auth quản lý mật khẩu. Hồ sơ được tạo ở mốc onboarding và liên kết bằng ID Auth. Khi ghi hồ sơ, lấy email từ tài khoản Auth và lưu số điện thoại liên hệ do người dùng nhập. Hai cột liên hệ cho phép NULL để tương thích với hồ sơ đã tồn tại. Giữ mật khẩu, token phiên và secret key ngoài log, commit và ảnh chụp PR. Nếu cần đổi cấu hình xác thực của Supabase chung, thống nhất với người quản lý project trước.

## Nhánh, commit và pull request

Từ working tree sạch, cập nhật `main` và tạo nhánh của mình:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/auth-ui
```

Người làm backend dùng `feature/auth-api` ở lệnh cuối. Các mốc sau đặt tên nhánh theo phần việc, ví dụ `feature/schedule-ui` và `feature/schedule-api`.

- Mỗi commit tập trung vào một thay đổi. Stage file cụ thể và xem `git diff --cached` trước khi commit. Ví dụ `feat(auth): add sign-in and sign-up screens` hoặc `feat(auth): persist Supabase sessions`.
- Chạy `npm run lint` và `npx tsc --noEmit`. Trong PR ghi các luồng đã thử, các phụ thuộc vào PR còn lại và phần chưa kiểm tra được.
- Push nhánh bằng `git push -u origin feature/auth-ui` hoặc `git push -u origin feature/auth-api`, rồi mở PR vào `main`. Hai người review chéo trước khi merge. Khi UI cần service thật, merge phần hợp đồng và service trước, cập nhật nhánh UI từ `main`, rồi ghép và kiểm tra.
- Agent chuẩn bị thay đổi và báo kết quả. Commit, push hoặc mở PR khi người giao việc yêu cầu thao tác đó.

## Tiêu chí nghiệm thu chung

- Mở app khi chưa có phiên sẽ thấy Đăng nhập, có thể sang Đăng ký. Các tab yêu cầu phiên.
- Đăng ký hiển thị đúng trạng thái xác nhận email theo cấu hình project. Sau khi xác nhận, người dùng đăng nhập được.
- Mật khẩu sai, email chưa xác nhận và lỗi mạng có phản hồi rõ. Bấm liên tiếp không gửi nhiều yêu cầu cùng lúc.
- Mở lại app khôi phục được phiên. Có hồ sơ thì vào Dashboard. Thiếu hồ sơ thì vào Onboarding. Lỗi tải hồ sơ có nút thử lại.
- Đăng xuất đưa app về Đăng nhập. Hai tài khoản thử chỉ đọc được hồ sơ của mình.
- PR ghi rõ nền tảng thử, kết quả lint và typecheck.

## Prompt giao cho agent

### Frontend

```text
Đọc AGENTS.md, PROJECT_PLAN.md và CONTRIBUTING.md trước khi sửa. Tôi phụ trách frontend đăng ký và đăng nhập của Foodemon trên nhánh feature/auth-ui.

Kiểm tra trạng thái Git trước khi tạo hoặc dùng lại nhánh. Mở Đăng nhập nếu chưa có phiên và chặn điều hướng trực tiếp vào các tab khi chưa xác thực. Làm form đăng ký, đăng nhập, trạng thái xác nhận email, trạng thái chờ/lỗi, đăng xuất và điều hướng theo trạng thái phiên/hồ sơ. Đặt route trong src/app/. Có phiên nhưng thiếu hồ sơ thì mở Onboarding. Có hồ sơ thì mở Dashboard. Dùng màn hình tạm cho hai route này nếu chưa triển khai nội dung. Nếu backend chưa có, dùng dữ liệu giả theo hợp đồng đã chốt và ghi rõ điểm sẽ nối service thật.

Tra tài liệu theo AGENTS.md trước khi dùng API Expo hoặc React Native. Chạy npm run lint và npx tsc --noEmit. Báo file đã sửa, luồng đã thử và nội dung cần bàn giao cho backend. Thực hiện commit, push hoặc mở PR khi tôi yêu cầu.
```

### Backend

```text
Đọc AGENTS.md, PROJECT_PLAN.md và CONTRIBUTING.md trước khi sửa. Tôi phụ trách backend đăng ký và đăng nhập của Foodemon trên nhánh feature/auth-api.

Kiểm tra trạng thái Git trước khi tạo hoặc dùng lại nhánh. Đối chiếu hợp đồng Auth trong CONTRIBUTING.md với frontend. Tích hợp Supabase Auth cho đăng ký, đăng nhập, xác nhận email, khôi phục/làm mới phiên và đăng xuất. Giữ Axios cho Data API. Đọc profiles bằng phiên người dùng và trả trạng thái thiếu hồ sơ riêng với trạng thái lỗi. Bàn giao kiểu dữ liệu, cách gọi, mã lỗi và ví dụ kết quả để frontend có thể tích hợp. Phần tạo hồ sơ sẽ làm ở mốc onboarding, lấy email từ Auth và số điện thoại liên hệ từ form.

Tra tài liệu Supabase và tài liệu Expo theo AGENTS.md trước khi viết code liên quan. Dùng .env.local và tài khoản thử, giữ credentials ngoài log. Chạy npm run lint và npx tsc --noEmit. Báo kết quả kiểm tra xác nhận email, khôi phục phiên, đăng xuất và quyền đọc hồ sơ của hai tài khoản. Thực hiện commit, push hoặc mở PR khi tôi yêu cầu.
```
