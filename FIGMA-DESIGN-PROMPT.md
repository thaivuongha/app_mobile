# Figma Design Prompt — Mobile App Quản lý Vending Machine

## 📋 Tổng quan dự án

**Tên app**: Vending Machine Management (tên chính thức có thể thay đổi)  
**Đối tượng người dùng**: Chủ khách sạn (Owner)  
**Mục đích**: Quản lý thiết bị vending machine, theo dõi bán hàng, đặt hàng nhập hàng, cài đặt thanh toán và lợi nhuận

---

## 🏗️ Cấu trúc App (Sau khi đăng nhập)

App sử dụng **Bottom Tab Navigation** với **4 tabs chính**:

### Tab 1: **Home** 🏠
- **Màn hình chính**: Danh sách thiết bị dạng **lưới (Grid)** - 2 cột
- **Nút "+"** (top right hoặc FAB): Claim thiết bị mới
- **Tương tác**: Tap vào card thiết bị → **Popup/Bottom Sheet** hiển thị sản phẩm trong 4 khe của máy
- **Chức năng**: Quản lý thiết bị, xem trạng thái realtime (pin, online, nhiệt độ), xem sản phẩm trong máy

### Tab 2: **Shop** 🛒
- **Màn hình chính**: Catalog sản phẩm (danh sách/grid)
- **Nút top right**: 
  - Icon **giỏ hàng** (với badge số lượng)
  - Icon **đơn hàng** (với badge số đơn đang chờ)
- **Chức năng**: Mua hàng, quản lý giỏ hàng, đặt đơn, theo dõi đơn hàng, cài đặt địa chỉ giao hàng

### Tab 3: **Doanh thu** 💰
- **Màn hình chính**: 
  - **Tab "Lịch sử"**: Danh sách giao dịch bán hàng
  - **Tab "Tổng hợp"**: Biểu đồ doanh thu (tuần/tháng/năm)
- **Cài đặt** (icon ⚙️ hoặc menu):
  - Thông tin thanh toán (với OTP)
  - Xuất hóa đơn
  - Phần trăm lợi nhuận
- **Chức năng**: Xem lịch sử bán hàng, tổng hợp doanh thu, cài đặt thanh toán/hóa đơn/lợi nhuận

### Tab 4: **Me** 👤
- **Màn hình chính**: Hồ sơ cá nhân (avatar, tên, SĐT)
- **Menu**: Chỉnh sửa hồ sơ, Đổi mật khẩu, Cài đặt thông báo, Ngôn ngữ, Về ứng dụng, Đăng xuất
- **Chức năng**: Quản lý tài khoản, cài đặt cá nhân

---

## 👤 User Personas

### Persona chính: Chủ khách sạn (Owner)

**Đặc điểm**:
- Tuổi: 35-55
- Có kinh nghiệm quản lý khách sạn, nhưng có thể không quen với công nghệ phức tạp
- Cần app đơn giản, dễ sử dụng, thao tác nhanh
- Quan tâm đến: doanh thu, trạng thái máy, quản lý hàng hóa
- Sử dụng điện thoại Android/iOS hàng ngày

**Pain points**:
- Cần theo dõi nhiều máy cùng lúc
- Muốn biết máy có hoạt động tốt không (pin, online, nhiệt độ)
- Cần đặt hàng nhanh khi hết hàng
- Muốn xem doanh thu rõ ràng

**Goals**:
- Quản lý thiết bị hiệu quả
- Theo dõi doanh thu và lợi nhuận
- Đặt hàng dễ dàng
- Cài đặt thanh toán an toàn

---

## 🎯 User Flows chính

### Flow 1: Onboarding & Claim thiết bị
1. Đăng ký/Đăng nhập (SĐT + mật khẩu)
2. Xác thực SĐT (SMS OTP)
3. Vào **Tab Home** → Nhấn nút "+" (top right)
4. **Claim thiết bị**:
   - Đặt tên máy (ví dụ: "Phòng 101")
   - Chọn lầu (Lầu 1, Lầu 2, ...)
   - Nhập Serial Number (từ thẻ trong hộp)
   - Nhập Owner Key (từ thẻ trong hộp)
5. Xác nhận → Thiết bị xuất hiện trong danh sách Home
6. Cài đặt thông tin thanh toán (trong Tab Doanh thu) - bắt buộc để máy có thể bán hàng

### Flow 2: Quản lý thiết bị hàng ngày (Tab Home)
1. Mở app → **Tab Home** (màn hình chính)
2. Xem danh sách thiết bị dạng lưới (grid 2 cột)
3. Tap vào card thiết bị → **Popup hiển thị sản phẩm trong máy**:
   - Xem 4 khe và sản phẩm trong từng khe
   - Thông tin máy: trạng thái, pin, nhiệt độ
