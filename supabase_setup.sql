-- Khởi tạo một lần trong SQL Editor của project Supabase mới.
-- Chạy trong một transaction để lỗi giữa chừng không để lại schema dở dang.
BEGIN;

-- Bảng 1: profiles - tạo khi người dùng hoàn tất onboarding
CREATE TABLE public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    email           TEXT,  -- Sao chép email từ Supabase Auth khi tạo hồ sơ
    phone           TEXT,  -- Số liên hệ, giữ được dấu + và số 0 đầu
    gender          TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    age             INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    height          NUMERIC NOT NULL CHECK (height > 0),  -- cm
    weight          NUMERIC NOT NULL CHECK (weight > 0),  -- kg
    -- 1=Ít vận động, 1.375=Nhẹ, 1.55=Trung bình, 1.725=Nhiều, 1.9=Rất nhiều
    activity_level  NUMERIC NOT NULL CHECK (activity_level IN (1.2, 1.375, 1.55, 1.725, 1.9)),
    goal_type       TEXT NOT NULL CHECK (goal_type IN ('LOSE', 'MAINTAIN', 'GAIN')),
    -- Số kg muốn thay đổi (dương = tăng, âm = giảm)
    target_weight_change NUMERIC NOT NULL DEFAULT 0,
    target_weeks    INTEGER NOT NULL DEFAULT 4 CHECK (target_weeks > 0),
    -- Chỉ số tính toán (tự động cập nhật sau onboarding)
    bmr             NUMERIC NOT NULL,   -- Basal Metabolic Rate (kcal/ngày)
    tdee            NUMERIC NOT NULL,   -- Total Daily Energy Expenditure (kcal/ngày)
    daily_calorie_target NUMERIC NOT NULL CHECK (daily_calorie_target > 0), -- Mục tiêu calo/ngày (TDEE +/- thâm hụt)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (goal_type = 'LOSE' AND target_weight_change < 0)
        OR (goal_type = 'MAINTAIN' AND target_weight_change = 0)
        OR (goal_type = 'GAIN' AND target_weight_change > 0)
    )
);

-- Bảng 2: foods - kho dữ liệu món ăn Việt Nam
CREATE TABLE public.foods (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    category     TEXT NOT NULL,  -- VD: 'Món chính', 'Món phụ', 'Tráng miệng', 'Nước uống'
    calories     NUMERIC NOT NULL CHECK (calories >= 0),  -- kcal / 1 khẩu phần
    protein      NUMERIC NOT NULL DEFAULT 0,  -- gram
    carbs        NUMERIC NOT NULL DEFAULT 0,  -- gram
    fat          NUMERIC NOT NULL DEFAULT 0,  -- gram
    sugar        NUMERIC NOT NULL DEFAULT 0,  -- gram
    -- ingredients: mảng object { name: string, amount: string }
    -- VD: [{"name": "Thịt bò", "amount": "200g"}, {"name": "Rau cải", "amount": "100g"}]
    ingredients  JSONB NOT NULL DEFAULT '[]',
    -- instructions: mảng string, mỗi phần tử là 1 bước nấu
    -- VD: ["Rửa sạch rau", "Đun sôi nước", "Cho thịt vào nấu 15 phút"]
    instructions JSONB NOT NULL DEFAULT '[]',
    image_url    TEXT,  -- Link ảnh từ Unsplash/Pexels
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 3: schedules - thời khóa biểu thực đơn 7 ngày của user
CREATE TABLE public.schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- day_of_week: 2=Thứ 2, 3=Thứ 3, ..., 8=Chủ nhật (theo quy ước Việt Nam)
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 2 AND 8),
    -- meal_slot: buổi ăn trong ngày
    meal_slot   TEXT NOT NULL CHECK (meal_slot IN ('MORNING', 'LUNCH', 'AFTERNOON', 'DINNER')),
    food_id     UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
    servings    NUMERIC NOT NULL DEFAULT 1 CHECK (servings > 0),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    -- Mỗi user chỉ có 1 món cho mỗi buổi trong 1 ngày (có thể thêm nhiều bằng cách bỏ constraint này)
    UNIQUE(user_id, day_of_week, meal_slot)
);

