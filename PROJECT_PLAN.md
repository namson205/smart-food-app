# SmartFood — Luồng ứng dụng và phân công

SmartFood giúp người dùng chọn món Việt, lập thực đơn tuần theo mục tiêu calo và xem lượng dinh dưỡng ước tính. Repo hiện có bộ tính dinh dưỡng, dữ liệu mẫu, màn hình đọc kho món và prototype Gemini. Auth, onboarding, lịch, bookmark và analytics là các mốc triển khai tiếp theo.

## Dữ liệu và trách nhiệm

| Thành phần | Chịu trách nhiệm |
|---|---|
| Expo Router, `src/app/` | Điều hướng, nhập liệu, hiển thị loading/lỗi/dữ liệu. Dùng nhóm `(auth)`, `(tabs)`, route `food/[id]` và `analytics` khi có màn hình tương ứng. |
| Tamagui, `src/components/` | Dùng lại thẻ món, thẻ buổi, biểu mẫu và thành phần trạng thái. |
| Redux Toolkit, `src/store/` | Quản lý phiên, hồ sơ, lịch, bookmark và trạng thái tải khi nhiều màn hình cần dùng chung. Form và bộ lọc riêng giữ ở màn hình. |
| `src/utils/nutritionCalculator.ts` | Tính BMR, TDEE, calo mục tiêu và ước tính từ lịch. Thống nhất đơn vị kg, cm, kcal và gram. |
| `src/services/` | Dùng Axios cho Data API. Service chuyển lỗi sang thông báo phù hợp và cấp dữ liệu cho màn hình hoặc Redux thunk. Request riêng tư dùng publishable key trong `apikey` và access token người dùng trong `Authorization: Bearer …`. |
| Supabase Auth | Đăng ký, xác nhận email, đăng nhập, làm mới phiên và đăng xuất. Có thể dùng Supabase JS riêng cho Auth để tận dụng quản lý phiên, đồng thời giữ Axios cho các thao tác Data API theo yêu cầu môn học. |
| Supabase PostgreSQL | `profiles` lưu chỉ số/mục tiêu sau onboarding. `foods` là danh mục chung chỉ đọc qua app. `schedules` lưu lịch đang áp dụng. `saved_items` lưu bookmark món hoặc bản lưu lịch. RLS giới hạn các bảng riêng tư theo tài khoản. |
| Supabase Edge Function (đề xuất) | Kiểm tra phiên, giới hạn đầu vào và gọi Gemini với secret phía server. Prototype gọi Gemini trực tiếp cần được thay trước khi nối vào app. |

## Luồng từ mở app đến sử dụng hàng ngày

1. **Phiên và hồ sơ.** Khôi phục phiên rồi đọc hồ sơ theo ID từ Auth. Khách có thể xem kho món. Khi mở tính năng cá nhân, khách vào login/register. Nếu bật xác nhận email, đăng ký xong hiện hướng dẫn xác nhận rồi quay lại đăng nhập. Có phiên nhưng chưa có hồ sơ thì vào onboarding. Lỗi tải hồ sơ có nút thử lại. Đăng xuất xóa dữ liệu riêng tư khỏi Redux và đóng các route yêu cầu phiên.
2. **Onboarding.** Nhập thông số, mức vận động và mục tiêu. Thống nhất kg âm khi giảm, dương khi tăng, bằng 0 khi duy trì. Bộ tính hiện dùng `calo mục tiêu = TDEE + (kg thay đổi × 7700) / (số tuần × 7)`. Kiểm tra số tuần, số liệu hữu hạn và calo mục tiêu dương trước khi lưu. Giá trị BMR/TDEE là ước tính. Hồ sơ lưu thành công thì bỏ qua onboarding ở lần mở sau, kể cả khi chưa có lịch.
3. **Thực đơn.** Mở lịch hiện tại hoặc trạng thái lịch trống. MVP giữ một món với số khẩu phần dương trên mỗi ô ngày/buổi, tối đa 28 ô. Buổi sáng/trưa/chiều/tối lần lượt có tỷ lệ gợi ý 25/35/10/30%. Người dùng có thể thêm, đổi, sửa khẩu phần và xóa ô. Tạo lịch tự động sinh bản xem trước, cho chỉnh rồi mới áp dụng. Thay toàn bộ lịch trong một transaction để bấm lại hoặc gặp lỗi giữa chừng vẫn nhất quán.
4. **Dashboard và analytics.** Lấy ngày giờ địa phương, đọc các ô của ngày hiện tại và tính calo theo món × khẩu phần. Giữ ý tưởng theo giờ (06–10, 10–14, 14–18, 18–22) dưới nhãn **Ước tính theo thực đơn**. Tuần là tổng hoặc trung bình lịch hiện tại có nhãn rõ. Tháng/năm chỉ là dự phóng từ lịch lặp lại. Nếu cần thống kê đã ăn, thêm nhật ký theo ngày có xác nhận và lưu giá trị dinh dưỡng tại thời điểm ghi.
5. **Kho món và bookmark.** Tìm theo tên, lọc danh mục/khoảng calo. Chi tiết hiển thị ảnh, dinh dưỡng mỗi khẩu phần, nguyên liệu và cách nấu. Từ chi tiết có thể chọn ô lịch hoặc lưu món. Lịch đã lưu giữ `food_id` và `servings` cho từng ô. Khi khôi phục, báo món không còn và cho sửa bản xem trước trước khi ghi. Chỉnh lịch đang áp dụng không làm đổi bản lưu.
6. **AI.** Tách tạo lịch và chat. Tạo lịch chỉ gửi mục tiêu và danh mục tối thiểu, kiểm tra đúng 7 ngày, 4 buổi mỗi ngày và ID có trong kho. Nếu AI lỗi thì dùng bộ chọn theo calo gần nhất, nếu kho trống thì cho thử lại sau. Chat trả lời và có thể gợi ý món, người dùng xác nhận mọi thay đổi vào lịch.