4. Đóng popup → Quay về danh sách
5. Nhấn nút "+" để claim thêm máy mới (nếu có)

### Flow 3: Đặt hàng nhập hàng (Tab Shop)
1. Chuyển sang **Tab Shop**
2. Xem catalog sản phẩm (hình ảnh, giá, mô tả)
3. Thêm sản phẩm vào giỏ (tap nút "Thêm vào giỏ")
4. Nhấn icon **giỏ hàng** (top right) → Xem giỏ hàng
5. Nhấn "Tiếp tục" → Chọn/nhập địa chỉ giao hàng
   - Chọn từ danh sách đã lưu, hoặc
   - "Thêm địa chỉ mới" (có thể truy cập từ menu Shop)
6. Xác nhận đơn → Đặt hàng
7. Nhấn icon **đơn hàng** (top right) → Xem danh sách đơn
8. Tap vào đơn → Chi tiết đơn (theo dõi: PENDING → CONFIRMED → SHIPPED → DELIVERED)

### Flow 4: Xem doanh thu & bán hàng (Tab Doanh thu)
1. Chuyển sang **Tab Doanh thu**
2. **Tab "Lịch sử"**:
   - Xem danh sách giao dịch (filter theo máy, thời gian)
   - Tap vào giao dịch → Chi tiết (nếu có)
3. **Tab "Tổng hợp"**:
   - Chọn xem theo **Tuần** / **Tháng** / **Năm**
   - Chọn khoảng thời gian
   - Xem biểu đồ doanh thu (Bar/Line chart)
   - Xem bảng chi tiết theo từng kỳ
4. **Cài đặt** (icon ⚙️ hoặc menu):
   - Cài đặt thông tin thanh toán (với OTP)
   - Cài đặt xuất hóa đơn
   - Cài đặt phần trăm lợi nhuận

### Flow 5: Cài đặt thanh toán (trong Tab Doanh thu)
1. Vào **Tab Doanh thu** → Menu/Cài đặt → "Thông tin thanh toán"
2. Xem danh sách phương thức thanh toán (masked)
3. Thêm phương thức mới:
   - Bước 1: Gửi OTP (POST request-otp)
   - Bước 2: Nhập OTP + thông tin (loại, STK, ngân hàng)
   - Xác nhận → Lưu
4. Sửa/Xóa phương thức (cũng cần OTP)

---

## 📱 Danh sách màn hình cần thiết kế

### 🔐 Nhóm Auth (chưa đăng nhập)

#### 1. Splash Screen / Welcome
- Logo app
- Tagline ngắn gọn
- Nút "Bắt đầu" hoặc tự chuyển sau 2-3 giây

#### 2. Đăng nhập (Login)
- Input: Số điện thoại
- Input: Mật khẩu (có nút hiện/ẩn)
- Checkbox "Ghi nhớ đăng nhập" (tùy chọn)
- Nút "Đăng nhập"
- Link "Quên mật khẩu?"
- Link "Chưa có tài khoản? Đăng ký"

#### 3. Đăng ký (Register)
- Input: Số điện thoại
- Input: Mật khẩu (validation: min 8 ký tự)
- Input: Xác nhận mật khẩu
- Checkbox đồng ý điều khoản
- Nút "Đăng ký"
- Link "Đã có tài khoản? Đăng nhập"

#### 4. Quên mật khẩu (Forgot Password)
- Input: Số điện thoại
- Nút "Gửi OTP"
- Thông báo: "OTP đã gửi đến SĐT ..."
- Input: Mã OTP (6 số)
- Nút "Xác nhận"
- Link "Quay lại đăng nhập"

#### 5. Reset mật khẩu (Reset Password)
- Input: Mật khẩu mới
- Input: Xác nhận mật khẩu mới
- Nút "Đặt lại mật khẩu"
- Thông báo thành công → Chuyển về Login

---

### 🏠 Tab Home (sau khi đăng nhập)

#### 6. Home - Danh sách thiết bị (Grid Layout)
**Nội dung**:
- Header: "Thiết bị" hoặc "Trang chủ"
- **Nút "+" (FAB hoặc top right)**: Để claim thiết bị mới
- **Danh sách thiết bị dạng lưới (Grid)**:
  - Layout: 2 cột (hoặc responsive)
  - Mỗi card thiết bị hiển thị:
    - Tên máy (hoặc Serial nếu chưa đặt tên)
    - Lầu (nếu đã chọn khi claim)
    - Trạng thái: Online/Offline badge (màu xanh/xám)
    - Pin: % + icon pin
    - Số khe có hàng: "2/4 khe" hoặc icon
    - Nhiệt độ (nếu có, hiển thị nhỏ)
  - Tap vào card → **Popup/Bottom Sheet** hiển thị sản phẩm trong máy