-- Bảng 4: saved_items - lưu trữ cá nhân (bookmark món ăn hoặc cả lịch trình)
CREATE TABLE public.saved_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type     TEXT NOT NULL CHECK (item_type IN ('FOOD', 'SCHEDULE')),
    -- Nếu item_type = 'FOOD': food_id có giá trị
    food_id       UUID REFERENCES public.foods(id) ON DELETE CASCADE,
    -- Nếu item_type = 'SCHEDULE': plan_title và plan_snapshot có giá trị
    plan_title    TEXT,
    -- plan_snapshot: snapshot toàn bộ lịch 7 ngày tại thời điểm lưu
    -- VD: { "2": {"MORNING": {"food_id": "...", "servings": 1.5}} }
    plan_snapshot JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (item_type = 'FOOD' AND food_id IS NOT NULL AND plan_title IS NULL AND plan_snapshot IS NULL)
        OR (item_type = 'SCHEDULE' AND food_id IS NULL AND plan_title IS NOT NULL
            AND plan_snapshot IS NOT NULL AND jsonb_typeof(plan_snapshot) = 'object')
    )
);

-- Quyền Data API và quyền truy cập từng hàng.
REVOKE ALL ON public.profiles, public.foods, public.schedules, public.saved_items
    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.foods TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules, public.saved_items TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY foods_read ON public.foods
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY profiles_own ON public.profiles
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY schedules_own ON public.schedules
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY saved_items_own ON public.saved_items
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE UNIQUE INDEX idx_saved_food_once ON public.saved_items(user_id, food_id)
    WHERE item_type = 'FOOD';
CREATE INDEX idx_saved_items_user_id ON public.saved_items(user_id);
CREATE INDEX idx_foods_category ON public.foods(category);
CREATE INDEX idx_foods_calories ON public.foods(calories);

-- ============================================================
-- BƯỚC 5: INSERT 20 MÓN ĂN VIỆT NAM MẪU
-- Link ảnh từ Unsplash (có fallback trong app nếu ảnh lỗi)
-- ============================================================
INSERT INTO public.foods (name, category, calories, protein, carbs, fat, sugar, ingredients, instructions, image_url)
VALUES

-- ===== MÓN CHÍNH =====

-- 1. Phở Bò
(
  'Phở Bò',
  'Món chính',
  450, 28, 55, 10, 3,
  '[
    {"name": "Bánh phở tươi", "amount": "200g"},
    {"name": "Thịt bò tái", "amount": "100g"},
    {"name": "Xương bò", "amount": "500g"},
    {"name": "Hành tây", "amount": "1 củ"},
    {"name": "Gừng", "amount": "1 nhánh"},
    {"name": "Hồi, quế, đinh hương", "amount": "mỗi loại 2g"},
    {"name": "Hành lá, giá đỗ, rau quế", "amount": "tùy ý"},
    {"name": "Nước mắm, muối", "amount": "nêm vừa"}
  ]',
  '[
    "Nướng hành tây và gừng trên lửa đến khi thơm và có màu vàng.",
    "Chần xương bò qua nước sôi, rửa sạch rồi cho vào nồi hầm 4-6 tiếng.",
    "Cho hồi, quế, đinh hương vào túi lọc, thêm vào nồi nước dùng.",
    "Nêm nước mắm, muối cho vừa ăn.",
    "Trụng bánh phở qua nước sôi, cho vào tô.",
    "Xếp thịt bò tái lên trên, chan nước dùng sôi vào tô.",
    "Thêm hành lá, giá đỗ, rau quế và tương ớt theo khẩu vị."
  ]',
  'https://images.unsplash.com/photo-1676037150408-4b1a0054b5fc?w=800'
),

-- 2. Cơm Tấm Sườn Bì Chả
(
  'Cơm Tấm Sườn Bì Chả',
  'Món chính',
  620, 32, 72, 18, 5,
  '[
    {"name": "Gạo tấm", "amount": "150g"},
    {"name": "Sườn heo", "amount": "150g"},
    {"name": "Bì heo", "amount": "50g"},
    {"name": "Trứng hấp (chả)", "amount": "1 miếng"},
    {"name": "Sả, tỏi, nước mắm", "amount": "nêm vừa"},
    {"name": "Dưa leo, cà chua", "amount": "garnish"},
    {"name": "Nước mắm chua ngọt", "amount": "3 muỗng canh"}
  ]',
  '[
    "Ướp sườn với tỏi băm, sả băm, nước mắm, đường trong 2 tiếng.",
    "Nướng sườn trên than hoa hoặc lò nướng ở 200°C đến khi vàng đều.",
    "Trộn bì heo xé sợi với thính gạo rang.",
    "Hấp trứng và tôm thịt bằm làm chả.",
    "Nấu gạo tấm chín dẻo.",
    "Bày cơm ra dĩa, xếp sườn, bì, chả lên trên.",
    "Pha nước mắm chua ngọt dùng kèm."
  ]',
  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800'
),

