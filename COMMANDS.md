# Lệnh thường dùng — Mobile (Expo)

## Phát triển

```bash
# Cài dependencies
npm install

# Chạy Expo (chọn device/simulator)
npm start

# Chạy trên Android
npm run android

# Chạy trên iOS (cần macOS)
npm run ios

# Chạy trên Web
npm run web
```

# Cài đặt lên device
cd mobile
APP_VARIANT=production npx expo run:android --variant release

## Biến môi trường

Tạo file `.env` (xem `.env.example`):

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

- Khi test trên thiết bị thật, dùng IP máy (ví dụ `http://192.168.1.10:3000`) thay vì `localhost`.

## Cấu trúc chính

```
app/
├── (auth)/                  # Login, Register, Forgot/Reset password
├── (tabs)/
│   ├── index.tsx            # Dashboard — tổng doanh thu, ví, máy hoạt động
│   ├── devices.tsx          # Thiết bị — claim, danh sách máy, 4 khe
│   ├── shop.tsx             # Shop — catalog sản phẩm (giá nhập + hoa hồng + giá bán)
│   ├── orders.tsx           # Đơn hàng B2B — đặt hàng, theo dõi, xác nhận nhận hàng
│   ├── wallet.tsx           # Ví đối tác — 3 số dư, sổ cái, nạp cọc, chuyển vốn
│   └── account.tsx          # Tài khoản — profile, PIN, STK hoa hồng, đăng xuất
├── wallet/
│   ├── topup.tsx            # Màn hình nạp cọc (nhập số tiền → QR VietQR → poll)
│   └── transfer.tsx         # Màn hình chuyển vốn (ví vận hành → ví hoa hồng, 1 chiều)
├── index.tsx                # Gate — redirect auth/main
└── modal.tsx                # Modal chung

src/
├── api/                     # API client, token storage, interceptor 401
│   ├── auth.ts
│   ├── products.ts          # GET /products (có commissionAmount, sellingPrice)
│   ├── orders.ts            # POST/GET/PATCH orders
│   ├── wallet.ts            # GET balance, ledger, topup init/status, transfer, payout accounts
│   └── transactions.ts
├── stores/                  # Zustand
│   ├── auth.ts              # token, user (priceMultiplier)
│   └── cart.ts              # giỏ hàng B2B
├── hooks/
│   ├── useWallet.ts         # số dư + sổ cái
│   ├── useTopup.ts          # khởi tạo + poll nạp cọc
│   └── useWalletTransfer.ts # chuyển vốn (POST /wallet/transfer)
└── config/
    └── env.ts               # EXPO_PUBLIC_API_URL
```

## Màn hình Ví đối tác (wallet.tsx)

- **Card ví vận hành**: `depositBalance` (khả dụng) + `reservedBalance` (đang giam)
  - Nút **"Nạp cọc"** → `wallet/topup.tsx`
  - Nút **"Chuyển vốn"** → `wallet/transfer.tsx`
- **Card ví hoa hồng**: `commissionBalance`
  - Thông tin STK nhận hoa hồng đã liên kết
- **Sổ cái**: danh sách `wallet_ledger_entries` (loại, chiều, số tiền, số dư sau)

## Màn hình Catalog Shop (shop.tsx)

Mỗi sản phẩm hiển thị **giá bán** (tính server-side theo `priceMultiplier` (K) của người dùng):
- **Giá nhập**: `price` = `products.price`
- **Hoa hồng**: `commissionAmount` = `commissionValue × priceMultiplier`
- **VAT**: `vatAmount` = `commissionAmount × 5%`
- **Giá bán**: `sellingPrice` = `ceil((price + commissionAmount + vatAmount) / 1000) × 1000`

## Auth

- Đăng nhập bằng **số điện thoại** + mật khẩu.
- JWT lưu trong SecureStore; tự refresh khi 401.
- `users/me` trả về `priceMultiplier` (K) — lưu vào auth store; đổi qua `PATCH /users/me/price-multiplier`.