- Pull to refresh
- Empty state: "Chưa có thiết bị nào" + nút "Thêm máy"

#### 7. Popup sản phẩm trong máy (Device Products Popup)
**Hiển thị khi tap vào card thiết bị**:
- **Modal/Bottom Sheet** từ dưới lên hoặc center
- Header: Tên máy + Serial + Nút đóng (X)
- Thông tin máy (nếu cần):
  - Trạng thái: Online/Offline
  - Pin: %
  - Nhiệt độ
- **Danh sách 4 khe** (Grid 2x2 hoặc List):
  - Mỗi khe hiển thị:
    - Slot số (1, 2, 3, 4)
    - Hình ảnh sản phẩm (nếu có)
    - Tên sản phẩm
    - Thương hiệu
    - Giá bán (finalPrice)
    - Trạng thái: "Có hàng" / "Trống"
- Nút "Xem chi tiết máy" (nếu cần mở màn chi tiết đầy đủ)
- Nút đóng popup

#### 8. Claim thiết bị (Add Device)
**Màn hình mới khi nhấn nút "+"**:
- Header: "Thêm thiết bị mới" + Nút đóng
- Hướng dẫn: "Nhập thông tin từ thẻ trong hộp thiết bị"
- **Input: Đặt tên** (ví dụ: "Phòng 101", "Lễ tân", "Sảnh chính")
  - Placeholder: "Nhập tên máy (ví dụ: Phòng 101)"
  - Gợi ý: "Bạn có thể đặt tên theo phòng để dễ quản lý"
- **Picker/Dropdown: Chọn lầu**
  - Options: Lầu 1, Lầu 2, Lầu 3, ... (hoặc số tự do)
  - Có thể thêm "Không chọn" hoặc "Tầng trệt"
  - Mục đích: Sắp xếp thiết bị theo lầu
- **Input: Serial Number**
  - Label: "Số Serial"
  - Placeholder: "Nhập số serial từ thẻ"
- **Input: Owner Key** (6 ký tự)
  - Label: "Owner Key"
  - Placeholder: "Nhập Owner Key từ thẻ"
- Nút "Xác nhận" (Primary)
- Thông báo lỗi nếu sai Serial/Owner Key
- Sau khi claim thành công → Toast "Đã thêm thiết bị thành công" → Quay về Home

#### 9. Chi tiết thiết bị (Device Detail)
**Tab 1: Tổng quan**
- Header: Tên máy + Serial
- Card trạng thái realtime:
  - Online/Offline badge (cập nhật realtime)
  - Pin: % + icon pin
  - Nhiệt độ: °C + icon
  - Lần cập nhật cuối: "Cập nhật lúc ..."
- Nút "Làm mới"
- Nút "Cài đặt máy" (đổi tên, status)

**Tab 2: Khe máy (4 khe)**
- Grid 2x2 hoặc List 4 items:
  - Mỗi khe: Slot số, hình ảnh sản phẩm (nếu có), tên SP, giá, trạng thái (Có hàng/Trống)
- Chỉ xem (không có nút gán khe — thiết bị tự detect qua NFC)

**Tab 3: Lịch sử (tùy chọn)**
- Lịch sử giao dịch của máy này

#### 10. Cài đặt thiết bị (Device Settings)
- Input: Tên máy
- Dropdown: Trạng thái (ACTIVE, INACTIVE, MAINTENANCE)
- Nút "Lưu"
- Nút "Xóa thiết bị" (cảnh báo)

---

### 🛒 Tab Shop (Mua hàng & Đơn hàng)

#### 11. Shop - Catalog sản phẩm
**Nội dung**:
- Header: "Mua hàng" hoặc "Cửa hàng"
- **Top right**: 
  - **Nút giỏ hàng** (icon giỏ + badge số lượng nếu có)
  - **Nút đơn hàng** (icon đơn hàng + badge số đơn đang chờ nếu có)
- Search bar (tìm theo tên sản phẩm)
- Filter: Danh mục (category) - Tab hoặc dropdown
- **Grid hoặc List items**:
  - Hình ảnh sản phẩm
  - Tên sản phẩm
  - Thương hiệu
  - Giá (giá gốc owner mua vào)
  - Mô tả ngắn (rút gọn)
  - Nút "Thêm vào giỏ"
- Pull to refresh
- Pagination (load more)
- Empty state: "Không có sản phẩm nào"

#### 12. Chi tiết sản phẩm (Product Detail) — Tùy chọn
- Hình ảnh lớn
- Tên + Thương hiệu
- Giá
- Mô tả đầy đủ
- Nút "Thêm vào giỏ"
- Nút "Mua ngay"