-- 3. Bún Bò Huế
(
  'Bún Bò Huế',
  'Món chính',
  520, 30, 60, 14, 2,
  '[
    {"name": "Bún tươi", "amount": "200g"},
    {"name": "Thịt bò bắp", "amount": "100g"},
    {"name": "Giò heo", "amount": "1 khúc"},
    {"name": "Xả", "amount": "3 cây"},
    {"name": "Mắm ruốc Huế", "amount": "2 muỗng canh"},
    {"name": "Ớt bột, dầu điều", "amount": "nêm vừa"},
    {"name": "Hành tím, tỏi", "amount": "5 củ"},
    {"name": "Rau sống các loại", "amount": "tùy ý"}
  ]',
  '[
    "Hầm xương bò và giò heo 3-4 tiếng lấy nước dùng trong.",
    "Phi thơm sả, tỏi, hành tím với dầu điều.",
    "Cho mắm ruốc pha loãng vào nước dùng, nêm thêm ớt bột.",
    "Nêm nếm cho vừa vị cay - mặn - thơm đặc trưng Huế.",
    "Trụng bún qua nước sôi, cho vào tô.",
    "Xếp thịt bò thái lát và giò heo vào tô.",
    "Chan nước dùng sôi, thêm sả cây thái mỏng và ớt tươi."
  ]',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800'
),

-- 4. Cá Kho Tộ
(
  'Cá Kho Tộ',
  'Món chính',
  380, 35, 15, 20, 8,
  '[
    {"name": "Cá basa hoặc cá thu", "amount": "300g"},
    {"name": "Nước dừa tươi", "amount": "200ml"},
    {"name": "Nước mắm", "amount": "3 muỗng canh"},
    {"name": "Đường nâu", "amount": "2 muỗng canh"},
    {"name": "Tỏi, ớt", "amount": "5 tép tỏi, 2 trái ớt"},
    {"name": "Tiêu, gừng", "amount": "nêm vừa"},
    {"name": "Hành lá", "amount": "2 cây"}
  ]',
  '[
    "Cá rửa sạch, cắt khúc, ướp với nước mắm, đường, tiêu 30 phút.",
    "Phi thơm tỏi và ớt trong nồi đất.",
    "Cho cá vào, thêm nước dừa tươi ngập mặt cá.",
    "Kho lửa lớn đến khi sôi, hạ lửa nhỏ kho tiếp 30 phút.",
    "Kho đến khi nước cạn sệt, cá thấm vị và có màu vàng đỏ đẹp.",
    "Rắc hành lá và tiêu lên trên trước khi tắt bếp."
  ]',
  'https://images.unsplash.com/photo-1562802378-063ec186a863?w=800'
),

-- 5. Gỏi Cuốn Tôm Thịt
(
  'Gỏi Cuốn Tôm Thịt',
  'Món chính',
  220, 18, 28, 4, 2,
  '[
    {"name": "Bánh tráng gạo", "amount": "6 tờ"},
    {"name": "Tôm sú luộc", "amount": "12 con"},
    {"name": "Thịt heo luộc", "amount": "100g"},
    {"name": "Bún tươi", "amount": "100g"},
    {"name": "Rau xà lách, rau thơm, giá đỗ", "amount": "tùy ý"},
    {"name": "Dưa leo", "amount": "1 trái"},
    {"name": "Tương hoisin, đậu phộng rang", "amount": "chấm kèm"}
  ]',
  '[
    "Tôm luộc chín, bóc vỏ, chẻ đôi theo chiều dọc.",
    "Thịt heo luộc chín, để nguội, thái mỏng.",
    "Nhúng bánh tráng qua nước ấm cho mềm.",
    "Trải bánh tráng ra mặt phẳng, xếp rau xà lách, bún, rau thơm, giá lên trên.",
    "Đặt thịt và tôm vào giữa, cuộn chặt tay.",
    "Pha tương hoisin với nước ấm và đậu phộng rang để chấm."
  ]',
  'https://images.unsplash.com/photo-1569562211093-4ed0d0758359?w=800'
),