## Các mốc cho hai thành viên

| Mốc | Thành viên A (dữ liệu và logic) | Thành viên B (UI) | Điều kiện xong |
|---|---|---|---|
| 1. Nền dữ liệu | Schema, RLS, dữ liệu mẫu, hợp đồng kiểu và API | Màn hình kho món, sau đó thêm tìm kiếm và chi tiết | Hai máy đọc cùng bộ 20 món từ một project |
| 2. Auth và onboarding | Phiên, profile service, kiểm tra quy ước dấu | Login, register, onboarding và route guard | Mở lại giữ phiên, chỉ vào onboarding khi thiếu hồ sơ |
| 3. Lịch và bookmark | CRUD, đổi lịch nguyên tử, serialize bản lưu | Lịch, sửa khẩu phần, xem trước và áp dụng, danh sách đã lưu | User A không đọc/sửa được dữ liệu user B |
| 4. Dashboard và analytics | Kiểm tra công thức, biên giờ và khẩu phần | Tiến độ ngày, biểu đồ tuần và nhãn dự phóng | Thay lịch cho kết quả đúng, trường hợp lịch trống rõ ràng |
| 5. Gemini | Edge Function, kiểm tra JSON, fallback | Xem trước lịch AI và AI Chat | AI lỗi vẫn lập lịch được, câu trả lời chat không tự ghi dữ liệu |

Hai người chốt hợp đồng dữ liệu và PR theo từng mốc trước khi ghép UI. Schema sau lần khởi tạo được cập nhật bằng migration có thứ tự, do một người áp dụng cho DB chung. Dùng hai tài khoản SmartFood riêng để kiểm tra phân quyền.

## Các quyết định cần chốt trước khi mở rộng

- **Lịch lặp hay lịch theo ngày thực?** Bản khởi tạo giữ một lịch mẫu lặp hàng tuần. Nếu cần tuần khác nhau hoặc lịch sử, bổ sung thực đơn theo ngày và/hoặc nhật ký.
- **Một hay nhiều món một buổi?** Một món giúp hoàn thành MVP. Nếu cần cơm + món chính + canh, đổi khóa duy nhất và giao diện chỉnh bữa trước khi mở rộng AI.
- **Calo và khẩu phần.** Dữ liệu seed là số liệu mẫu. Hai bạn nên chốt cách định nghĩa một khẩu phần và đối chiếu nguồn trước khi trình bày số liệu như thông tin sử dụng thực tế.
- **Theo dõi cân nặng.** Bộ tính hiện có ước tính thay đổi cân nặng, với quy ước dấu giữa mục tiêu và chỉ số dashboard khác nhau. Chốt một quy ước trước khi nối UI và ưu tiên nghiệm thu lịch, khẩu phần và nhãn ước tính trước.