#### 13. Giỏ hàng (Cart)
- List items:
  - Hình ảnh nhỏ
  - Tên SP
  - Giá
  - Số lượng (tăng/giảm)
  - Tổng tiền item
  - Nút xóa
- Tổng tiền đơn hàng
- Nút "Tiếp tục" → Chọn địa chỉ giao hàng

#### 14. Chọn địa chỉ giao hàng (Delivery Address Selection)
**Màn này có thể truy cập từ Shop tab hoặc trong flow checkout**:
- Header: "Chọn địa chỉ giao hàng" + Nút đóng
- List địa chỉ đã lưu:
  - Tên người nhận
  - SĐT
  - Địa chỉ chi tiết
  - Badge "Mặc định" (nếu có)
  - Radio button chọn
- Nút "Thêm địa chỉ mới" (Primary)
- Nút "Xác nhận" (khi đã chọn)
- Empty state: "Chưa có địa chỉ nào" + nút "Thêm địa chỉ"

#### 15. Form địa chỉ giao hàng (Add/Edit Delivery Address)
**Có thể truy cập từ Shop tab (menu/cài đặt) hoặc trong flow checkout**:
- Header: "Thêm địa chỉ" / "Sửa địa chỉ" + Nút đóng
- Input: Tên người nhận
- Input: Số điện thoại
- Input: Địa chỉ (số nhà, đường)
- Dropdown/Picker: Phường/Xã
- Dropdown/Picker: Quận/Huyện
- Dropdown/Picker: Tỉnh/Thành
- Input: Ghi chú (optional)
- Checkbox: "Đặt làm địa chỉ mặc định"
- Nút "Lưu" (Primary)
- Validation: Hiển thị lỗi nếu thiếu thông tin

#### 15b. Danh sách địa chỉ giao hàng (trong Shop tab)
**Menu/Cài đặt trong Shop tab**:
- Header: "Địa chỉ giao hàng"
- List địa chỉ:
  - Tên người nhận, SĐT, địa chỉ
  - Badge "Mặc định"
  - Nút "Sửa"
  - Nút "Xóa"
- Nút FAB "Thêm địa chỉ"

#### 16. Xác nhận đơn hàng (Checkout)
- Tóm tắt đơn hàng:
  - Danh sách sản phẩm (tên, số lượng, giá)
  - Tổng tiền
- Thông tin giao hàng:
  - Tên người nhận
  - Địa chỉ
  - SĐT
- Input: Ghi chú đơn hàng (optional)
- Nút "Đặt hàng"
- Thông báo thành công → Chuyển về danh sách đơn

#### 17. Danh sách đơn hàng (Orders List)
- Tab filter: Tất cả / Đang chờ / Đã xác nhận / Đang giao / Đã giao / Đã hủy
- List items:
  - Mã đơn (hoặc ngày đặt)
  - Số lượng sản phẩm
  - Tổng tiền
  - Trạng thái (badge màu)
  - Ngày đặt
- Pull to refresh
- Tap item → Chi tiết đơn

#### 18. Chi tiết đơn hàng (Order Detail)
- Header: Mã đơn + Trạng thái
- Thông tin đơn:
  - Ngày đặt
  - Trạng thái timeline (PENDING → CONFIRMED → SHIPPED → DELIVERED)
- Danh sách sản phẩm:
  - Hình ảnh, tên, số lượng, giá tại thời điểm đặt
- Tổng tiền đơn hàng
- Thông tin giao hàng:
  - Tên người nhận
  - Địa chỉ đầy đủ
  - SĐT
- Ghi chú đơn hàng (nếu có)
- Nút "Hủy đơn" (chỉ khi PENDING)

---

### 💰 Tab Doanh thu (Lịch sử bán hàng & Cài đặt)

#### 19. Doanh thu - Lịch sử bán hàng
**Tab chính trong màn Doanh thu**:
- Header: "Lịch sử bán hàng"
- **Filter bar**:
  - Chọn máy (dropdown: Tất cả / Máy cụ thể)
  - Chọn khoảng thời gian (date picker: từ ngày → đến ngày)
- **List giao dịch**:
  - Thời gian (ngày, giờ)
  - Tên máy (hoặc serial) + Lầu (nếu có)
  - Tên sản phẩm
  - Số tiền (finalPrice) - highlight
  - Trạng thái (PAID badge - xanh lá)
- **Card tổng hợp** (top):
  - Tổng doanh thu trong khoảng thời gian đã chọn
  - Số giao dịch
- Pull to refresh
- Pagination (load more)
- Empty state: "Chưa có giao dịch nào"

#### 20. Doanh thu - Biểu đồ & Tổng hợp
**Tab thứ 2 trong màn Doanh thu** (có thể switch bằng tab bar):
- Header: "Tổng hợp doanh thu"
- **Tab filter**: "Tuần" / "Tháng" / "Năm"
- **Filter**:
  - Chọn khoảng thời gian (date picker hoặc preset: Tuần này, Tháng này, Năm nay)
  - Chọn máy (Tất cả / Máy cụ thể)