-- 6. Bánh Mì Thịt Nguội
(
  'Bánh Mì Thịt Nguội',
  'Món chính',
  410, 20, 48, 14, 4,
  '[
    {"name": "Bánh mì cọng", "amount": "1 ổ"},
    {"name": "Chả lụa", "amount": "50g"},
    {"name": "Thịt nguội", "amount": "50g"},
    {"name": "Pate gan", "amount": "2 muỗng canh"},
    {"name": "Dưa chua (cà rốt, củ cải)", "amount": "50g"},
    {"name": "Dưa leo, ớt, rau mùi", "amount": "tùy ý"},
    {"name": "Tương ớt, mayo", "amount": "nêm vừa"}
  ]',
  '[
    "Nướng bánh mì trong lò 180°C đến khi vỏ giòn.",
    "Rạch dọc bánh mì, phết pate và mayo vào bên trong.",
    "Xếp thịt nguội, chả lụa vào bánh.",
    "Thêm dưa chua, dưa leo và rau mùi.",
    "Rưới tương ớt lên trên, kẹp lại và thưởng thức."
  ]',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
),

-- 7. Hủ Tiếu Nam Vang
(
  'Hủ Tiếu Nam Vang',
  'Món chính',
  490, 26, 58, 12, 3,
  '[
    {"name": "Hủ tiếu khô", "amount": "150g"},
    {"name": "Thịt heo bằm", "amount": "80g"},
    {"name": "Tôm khô", "amount": "30g"},
    {"name": "Xương heo", "amount": "300g"},
    {"name": "Hành phi, tỏi phi", "amount": "2 muỗng canh"},
    {"name": "Cải xanh, giá đỗ", "amount": "100g"},
    {"name": "Nước mắm, đường, tiêu", "amount": "nêm vừa"}
  ]',
  '[
    "Hầm xương heo 2 tiếng lấy nước dùng ngọt thanh.",
    "Trụng hủ tiếu qua nước sôi đến khi mềm.",
    "Xào thịt bằm với tỏi phi, nêm nước mắm.",
    "Cho cải xanh và giá vào nước dùng sôi trụng sơ.",
    "Cho hủ tiếu vào tô, chan nước dùng.",
    "Xếp thịt bằm, tôm khô, hành phi và rau lên trên."
  ]',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800'
),

-- ===== MÓN PHỤ / SALAD =====

-- 8. Rau Muống Xào Tỏi
(
  'Rau Muống Xào Tỏi',
  'Món phụ',
  120, 5, 10, 7, 2,
  '[
    {"name": "Rau muống", "amount": "300g"},
    {"name": "Tỏi", "amount": "5 tép"},
    {"name": "Dầu ăn", "amount": "2 muỗng canh"},
    {"name": "Nước mắm, muối, đường", "amount": "nêm vừa"},
    {"name": "Ớt tươi", "amount": "1-2 trái (tùy khẩu vị)"}
  ]',
  '[
    "Rau muống nhặt sạch, bẻ thành từng khúc 5cm.",
    "Băm nhỏ tỏi.",
    "Đun nóng dầu trong chảo, phi thơm tỏi.",
    "Cho rau muống vào xào lửa lớn trong 2-3 phút.",
    "Nêm nước mắm, muối, đường cho vừa ăn.",
    "Cho ớt vào xào thêm 30 giây rồi tắt bếp."
  ]',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'
),

-- 9. Trứng Chiên Hành Lá
(
  'Trứng Chiên Hành Lá',
  'Món phụ',
  180, 12, 2, 14, 1,
  '[
    {"name": "Trứng gà", "amount": "2 quả"},
    {"name": "Hành lá", "amount": "3 cây"},
    {"name": "Dầu ăn", "amount": "1 muỗng canh"},
    {"name": "Muối, tiêu", "amount": "nêm vừa"},
    {"name": "Nước mắm", "amount": "1 muỗng canh"}
  ]',
  '[
    "Đập trứng vào tô, thêm muối tiêu, đánh đều.",
    "Hành lá rửa sạch, thái nhỏ.",
    "Trộn hành lá vào hỗn hợp trứng.",
    "Đun nóng dầu trong chảo nhỏ.",
    "Đổ hỗn hợp trứng vào, chiên lửa vừa đến khi vàng đều hai mặt.",
    "Dùng kèm cơm trắng và nước mắm."
  ]',
  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800'
),

