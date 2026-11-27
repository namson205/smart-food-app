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

1. **Phiên và hồ sơ.** Khi mở app, khôi phục phiên. Chưa có phiên thì vào Đăng nhập, có link sang Đăng ký. Nếu Supabase yêu cầu xác nhận email, hiển thị hướng dẫn rồi cho quay lại đăng nhập. Có phiên thì đọc hồ sơ theo ID Auth. Thiếu hồ sơ thì vào Onboarding, có hồ sơ thì vào thẳng Dashboard. Lỗi tải hồ sơ có nút thử lại. Đăng xuất xóa dữ liệu riêng tư khỏi Redux và quay về Đăng nhập.
2. **Onboarding.** Nhập thông số, mức vận động, số điện thoại liên hệ và mục tiêu. Lấy email từ tài khoản Auth. Thống nhất kg âm khi giảm, dương khi tăng, bằng 0 khi duy trì. Bộ tính dùng `calo mục tiêu = TDEE + (kg thay đổi × 7700) / (số tuần × 7)`. Kiểm tra số tuần, số liệu hữu hạn và calo mục tiêu dương trước khi lưu. Giá trị BMR/TDEE là ước tính. Khi bấm **Hoàn tất**, tự sinh thực đơn 7 ngày theo mục tiêu và lưu hồ sơ cùng lịch đầu tiên trong một transaction. Nếu lưu thất bại, giữ dữ liệu form để người dùng thử lại. Khi thành công, mở Dashboard.
3. **Thực đơn.** Mỗi tuần mẫu có tối đa 28 ô, mỗi ô một món với số khẩu phần dương. Buổi sáng/trưa/chiều/tối có tỷ lệ 25/35/10/30%. Có thể dùng thuật toán chọn món theo calo để onboarding hoạt động trước khi tích hợp Gemini. Sau onboarding, người dùng có thể thêm, đổi, sửa khẩu phần và xóa ô. Tạo lại lịch cho xem trước và chỉnh rồi mới áp dụng. Thay toàn bộ lịch trong một transaction.
4. **Dashboard và analytics.** Lấy ngày giờ địa phương, đọc các ô của ngày hiện tại và tính calo theo món × khẩu phần. Giữ ý tưởng theo giờ (06–10, 10–14, 14–18, 18–22) dưới nhãn **Ước tính theo thực đơn**. Tuần là tổng hoặc trung bình lịch hiện tại có nhãn rõ. Tháng/năm chỉ là dự phóng từ lịch lặp lại. Nếu cần thống kê đã ăn, thêm nhật ký theo ngày có xác nhận và lưu giá trị dinh dưỡng tại thời điểm ghi.
5. **Kho món và bookmark.** Tìm theo tên, lọc danh mục, khoảng calo và chế độ ăn. Chi tiết hiển thị ảnh, dinh dưỡng mỗi khẩu phần, nguyên liệu và cách nấu. Từ chi tiết có thể chọn ô lịch hoặc lưu món. Lịch đã lưu giữ `food_id` và `servings` cho từng ô. Khi khôi phục, báo món không còn và cho sửa bản xem trước trước khi ghi. Chỉnh lịch đang áp dụng không làm đổi bản lưu.
6. **AI.** Tách tạo lịch, gợi ý món/công thức theo calo còn lại hoặc nguyên liệu và chat. Tạo lịch chỉ gửi mục tiêu và danh mục tối thiểu, kiểm tra đúng 7 ngày, 4 buổi mỗi ngày và ID có trong kho. Nếu AI lỗi thì dùng bộ chọn theo calo gần nhất, nếu kho trống thì cho thử lại sau. Chat trả lời và có thể gợi ý món, người dùng xác nhận mọi thay đổi vào lịch.

## Các mốc cho hai thành viên

| Mốc | Thành viên A (dữ liệu và logic) | Thành viên B (UI) | Điều kiện xong |
|---|---|---|---|
| 1. Nền dữ liệu | Schema, RLS, dữ liệu mẫu, hợp đồng kiểu và API | Màn hình kho món, sau đó thêm tìm kiếm và chi tiết | Hai máy đọc cùng bộ 20 món từ một project |
| 2. Auth và onboarding | Phiên, profile service, kiểm tra quy ước dấu | Login, register, onboarding và route guard | Chưa có phiên vào Đăng nhập, thiếu hồ sơ vào Onboarding, có hồ sơ vào Dashboard |
| 3. Lịch và bookmark | CRUD, đổi lịch nguyên tử, serialize bản lưu | Lịch, sửa khẩu phần, xem trước và áp dụng, danh sách đã lưu | User A không đọc/sửa được dữ liệu user B |
| 4. Dashboard và analytics | Kiểm tra công thức, biên giờ và khẩu phần | Tiến độ ngày, biểu đồ tuần và nhãn dự phóng | Thay lịch cho kết quả đúng, trường hợp lịch trống rõ ràng |
| 5. Gemini | Edge Function, kiểm tra JSON, fallback | Xem trước lịch AI và AI Chat | AI lỗi vẫn lập lịch được, câu trả lời chat không tự ghi dữ liệu |

Yêu cầu đồ án gồm React Native + Expo Router (TypeScript), Tamagui hỗ trợ sáng/tối, xoay ngang và tablet, animation cơ bản, Redux Toolkit, Axios cho REST, Gemini Flash qua Axios phía server, khoảng 10–15 màn hình và bản build phân phối qua internet để thử trên thiết bị thật. Nộp link GitHub và chuẩn bị giải thích code khi bảo vệ.

Hai người chốt hợp đồng dữ liệu và PR theo từng mốc trước khi ghép UI. Schema sau lần khởi tạo được cập nhật bằng migration có thứ tự, do một người áp dụng cho DB chung. Dùng hai tài khoản SmartFood riêng để kiểm tra phân quyền.

## Các quyết định cần chốt trước khi mở rộng

- **Lịch lặp hay lịch theo ngày thực?** Bản khởi tạo giữ một lịch mẫu lặp hàng tuần. Nếu cần tuần khác nhau hoặc lịch sử, bổ sung thực đơn theo ngày và/hoặc nhật ký.
- **Một hay nhiều món một buổi?** Một món giúp hoàn thành MVP. Nếu cần cơm + món chính + canh, đổi khóa duy nhất và giao diện chỉnh bữa trước khi mở rộng AI.
- **Calo và khẩu phần.** Dữ liệu seed là số liệu mẫu. Hai bạn nên chốt cách định nghĩa một khẩu phần và đối chiếu nguồn trước khi trình bày số liệu như thông tin sử dụng thực tế.
- **Theo dõi cân nặng.** Bộ tính hiện có ước tính thay đổi cân nặng, với quy ước dấu giữa mục tiêu và chỉ số dashboard khác nhau. Chốt một quy ước trước khi nối UI và ưu tiên nghiệm thu lịch, khẩu phần và nhãn ước tính trước.