- **Card tổng quan**:
  - Tổng doanh thu (số lớn, highlight)
  - Số giao dịch
  - So sánh với kỳ trước (tăng/giảm %)
- **Biểu đồ**:
  - Bar chart hoặc Line chart
  - X-axis: Ngày/Tuần/Tháng (tùy tab đã chọn)
  - Y-axis: Doanh thu (VND)
  - Tooltip khi tap: Doanh thu + Số giao dịch
- **Bảng chi tiết** (optional, có thể scroll):
  - Cột: Thời gian | Doanh thu | Số giao dịch
  - Tổng cuối bảng
- Pull to refresh

#### 20b. Cài đặt trong Tab Doanh thu
**Menu/Cài đặt trong Tab Doanh thu** (có thể là icon ⚙️ top right hoặc section riêng):
- **Cài đặt thông tin thanh toán** (→ màn 23, 24, 25)
- **Cài đặt xuất hóa đơn** (→ màn 26)
- **Cài đặt phần trăm lợi nhuận** (→ màn 27)

---

### ⚙️ Cài đặt (trong các Tab)

**Lưu ý**: Các cài đặt được phân bổ vào các tab phù hợp:
- **Địa chỉ giao hàng**: Trong Tab Shop (màn 15b)
- **Thông tin thanh toán, Hóa đơn, Lợi nhuận**: Trong Tab Doanh thu (màn 20b)
- **Cài đặt cá nhân, Đăng xuất**: Trong Tab Me

#### 23. Danh sách phương thức thanh toán (Payment Methods List)
- Header: "Thông tin thanh toán"
- Cảnh báo: "Cần cài đặt để máy có thể tạo mã QR thanh toán"
- List phương thức:
  - Loại (BANK_TRANSFER, MOMO, VNPAY...)
  - Tên ngân hàng
  - Số tài khoản (masked: ****1234)
  - Badge "Mặc định" (nếu có)
  - Nút "Sửa"
  - Nút "Xóa"
- Nút "Thêm phương thức" → Màn 24

#### 24. Gửi OTP thanh toán (Request Payment OTP)
- Header: "Xác thực OTP"
- Thông báo: "OTP đã gửi đến SĐT ..."
- Input: Mã OTP (6 số)
- Nút "Xác nhận"
- Nút "Gửi lại OTP" (đếm ngược 60s, rate limit 3 lần/15 phút)
- Thông báo lỗi nếu sai/hết hạn

#### 25. Form thêm/sửa phương thức thanh toán (Add/Edit Payment Method)
- Dropdown: Loại thanh toán (BANK_TRANSFER, MOMO, VNPAY...)
- Input: Số tài khoản
- Input: Tên ngân hàng (hoặc autocomplete nếu có)
- Checkbox: "Đặt làm phương thức mặc định"
- Nút "Lưu"
- Lưu ý: Cần OTP trước khi lưu (màn 24)

#### 26. Cài đặt hóa đơn (Invoice Settings)
- Input: Tên công ty
- Input: Mã số thuế
- Input: Tiền tố hóa đơn (invoice prefix)
- Input: VAT rate (%)
- Nút "Lưu"

#### 27. Cài đặt lợi nhuận (Commission Settings)
- Header: "Quy tắc lợi nhuận"
- Thông báo: "Áp dụng cho giá bán trên máy"
- List quy tắc:
  - Tên quy tắc
  - Loại: % hoặc Số tiền cố định
  - Giá trị
  - Áp dụng cho: Sản phẩm cụ thể / Danh mục / Mặc định
  - Trạng thái: Active/Inactive
  - Nút "Sửa"
  - Nút "Xóa"
- Nút "Thêm quy tắc"
- Form thêm/sửa:
  - Input: Tên quy tắc
  - Radio: Loại (PERCENTAGE / FIXED_AMOUNT)
  - Input: Giá trị
  - Multi-select: Áp dụng cho sản phẩm (optional)
  - Multi-select: Áp dụng cho danh mục (optional)
  - Checkbox: "Quy tắc mặc định"
  - Toggle: Active
  - Date picker: Ngày bắt đầu / Kết thúc (optional)
  - Input: Độ ưu tiên (priority)
  - Nút "Lưu"

---

### 👤 Tab Me (Tài khoản & Cài đặt cá nhân)

#### 28. Me - Hồ sơ & Cài đặt
**Màn hình chính Tab Me**:
- **Header**: Avatar lớn (có thể tap để upload)
- **Thông tin cá nhân**:
  - Tên (họ tên)
  - Số điện thoại
  - Email (nếu có)