-- 10. Canh Chua Cá Lóc
(
  'Canh Chua Cá Lóc',
  'Món phụ',
  210, 22, 18, 6, 6,
  '[
    {"name": "Cá lóc", "amount": "300g"},
    {"name": "Me chua", "amount": "50g"},
    {"name": "Cà chua", "amount": "2 trái"},
    {"name": "Dứa (thơm)", "amount": "100g"},
    {"name": "Giá đỗ, cọng bạc hà", "amount": "100g"},
    {"name": "Ngò gai, ngò om", "amount": "tùy ý"},
    {"name": "Nước mắm, đường, muối", "amount": "nêm vừa"}
  ]',
  '[
    "Nấu me với nước nóng, lọc lấy nước chua.",
    "Đun sôi nước, cho me vào tạo vị chua nền.",
    "Cá lóc làm sạch, cắt khúc, cho vào nồi nước đang sôi.",
    "Thêm cà chua và dứa đã cắt miếng.",
    "Nêm nước mắm, đường, muối cho vừa vị chua ngọt.",
    "Cho bạc hà và giá vào, đun thêm 2 phút.",
    "Tắt bếp, thêm ngò gai và ngò om."
  ]',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800'
),

-- ===== TRÁNG MIỆNG =====

-- 11. Chè Đậu Xanh
(
  'Chè Đậu Xanh',
  'Tráng miệng',
  260, 8, 48, 5, 20,
  '[
    {"name": "Đậu xanh cà vỏ", "amount": "150g"},
    {"name": "Đường phèn", "amount": "60g"},
    {"name": "Nước dừa", "amount": "200ml"},
    {"name": "Nước lá dứa", "amount": "100ml"},
    {"name": "Muối", "amount": "1/4 muỗng cà phê"}
  ]',
  '[
    "Ngâm đậu xanh 2 tiếng, rửa sạch.",
    "Hầm đậu xanh với nước và chút muối đến khi mềm.",
    "Thêm đường phèn, khuấy tan.",
    "Cho nước dừa và nước lá dứa vào, đun thêm 5 phút.",
    "Có thể dùng nóng hoặc để nguội rồi cho đá vào."
  ]',
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800'
),

-- 12. Bánh Flan (Bánh Caramen)
(
  'Bánh Flan Caramen',
  'Tráng miệng',
  220, 7, 30, 8, 25,
  '[
    {"name": "Trứng gà", "amount": "3 quả"},
    {"name": "Sữa tươi không đường", "amount": "300ml"},
    {"name": "Đường trắng", "amount": "80g"},
    {"name": "Vani", "amount": "1 ống"},
    {"name": "Nước", "amount": "2 muỗng canh (thắng caramen)"}
  ]',
  '[
    "Thắng 40g đường với nước đến khi có màu hổ phách, đổ vào khuôn.",
    "Đánh tan trứng với 40g đường còn lại.",
    "Đun sữa ấm (~60°C), từ từ đổ vào hỗn hợp trứng, khuấy đều.",
    "Lọc hỗn hợp qua rây, thêm vani.",
    "Đổ vào khuôn đã có caramen.",
    "Hấp cách thủy hoặc nướng bain-marie ở 160°C trong 40 phút.",
    "Để nguội, lật khuôn ra đĩa và thưởng thức."
  ]',
  'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=800'
),

-- ===== NƯỚC UỐNG / SMOOTHIE =====

-- 13. Sinh Tố Bơ
(
  'Sinh Tố Bơ',
  'Nước uống',
  350, 4, 28, 24, 18,
  '[
    {"name": "Bơ chín", "amount": "1 trái (khoảng 150g thịt)"},
    {"name": "Sữa đặc có đường", "amount": "2 muỗng canh"},
    {"name": "Sữa tươi", "amount": "200ml"},
    {"name": "Đá viên", "amount": "1 nắm"},
    {"name": "Đường", "amount": "nêm theo khẩu vị"}
  ]',
  '[
    "Bơ bổ đôi, lấy thịt ra tô.",
    "Cho bơ, sữa đặc, sữa tươi và đá vào máy xay.",
    "Xay nhuyễn trong 30 giây.",
    "Nếm thử, thêm đường nếu muốn ngọt hơn.",
    "Rót ra ly, dùng ngay."
  ]',
  'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800'
),

-- 14. Nước Ép Dưa Hấu
(
  'Nước Ép Dưa Hấu',
  'Nước uống',
  85, 1, 21, 0, 17,
  '[
    {"name": "Dưa hấu", "amount": "400g (đã bỏ vỏ, hột)"},
    {"name": "Đá viên", "amount": "1 nắm"},
    {"name": "Muối", "amount": "1 nhúm nhỏ"},
    {"name": "Chanh", "amount": "1/2 trái (tùy ý)"}
  ]',
  '[
    "Dưa hấu bỏ vỏ, hột, cắt miếng nhỏ.",
    "Cho dưa hấu vào máy xay hoặc máy ép.",
    "Cho đá và chút muối vào, xay đều.",
    "Vắt thêm chanh nếu muốn vị chua nhẹ.",
    "Rót ra ly và thưởng thức."
  ]',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800'
),

-- ===== MÓN ĂN SÁNG =====

-- 15. Xôi Gà
(
  'Xôi Gà',
  'Món ăn sáng',
  520, 28, 68, 12, 2,
  '[
    {"name": "Nếp", "amount": "200g"},
    {"name": "Thịt gà", "amount": "150g"},
    {"name": "Hành phi", "amount": "2 muỗng canh"},
    {"name": "Dầu ăn, nước mắm", "amount": "nêm vừa"},
    {"name": "Muối, tiêu", "amount": "nêm vừa"},
    {"name": "Lá dứa", "amount": "2 lá"}
  ]',
  '[
    "Ngâm nếp 4-6 tiếng, để ráo.",
    "Hấp nếp cùng lá dứa đến khi chín dẻo (25-30 phút).",
    "Luộc gà chín, xé sợi, tẩm nêm với nước mắm, tiêu.",
    "Trộn hành phi vào nếp, nêm muối.",
    "Cho xôi ra đĩa, xếp gà xé phai lên trên.",
    "Rắc hành phi và tiêu, dùng kèm nước mắm gừng."
  ]',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'
),

-- 16. Bánh Cuốn Tôm Thịt
(
  'Bánh Cuốn Tôm Thịt',
  'Món ăn sáng',
  320, 18, 42, 7, 2,
  '[
    {"name": "Bột bánh cuốn pha sẵn", "amount": "200g"},
    {"name": "Thịt heo bằm", "amount": "100g"},
    {"name": "Nấm mèo", "amount": "30g"},
    {"name": "Hành lá, hành phi", "amount": "tùy ý"},
    {"name": "Nước mắm chua ngọt", "amount": "chấm kèm"},
    {"name": "Chả lụa, giá đỗ", "amount": "ăn kèm"}
  ]',
  '[
    "Pha bột bánh cuốn với nước theo tỷ lệ 1:3.",
    "Xào nhân: phi hành, cho thịt bằm và nấm mèo vào xào chín.",
    "Tráng bánh trên khuôn hơi nước, cho nhân vào cuộn lại.",
    "Pha nước mắm chua ngọt với tỏi ớt.",
    "Dọn bánh cuốn ra đĩa cùng chả lụa, giá đỗ, hành phi.",
    "Chan nước mắm lên trước khi ăn."
  ]',
  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800'
),

-- 17. Cháo Gà
(
  'Cháo Gà',
  'Món ăn sáng',
  290, 20, 38, 5, 1,
  '[
    {"name": "Gạo tẻ", "amount": "80g"},
    {"name": "Thịt gà", "amount": "150g"},
    {"name": "Gừng tươi", "amount": "1 nhánh"},
    {"name": "Hành lá, ngò rí", "amount": "tùy ý"},
    {"name": "Nước mắm, muối, tiêu", "amount": "nêm vừa"},
    {"name": "Hành phi", "amount": "1 muỗng canh"}
  ]',
  '[
    "Luộc gà với gừng đến khi chín, lấy nước dùng.",
    "Vo gạo, nấu với nước dùng gà theo tỷ lệ 1:10.",
    "Khuấy đều để cháo không bị vón, nấu lửa nhỏ 20-25 phút.",
    "Gà xé sợi nhỏ, trộn với chút nước mắm và tiêu.",
    "Cho gà vào cháo, nêm nêm vừa ăn.",
    "Múc ra tô, thêm hành lá, ngò, hành phi và tiêu."
  ]',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800'
),