- **Menu list**:
  - "Chỉnh sửa hồ sơ" (→ màn 29)
  - "Đổi mật khẩu" (→ màn 30)
  - "Cài đặt thông báo"
  - "Ngôn ngữ"
  - "Về ứng dụng" (version, thông tin)
  - "Điều khoản & Chính sách"
  - "Hỗ trợ"
- **Nút "Đăng xuất"** (màu đỏ, bottom hoặc trong menu)
- Divider giữa các section

#### 29. Chỉnh sửa hồ sơ (Edit Profile)
**Stack từ Tab Me**:
- Header: "Chỉnh sửa hồ sơ" + Nút "Lưu" (top right)
- **Upload avatar**:
  - Avatar lớn (center)
  - Nút "Thay đổi ảnh" (camera/gallery)
- Input: Họ tên
- Input: Email (optional)
- Input: Số điện thoại (disabled, hiển thị nhưng không sửa được)
- Validation: Hiển thị lỗi nếu thiếu thông tin
- Toast "Đã lưu thành công" khi save

#### 30. Đổi mật khẩu (Change Password)
**Stack từ Tab Me**:
- Header: "Đổi mật khẩu" + Nút đóng
- Input: Mật khẩu hiện tại (password type)
- Input: Mật khẩu mới (password type, min 8 ký tự)
- Input: Xác nhận mật khẩu mới (password type)
- Validation: Hiển thị lỗi nếu không khớp
- Nút "Đổi mật khẩu" (Primary)
- Thông báo thành công → Quay về Me

---

## 🎨 Design Principles & Guidelines

### Visual Style

#### Màu sắc — EMBOX Brand Colors

> ⚠️ Bắt buộc dùng đúng bảng màu EMBOX để nhất quán với Web. Nguồn: `mobile/constants/Colors.ts`.

| Token | Hex | Dùng cho |
|-------|-----|---------|
| **Primary** | `#9333EA` (purple-600) | Nút CTA, icon active, tab active, tiêu đề nổi bật |
| **Primary Dark** | `#7E22CE` (purple-700) | Pressed / hover state |
| **Primary Light** | `#FAF5FF` (purple-50) | Nền badge, chip active, card highlight |
| **Accent / Danger** | `#EF4444` (red-500) | Nút xóa/nguy hiểm, badge count, đường gradient end |
| **Accent Light** | `#FEF2F2` (red-50) | Nền danger nhẹ |
| **Gradient** | `#9333EA` → `#EF4444` | Hero banner, logo, nút nổi bật |
| **Background** | `#F9FAFB` (gray-50) | Nền toàn trang |
| **Card** | `#FFFFFF` | Nền card, bottom sheet, modal |
| **Text Primary** | `#111827` (gray-900) | Tiêu đề, nội dung chính |
| **Text Secondary** | `#4B5563` (gray-600) | Label, mô tả phụ |
| **Text Muted** | `#9CA3AF` (gray-400) | Placeholder, thông tin mờ |
| **Border** | `#E5E7EB` (gray-200) | Viền card, divider |
| **Success** | `#10B981` (emerald-500) | Trạng thái online, xác nhận |
| **Warning** | `#F59E0B` (amber-500) | Cảnh báo pin thấp, nhiệt độ cao |

**Logo EMBOX trên Mobile**: Ô vuông gradient `#9333EA → #EF4444` với chữ "E" trắng, bên cạnh text "EMBOX" màu gray-900 (giống Web).

#### Typography
- **Font family**: System font (San Francisco trên iOS, Roboto trên Android) hoặc font custom nếu có
- **Heading 1**: 28-32px, Bold
- **Heading 2**: 24px, Bold
- **Heading 3**: 20px, SemiBold
- **Body**: 16px, Regular
- **Caption**: 14px, Regular
- **Small**: 12px, Regular

#### Spacing
- **Base unit**: 4px hoặc 8px
- **Padding**: 16px (standard), 24px (large)
- **Margin**: 8px, 16px, 24px
- **Border radius**: 8px (card), 12px (button), 4px (input)

#### Components Style

**Buttons**:
- Primary: Nền primary color, chữ trắng, padding 12-16px, border radius 8px
- Secondary: Nền trắng, viền primary, chữ primary
- Text: Chỉ chữ, không nền
- Disabled: Opacity 0.5

**Inputs**:
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 12px 16px
- Focus: Border màu primary
- Error: Border màu error

**Cards**:
- Background: Trắng
- Shadow: Nhẹ (elevation 2-4)
- Border radius: 12px
- Padding: 16px