-- 18. Mì Quảng
(
  'Mì Quảng',
  'Món chính',
  480, 25, 55, 15, 3,
  '[
    {"name": "Sợi mì Quảng", "amount": "200g"},
    {"name": "Tôm sú", "amount": "100g"},
    {"name": "Thịt gà hoặc heo", "amount": "100g"},
    {"name": "Trứng cút", "amount": "3 quả"},
    {"name": "Nghệ tươi hoặc bột nghệ", "amount": "1 muỗng cà phê"},
    {"name": "Đậu phộng rang, bánh đa", "amount": "2 muỗng canh"},
    {"name": "Rau sống các loại, chuối sứ", "amount": "tùy ý"}
  ]',
  '[
    "Nấu nước dùng từ xương với nghệ cho màu vàng đặc trưng.",
    "Xào tôm và thịt với tỏi, nêm nước mắm.",
    "Trụng mì Quảng qua nước sôi.",
    "Cho mì vào tô, xếp tôm, thịt, trứng cút lên trên.",
    "Chan ít nước dùng (mì Quảng ít nước hơn các loại khác).",
    "Thêm đậu phộng rang, bánh đa bóp vụn và rau sống."
  ]',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800'
),

-- 19. Bún Chả Hà Nội
(
  'Bún Chả Hà Nội',
  'Món chính',
  540, 30, 52, 20, 8,
  '[
    {"name": "Bún tươi", "amount": "200g"},
    {"name": "Thịt heo bằm làm chả viên", "amount": "100g"},
    {"name": "Ba chỉ heo làm chả miếng", "amount": "100g"},
    {"name": "Nước mắm ngon", "amount": "3 muỗng canh"},
    {"name": "Đường, giấm, tỏi, ớt", "amount": "nêm vừa"},
    {"name": "Rau sống (xà lách, kinh giới, tía tô)", "amount": "tùy ý"},
    {"name": "Nem cuốn hoặc nem rán ăn kèm", "amount": "2 cái (tùy ý)"}
  ]',
  '[
    "Ướp thịt với nước mắm, đường, tỏi, sả băm trong 1 tiếng.",
    "Nặn chả viên từ thịt bằm.",
    "Nướng chả trên than hoa hoặc lò nướng đến khi thơm vàng.",
    "Pha nước chấm: nước mắm + đường + giấm + nước ấm + tỏi ớt.",
    "Chan nước chấm vào bát, nhúng chả vào nước chấm ngay khi còn nóng.",
    "Dùng kèm bún và rau sống xanh."
  ]',
  'https://images.unsplash.com/photo-1569562211093-4ed0d0758359?w=800'
),

-- 20. Súp Yến Mạch Trái Cây (Healthy)
(
  'Yến Mạch Trái Cây',
  'Món ăn sáng',
  310, 10, 52, 8, 15,
  '[
    {"name": "Yến mạch cán dẹt", "amount": "80g"},
    {"name": "Sữa hạnh nhân hoặc sữa tươi", "amount": "250ml"},
    {"name": "Chuối", "amount": "1 trái"},
    {"name": "Dâu tây", "amount": "5-6 trái"},
    {"name": "Mật ong", "amount": "1 muỗng canh"},
    {"name": "Hạt chia", "amount": "1 muỗng cà phê"},
    {"name": "Hạt óc chó hoặc hạnh nhân", "amount": "1 muỗng canh"}
  ]',
  '[
    "Nấu yến mạch với sữa trên lửa vừa, khuấy đều trong 5 phút.",
    "Cho ra tô khi cháo đặc sệt vừa ý.",
    "Chuối và dâu tây rửa sạch, cắt lát.",
    "Xếp trái cây lên trên yến mạch.",
    "Rưới mật ong, rắc hạt chia và hạt óc chó lên trên.",
    "Thưởng thức nóng hoặc lạnh đều ngon."
  ]',
  'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800'
);

COMMIT;