**Badges**:
- Online: Xanh lá (#34C759)
- Offline: Xám (#999999)
- PENDING: Vàng (#FF9500)
- PAID: Xanh lá (#34C759)
- CONFIRMED: Xanh dương (#007AFF)
- SHIPPED: Tím (#AF52DE)
- DELIVERED: Xanh lá (#34C759)
- CANCELLED: Đỏ (#FF3B30)

---

## 📐 Technical Constraints

### Platform
- **iOS**: iPhone (từ iPhone 8 trở lên), hỗ trợ iOS 13+
- **Android**: Android 8.0+ (API level 26+)
- **Screen sizes**: Tối thiểu 375x667 (iPhone SE), tối đa 428x926 (iPhone 14 Pro Max)

### React Native / Expo
- Sử dụng Expo Router (file-based routing)
- Components: React Native components (View, Text, Image, ScrollView, FlatList, TextInput, Button, TouchableOpacity...)
- Navigation: Expo Router tabs và stack
- Icons: Expo Icons hoặc React Native Vector Icons
- Images: Local assets hoặc remote URLs

### Performance
- Lazy loading cho danh sách dài
- Image optimization (resize, cache)
- Pull to refresh cho danh sách
- Skeleton loading khi fetch data

---

## 🔄 States & Interactions

### Loading States
- **Skeleton screens**: Khi load danh sách lần đầu
- **Spinner**: Khi submit form, refresh
- **Pull to refresh**: Kéo xuống để làm mới

### Empty States
- **Không có thiết bị**: Illustration + text "Chưa có thiết bị nào" + nút "Thêm máy"
- **Giỏ hàng trống**: Illustration + text "Giỏ hàng trống" + nút "Mua sắm ngay"
- **Không có đơn hàng**: Illustration + text "Chưa có đơn hàng nào"
- **Không có giao dịch**: Illustration + text "Chưa có giao dịch nào"

### Error States
- **Network error**: "Không có kết nối mạng" + nút "Thử lại"
- **API error**: Hiển thị message từ server
- **Validation error**: Hiển thị dưới input field

### Success States
- **Toast notification**: "Đã lưu thành công", "Đặt hàng thành công"
- **Confirmation screen**: Sau khi đặt hàng, claim máy

### Interactive Elements
- **Tap feedback**: Ripple effect hoặc opacity change
- **Swipe actions**: Swipe để xóa (trong danh sách địa chỉ, phương thức thanh toán)
- **Long press**: Menu context (nếu cần)

---

## 🧩 Components cần thiết kế

### Basic Components
1. **Button** (Primary, Secondary, Text, Icon)
2. **Input** (Text, Password, Number, Search)
3. **Card**
4. **Badge** (Status, Count)
5. **Avatar**
6. **Icon** (set icons cần dùng)
7. **Loading Spinner**
8. **Skeleton**
9. **Toast / Snackbar**
10. **Modal / Bottom Sheet**
11. **Dropdown / Picker**
12. **Date Picker**
13. **Checkbox**
14. **Radio Button**
15. **Switch / Toggle**
16. **Tab Bar**
17. **Search Bar**
18. **Filter Bar**

### Complex Components
1. **Device Card** (tên, status, pin, khe)
2. **Product Card** (hình, tên, giá, nút thêm giỏ)
3. **Order Card** (mã đơn, trạng thái, tổng tiền)
4. **Transaction Card** (thời gian, máy, sản phẩm, tiền)
5. **Status Timeline** (cho đơn hàng)
6. **Chart** (Bar, Line cho doanh thu)
7. **OTP Input** (6 ô số)
8. **Address Form** (với picker địa chỉ VN)

---

## 📱 Navigation Structure

### Tab Navigation (Bottom Tabs) - 4 Tabs chính
1. **Home** (Home icon) - Quản lý thiết bị
2. **Shop** (Shop icon) - Mua hàng & Đơn hàng
3. **Doanh thu** (Chart/Revenue icon) - Lịch sử bán hàng & Cài đặt thanh toán/hóa đơn
4. **Me** (User/Account icon) - Tài khoản & Cài đặt cá nhân

### Stack Navigation (trong mỗi tab)
- **Home tab**: Claim thiết bị, Popup sản phẩm trong máy
- **Shop tab**: Chi tiết sản phẩm, Giỏ hàng, Checkout, Danh sách đơn hàng, Chi tiết đơn, Cài đặt địa chỉ giao hàng
- **Doanh thu tab**: Chi tiết giao dịch, Cài đặt thanh toán, Cài đặt hóa đơn, Cài đặt lợi nhuận
- **Me tab**: Chỉnh sửa hồ sơ, Đổi mật khẩu, Các cài đặt khác

---

## 🎯 Priority Screens (thiết kế trước)

### Phase 1: Core Features & Navigation
1. Login / Register
2. **Tab Home** - Danh sách thiết bị (Grid)
3. **Popup sản phẩm trong máy** (khi tap vào thiết bị)
4. **Claim thiết bị** (với đặt tên, chọn lầu, Serial + Owner Key)
5. **Tab Shop** - Catalog sản phẩm (với nút giỏ hàng và đơn hàng top right)

### Phase 2: E-commerce Flow
6. Giỏ hàng
7. Checkout (với chọn địa chỉ giao hàng)
8. Danh sách đơn hàng
9. Chi tiết đơn hàng
10. Cài đặt địa chỉ giao hàng (trong Shop tab)

### Phase 3: Analytics & Settings
11. **Tab Doanh thu** - Lịch sử bán hàng
12. **Tab Doanh thu** - Biểu đồ & Tổng hợp (tuần/tháng/năm)
13. Cài đặt thanh toán (với OTP flow) - trong Tab Doanh thu
14. Cài đặt hóa đơn - trong Tab Doanh thu
15. Cài đặt lợi nhuận - trong Tab Doanh thu
16. **Tab Me** - Hồ sơ & Cài đặt cá nhân

---

## 📝 Notes cho Designer

1. **Tab Navigation**: 4 tabs chính (Home, Shop, Doanh thu, Me) - Bottom tab bar, mỗi tab có icon và label rõ ràng

2. **Home Tab - Grid Layout**: Danh sách thiết bị hiển thị dạng lưới (2 cột), mỗi card compact nhưng đủ thông tin. Nút "+" để claim thiết bị (FAB hoặc top right)

3. **Popup sản phẩm**: Khi tap vào card thiết bị, hiển thị popup/bottom sheet với 4 khe và sản phẩm. Popup có thể swipe down để đóng

4. **Claim thiết bị**: Form có 3 phần chính: Đặt tên (theo phòng), Chọn lầu (picker), Serial + Owner Key. Lưu ý UX: Hướng dẫn rõ ràng về thẻ trong hộp

5. **Shop Tab**: Header có 2 nút top right: Giỏ hàng (với badge số lượng) và Đơn hàng (với badge số đơn đang chờ). Cài đặt địa chỉ giao hàng có thể là menu item hoặc icon trong header

6. **Doanh thu Tab**: Có 2 phần chính: Lịch sử bán hàng (list) và Tổng hợp (biểu đồ). Có thể dùng tab bar nhỏ trong màn hoặc switch button. Cài đặt (thanh toán, hóa đơn, lợi nhuận) có thể là icon ⚙️ hoặc section riêng

7. **Realtime updates**: Màn Home (danh sách thiết bị) và popup sản phẩm cần hiển thị indicator "Đang cập nhật..." hoặc timestamp "Cập nhật lúc ..."

8. **OTP Flow**: Flow OTP cho thanh toán cần rõ ràng, có đếm ngược, thông báo rate limit

9. **Masked data**: Số tài khoản, số điện thoại cần mask (ví dụ: ****1234)

10. **Currency format**: Hiển thị tiền VND với format: "50.000 đ" hoặc "50.000 VNĐ"

11. **Date format**: Ngày tháng theo format VN: "dd/mm/yyyy" hoặc "dd/mm/yyyy HH:mm"

12. **Empty states**: Mỗi danh sách cần có empty state với illustration và CTA rõ ràng

13. **Error handling**: Mỗi form cần hiển thị lỗi validation rõ ràng, đặt dưới input field

14. **Accessibility**: Đảm bảo contrast ratio, touch target tối thiểu 44x44px

15. **Dark mode**: Có thể hỗ trợ dark mode sau (không bắt buộc Phase 1)

16. **Localization**: Text có thể thay đổi, dùng placeholder text tiếng Việt

17. **Lầu (Floor)**: Khi claim thiết bị, chọn lầu để sắp xếp. Có thể filter/sort thiết bị theo lầu trong Home tab sau này

---

## 🔗 Tài liệu tham khảo

- [MOBILE.md](../docs/MOBILE.md) — Spec chi tiết màn hình và API
- [API.md](../docs/API.md) — Chi tiết API endpoints
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) — Kiến trúc tổng quan
- [PAYMENT-FLOW.md](../docs/PAYMENT-FLOW.md) — Luồng thanh toán VietQR

---

## ✅ Checklist thiết kế

- [ ] Design System (Colors, Typography, Spacing, Components)
- [ ] Wireframes cho tất cả màn hình
- [ ] High-fidelity designs cho Phase 1
- [ ] High-fidelity designs cho Phase 2
- [ ] High-fidelity designs cho Phase 3
- [ ] Component library trong Figma
- [ ] Prototype interactions (nếu có)
- [ ] Export assets (icons, illustrations)
- [ ] Design specs (spacing, sizes) cho developer

---

**Ngày tạo**: [Ngày hiện tại]  
**Version**: 1.0  
**Người tạo**: AI Assistant  
**Người review**: [Tên designer/PM]
